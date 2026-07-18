import time
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from db.study_cafe_db import get_nfc_card, register_nfc_card, find_active_session_by_user, get_session, update_session_metadata, update_session_status, get_owner_nfc_cards, delete_owner_nfc_card
from schemas import NfcScanRequest, NfcRegisterRequest
from mqtt_helper import mqtt_publish
from websocket_manager import manager
import asyncio
from datetime import datetime

router = APIRouter(
    prefix="/api/study-cafe/nfc",
    tags=["NFC"]
)

# store_id 별로 단일 락을 관리하는 인메모리 딕셔너리
# 구조: { store_id: { "user_name": str, "phone_number": str, "expires_at": float } }
nfc_registration_locks = {}

class NfcPairingRequest(BaseModel):
    store_id: str = "ST001"
    user_name: str
    phone_number: str

class OwnerNfcPairingRequest(BaseModel):
    store_id: str
    owner_id: str
    card_name: str = "점주 마스터"

@router.post("/request_registration")
def request_registration(req: NfcPairingRequest):
    """
    모바일 웹에서 사용자가 'NFC 연동하기' 버튼을 눌렀을 때 호출
    """
    current_time = time.time()
    
    # 락이 존재하는지, 그리고 만료되지 않았는지 확인
    if req.store_id in nfc_registration_locks:
        lock = nfc_registration_locks[req.store_id]
        if current_time < lock["expires_at"]:
            # 누군가 락을 선점하고 있음
            return {
                "status": "locked", 
                "message": "다른 분이 카드 등록을 진행 중입니다. 1분 후 다시 시도해 주세요."
            }

    # 락 획득 (60초 유효)
    nfc_registration_locks[req.store_id] = {
        "user_name": req.user_name,
        "phone_number": req.phone_number,
        "expires_at": current_time + 60.0
    }
    
    return {
        "status": "success",
        "message": "지금부터 60초 이내에 매장 입구의 리더기에 카드를 태그해 주세요!"
    }

@router.post("/owner/request_registration")
def owner_request_registration(req: OwnerNfcPairingRequest):
    """
    점주가 대시보드에서 '마스터 출입 카드 등록' 버튼을 눌렀을 때 호출
    """
    current_time = time.time()
    
    if req.store_id in nfc_registration_locks:
        lock = nfc_registration_locks[req.store_id]
        if current_time < lock["expires_at"]:
            return {
                "status": "locked", 
                "message": "다른 카드 등록 작업이 진행 중입니다. 1분 후 다시 시도해 주세요."
            }

    nfc_registration_locks[req.store_id] = {
        "user_name": req.card_name,
        "phone_number": req.owner_id,
        "expires_at": current_time + 60.0
    }
    
    return {
        "status": "success",
        "message": f"[{req.card_name}] 카드를 등록합니다.\n지금부터 60초 이내에 리더기에 카드를 태그해 주세요!"
    }

@router.get("/owner/cards")
def get_owner_cards(owner_id: str):
    cards = get_owner_nfc_cards(owner_id)
    return {"status": "success", "cards": cards}

@router.delete("/owner/cards/{uid}")
def delete_owner_card(uid: str, owner_id: str):
    success = delete_owner_nfc_card(uid, owner_id)
    if success:
        return {"status": "success", "message": "카드가 정상적으로 삭제되었습니다."}
    else:
        raise HTTPException(status_code=400, detail="카드 삭제에 실패했습니다. (잘못된 권한 또는 없는 카드)")


def _send_system_chat(session_id: str, text: str, background_tasks: Optional[BackgroundTasks] = None):
    sess = get_session(session_id)
    if not sess: return
    sess_meta = sess.get("metadata") or {}
    messages = sess_meta.get("messages", [])
    msg = {
        "sender": "system",
        "text": text,
        "timestamp": datetime.now().isoformat()
    }
    messages.append(msg)
    sess_meta["messages"] = messages
    update_session_metadata(session_id, sess_meta)
    
    async def _send():
        try:
            await manager.send_to_customer(session_id, {
                "type": "admin_message",
                "message": msg
            })
        except Exception:
            pass
            
    if background_tasks:
        background_tasks.add_task(_send)

def _send_nfc_scan_event(session_id: str, data: dict, background_tasks: Optional[BackgroundTasks] = None, store_id: str = "ST001"):
    payload = {
        "type": "nfc_scan_result",
        "session_id": session_id,
        "data": data
    }
    if background_tasks:
        background_tasks.add_task(mqtt_publish, f"mqcafe/{store_id}/update", payload)
    else:
        mqtt_publish(f"mqcafe/{store_id}/update", payload)

