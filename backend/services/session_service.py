import random
import re
import uuid
import hashlib
from datetime import datetime

class SessionServiceError(Exception):
    pass

def validate_and_prepare_session(req):
    """
    고객 예약 세션 생성 시 유효성을 검사하고 메타데이터를 준비합니다.
    """
    # 1. 주민번호 형식 정규식 검사 (YYMMDD-G)
    if not re.match(r"^\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])-[1-4]$", req.jumin):
        raise SessionServiceError("올바른 주민등록번호 형식(YYMMDD-G)이 아닙니다.")
        
    # 2. 연 나이 계산 및 학년 필터 (2026년 기준 2010년생을 포함한 그 이전 연도 출생자만 가능)
    front, back = req.jumin.split("-")
    year_short = int(front[:2])
    gender_digit = int(back)
    
    if gender_digit in (1, 2):
        birth_year = 1900 + year_short
    else:
        birth_year = 2000 + year_short
        
    current_year = datetime.now().year
    age = current_year - birth_year
    
    if age < 16:
        raise SessionServiceError(
            f"본 매장은 안전 및 정숙을 위해 고등학교 1학년(연 나이 16세) 이상만 이용 가능합니다. (현재 연 나이: {age}세)"
        )

    session_id = f"SESS-MQ-{uuid.uuid4().hex[:12].upper()}"
    access_pin = f"{random.randint(1000, 9999)}"

    password_hash = hashlib.sha256(req.password.encode()).hexdigest()
    metadata = {
        "user_name": req.user_name,
        "phone_number": req.phone_number,
        "password_hash": password_hash,
        "jumin": req.jumin,
        "ticket_type": req.ticket_type,
        "duration_minutes": req.duration_minutes,
        "amount": req.amount,
        "use_locker": req.use_locker,
        "contract_date": datetime.now().strftime("%Y-%m-%d"),
        "remaining_time_minutes": req.duration_minutes,
        "seat_type": (
            "open" if req.table_id.startswith("seat-12")
            else "focus" if req.table_id.startswith("seat-18")
            else "study_room"
        ),
        "access_pin": access_pin,
        "locker_number": None,
        "locker_end_time": None,
        "outing_limit_minutes": 180,
        "outing_start_time": None,
        "total_outing_minutes": 0,
        "payment_info": {
            "payment_key": req.nicepay_tid or f"sim_{uuid.uuid4().hex[:8]}",
            "order_id": req.nicepay_order_id or "",
            "method": req.pay_method or "card",
            "pg": "nicepay" if req.nicepay_tid else "simulation",
            "paid_at": datetime.now().isoformat(),
        },
        "extension_count": 0,
        "scheduled_entry_time": req.scheduled_entry_time,
        "scheduled_exit_time": req.scheduled_exit_time,
        "messages": [],
    }
    
    return session_id, access_pin, metadata
