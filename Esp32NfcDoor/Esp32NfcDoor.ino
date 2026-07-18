#include <Adafruit_PN532.h>
#include <Preferences.h> // 내부 플래시 메모리(NVS) 저장용 라이브러리 (ESP32 기본 내장)
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h> // TLS 보안 연결
#include <WiFiManager.h> // WiFi 설정 웹서버 라이브러리 (설치 필수: WiFiManager by tzapu)
#include <Wire.h>

// -----------------------------------------
// 1. MQTT 설정 (백엔드 고정 정보)
// -----------------------------------------
const char *mqtt_server = "315e5d948dad4a52b84916853d7e9344.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char *mqtt_user = "situation";
const char *mqtt_password = "M!nkim5053hivemq";

// -----------------------------------------
// 2. 동적 설정 (WiFiManager & Preferences)
// -----------------------------------------
Preferences preferences;

// 기본값 세팅 (스마트폰으로 언제든 변경 가능)
char mqcafe_id[40] = "ST001";
char reader_action[10] = "entry";
String macAddr = "";
String topic_open = "";
const char *topic_scan = "mqcafe/nfc/scan";

bool shouldSaveConfig = false;
void saveConfigCallback() {
  Serial.println("[WIFI] 설정이 변경되어 저장해야 합니다.");
  shouldSaveConfig = true;
}

WiFiClientSecure espClient;
PubSubClient client(espClient);

/*
  [ ESP32-WROOM vs ESP32-C3 사용 시 차이점 요약 ]
  1. UART 개수: 
     - ESP32-WROOM: UART가 3개(0, 1, 2). 주로 HardwareSerial(2)를 사용합니다.
     - ESP32-C3: UART가 2개(0, 1). 0번은 로그(Serial) 출력용이므로 PN532 통신에는 HardwareSerial(1)을 사용해야 합니다.
  2. 핀 할당 (Pinout):
     - ESP32-WROOM: RX=16, TX=17 등 범용 핀을 자유롭게 사용할 수 있습니다. BOOT 버튼 핀은 주로 0번입니다.
     - ESP32-C3: 핀 수가 적으며, 스트래핑 핀을 피해서 RX=6, TX=7 등 C3에 맞는 안전한 핀을 사용해야 합니다. 내장 BOOT 버튼 핀은 9번입니다.
*/
// -----------------------------------------
// 3. 하드웨어 핀 설정 (릴레이 & NFC)
// -----------------------------------------
// 릴레이 신호 핀
const int DOOR_PIN = 4;
#define RESET_BTN_PIN 9   // ESP32-C3의 기기 자체 BOOT 버튼 (초기화용)
#define PN532_RX_PIN (6)  // ESP32-C3 안전한 핀으로 변경
#define PN532_TX_PIN (7)  // ESP32-C3 안전한 핀으로 변경
#define PN532_RESET  (5)  // ESP32-C3 안전한 핀으로 변경

HardwareSerial PN532Serial(1); // ESP32-C3는 UART가 2개뿐이므로 1을 사용
Adafruit_PN532 nfc(PN532_RESET, &PN532Serial);
bool hasNfc = false; // NFC 리더기 연결 여부 확인용 플래그

// 중복 태그 방지용 변수
unsigned long lastReadTime = 0;
const unsigned long readDelay = 2000;

// -----------------------------------------
// 4. 자동문 열림 함수
// -----------------------------------------
void openDoor() {
  Serial.println("\n[DOOR] 서버로부터 문열림 명령 수신!");
  Serial.println("[DOOR] 릴레이 ON (자동문 개방 시작) -> 5초 대기");
  digitalWrite(DOOR_PIN, HIGH); // 릴레이 ON
  delay(5000);
  digitalWrite(DOOR_PIN, LOW); // 릴레이 OFF
  Serial.println("[DOOR] 릴레이 OFF (자동문 닫힘)\n");
}

// -----------------------------------------
// 5. MQTT 수신 콜백 함수
// -----------------------------------------
void mqtt_callback(char *topic, byte *payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  Serial.println(msg);

  if (String(topic) == topic_open) {
    if (msg.indexOf("\"command\":\"OPEN\"") >= 0 ||
        msg.indexOf("\"command\": \"OPEN\"") >= 0 || msg.indexOf("OPEN") >= 0) {
      openDoor();
    }
  }
}

