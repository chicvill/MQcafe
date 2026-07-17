STcafe/
├── backend/                       # 🐍 Python / FastAPI 백엔드
│   ├── .venv/                     # Python 3.11 가상환경 (uv 자동 구축)
│   ├── db/
│   │   ├── __init__.py
│   │   ├── connection.py          # PostgreSQL 풀링 및 stcafe 스키마 생성
│   │   └── study_cafe_db.py       # 스터디 카페 전용 CRUD 및 요약/삭제 쿼리
│   ├── routers/
│   │   ├── __init__.py
│   │   └── study_cafe.py          # 입/외출/퇴실 및 AI 상담 API 엔드포인트
│   ├── .env.template              # 환경변수 설정 템플릿
│   ├── requirements.txt           # 패키지 의존성 파일
│   ├── ai_engine.py               # Gemini API 기반 월간 리포트 및 RAG 챗봇
│   ├── cron_archive.py            # 만료 세션 요약 및 DB 물리적 삭제 배치 스크립트
│   └── main.py                    # 백엔드 서버 엔트리 포인트
│
└── frontend/                      # ⚛️ Vite / React / TypeScript 프론트엔드
    ├── node_modules/
    ├── src/
    │   ├── App.css
    │   ├── App.tsx                # 고객 모바일 UI & 관리자 대시보드 SPA 구현체
    │   ├── index.css
    │   └── main.tsx
    ├── index.html                 # 폰트(Outfit) 및 메타 설정 완료
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts
