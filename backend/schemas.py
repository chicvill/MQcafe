"""
schemas.py
==========
MQcafe 백엔드 전용 Pydantic 요청/응답 모델 모음.
모든 라우터에서 이 파일을 공통으로 import하여 사용합니다.
"""
from typing import Optional
from pydantic import BaseModel


# ── 체크인 / 세션 ──────────────────────────────────────────────────────────────

class CheckInRequest(BaseModel):
    store_id: str = "ST001"
    table_id: str                        # 좌석 번호 (예: "seat-1")
    user_name: str
    phone_number: str
    password: str                        # 비밀번호 (사칭 및 복구용)
    jumin: str                           # 주민번호 앞6자리-뒷1자리 (YYMMDD-G)
    ticket_type: str                     # "time" | "day" | "period"
    duration_minutes: int                # 분 단위 (예: 120, 240)
    amount: int
    use_locker: bool = False             # 사물함 추가 이용 여부
    scheduled_entry_time: str
    scheduled_exit_time: str
    # NicePay 결제 정보 (결제창 승인 후 전달)
    nicepay_tid: Optional[str] = None        # 거래 ID
    nicepay_order_id: Optional[str] = None  # 주문 번호 (orderId)
    pay_method: Optional[str] = "card"      # card | appcard | vbank | naverpay | kakaopay | samsungpay | tosspay


class RestoreRequest(BaseModel):
    user_name: Optional[str] = None
    phone_number: str
    password: str


class EntryRequest(BaseModel):
    session_id: str


class OutingRequest(BaseModel):
    session_id: str


class CheckOutRequest(BaseModel):
    session_id: str

class ExtendSessionRequest(BaseModel):
    session_id: str
    extend_minutes: int


class ResetSessionRequest(BaseModel):
    session_id: str
    store_id: str = "ST001"


class MoveSeatRequest(BaseModel):
    session_id: str
    new_table_id: str


class LockerAssignRequest(BaseModel):
    session_id: str
    new_locker_id: str
    store_id: str = "ST001"



# ── 점주 계정 ──────────────────────────────────────────────────────────────────

class OwnerSignupRequest(BaseModel):
    phone: str
    password: str
    name: Optional[str] = None
    email: Optional[str] = None

class OwnerLoginRequest(BaseModel):
    phone: str
    password: str

class OwnerUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None


# ── 매장 ──────────────────────────────────────────────────────────────────────

class StoreCreateRequest(BaseModel):
    name: str
    ceo_name: str
    metadata: dict
    owner_id: str


class StoreUpdateRequest(BaseModel):
    name: str
    ceo_name: str
    metadata: dict


# ── AI 채팅 ────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    store_id: str = "ST001"
    query: str


# ── NicePay 결제 ───────────────────────────────────────────────────────────────

class NicePayReturnRequest(BaseModel):
    """NicePay 결제창 returnUrl 수신 모델"""
    authResultCode: str      # "0000" = 인증 성공
    authResultMsg: str
    tid: str                 # 거래 ID
    clientId: str
    orderId: str             # 가맹점 주문 번호
    amount: int
    mallReserved: Optional[str] = None
    authToken: Optional[str] = None
    signature: Optional[str] = None


class NicePayWebhookRequest(BaseModel):
    """NicePay 서버 → MQcafe 백엔드 Webhook 수신 모델"""
    resultCode: str
    resultMsg: str
    tid: str
    cancelledTid: Optional[str] = None
    orderId: str
    status: str              # paid | cancelled | failed
    amount: int
    balanceAmt: Optional[int] = None
    goodsName: Optional[str] = None
    method: Optional[str] = None
    useEscrow: Optional[bool] = False
    currency: Optional[str] = "KRW"
    approveNo: Optional[str] = None
    buyerName: Optional[str] = None
    buyerTel: Optional[str] = None
    mallReserved: Optional[str] = None

# ── NFC 출입 통제 ──────────────────────────────────────────────────────────────

class NfcScanRequest(BaseModel):
    uid: str
    action: Optional[str] = "entry"

class NfcRegisterRequest(BaseModel):
    uid: str
    user_name: str
    phone_number: str
    password: str  # 본인 확인용

