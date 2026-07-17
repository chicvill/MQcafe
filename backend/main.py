import os
import asyncio
import httpx
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from db.connection import init_db
from db.study_cafe_db import save_keep_alive
from routers.store import router as store_router
from routers.seat_locker import router as seat_locker_router
from routers.session import router as session_router
from routers.admin import router as admin_router
from routers.payment import router as payment_router
from routers.nfc_access import router as nfc_router
from background_jobs import check_expired_sessions_loop

async def keep_alive_scheduler():
    # 5초 대기 후 시작하여 DB 초기화 완료 유도
    await asyncio.sleep(5)
    print("[Keep-Alive] Background scheduler task started.")
    
    # Render에 매핑된 도메인 주소로 self-ping 설정
    render_url = "https://stcafe.chicvill.store"
    
    while True:
        try:
            # 1. Supabase에 1 저장
            success = save_keep_alive(1)
            if success:
                print("[Keep-Alive] Saved '1' to Supabase successfully.")
            else:
                print("[Keep-Alive] Failed to save '1' to Supabase.")
        except Exception as e:
            print(f"[Keep-Alive] Database error: {e}")
            
        # 로컬 환경으로 마이그레이션 중이므로 Render 서버를 깨울 필요가 없습니다.
        # try:
        #     # 2. Render가 잠들지 않도록 HTTP self-ping 날림
        #     async with httpx.AsyncClient() as client:
        #         resp = await client.get(render_url, timeout=10.0)
        #         print(f"[Keep-Alive] Sent self-ping to {render_url}. Status: {resp.status_code}")
        # except Exception as e:
        #     print(f"[Keep-Alive] Self-ping failed: {e}")
            
        # 10분(600초) 간격으로 대기
        await asyncio.sleep(600)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 앱 시작 시 DB 스키마 및 테이블 생성
    print("[INFO] Initializing Study Cafe database...")
    try:
        init_db()
    except Exception as e:
        print(f"[WARN] Database initialization failed at startup: {e}")
        print("Please configure DATABASE_URL in .env before running the server.")
        
    # 백그라운드 keep_alive task 시작
    keep_alive_task = asyncio.create_task(keep_alive_scheduler())
    
    # 시간 초과 세션 알림 스케줄러 시작
    expired_sessions_task = asyncio.create_task(check_expired_sessions_loop())
    
    # MQTT 수신(Subscriber) 백그라운드 스레드 시작
    from mqtt_helper import start_mqtt_listener
    start_mqtt_listener()
    
    yield
    
    # Clean up
    keep_alive_task.cancel()
    expired_sessions_task.cancel()
    try:
        await keep_alive_task
    except asyncio.CancelledError:
        print("[Keep-Alive] Background task cancelled.")

app = FastAPI(
    title="MQcafe : 운정 산내점 API",
    description="무인 QR 결제 및 AI 분석을 지원하는 스터디 카페 SaaS 백엔드",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(store_router)
app.include_router(seat_locker_router)
app.include_router(session_router)
app.include_router(admin_router)
app.include_router(payment_router)
app.include_router(nfc_router)

# --- 프론트엔드 static 파일 서빙 ---
# Docker 또는 로컬 배포 환경에서 빌드된 frontend/dist 폴더를 탐색
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # backend/
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend", "dist")

if os.path.exists(FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

@app.get("/")
@app.head("/")
def read_root():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Welcome to MQcafe : 운정 산내점 API (Frontend dist not found, please build React app)"}

# 프론트엔드 라우팅을 위한 Catch-All 엔드포인트
@app.get("/{full_path:path}")
def catch_all(full_path: str):
    # API 요청이나 assets 폴더 안의 내용인 경우
    if full_path.startswith("api/") or full_path.startswith("assets/"):
        return {"detail": "Not Found"}
    
    # 요청한 파일이 FRONTEND_DIR에 존재하는지 확인 (예: device_setup_guide.html, favicon.svg 등)
    requested_file_path = os.path.join(FRONTEND_DIR, full_path)
    if os.path.isfile(requested_file_path):
        return FileResponse(requested_file_path)
    
    # 파일이 존재하지 않으면 SPA 처리를 위해 index.html 반환
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Welcome to MQcafe (Frontend dist not found)"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)

