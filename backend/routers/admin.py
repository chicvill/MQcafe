import uuid, hashlib

from datetime import datetime, timezone

from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks

from db import study_cafe_db

from ai_engine import chat_with_admin

from cron_archive import run_archiving_job

from mqtt_helper import mqtt_publish

from schemas import (
    CheckInRequest,
    RestoreRequest,
    EntryRequest,
    OutingRequest,
    CheckOutRequest,
    ResetSessionRequest,
    MoveSeatRequest,
    ChatRequest,
    OwnerSignupRequest,
    OwnerLoginRequest,
    StoreCreateRequest,
    StoreUpdateRequest,
    LockerAssignRequest,
)

from pydantic import BaseModel

class DoorControlRequest(BaseModel):
    store_id: str

from utils import mask_name, is_within_valid_period

from websocket_manager import manager

from fastapi import APIRouter

from services.notification import send_system_message_to_customer

router = APIRouter(prefix="/api/study-cafe", tags=["Admin"])

"""
routers/study_cafe.py
=====================
스터디 카페 핵심 비즈니스 라우터.

담당 영역:
  - 점주 계정 (회원가입 / 로그인)
  - 매장 CRUD
  - 좌석 현황 조회
  - 이용 세션 라이프사이클 (예약 → 입장 → 외출 ↔ 복귀 → 퇴실)
  - 관리자 기능 (세션 초기화, 아카이빙, AI 채팅)
  - 실시간 WebSocket 채팅 (고객 ↔ 관리자)

결제(NicePay) 엔드포인트는 routers/payment.py 에서 관리합니다.
"""

def get_remaining_minutes(exit_time_str: str) -> int:
    """날짜 문자열(timezone aware/naive)과 현재 시각 간의 잔여 분 단위를 계산합니다."""
    try:
        clean_str = exit_time_str.replace("Z", "+00:00") if exit_time_str.endswith("Z") else exit_time_str
        exit_dt = datetime.fromisoformat(clean_str)
        if exit_dt.tzinfo is not None:
            diff = exit_dt - datetime.now(timezone.utc)
        else:
            diff = exit_dt - datetime.now()
        return max(0, int(diff.total_seconds() / 60))
    except Exception as e:
        print(f"[get_remaining_minutes] Error parsing exit_time_str '{exit_time_str}': {e}")
        return 0

