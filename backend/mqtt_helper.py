import os
import json
import ssl
import random
import string
import uuid
from typing import Optional, Union
from paho.mqtt import client as mqtt_client

# MQTT 브로커 설정 로드
MQTT_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_BROKER_PORT", "1885"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME") or None
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD") or None

def mqtt_publish(topic: str, payload: Union[dict, str]) -> bool:
    """MQTT 토픽으로 동기식 메시지 발행 (단일 연결 및 발행)"""
    rand_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    client_id = f'stcafe-backend-pub-{rand_str}'
    
    def on_connect(client, userdata, flags, rc, properties=None):
        if rc == 0:
            # print("Connected to MQTT Broker!")
            pass
        else:
            print(f"Failed to connect, return code {rc}")

    client = mqtt_client.Client(
        client_id=client_id, 
        callback_api_version=mqtt_client.CallbackAPIVersion.VERSION2
    )
    
    if MQTT_USERNAME and MQTT_PASSWORD:
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
        
    if MQTT_PORT == 8883: # HiveMQ Cloud TLS
        client.tls_set(tls_version=ssl.PROTOCOL_TLSv1_2)
        
    client.on_connect = on_connect
    
    try:
        client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
        client.loop_start()
        
        if isinstance(payload, dict):
            msg = json.dumps(payload, ensure_ascii=False)
        else:
            msg = payload
            
        result = client.publish(topic, msg, qos=1)
        # 발행 완료 대기 (최대 3.0초 타임아웃 설정으로 블로킹 방지)
        try:
            result.wait_for_publish(timeout=3.0)
        except Exception as ex:
            print(f"⚠️ [MQTT Publish Timeout/Error] {ex}")
        
        client.loop_stop()
        client.disconnect()
        print(f"📢 [MQTT Publish] topic={topic} | payload={msg[:150]}")
        return True
    except Exception as e:
        print(f"❌ [MQTT Publish Error] {e}")
        return False

def start_mqtt_listener():
    """백그라운드에서 실행되는 MQTT 수신(Subscribe) 루틴"""
    import threading
    rand_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    client_id = f'stcafe-backend-sub-{rand_str}'
    
    def on_connect(client, userdata, flags, rc, properties=None):
        if rc == 0:
            print("[MQTT] Subscriber connected! Listening for NFC and Remote Controls...")
            client.subscribe("stcafe/nfc/scan")
            client.subscribe("stcafe/remote_control")
        else:
            print(f"[MQTT] Subscriber failed to connect, return code {rc}")

    def on_disconnect(client, userdata, disconnect_flags, rc, properties=None):
        print(f"[MQTT] Subscriber disconnected! Reason Code: {rc}")

    def on_message(client, userdata, msg):
        try:
            payload = msg.payload.decode()
            print(f"📥 [MQTT Receive] topic={msg.topic} | payload={payload}")
            if msg.topic == "stcafe/nfc/scan":
                data = json.loads(payload)
                uid = data.get("uid")
                action = data.get("action", "entry")
                store_id = data.get("store_id", "ST001")
                if uid:
                    # 지연 임포트 (순환 참조 방지)
                    from routers.nfc_access import process_nfc_scan_logic
                    result = process_nfc_scan_logic(uid, store_id, None, action)
                    print(f"   [NFC Process Result] {result}")
                    
            elif msg.topic == "stcafe/remote_control":
                data = json.loads(payload)
                command = data.get("command")
                if command == "open_door":
                    # 도어 오픈 시 기존 NFC 도어 릴레이 명령 발행
                    print("   [Remote Control] Executing Open Door!")
                    target = data.get("target", "main")
                    mqtt_publish(f"stcafe/door/{target}", {"command": "open"})
                elif command == "send_chat":
                    from routers.nfc_access import _send_system_chat
                    sess_id = data.get("target_session")
                    msg_text = data.get("message")
                    if sess_id and msg_text:
                        print(f"   [Remote Control] Sending Chat to {sess_id}")
                        _send_system_chat(sess_id, msg_text)
                elif command == "parking_complete":
                    # 주차 처리 완료 알림 전송 (채팅 등)
                    from routers.nfc_access import _send_system_chat
                    sess_id = data.get("target_session")
                    if sess_id:
                        print(f"   [Remote Control] Parking Complete for {sess_id}")
                        _send_system_chat(sess_id, "주차 정산이 완료되었습니다. 안녕히 가세요!")
        except Exception as e:
            print(f"[MQTT Receive Error] {e}")

    client = mqtt_client.Client(
        client_id=client_id, 
        callback_api_version=mqtt_client.CallbackAPIVersion.VERSION2
    )
    
    if MQTT_USERNAME and MQTT_PASSWORD:
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
        
    if MQTT_PORT == 8883: # HiveMQ Cloud TLS
        client.tls_set(tls_version=ssl.PROTOCOL_TLSv1_2)
        
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    
    def _loop():
        try:
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            client.loop_forever()
        except Exception as e:
            print(f"❌ [MQTT Listener Fatal Error] {e}")

    # 백그라운드 스레드로 실행
    t = threading.Thread(target=_loop, daemon=True)
    t.start()
