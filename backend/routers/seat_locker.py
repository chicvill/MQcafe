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

from utils import mask_name, is_within_valid_period

from websocket_manager import manager

from fastapi import APIRouter

from services.notification import send_system_message_to_customer

router = APIRouter(prefix="/api/study-cafe", tags=["Seat & Locker"])

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

@router.get("/seats")
def get_seats(background_tasks: BackgroundTasks, store_id: str = "ST001"):
    """
    전체 좌석 현황 조회.
    각 좌석의 점유 여부, 남은 이용 시간, 이용자 정보(마스킹)를 실시간으로 반환.
    """
    store = study_cafe_db.get_store_by_id(store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    meta = store.get("metadata") or {}
    seat_config = meta.get("seat_config", {"open": 12, "focus": 6, "study_room": 2})

    # 좌석 목록 생성 (타입 순서: open → focus → study_room)
    total_seats = []
    idx = 1
    for stype in ["open", "focus", "study_room"]:
        for _ in range(seat_config.get(stype, 0)):
            total_seats.append({"id": f"seat-{idx}", "name": f"{idx}번 좌석", "type": stype})
            idx += 1

    # 활성 세션 맵 (table_id → session)
    active_sessions = study_cafe_db.get_all_active_sessions(store_id)
    session_map = {s["table_id"]: s for s in active_sessions}

    seat_status_list = []
    for seat in total_seats:
        seat_id = seat["id"]
        status_info: Dict[str, Any] = {
            "id": seat_id,
            "name": seat["name"],
            "type": seat["type"],
            "is_occupied": False,
            "status": "empty",   # empty | active | outing | reserved
            "session_id": None,
            "user_name": None,
            "checkin_time": None,
            "remaining_time_minutes": 0,
            "ticket_type": None,
        }

        if seat_id in session_map:
            sess = session_map[seat_id]
            sess_meta = sess.get("metadata") or {}

            # 남은 시간 실시간 계산
            exit_time_str = sess_meta.get("scheduled_exit_time")
            if exit_time_str:
                remaining = get_remaining_minutes(exit_time_str)
            else:
                checkin_dt = datetime.fromisoformat(sess["checkin_time"])
                elapsed_minutes = (datetime.now() - checkin_dt).total_seconds() / 60
                remaining = max(0, int(sess_meta.get("duration_minutes", 0) - elapsed_minutes))

            # 5분 전 및 1분 전 알림 메시지 발송 로직
            if 1 < remaining <= 5 and not sess_meta.get("sent_5min_alert"):
                msg_text = "이용 시간 종료 5분 전입니다. 이용 시간 연장을 원하시면 아래 '이용 연장 결제하기' 버튼을 눌러 연장 결제를 진행해 주세요."
                sess_meta["sent_5min_alert"] = True
                study_cafe_db.update_session_metadata(sess["session_id"], {"sent_5min_alert": True})
                background_tasks.add_task(send_system_message_to_customer, sess["session_id"], msg_text, store_id)
            elif 0 < remaining <= 1 and not sess_meta.get("sent_1min_alert"):
                msg_text = "이용 시간 종료 1분 전입니다. 1분 후 자동으로 퇴실 처리(문 개방 및 세션 종료)됩니다."
                sess_meta["sent_1min_alert"] = True
                study_cafe_db.update_session_metadata(sess["session_id"], {"sent_1min_alert": True})
                background_tasks.add_task(send_system_message_to_customer, sess["session_id"], msg_text, store_id)

            if remaining <= 0:
                # 시간 만료 시 자동 퇴실(closed) 처리 및 MQTT 발행
                study_cafe_db.update_session_status(sess["session_id"], "closed", datetime.now().isoformat())
                background_tasks.add_task(
                    mqtt_publish,
                    topic=f"mqcafe/{store_id}/update",
                    payload={
                        "type": "CHECKOUT",
                        "table_id": seat_id,
                        "session_id": sess["session_id"],
                        "status": "closed",
                    },
                )
                seat_status_list.append(status_info)
                continue

            status_info.update({
                "is_occupied": True,
                "status": sess["status"],
                "session_id": sess["session_id"],
                "user_name": mask_name(sess_meta.get("user_name")),
                "checkin_time": sess["checkin_time"],
                "remaining_time_minutes": remaining,
                "ticket_type": sess_meta.get("ticket_type"),
            })
            status_info["metadata"] = sess_meta

        seat_status_list.append(status_info)

    return {"seats": seat_status_list}

@router.get("/lockers")
def get_lockers(store_id: str = "ST001"):
    """전체 사물함 현황 조회."""
    store = study_cafe_db.get_store_by_id(store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    meta = store.get("metadata") or {}
    seat_config = meta.get("seat_config", {"open": 12, "focus": 6, "study_room": 2})

    # Total lockers = sum of all seat config
    total_lockers_count = sum(seat_config.values())
    
    lockers = []
    for idx in range(1, total_lockers_count + 1):
        lockers.append({
            "id": f"locker-{idx}",
            "name": f"{idx}번 사물함",
            "is_occupied": False,
            "session_id": None,
            "user_name": None
        })

    active_sessions = study_cafe_db.get_all_active_sessions(store_id)
    # Check which lockers are occupied
    occupied_lockers = {}
    for sess in active_sessions:
        sess_meta = sess.get("metadata") or {}
        locker_id = sess_meta.get("locker_id")
        if locker_id:
            occupied_lockers[locker_id] = {
                "session_id": sess["session_id"],
                "user_name": mask_name(sess_meta.get("user_name") or "")
            }

    for locker in lockers:
        if locker["id"] in occupied_lockers:
            locker["is_occupied"] = True
            locker["session_id"] = occupied_lockers[locker["id"]]["session_id"]
            locker["user_name"] = occupied_lockers[locker["id"]]["user_name"]

    return {"lockers": lockers}

@router.post("/lockers/assign")
def assign_locker(req: LockerAssignRequest, background_tasks: BackgroundTasks):
    """장기 이용자의 사물함 배정/이동 처리."""
    sess = study_cafe_db.get_session(req.session_id)
    if not sess or sess.get("status") == "closed":
        raise HTTPException(status_code=404, detail="Active session not found.")
        
    sess_meta = sess.get("metadata") or {}
    ticket_type = sess_meta.get("ticket_type")
    
    if ticket_type not in ["day", "period"]:
        raise HTTPException(status_code=403, detail="장기 이용권(1일권 이상) 고객만 사물함을 이용할 수 있습니다.")
        
    # Check if target locker is occupied
    active_sessions = study_cafe_db.get_all_active_sessions(req.store_id)
    for active_sess in active_sessions:
        if active_sess["session_id"] == req.session_id:
            continue # ignore self
        active_sess_meta = active_sess.get("metadata") or {}
        if active_sess_meta.get("locker_id") == req.new_locker_id:
            raise HTTPException(status_code=400, detail="이미 사용 중인 사물함입니다.")
            
    # Remove old locker if any, assign new
    old_locker_id = sess_meta.get("locker_id")
    sess_meta["locker_id"] = req.new_locker_id
    study_cafe_db.update_session_metadata(req.session_id, sess_meta)
    
    timestamp_str = datetime.now().strftime('%Y%m%d %H:%M')
    msg_action = "사물함 배정 완료" if not old_locker_id else "사물함 이동 완료"
    msg_detail = f"({req.new_locker_id})" if not old_locker_id else f"({old_locker_id} ➔ {req.new_locker_id})"
    
    background_tasks.add_task(
        send_system_message_to_customer,
        req.session_id,
        f"{msg_action} {msg_detail} [{timestamp_str}]",
        req.store_id
    )
    
    return {"status": "success", "message": f"{req.new_locker_id.replace('locker-', '')}번 사물함으로 배정되었습니다."}

@router.post("/seats/move")
@router.post("/move-seat") # Alias for backwards compatibility with older frontend clients
def move_seat(req: MoveSeatRequest, background_tasks: BackgroundTasks):
    """이용 중인 세션의 좌석을 새로운 빈 좌석으로 변경"""
    sess = study_cafe_db.get_session(req.session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Active session not found.")

    if sess.get("status") == "closed":
        raise HTTPException(status_code=400, detail="이미 종료된 세션은 좌석을 이동할 수 없습니다.")

    # 1. 이동할 좌석이 이미 사용 중인지 확인
    active_target_sess = study_cafe_db.get_active_session_by_table(sess["store_id"], req.new_table_id)
    if active_target_sess:
        raise HTTPException(status_code=400, detail="이동하려는 좌석이 이미 사용 중입니다.")

    old_table_id = sess["table_id"]

    # 2. DB 업데이트
    if not study_cafe_db.change_session_table(req.session_id, req.new_table_id):
        raise HTTPException(status_code=500, detail="좌석 이동 처리에 실패했습니다.")

    # 3. MQTT 전파 (이전 좌석은 CHECKOUT으로 비우고, 새 좌석은 기존 status로 CHECKIN)
    # 이전 좌석 비우기 전파
    background_tasks.add_task(
        mqtt_publish,
        topic=f"mqcafe/{sess['store_id']}/update",
        payload={
            "type": "CHECKOUT",
            "table_id": old_table_id,
            "session_id": req.session_id,
            "status": "closed",
        },
    )

    # 새 좌석 채우기 전파
    sess_meta = sess.get("metadata") or {}
    background_tasks.add_task(
        mqtt_publish,
        topic=f"mqcafe/{sess['store_id']}/update",
        payload={
            "type": "CHECKIN",
            "table_id": req.new_table_id,
            "session_id": req.session_id,
            "status": sess["status"],
            "user_name": mask_name(sess_meta.get("user_name") or ""),
        },
    )

    return {
        "status": "success",
        "message": f"좌석이 {old_table_id.replace('seat-', '')}번에서 {req.new_table_id.replace('seat-', '')}번으로 성공적으로 변경되었습니다."
    }