@router.websocket("/ws/customer/{session_id}")
async def websocket_customer(websocket: WebSocket, session_id: str):
    """고객 실시간 채팅 소켓. 수신 메시지를 DB에 저장 후 관리자 전체에게 브로드캐스트."""
    await manager.connect_customer(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            text = data.get("text", "").strip()
            if not text:
                continue

            sess = study_cafe_db.get_session(session_id)
            if sess:
                sess_meta = sess.get("metadata") or {}
                messages = sess_meta.get("messages", [])
                msg = {
                    "sender": "customer",
                    "text": text,
                    "timestamp": datetime.now().isoformat(),
                }
                messages.append(msg)
                sess_meta["messages"] = messages
                study_cafe_db.update_session_metadata(session_id, sess_meta)

                await manager.broadcast_to_admins({
                    "type": "customer_message",
                    "session_id": session_id,
                    "user_name": sess_meta.get("user_name"),
                    "table_id": sess.get("table_id"),
                    "message": msg,
                })
    except WebSocketDisconnect:
        manager.disconnect_customer(session_id)
    except Exception as e:
        print(f"[WS Customer Exception] {e}")
        manager.disconnect_customer(session_id)

@router.websocket("/ws/admin")
async def websocket_admin(websocket: WebSocket):
    """관리자 실시간 채팅 소켓. 수신 메시지를 DB 저장 후 해당 고객에게 전송."""
    await manager.connect_admin(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            session_id = data.get("session_id")
            text = data.get("text", "").strip()
            if not session_id or not text:
                continue

            sess = study_cafe_db.get_session(session_id)
            if sess:
                sess_meta = sess.get("metadata") or {}
                messages = sess_meta.get("messages", [])
                msg = {
                    "sender": "admin",
                    "text": text,
                    "timestamp": datetime.now().isoformat(),
                }
                messages.append(msg)
                sess_meta["messages"] = messages
                study_cafe_db.update_session_metadata(session_id, sess_meta)

                await manager.send_to_customer(session_id, {
                    "type": "admin_message",
                    "message": msg,
                })
                await manager.broadcast_to_admins({
                    "type": "admin_reply",
                    "session_id": session_id,
                    "message": msg,
                })
    except WebSocketDisconnect:
        manager.disconnect_admin(websocket)
    except Exception as e:
        print(f"[WS Admin Exception] {e}")
        manager.disconnect_admin(websocket)

@router.post("/admin/chat")
def admin_chat(req: ChatRequest):
    """knowledge_bundles 데이터를 RAG 컨텍스트로 Gemini AI 경영 상담 제공."""
    history = study_cafe_db.get_knowledge_history(req.store_id)
    ai_response = chat_with_admin(req.query, history, req.store_id)
    return {"response": ai_response}

@router.post("/admin/trigger-archive")
def trigger_archive(store_id: str = "ST001"):
    """(테스트용) 만료 세션 아카이빙 및 정리 작업 즉시 실행."""
    return run_archiving_job(store_id)

@router.post("/admin/reset-session")
def admin_reset_session(req: ResetSessionRequest, background_tasks: BackgroundTasks):
    """관리자 강제 세션 초기화. 비정상 또는 더미 세션을 강제 종료."""
    sess = study_cafe_db.get_session(req.session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="해당 세션을 찾을 수 없습니다.")

    if not study_cafe_db.update_session_status(req.session_id, "closed", datetime.now().isoformat()):
        raise HTTPException(status_code=500, detail="세션 초기화 처리에 실패했습니다.")

    background_tasks.add_task(
        mqtt_publish,
        topic=f"mqcafe/{req.store_id}/update",
        payload={
            "type": "ADMIN_RESET",
            "session_id": req.session_id,
            "status": "closed",
        },
    )
    return {"status": "success", "message": f"{sess.get('table_id')} 좌석의 세션이 초기화되었습니다."}

@router.delete("/admin/chat/{session_id}")
def admin_clear_chat(session_id: str, background_tasks: BackgroundTasks):
    """특정 세션의 채팅 메시지 내역을 초기화합니다."""
    sess = study_cafe_db.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="해당 세션을 찾을 수 없습니다.")
    
    sess_meta = sess.get("metadata", {})
    sess_meta["messages"] = []
    
    if not study_cafe_db.update_session_metadata(session_id, sess_meta):
        raise HTTPException(status_code=500, detail="메시지 초기화에 실패했습니다.")
    
    background_tasks.add_task(
        mqtt_publish,
        topic=f"mqcafe/{sess.get('store_id', 'ST001')}/update",
        payload={
            "type": "UPDATE",
        },
    )
    return {"status": "success", "message": "채팅 내역이 초기화되었습니다."}

@router.post("/door/open")
def remote_door_open(req: DoorControlRequest, background_tasks: BackgroundTasks):
    """
    점주 대시보드에서 '원격 출입문 개방' 버튼 클릭 시 호출
    """
    topic = f"mqcafe/{req.store_id}/door/control"
    payload = {"command": "OPEN", "session_id": "remote_admin"}
    print(f"!!! DEBUG ADMIN DOOR OPEN !!! -> topic: {topic}, payload: {payload}")
    
    background_tasks.add_task(mqtt_publish, topic=topic, payload=payload)
        
    return {"status": "success", "message": "출입문 개방 신호를 전송했습니다."}

@router.get("/admin/revenue")
def get_admin_revenue(store_id: str, month: str):
    """
    특정 매장의 특정 월(YYYY-MM) 매출액을 조회합니다.
    """
    revenue = study_cafe_db.get_monthly_revenue(store_id, month)
    return {
        "store_id": store_id,
        "month": month,
        "revenue": revenue
    }
