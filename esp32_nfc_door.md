# ESP32 기반 스마트 스터디카페 자동문 출입 제어기

본 문서는 ESP32와 PN532(NFC 모듈), 그리고 포토커플러를 활용하여 자동문을 제어하는 하드웨어 회로도 및 아두이노(Arduino IDE) 기반 100% 범용 프로그램 소스 코드입니다.

## 1. 하드웨어 구성 및 회로도 (Pin Map)

> [!IMPORTANT]
> - 자동문 열림 접점은 무전원 접점(Dry Contact) 방식을 사용하므로, 릴레이 또는 **포토커플러(TLP620 등)**를 사용하여 ESP32와 자동문 컨트롤러 사이를 전기적으로 완전히 절연(Isolation)시켜야 합니다.
> - PN532 모듈은 HSU (UART) 통신을 사용하므로 딥스위치가 `0 0` (UART) 모드로 설정되어 있는지 확인하세요.
> - **자동 감지 기능**: PN532를 연결하지 않고 릴레이(포토커플러)만 연결하면 코드가 자동으로 '릴레이 전용 제어기' 모드로 전환됩니다!

### 회로 연결표

| 부품 | 핀 이름 | 연결 대상 (ESP32) | 설명 |
| :--- | :--- | :--- | :--- |
| **PN532 (NFC)** | VCC | 3.3V 또는 5V | 모듈 스펙에 맞는 전원 연결 |
| | GND | GND | 접지 |
| | RXD | GPIO 17 (TX2) | UART 통신 |
| | TXD | GPIO 16 (RX2) | UART 통신 |
| | RST | GPIO 3 | 초기화 핀 |
| **포토커플러(TLP620)** | Pin 1 (Anode) | GPIO 4 | 330Ω 저항을 거쳐 연결 |
| | Pin 2 (Cathode) | GND | ESP32의 GND로 연결 |
| | Pin 3 (Emitter) | 자동문 COM | 자동문 스위치 접점 1 |
| | Pin 4 (Collector)| 자동문 NO | 자동문 스위치 접점 2 (신호 인가 시 열림) |

---

## 2. 작동 프로세스 및 100% 범용화 세팅 가이드

더 이상 와이파이 이름이나 매장 ID를 코드에 하드코딩할 필요가 없습니다. 단 하나의 코드(`Esp32NfcDoor.ino`)로 전국의 모든 매장 기기를 커버합니다!

### ⚙️ 스마트폰 초기 세팅 방법 (WiFiManager)
1. 최초 부팅 시, ESP32가 저장된 와이파이를 찾지 못하면 스스로 **`STCafe-Setup`** 이라는 이름의 핫스팟을 생성합니다.
2. 스마트폰으로 `STCafe-Setup` 와이파이에 연결하면 자동으로 설정 창이 뜹니다.
3. 다음 4가지 정보를 입력하고 `Save`를 누릅니다:
   - **Wi-Fi SSID**: 연결할 매장 공유기 이름
   - **Wi-Fi Password**: 공유기 비밀번호
   - **매장 ID (`stcafe_id`)**: 본사에서 부여받은 매장 고유 ID (예: `ST001`)
   - **역할 (`reader_action`)**: 
     - `entry` (입장용 NFC 단말기)
     - `exit` (퇴장용 NFC 단말기)
     - `relay` (NFC 없이 문만 제어하는 단말기일 경우 메모용으로 기입. 하드웨어가 자동으로 릴레이 모드를 감지합니다.)
4. 저장이 완료되면 기기가 재부팅되며, 입력한 매장 와이파이로 접속하여 백엔드 서버와 통신을 시작합니다! (설정값은 영구 저장됩니다.)

### 🔄 설정 초기화 방법 (와이파이 변경 시)
공유기가 바뀌거나 설정을 초기화하고 싶다면 코드 내 `setup()` 함수의 `wm.resetSettings();` 주석을 해제하고 **1회 업로드** 하시면 기억이 모두 지워집니다. 지워진 것을 확인한 후 **반드시 다시 주석 처리 후 업로드** 하셔야 합니다.

---

## 3. ESP32 범용 통합 펌웨어 (Arduino IDE)

> [!TIP]
> 아두이노 IDE의 라이브러리 매니저에서 다음 라이브러리를 **반드시 설치**해야 합니다.
> - `WiFiManager` by tzapu (설정 웹서버)
> - `PubSubClient` (MQTT 통신)
> - `Adafruit PN532` (NFC 리더)

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h> // TLS 보안 연결
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_PN532.h>
#include <WiFiManager.h>      // WiFi 설정 웹서버 라이브러리
#include <Preferences.h>      // 내부 플래시 메모리 저장용 (기본 내장)

// -----------------------------------------
// 1. MQTT 설정 (백엔드 고정 정보)
// -----------------------------------------
const char* mqtt_server = "315e5d948dad4a52b84916853d7e9344.s1.eu.hivemq.cloud"; 
const int   mqtt_port = 8883; 
const char* mqtt_user = "situation";
const char* mqtt_password = "M!nkim5053hivemq";

// -----------------------------------------
// 2. 동적 설정 (WiFiManager & Preferences)
// -----------------------------------------
Preferences preferences;

char stcafe_id[40] = "ST001";
char reader_action[10] = "entry";
String macAddr = "";
String topic_open = "";
const char* topic_scan = "stcafe/nfc/scan";

