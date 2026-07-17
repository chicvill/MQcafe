"""
routers/payment.py
==================
NicePay PG 연동 전용 라우터.

엔드포인트:
  POST /api/study-cafe/payment/nicepay-approve   — 결제창 인증 후 서버 승인
  POST /api/study-cafe/payment/nicepay-webhook   — NicePay → 백엔드 Webhook
  POST /api/study-cafe/payment/nicepay-cancel    — 결제 취소 (환불)
  GET  /api/study-cafe/config                    — 클라이언트용 설정 조회
"""
import os
import uuid
import base64

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
import httpx

from mqtt_helper import mqtt_publish
from schemas import NicePayReturnRequest

# ── 환경변수 ───────────────────────────────────────────────────────────────────

NICEPAY_CLIENT_ID  = os.getenv("NICEPAY_CLIENT_ID", "")
NICEPAY_SECRET_KEY = os.getenv("NICEPAY_SECRET_KEY", "")
NICEPAY_API_URL    = os.getenv("NICEPAY_API_URL", "https://api.nicepay.co.kr/v1")

# ── 라우터 ─────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api/study-cafe", tags=["Payment"])


# ── 내부 헬퍼 ──────────────────────────────────────────────────────────────────

def _nicepay_basic_auth() -> str:
    """NicePay Basic Auth 헤더 값 생성."""
    credentials = f"{NICEPAY_CLIENT_ID}:{NICEPAY_SECRET_KEY}"
    return "Basic " + base64.b64encode(credentials.encode()).decode()


# ── 엔드포인트 ─────────────────────────────────────────────────────────────────

@router.post("/payment/nicepay-approve")
async def nicepay_approve(body: NicePayReturnRequest):
    """
    NicePay 결제창 인증 완료 후 서버 승인 요청.

    프론트엔드 returnUrl 콜백 또는 직접 호출로 사용.
    성공 시 { status, tid, approveNo, amount } 반환.
    """
    if body.authResultCode != "0000":
        raise HTTPException(
            status_code=400,
            detail=f"NicePay 인증 실패: {body.authResultMsg}",
        )

    # 개발/테스트 환경 — 시뮬레이션 응답
    if not NICEPAY_CLIENT_ID or not NICEPAY_SECRET_KEY:
        return {
            "status": "success",
            "tid": body.tid or f"sim_{uuid.uuid4().hex[:12]}",
            "orderId": body.orderId,
            "amount": body.amount,
            "approveNo": "SIM00001",
            "simulation": True,
        }

    # 실제 NicePay 서버 승인 API 호출
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{NICEPAY_API_URL}/payments/{body.tid}",
                headers={
                    "Authorization": _nicepay_basic_auth(),
                    "Content-Type": "application/json",
                },
                json={"amount": body.amount, "orderId": body.orderId},
            )
        data = resp.json()
        if data.get("resultCode") != "0000":
            raise HTTPException(
                status_code=402,
                detail=f"NicePay 승인 실패: {data.get('resultMsg')}",
            )
        return {
            "status": "success",
            "tid": data.get("tid"),
            "orderId": data.get("orderId"),
            "amount": data.get("amount"),
            "approveNo": data.get("approveNo"),
        }
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"NicePay 통신 오류: {str(e)}")


@router.post("/payment/nicepay-webhook")
async def nicepay_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    NicePay 서버 → STcafe 백엔드 Webhook.

    결제 완료/취소 이벤트 수신 후 MQTT로 단말기에 결제 완료 전파.
    NicePay는 HTTP 200 + 'OK' 텍스트를 Webhook 수신 확인으로 요구합니다.
    """
    try:
        body = await request.json()
    except Exception:
        return "OK"  # 파싱 실패해도 200 반환 (NicePay 재시도 방지)

    status   = body.get("status", "")
    tid      = body.get("tid", "")
    order_id = body.get("orderId", "")
    amount   = body.get("amount", 0)
    method   = body.get("method", "card")

    if status == "paid":
        # orderId 형식: {storeId}_{requestId} 로 약속
        store_id = order_id.split("_")[0] if "_" in order_id else "ST001"
        background_tasks.add_task(
            mqtt_publish,
            topic=f"terminal/{store_id}/pay/complete",
            payload={
                "action": "pay_complete",
                "tid": tid,
                "orderId": order_id,
                "amount": amount,
                "method": method,
                "message": "결제 완료 — 영수증을 출력해 주세요.",
            },
        )
        print(f"✅ [NicePay Webhook] paid | tid={tid} | orderId={order_id} | amount={amount}")
    elif status in ("cancelled", "failed"):
        print(f"❌ [NicePay Webhook] {status} | tid={tid} | orderId={order_id}")

    return "OK"


@router.post("/payment/nicepay-cancel")
async def nicepay_cancel(tid: str, amount: int, reason: str = "고객 요청 취소"):
    """
    NicePay 결제 취소 (환불).
    관리자 또는 점주가 호출합니다.
    """
    if not NICEPAY_CLIENT_ID or not NICEPAY_SECRET_KEY:
        return {"status": "success", "simulation": True, "message": "시뮬레이션 취소 완료"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{NICEPAY_API_URL}/payments/{tid}/cancel",
                headers={
                    "Authorization": _nicepay_basic_auth(),
                    "Content-Type": "application/json",
                },
                json={"amount": amount, "reason": reason},
            )
        data = resp.json()
        if data.get("resultCode") != "0000":
            raise HTTPException(
                status_code=400,
                detail=f"취소 실패: {data.get('resultMsg')}",
            )
        return {"status": "success", "cancelledTid": data.get("cancelledTid")}
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"NicePay 통신 오류: {str(e)}")


@router.get("/config")
def get_config():
    """클라이언트 결제창 호출용 환경변수(NICEPAY_CLIENT_ID) 조회."""
    return {"nicepay_client_id": NICEPAY_CLIENT_ID}

