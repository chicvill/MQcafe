# MQcafe - 독립형 무인 스터디카페 관리 시스템

**MQcafe**는 N100 미니 PC를 기반으로 로컬망에서 작동하도록 구축된 **오프라인 우선(Offline-First) 무인 스터디카페 관리 시스템**입니다. 인터넷 장애 시에도 매장 내 서비스가 유지되도록 설계되었으며, ESP32 기반의 NFC 출입 통제, 실시간 좌석 예약, 오프라인 결제 단말기 연동 등을 지원합니다.

## 🌟 주요 특징 (Key Features)

* **로컬망 기반 오프라인 최적화 (Offline-First)**
  * 클라우드 의존성을 최소화하고 매장 자체 로컬 서버(N100 미니 PC)를 통해 운영됩니다. 외부 인터넷 장애 시에도 도어락 제어 및 내부 통신망이 유지됩니다.
* **실시간 IoT 제어 (MQTT & WebSocket)**
  * MQTT 프로토콜을 활용하여 ESP32 도어락, 오프라인 결제 단말기 등과 초저지연으로 통신합니다.
  * 고객과 점주 간의 실시간 채팅 및 알림을 위해 WebSocket을 활용합니다.
* **통합 UI / UX (React + Lazy Loading)**
  * 고객용 키오스크, 점주용 대시보드 모드를 하나의 Vite/React 애플리케이션으로 통합 제공하며, `React.lazy`를 통한 코드 스플릿팅으로 성능 최적화가 적용되었습니다.
* **유연한 데이터베이스 구조 (PostgreSQL/SQLite + JSONB)**
  * 가벼운 로컬 SQLite와 대형 매장을 위한 PostgreSQL(Docker 기반)을 모두 지원합니다. 
  * JSONB를 활용하여 채팅 이력, 결제 정보 등의 비정형 메타데이터를 유연하게 관리합니다.
* **한국형 무인 스터디카페 맞춤 비즈니스 로직**
  * 결제 후 5분 내 미입장 처리, 외출 중 시간 자동 차감, 연령 제한(만 16세 미만), 이용 시간 자동 만료 및 퇴실 스케줄링(Cron) 등 세밀한 규칙을 제공합니다.

---

## 🏗️ 시스템 아키텍처 (Architecture)

1. **하드웨어/인프라**: N100 미니 PC 로컬 서버 + ESP32 기반 NFC 리더 및 도어락 컨트롤러
2. **백엔드**: FastAPI (REST API), Uvicorn
3. **프론트엔드**: Vite + React + TypeScript + SPA 구조
4. **실시간 통신망**: Mosquitto (MQTT 브로커), WebSocket
5. **데이터베이스**: PostgreSQL (Docker-Compose 구성) 또는 SQLite
6. **배포 환경**: Docker & Docker Compose를 통한 컨테이너 배포

---

## 📂 주요 디렉토리 구조 (Directory Structure)

```text
MQcafe/
├── backend/                       # 🐍 Python / FastAPI 백엔드
│   ├── db/                        # 데이터베이스 연결 및 CRUD 로직 (PostgreSQL/SQLite)
│   ├── routers/                   # API 라우터 모듈 분리 (세션, 통신 등)
│   ├── schemas.py                 # Pydantic 데이터 검증 모델
│   ├── main.py                    # FastAPI 애플리케이션 진입점
│   └── (기타 유지보수 및 DB 스크립트)
│
├── frontend/                      # ⚛️ Vite / React / TypeScript 프론트엔드
│   ├── src/
│   │   ├── components/            # UI 컴포넌트 모음
│   │   ├── App.tsx                # 통합 뷰(고객/관리자) 라우팅
│   │   └── main.tsx               # 애플리케이션 엔트리 포인트
│   ├── index.html                 # 메인 HTML
│   └── vite.config.ts             # Vite 빌드 설정
│
├── Esp32NfcDoor/                  # 🔌 ESP32 도어락 및 NFC 제어 소스코드 및 관련 문서
├── docker-compose.yml             # 통합 컨테이너 배포 설정 (DB + Web)
├── Dockerfile                     # 백엔드/프론트엔드 통합 빌드용 Dockerfile
└── system_checklist.md            # 시스템 구조 체크리스트 및 아키텍처 한계/평가서
```

---

## 🚀 실행 방법 (Getting Started)

시스템은 Docker Compose를 이용한 손쉬운 배포를 권장합니다.

### 1. 환경 변수 설정
프로젝트 루트에 `.env` 파일을 생성하거나 수정하여 필요한 환경 변수(DB 접속 정보, 포트 등)를 설정합니다.

### 2. Docker Compose로 전체 실행 (권장)
```bash
# 컨테이너 빌드 및 백그라운드 실행
docker-compose up -d --build
```
실행 후 `http://localhost:8080` (설정한 포트)에서 시스템에 접근할 수 있습니다. PostgreSQL 데이터베이스 컨테이너도 함께 기동됩니다.

### 3. 로컬 개발 환경 분리 실행 (수동)

**프론트엔드 (Frontend)**
```bash
cd frontend
npm install
npm run dev
```

**백엔드 (Backend)**
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. MQTT 브로커 및 하드웨어 연동
* 하드웨어 제어를 위해서는 서버망 내에 `mosquitto` 등의 MQTT 브로커가 설치되어 구동 중이어야 합니다.
* ESP32 보드에 펌웨어를 업로드하고, 공유기(로컬망) Wi-Fi 및 MQTT 브로커 주소를 세팅해야 정상 작동합니다.

---

## 🛡️ 운영 시 참고 및 주의사항 (Checklist)

* **정전 대비**: N100 미니 PC 전원 차단 시 출입이 불가하므로 **UPS(무정전 전원 장치)** 연결이 강력히 권장됩니다.
* **키오스크 전용 모드**: 프론트엔드 고객 모드는 브라우저 제스처 등을 방지하기 위해 상용 배포 시 Kiosk Mode(전체화면) 래퍼를 씌우는 것이 좋습니다.
* **상세 기술 문서**: 전체 구조 평가 및 한계점은 [`system_checklist.md`](./system_checklist.md) 문서에 자세히 기록되어 있으므로 상용화 전 반드시 참고 바랍니다.