bool shouldSaveConfig = false;
void saveConfigCallback () {
  Serial.println("[WIFI] 설정이 변경되어 저장해야 합니다.");
  shouldSaveConfig = true;
}

WiFiClientSecure espClient;
PubSubClient client(espClient);

// -----------------------------------------
// 3. 하드웨어 핀 설정 (릴레이 & NFC)
// -----------------------------------------
const int DOOR_PIN = 4;
#define RESET_BTN_PIN 0   // 기기 자체 BOOT 버튼 (초기화용)
#define PN532_RX_PIN (16) 
#define PN532_TX_PIN (17) 
#define PN532_RESET  (3)  

HardwareSerial PN532Serial(2);
Adafruit_PN532 nfc(PN532_RESET, &PN532Serial);
bool hasNfc = false; 

unsigned long lastReadTime = 0;
const unsigned long readDelay = 2000;

// -----------------------------------------
// 4. 자동문 열림 함수
// -----------------------------------------
void openDoor() {
  Serial.println("\n[DOOR] 서버로부터 문열림 명령 수신!");
  Serial.println("[DOOR] 릴레이 ON (개방 시작) -> 5초 대기");
  digitalWrite(DOOR_PIN, HIGH);
  delay(5000);                  
  digitalWrite(DOOR_PIN, LOW);
  Serial.println("[DOOR] 릴레이 OFF (닫힘)\n");
}

// -----------------------------------------
// 5. MQTT 수신 및 재연결
// -----------------------------------------
void mqtt_callback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  if (String(topic) == topic_open) {
    if (msg.indexOf("\"command\":\"OPEN\"") >= 0 || msg.indexOf("\"command\": \"OPEN\"") >= 0 || msg.indexOf("OPEN") >= 0) {
      openDoor();
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    String clientId = "STCafe-Door-" + macAddr;
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_password)) {
      client.subscribe(topic_open.c_str());
    } else {
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

  preferences.begin("stcafe", false);
  String saved_id = preferences.getString("stcafe_id", "ST001");
  String saved_action = preferences.getString("reader_action", "entry");
  saved_id.toCharArray(stcafe_id, 40);
  saved_action.toCharArray(reader_action, 10);

  WiFiManager wm;
  wm.setSaveConfigCallback(saveConfigCallback);
  
  WiFiManagerParameter custom_stcafe_id("stcafe_id", "매장 ID (예: ST001)", stcafe_id, 40);
  WiFiManagerParameter custom_reader_action("reader_action", "역할 (entry, exit, relay)", reader_action, 10);
  
  wm.addParameter(&custom_stcafe_id);
  wm.addParameter(&custom_reader_action);

  // wm.resetSettings(); // 공유기 설정 초기화 시 주석 해제 후 1회 실행
  
  if (!wm.autoConnect("STCafe-Setup")) {
    delay(3000);
    ESP.restart();
  }
  
  if (shouldSaveConfig) {
    strcpy(stcafe_id, custom_stcafe_id.getValue());
    strcpy(reader_action, custom_reader_action.getValue());
    
    preferences.putString("stcafe_id", String(stcafe_id));
    preferences.putString("reader_action", String(reader_action));
  }
  preferences.end();

  macAddr = WiFi.macAddress();
  macAddr.replace(":", "");
  topic_open = "stcafe/" + String(stcafe_id) + "/door/control";

  espClient.setInsecure();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqtt_callback);

  PN532Serial.begin(115200, SERIAL_8N1, PN532_RX_PIN, PN532_TX_PIN);
  nfc.begin();
  
  uint32_t versiondata = 0;
  for (int i = 0; i < 5; i++) {
    versiondata = nfc.getFirmwareVersion();
    if (versiondata) break;
    Serial.println("[NFC] 모듈 응답 대기 중... (재시도)");
    delay(1000);
  }

  if (!versiondata) {
    Serial.println("[NFC] PN53x 보드 없음! NFC 없이 문 제어(릴레이)만 작동합니다.");
    hasNfc = false;
  } else {
    hasNfc = true;
    nfc.setPassiveActivationRetries(0x00);
    nfc.SAMConfig();
  }
}

// -----------------------------------------
// 무한 루프
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
      ESP.restart();      // 기기 재부팅 -> STCafe-Setup 핫스팟 생성
    }
  } else {
    btnPressTime = 0;
  }

  if (!client.connected()) reconnect();
  client.loop();
  
  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 10000) {
    lastHeartbeat = millis();
    Serial.println("[SYS] 정상 동작 중... (매장: " + String(stcafe_id) + " / 모드: " + String(reader_action) + ")");
  }

  static unsigned long lastScanTime = 0;
  if (hasNfc && (millis() - lastScanTime > 500)) {
    lastScanTime = millis();
    
    uint8_t success;
    uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };
    uint8_t uidLength;

    while (PN532Serial.available()) { PN532Serial.read(); }
    success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, 1000);

    if (success && (millis() - lastReadTime > readDelay)) {
      String uidStr = "";
      for (uint8_t i = 0; i < uidLength; i++) {
        if(uid[i] < 0x10) uidStr += "0";
        uidStr += String(uid[i], HEX);
      }
      uidStr.toUpperCase();
      
      String payload = "{\"device_id\":\"" + macAddr + "\", \"store_id\":\"" + String(stcafe_id) + "\", \"action\":\"" + String(reader_action) + "\", \"uid\":\"" + uidStr + "\"}";
      client.publish(topic_scan, payload.c_str());
      lastReadTime = millis();
    }
  }
}
```