// -----------------------------------------
// 6. MQTT 재연결 루틴
// -----------------------------------------
void reconnect() {
  while (!client.connected()) {
    Serial.print("\n[MQTT] 연결 시도 중...");
    String clientId = "MQCafe-Door-" + macAddr;

    if (client.connect(clientId.c_str(), mqtt_user, mqtt_password)) {
      Serial.println("연결 성공!");
      client.subscribe(topic_open.c_str());
      Serial.print("[MQTT] 다음 토픽을 구독합니다: ");
      Serial.println(topic_open);
    } else {
      Serial.print("실패, rc=");
      Serial.print(client.state());
      Serial.println(" 5초 후 재시도");
      delay(5000);
    }
  }
}

// -----------------------------------------
// 초기화 함수
// -----------------------------------------
void setup() {
  Serial.begin(115200);
  pinMode(DOOR_PIN, OUTPUT);
  digitalWrite(DOOR_PIN, LOW);
  pinMode(RESET_BTN_PIN, INPUT_PULLUP);

  // 1. 저장된 설정 불러오기
  preferences.begin("mqcafe", false);
  String saved_id = preferences.getString("mqcafe_id", "ST001");
  String saved_action = preferences.getString("reader_action", "entry");
  saved_id.toCharArray(mqcafe_id, 40);
  saved_action.toCharArray(reader_action, 10);
  Serial.println("\n[INIT] 로드된 설정 - 매장 ID: " + String(mqcafe_id) +
                 ", 단말기 역할: " + String(reader_action));

  /*
    [ MQcafe WiFi 설정 (WiFiManager) 방법 요약 ]
    1. 기기에 전원을 연결합니다.
    2. 이전에 저장된 WiFi 정보가 없거나 연결에 실패하면, 기기가 스스로 AP(공유기)가 됩니다.
    3. 스마트폰이나 PC의 WiFi 설정에서 "MQCafe-Setup" 이라는 네트워크를 찾아 연결합니다.
    4. 연결 후 자동으로 설정 웹페이지(Captive Portal)가 뜹니다.
       (자동으로 뜨지 않을 경우 브라우저를 열고 192.168.4.1 로 접속합니다)
    5. 'Configure WiFi'를 누르고, 매장의 실제 사용 중인 공유기(WiFi) 이름과 비밀번호를 입력합니다.
    6. 하단의 커스텀 파라미터 입력란에 '매장 ID(예: ST001)'와 '역할(entry, exit 또는 relay)'을 입력하고 Save를 누릅니다.
    7. 기기가 자동으로 재부팅되며, 방금 설정한 WiFi를 통해 백엔드 서버와 통신을 시작합니다.
  */
  // 2. WiFiManager 설정 (공유기 및 커스텀 파라미터)
  WiFiManager wm;
  wm.setSaveConfigCallback(saveConfigCallback);

  WiFiManagerParameter custom_mqcafe_id("mqcafe_id", "매장 ID (예: ST001)",
                                        mqcafe_id, 40);
  WiFiManagerParameter custom_reader_action(
      "reader_action", "역할 (entry, exit 또는 relay 입력)", reader_action, 10);

  wm.addParameter(&custom_mqcafe_id);
  wm.addParameter(&custom_reader_action);

  // 와이파이 연결 시도 (실패 시 "MQCafe-Setup" AP 생성)
  // wm.resetSettings(); // 공유기 설정을 초기화하고 싶을 때 주석 해제하여 한 번
  // 실행하세요

  if (!wm.autoConnect("MQCafe-Setup")) {
    Serial.println("[WIFI] 설정 시간 초과. 기기를 재부팅합니다.");
    delay(3000);
    ESP.restart();
  }

  Serial.println("\n[WIFI] 와이파이 연결 성공!");

  // 3. 설정이 변경되었다면 저장
  if (shouldSaveConfig) {
    strcpy(mqcafe_id, custom_mqcafe_id.getValue());
    strcpy(reader_action, custom_reader_action.getValue());

    preferences.putString("mqcafe_id", String(mqcafe_id));
    preferences.putString("reader_action", String(reader_action));
    Serial.println("[INIT] 새 설정이 저장되었습니다.");
  }
  preferences.end();

  // 4. 기기 고유 MAC 주소 추출 및 토픽 생성
  macAddr = WiFi.macAddress();
  macAddr.replace(":", "");
  topic_open = "mqcafe/" + String(mqcafe_id) + "/door/control";
  Serial.println("[INIT] 내 기기 MAC 주소: " + macAddr);

  // 5. MQTT 초기화
  espClient.setInsecure();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqtt_callback);

  // 6. PN532 NFC 초기화
  PN532Serial.begin(115200, SERIAL_8N1, PN532_RX_PIN, PN532_TX_PIN);
  nfc.begin();
  uint32_t versiondata = nfc.getFirmwareVersion();
  if (!versiondata) {
    Serial.println("[NFC] PN53x 보드를 찾을 수 없습니다! NFC 기능 없이 문 "
                   "제어만 작동합니다.");
    hasNfc = false;
  } else {
    hasNfc = true;
    Serial.print("[NFC] Found chip PN5");
    Serial.println((versiondata >> 24) & 0xFF, HEX);
    nfc.setPassiveActivationRetries(0x00); // 무한 대기 버그 방지
    nfc.SAMConfig();
    Serial.println("[NFC] NFC 초기화 완료! 카드를 대주세요...");
  }
}