def process_nfc_scan_logic(uid: str, store_id: str = "ST001", background_tasks: Optional[BackgroundTasks] = None, action: str = "entry"):
    """
    NFC 스캔 시 처리하는 핵심 비즈니스 로직 (API 및 MQTT에서 공통 사용)
    """
    # 1. DB에 등록된 카드인지 확인
    card = get_nfc_card(uid)
    
    if not card:
        # 미등록 카드일 경우: 현재 락이 걸려있는지 확인
        current_time = time.time()
        lock = nfc_registration_locks.get(store_id)
        
        if lock and current_time < lock["expires_at"]:
            # 락을 잡은 고객 정보로 카드 등록
            success = register_nfc_card(uid, lock["user_name"], lock["phone_number"])
            if success:
                del nfc_registration_locks[store_id]
                session = find_active_session_by_user(lock["user_name"], lock["phone_number"])
                result = {"status": "registered_now", "message": f"💳 카드 등록 완료!\n\n[{lock['user_name']}] 카드가 성공적으로 연동되었습니다.\n다음부터 카드를 태그하시면 출입문이 열립니다."}
                
                # 프론트엔드 키오스크/패드에 메시지 표시를 위해 이벤트 전송
                _send_nfc_scan_event("master_registration", result, background_tasks, store_id)
                
                if session:
                    timestamp_str = datetime.now().strftime('%Y%m%d %H:%M')
                    _send_system_chat(session["session_id"], f"카드 등록 완료 [{timestamp_str}]", background_tasks)
                return result
            else:
                return {"status": "error", "message": "카드 등록 처리 중 오류가 발생했습니다."}
        else:
            return {"status": "unregistered", "message": "등록되지 않은 카드입니다. 고객님의 휴대폰에서 [출입 카드 연동] 버튼을 먼저 눌러주세요."}
    
    # 2. 점주 마스터 카드인지 확인
    if card["phone_number"].startswith("owner-"):
        result = {"status": "master_key", "message": f"점주 마스터 카드 인식 완료. ({card['user_name']})\n출입문이 개방되었습니다."}
        _send_nfc_scan_event("master", result, background_tasks, store_id)
        # MQTT로 문 열림 명령 즉시 전송
        topic = f"mqcafe/{store_id}/door/control"
        payload = {"command": "OPEN", "session_id": "master", "uid": uid}
        if background_tasks:
            background_tasks.add_task(mqtt_publish, topic, payload)
        else:
            mqtt_publish(topic, payload)
        return result

    # 3. 고객 카드인 경우, 현재 활성 이용권이 있는지 확인
    session = find_active_session_by_user(card["user_name"], card["phone_number"])
    if not session:
        return {"status": "no_ticket", "message": "현재 유효한 이용권이 없습니다."}
        
    # 2-1. 해당 이용권이 현재 스캔된 매장의 이용권인지 확인 (타 매장 이용권으로 문이 열리는 것을 방지)
    if session.get("store_id") != store_id:
        return {"status": "invalid_store", "message": "다른 지점의 이용권입니다. 해당 지점에서는 이용하실 수 없습니다."}
    
    # --- NFC 태그 시 세션 상태 자동 전환 로직 ---
    current_status = session.get("status")
    sess_meta = session.get("metadata", {})
    
    if action == "exit":
        # 실내 리더기(퇴실/외출용)에서 스캔된 경우
        if current_status == "active":
            # 이용 시간 초과 여부 확인
            exit_time_str = sess_meta.get("scheduled_exit_time")
            is_expired = False
            if exit_time_str:
                try:
                    exit_dt = datetime.fromisoformat(exit_time_str)
                    now = datetime.now()
                    if exit_dt.tzinfo is not None:
                        now = now.astimezone(exit_dt.tzinfo)
                    if (now - exit_dt).total_seconds() > 0:
                        is_expired = True
                except Exception:
                    pass
            
            if is_expired:
                # 시간이 만료되었다면 아예 퇴실(closed) 처리
                update_session_status(session["session_id"], "closed")
                new_status = "closed"
                msg_text = "퇴실 처리 완료"
            else:
                # 시간이 남아있다면 외출(outing) 처리
                sess_meta["outing_start_time"] = datetime.now().isoformat()
                update_session_status(session["session_id"], "outing")
                update_session_metadata(session["session_id"], sess_meta)
                new_status = "outing"
                msg_text = "외출 처리 완료"
                
            if background_tasks:
                background_tasks.add_task(
                    mqtt_publish,
                    f"mqcafe/{store_id}/update", {
                        "type": "CHECKOUT" if new_status == "closed" else "OUTING_TOGGLE",
                        "table_id": session["table_id"],
                        "session_id": session["session_id"],
                        "status": new_status,
                    }
                )
            else:
                mqtt_publish(f"mqcafe/{store_id}/update", {
                    "type": "CHECKOUT" if new_status == "closed" else "OUTING_TOGGLE",
                    "table_id": session["table_id"],
                    "session_id": session["session_id"],
                    "status": new_status,
                })
        else:
            # 이미 외출 중이거나 예약 상태라면 상태를 변경하지 않음
            new_status = current_status
            msg_text = "외출 (출입문 개방)"
            
    else:
        # 외부 리더기(입장/복귀용)에서 스캔된 경우 (action == "entry")
        if current_status == "reserved":
            update_session_status(session["session_id"], "active")
            new_status = "active"
            msg_text = "입장 (출입문 개방)"
            if background_tasks:
                background_tasks.add_task(
                    mqtt_publish,
                    f"mqcafe/{store_id}/update", {
                        "type": "CHECKIN",
                        "table_id": session["table_id"],
                        "session_id": session["session_id"],
                        "status": "active",
                    }
                )
            else:
                mqtt_publish(f"mqcafe/{store_id}/update", {
                    "type": "CHECKIN",
                    "table_id": session["table_id"],
                    "session_id": session["session_id"],
                    "status": "active",
                })
        elif current_status == "outing":
            outing_start_str = sess_meta.get("outing_start_time")
            if outing_start_str:
                outing_start = datetime.fromisoformat(outing_start_str)
                elapsed_outing = int((datetime.now() - outing_start).total_seconds() / 60)
                sess_meta["total_outing_minutes"] = sess_meta.get("total_outing_minutes", 0) + elapsed_outing
            sess_meta["outing_start_time"] = None
            update_session_status(session["session_id"], "active")
            update_session_metadata(session["session_id"], sess_meta)
            new_status = "active"
            msg_text = "복귀 (출입문 개방)"
            if background_tasks:
                background_tasks.add_task(
                    mqtt_publish,
                    f"mqcafe/{store_id}/update", {
                        "type": "OUTING_TOGGLE",
                        "table_id": session["table_id"],
                        "session_id": session["session_id"],
                        "status": "active",
                    }
                )
            else:
                mqtt_publish(f"mqcafe/{store_id}/update", {
                    "type": "OUTING_TOGGLE",
                    "table_id": session["table_id"],
                    "session_id": session["session_id"],
                    "status": "active",
                })
        else:
            # 이미 active인 경우 그냥 입장(재스캔)
            new_status = "active"
            msg_text = "입장 (출입문 개방)"
    # ---------------------------------------------

    # 3. 이용권이 있다면 문 열림 신호 (MQTT) 발송
    topic = f"mqcafe/{store_id}/door/control"
    payload = {"command": "OPEN", "session_id": session["session_id"], "uid": uid}
    if background_tasks:
        background_tasks.add_task(mqtt_publish, topic, payload)
    else:
        mqtt_publish(topic, payload)
    
    # 4. 앱 내 채팅 로그 남기기
    timestamp_str = datetime.now().strftime('%Y%m%d %H:%M')
    _send_system_chat(session["session_id"], f"{msg_text} [{timestamp_str}]", background_tasks)
    
    # 5. 스캔 결과 응답
    if action == "exit":
        if new_status == "closed":
            message = f"✅ 퇴실 처리 완료! 문이 열렸습니다.\n\n{card['user_name']}님, 이용해 주셔서 감사합니다."
        else:
            message = f"✅ 외출 처리 완료! 문이 열렸습니다.\n\n{card['user_name']}님, 다녀오세요."
    else:
        message = f"✅ 인증 성공! 출입문이 열렸습니다.\n\n{card['user_name']}님 환영합니다."
        
    result = {"status": "success", "message": message, "user_name": card["user_name"], "session_status": new_status}
    _send_nfc_scan_event(session["session_id"], result, background_tasks, store_id)
    return result

@router.post("/scan")
def scan_nfc_card(req: NfcScanRequest, background_tasks: BackgroundTasks):
    """
    리더기(ESP32 등)에서 카드를 태그했을 때 호출
    """
    return process_nfc_scan_logic(req.uid, "ST001", background_tasks, req.action or "entry")

