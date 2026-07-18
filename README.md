# MQcafe - 독립형 무인 스터디카페 관리 시스템

**MQcafe**는 N100 미니 PC를 기반으로 로컬망에서 작동하도록 구축된 **오프라인 무인 스터디카페 관리 시스템**입니다. 인터넷 장애 시에도 매장 내 서비스가 유지되도록 설계되었으며, ESP32 기반의 NFC 출입 통제, 실시간 좌석 예약, 오프라인 결제 단말기 연동 등을 지원합니다.

## 🌟 주요 특징 (Key Features)

*   **로컬망 기반 오프라인 최적화**: 클라우드 의존성을 낮추고 매장 자체 로컬 서버(N100 미니 PC)를 통해 운영되어 인터넷 장애 시에도 정상 출입 및 이용이 가능합니다.
*   **실시간 하드웨어 제어 (IoT)**: MQTT 프로토콜을 활용하여 ESP32 도어락, 오프라인 결제 단말기 등과 초저지연으로 통신합니다.
*   **통합 UI (Lazy Loading 적용)**: 하나의 React/Vite 애플리케이션으로 고객용 키오스크, 점주용 대시보드 모드를 통합 제공하며 성능 최적화가 적용되었습니다.
*   **유연한 데이터베이스 (SQLite + JSONB)**: 가볍고 빠른 SQLite 기반에 JSONB를 활용하여 다양한 메타데이터(채팅, 결제 정보 등)를 유연하게 관리합니다.
*   **세밀한 비즈니스 로직**: 5분 내 미입장 처리, 외출 중 시간 차감, 연령 제한(만 16세 미만), 자동 만료 및 퇴실 등 한국 무인 스터디카페 운영 실태에 맞춘 세밀한 룰을 제공합니다.

## 🏗️ 시스템 아키텍처 (Architecture)

1.  **하드웨어/인프라**: N100 미니 PC 로컬 서버 + ESP32 NFC 리더 및 도어락
2.  **데이터베이스**: SQLite (대형 매장 도입 시 PostgreSQL 마이그레이션 호환)
3.  **백엔드 & 통신망**: FastAPI (REST API), Mosquitto (MQTT 브로커), WebSocket (실시간 채팅)
4.  **프론트엔드**: Vite + React + TypeScript 기반 SPA

## 🛠️ 기술 스택 (Tech Stack)

*   **Frontend**: React, TypeScript, Vite
*   **Backend**: Python, FastAPI, Uvicorn
*   **Database**: SQLite
*   **IoT & Communication**: MQTT (Mosquitto), WebSocket
*   **Hardware**: ESP32, NFC Reader

## 📂 주요 디렉토리 구조 (Directory Structure)

```text
MQcafe/
├── backend/                       # 🐍 Python / FastAPI 백엔드
│   ├── db/                        # 데이터베이스 연결 및 CRUD 로직
│   ├── routers/                   # API 라우터 (세션, 통신 등 분리)
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
├── Esp32NfcDoor/                  # 🔌 ESP32 도어락 및 NFC 제어 코드
├── docker-compose.yml             # 컨테이너화 배포 설정
└── system_checklist.md            # 시스템 구조 체크리스트 및 평가서
```

## 🚀 실행 방법 (Getting Started)

1. **백엔드 실행 (Backend)**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # (Windows: .venv\Scripts\activate)
   pip install -r requirements.txt
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **프론트엔드 실행 (Frontend)**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **MQTT 브로커 및 하드웨어 연동**
   * 로컬망 내 서버 환경에 `mosquitto` 등의 MQTT 브로커를 설치하고 실행해야 합니다.
   * 하드웨어 제어를 위해 ESP32에 펌웨어를 업로드하여 브로커와 연결되도록 세팅합니다.

---

> **참고사항**: 실제 매장 상용화 전 정전 대비(UPS), 단말기 결제 타임아웃 롤백 처리, 실명 인증 연동 등의 물리적 예외 처리 및 보안 보강이 권장됩니다. 자세한 내용은 [`system_checklist.md`](./system_checklist.md) 문서를 참고하세요.