// -----------------------------------------
// 무한 루프 메인 함수
// -----------------------------------------
void loop() {
  // 와이파이 설정 강제 초기화 (BOOT 버튼 5초 이상 누르기)
  static unsigned long btnPressTime = 0;
  if (digitalRead(RESET_BTN_PIN) == LOW) {
    if (btnPressTime == 0) {
      btnPressTime = millis();
    } else if (millis() - btnPressTime > 5000) {
      Serial.println("\n[SYS] BOOT 버튼 5초 눌림 감지! 설정을 초기화하고 재부팅합니다...");
      WiFiManager wm;
      wm.resetSettings(); // 저장된 와이파이 정보 삭제
      delay(1000);
      ESP.restart();      // 기기 재부팅 -> MQCafe-Setup 핫스팟 생성
    }
  } else {
    btnPressTime = 0;
  }

  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 10000) {
    lastHeartbeat = millis();
    Serial.println("[SYS] 정상 동작 중... (매장: " + String(mqcafe_id) +
                   " / 모드: " + String(reader_action) + ")");
  }

  // NFC 리더기가 정상 연결된 경우에만 스캔 시도 (미연결 시 대기(블로킹) 방지)
  static unsigned long lastScanTime = 0;
  if (hasNfc && (millis() - lastScanTime > 500)) {
    lastScanTime = millis();

    uint8_t success;
    uint8_t uid[] = {0, 0, 0, 0, 0, 0, 0};
    uint8_t uidLength;

    // UART 버퍼 비우기 (Desync 방지)
    while (PN532Serial.available()) {
      PN532Serial.read();
    }

    success =
        nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, 1000);

    if (success) {
      if (millis() - lastReadTime > readDelay) {
        String uidStr = "";
        for (uint8_t i = 0; i < uidLength; i++) {
          if (uid[i] < 0x10)
            uidStr += "0";
          uidStr += String(uid[i], HEX);
        }
        uidStr.toUpperCase();

        Serial.print("\n[NFC] 스캔된 카드 UID: ");
        Serial.println(uidStr);

        // MAC 주소와 설정된 매장 ID를 포함하여 전송 (완전 범용)
        String payload = "{\"device_id\":\"" + macAddr + "\", \"store_id\":\"" +
                         String(mqcafe_id) + "\", \"action\":\"" +
                         String(reader_action) + "\", \"uid\":\"" + uidStr +
                         "\"}";
        client.publish(topic_scan, payload.c_str());
        Serial.println("[MQTT] 백엔드로 스캔 정보 전송 완료!");

        lastReadTime = millis();
      }
    }
  }
}
