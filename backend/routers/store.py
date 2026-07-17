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
    OwnerUpdateRequest,
    StoreCreateRequest,
    StoreUpdateRequest,
    LockerAssignRequest,
)

from utils import mask_name, is_within_valid_period

from websocket_manager import manager

from fastapi import APIRouter

from services.notification import send_system_message_to_customer

router = APIRouter(prefix="/api/study-cafe", tags=["Store"])

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

@router.post("/owner/signup")
def owner_signup(req: OwnerSignupRequest):
    """점주 회원가입. 전화번호 중복 검사 후 SHA-256 해시 저장."""
    password_hash = hashlib.sha256(req.password.encode()).hexdigest()

    if study_cafe_db.get_owner_by_phone(req.phone):
        raise HTTPException(status_code=400, detail="이미 가입된 전화번호입니다.")

    owner_id = f"owner-{uuid.uuid4().hex[:6]}"
    metadata = {}
    if req.name:
        metadata["name"] = req.name
    if req.email:
        metadata["email"] = req.email

    if not study_cafe_db.create_owner(owner_id, req.phone, password_hash, metadata):
        raise HTTPException(status_code=500, detail="Signup failed")

    return {"status": "success", "owner_id": owner_id}

@router.post("/owner/login")
def owner_login(req: OwnerLoginRequest):
    """점주 로그인. 비밀번호 해시 검증 후 owner_id 반환."""
    owner = study_cafe_db.get_owner_by_phone(req.phone)
    if not owner:
        raise HTTPException(status_code=401, detail="Invalid phone or password")

    password_hash = hashlib.sha256(req.password.encode()).hexdigest()
    if owner["password_hash"] != password_hash:
        raise HTTPException(status_code=401, detail="Invalid phone or password")

    return {"status": "success", "owner_id": owner["id"]}

@router.get("/owner/{owner_id}")
def get_owner(owner_id: str):
    owner = study_cafe_db.get_owner_by_id(owner_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    
    # Exclude password_hash
    return {
        "status": "success",
        "owner": {
            "id": owner["id"],
            "phone": owner["phone"],
            "metadata": owner.get("metadata", {})
        }
    }

@router.put("/owner/{owner_id}")
def update_owner(owner_id: str, req: OwnerUpdateRequest):
    owner = study_cafe_db.get_owner_by_id(owner_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    
    metadata = owner.get("metadata", {})
    if req.name is not None:
        metadata["name"] = req.name
    if req.email is not None:
        metadata["email"] = req.email
        
    if not study_cafe_db.update_owner_metadata(owner_id, metadata):
        raise HTTPException(status_code=500, detail="Failed to update owner")
        
    return {"status": "success"}

from pydantic import BaseModel
class OwnerPasswordUpdateRequest(BaseModel):
    old_password: str
    new_password: str

@router.put("/owner/{owner_id}/password")
def update_owner_password_api(owner_id: str, req: OwnerPasswordUpdateRequest):
    """점주 비밀번호 변경"""
    old_hash = hashlib.sha256(req.old_password.encode()).hexdigest()
    new_hash = hashlib.sha256(req.new_password.encode()).hexdigest()
    
    success = study_cafe_db.update_owner_password(owner_id, old_hash, new_hash)
    if not success:
        raise HTTPException(status_code=401, detail="기존 비밀번호가 일치하지 않거나 업데이트에 실패했습니다.")
    
    return {"status": "success", "message": "비밀번호가 성공적으로 변경되었습니다."}

@router.get("/stores")
def get_stores(owner_id: Optional[str] = None):
    """전체 매장 목록 조회. owner_id 파라미터 제공 시 해당 점주 매장만 반환."""
    if owner_id:
        stores = study_cafe_db.get_stores_by_owner(owner_id)
    else:
        stores = study_cafe_db.get_all_stores()
    return {"stores": stores}

@router.post("/stores")
def create_store(req: StoreCreateRequest):
    """새 매장 개설."""
    store_id = study_cafe_db.get_next_store_id()
    if not study_cafe_db.create_store(store_id, req.name, req.ceo_name, req.metadata, req.owner_id):
        raise HTTPException(status_code=500, detail="Failed to create store")
    return {"status": "success", "store_id": store_id}

@router.put("/stores/{store_id}")
def update_store(store_id: str, req: StoreUpdateRequest):
    """매장 정보(이름, 대표자명, 메타데이터) 수정."""
    if not study_cafe_db.update_store_metadata(store_id, req.name, req.ceo_name, req.metadata):
        raise HTTPException(status_code=500, detail="Failed to update store")
    return {"status": "success"}