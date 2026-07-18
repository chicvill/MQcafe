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
    ExtendSessionRequest,
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

router = APIRouter(prefix="/api/study-cafe", tags=["Session"])

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

@router.post("/session/check-in")
def check_in(req: CheckInRequest, background_tasks: BackgroundTasks):
    """결제 완료 후 신규 예약 세션 생성. 4자리 access_pin을 함께 발급."""
    from services.session_service import validate_and_prepare_session, SessionServiceError

    try:
        session_id, access_pin, metadata = validate_and_prepare_session(req)
    except SessionServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not study_cafe_db.save_session(
        session_id=session_id,
        store_id=req.store_id,
        table_id=req.table_id,
        metadata=metadata,
        status="reserved",
    ):
        raise HTTPException(status_code=500, detail="Failed to initialize session.")

    background_tasks.add_task(
        mqtt_publish,
        topic=f"mqcafe/{req.store_id}/update",
        payload={
            "type": "CHECKIN",
            "table_id": req.table_id,
            "session_id": session_id,
            "status": "reserved",
            "user_name": mask_name(req.user_name),
        },
    )

    return {
        "status": "success",
        "session_id": session_id,
        "access_pin": access_pin,
        "message": f"{req.table_id} 예약 등록 성공",
    }

@router.post("/session/entry")
def check_in_entry(req: EntryRequest, background_tasks: BackgroundTasks):
    """QR 스캔 시 실제 입장 처리. 이용 시작 5분 전 ~ 종료 5분 후만 허용."""
    sess = study_cafe_db.get_session(req.session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Active session not found.")

    sess_meta = sess.get("metadata") or {}
    if not is_within_valid_period(
        sess_meta.get("scheduled_entry_time"),
        sess_meta.get("scheduled_exit_time"),
    ):
        raise HTTPException(
            status_code=400,
            detail="출입 가능 시간이 아닙니다. 이용 시간 5분 전부터 종료 5분 후까지만 문을 열 수 있습니다.",
        )

    if not study_cafe_db.update_session_status(req.session_id, "active"):
        raise HTTPException(status_code=500, detail="Failed to update session status.")

    background_tasks.add_task(
        mqtt_publish,
        topic=f"mqcafe/{sess['store_id']}/update",
        payload={
            "type": "CHECKIN",
            "table_id": sess["table_id"],
            "session_id": req.session_id,
            "status": "active",
            "user_name": mask_name(sess_meta.get("user_name") or ""),
        },
    )
    
    timestamp_str = datetime.now().strftime('%Y%m%d %H:%M')
    background_tasks.add_task(
        send_system_message_to_customer,
        req.session_id,
        f"이용권 결제 및 이용 시작 (좌석: {sess['table_id']}) [{timestamp_str}]",
        sess["store_id"]
    )
    
    # 출입문 제어 신호 발송
    background_tasks.add_task(
        mqtt_publish,
        topic=f"mqcafe/{sess['store_id']}/door/control",
        payload={"command": "OPEN", "session_id": req.session_id}
    )

    return {"status": "success", "message": "출입문이 열렸습니다. 환영합니다!"}

@router.post("/session/extend")
def extend_session(req: ExtendSessionRequest, background_tasks: BackgroundTasks):
    """이용 시간 연장. 지정된 분(minutes)만큼 scheduled_exit_time을 늘립니다."""
    sess = study_cafe_db.get_session(req.session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Active session not found.")
        
    sess_meta = sess.get("metadata") or {}
    exit_time_str = sess_meta.get("scheduled_exit_time")
    if not exit_time_str:
        raise HTTPException(status_code=400, detail="Cannot extend session without a scheduled exit time.")
        
    exit_dt = datetime.fromisoformat(exit_time_str)
    
    # 시간 연장
    from datetime import timedelta
    new_exit_dt = exit_dt + timedelta(minutes=req.extend_minutes)
    sess_meta["scheduled_exit_time"] = new_exit_dt.isoformat()
    
    # 초과 알림 초기화
    if "last_reminder_time" in sess_meta:
        del sess_meta["last_reminder_time"]
        
    study_cafe_db.update_session_metadata(req.session_id, sess_meta)
    
    # MQTT 업데이트 발송
    background_tasks.add_task(
        mqtt_publish,
        topic=f"mqcafe/{sess['store_id']}/update",
        payload={
            "type": "UPDATE",
            "table_id": sess["table_id"],
            "session_id": req.session_id,
            "status": sess.get("status"),
        },
    )
    
    timestamp_str = datetime.now().strftime('%Y%m%d %H:%M')
    background_tasks.add_task(
        send_system_message_to_customer,
        req.session_id,
        f"이용 시간이 {req.extend_minutes}분 연장되었습니다. [{timestamp_str}]",
        sess["store_id"]
    )
    
    return {"status": "success", "message": "이용 시간이 연장되었습니다.", "new_exit_time": new_exit_dt.isoformat()}

@router.post("/session/restore")
def restore_session(req: RestoreRequest):
    """전화번호로 현재 활성 세션 상태 조회 및 복구."""
    if req.user_name:
        sess = study_cafe_db.find_active_session_by_user(req.user_name, req.phone_number)
    else:
        sess = study_cafe_db.find_active_session_by_phone(req.phone_number)
        
    if not sess:
        raise HTTPException(
            status_code=404,
            detail="매칭되는 활성 이용권 세션이 존재하지 않습니다.",
        )

    sess_meta = sess.get("metadata") or {}
    stored_hash = sess_meta.get("password_hash")
    if stored_hash:
        input_hash = hashlib.sha256(req.password.encode()).hexdigest()
        if stored_hash != input_hash:
            raise HTTPException(
                status_code=401,
                detail="비밀번호가 일치하지 않습니다.",
            )

    exit_time_str = sess_meta.get("scheduled_exit_time")
    remaining = 0
    if exit_time_str:
        remaining = get_remaining_minutes(exit_time_str)
    else:
        try:
            checkin_dt = datetime.fromisoformat(sess["checkin_time"])
            elapsed = (datetime.now() - checkin_dt).total_seconds() / 60
            remaining = max(0, int(sess_meta.get("duration_minutes", 0) - elapsed))
        except Exception:
            pass

    return {
        "status": "success",
        "session": {
            "session_id": sess["session_id"],
            "table_id": sess["table_id"],
            "status": sess["status"],
            "remaining_time_minutes": remaining,
            "checkin_time": sess["checkin_time"],
            "metadata": sess_meta,
        },
    }

@router.post("/session/outing")
def toggle_outing(req: OutingRequest, background_tasks: BackgroundTasks):
    """외출 / 복귀 토글. 외출 시 outing_start_time 기록, 복귀 시 누적 외출 시간 갱신."""
    sess = study_cafe_db.get_session(req.session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Active session not found.")

    sess_meta = sess.get("metadata") or {}
    if not is_within_valid_period(
        sess_meta.get("scheduled_entry_time"),
        sess_meta.get("scheduled_exit_time"),
    ):
        raise HTTPException(
            status_code=400,
            detail="출입문을 열 수 있는 시간이 아닙니다. 이용 시간 5분 전부터 종료 5분 후까지만 가능합니다.",
        )

    current_status = sess.get("status")
    new_status = "outing" if current_status == "active" else "active"

    if new_status == "outing":
        sess_meta["outing_start_time"] = datetime.now().isoformat()
    else:
        outing_start_str = sess_meta.get("outing_start_time")
        if outing_start_str:
            outing_start = datetime.fromisoformat(outing_start_str)
            elapsed_outing = int((datetime.now() - outing_start).total_seconds() / 60)
            sess_meta["total_outing_minutes"] = sess_meta.get("total_outing_minutes", 0) + elapsed_outing
        sess_meta["outing_start_time"] = None

    study_cafe_db.update_session_status(req.session_id, new_status)
    study_cafe_db.update_session_metadata(req.session_id, sess_meta)

    # 1. 외출/복귀 시 문 열림 신호 발송 (가장 먼저 실행하여 릴레이 동작 보장)
    background_tasks.add_task(
        mqtt_publish,
        topic=f"mqcafe/{sess['store_id']}/door/control",
        payload={"command": "OPEN", "session_id": req.session_id}
    )

    # 2. 상태 업데이트 알림 (UI 갱신용)
    background_tasks.add_task(
        mqtt_publish,
        topic=f"mqcafe/{sess['store_id']}/update",
        payload={
            "type": "OUTING_TOGGLE",
            "table_id": sess["table_id"],
            "session_id": req.session_id,
            "status": new_status,
            "user_name": mask_name(sess_meta.get("user_name") or ""),
        },
    )

    action_label = "외출" if new_status == "outing" else "복귀"
    timestamp_str = datetime.now().strftime('%Y%m%d %H:%M')
    background_tasks.add_task(
        send_system_message_to_customer,
        req.session_id,
        f"{action_label} [{timestamp_str}]",
        sess["store_id"]
    )
    
    return {"status": "success", "session_status": new_status, "message": f"{action_label} 및 출입문 개방 완료"}

@router.post("/session/check-out")
def check_out(req: CheckOutRequest, background_tasks: BackgroundTasks):
    """퇴실 처리. 세션 상태를 closed로 변경하고 퇴실 시각을 기록."""
    sess = study_cafe_db.get_session(req.session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Active session not found.")

    sess_meta = sess.get("metadata") or {}
    # 퇴실은 이용 중이거나 이미 초과한 경우 모두 언제든 가능해야 문이 열리고 세션이 종료됩니다.
    # 시작 예정 시각 5분 전 이후이기만 하면 언제든 퇴실이 가능하도록 제한을 완화합니다.
    entry_time_str = sess_meta.get("scheduled_entry_time")
    if entry_time_str:
        try:
            entry_dt = datetime.fromisoformat(entry_time_str)
            now = datetime.now()
            if entry_dt.tzinfo is not None:
                now = now.astimezone(entry_dt.tzinfo)
            if (now - entry_dt).total_seconds() / 60.0 < -5.0:
                raise HTTPException(
                    status_code=400,
                    detail="퇴실 가능 시간이 아닙니다. 이용 시작 5분 전부터만 퇴실이 가능합니다.",
                )
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e

    if not study_cafe_db.update_session_status(req.session_id, "closed", datetime.now().isoformat()):
        raise HTTPException(status_code=500, detail="Failed to close session.")

    background_tasks.add_task(
        mqtt_publish,
        topic=f"mqcafe/{sess['store_id']}/update",
        payload={
            "type": "CHECKOUT",
            "table_id": sess["table_id"],
            "session_id": req.session_id,
            "status": "closed",
        },
    )
    
    # 퇴실 시 문 열림 신호 발송
    background_tasks.add_task(
        mqtt_publish,
        topic=f"mqcafe/{sess['store_id']}/door/control",
        payload={"command": "OPEN", "session_id": req.session_id}
    )
    
    timestamp_str = datetime.now().strftime('%Y%m%d %H:%M')
    background_tasks.add_task(
        send_system_message_to_customer,
        req.session_id,
        f"퇴실 및 이용 종료 [{timestamp_str}]",
        sess["store_id"]
    )
    
    return {"status": "success", "message": "퇴실 및 출입문 개방 완료"}