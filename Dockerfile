# 1단계: 프론트엔드 React 빌드
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# 2단계: 백엔드 Python 서버 구성 및 프론트엔드 서빙
FROM python:3.11-slim
WORKDIR /app

# 파이썬 의존성 설치
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# 소스코드 복사
COPY backend/ ./backend/

# 빌드 완료된 프론트엔드 복사
COPY --from=frontend-builder /app/frontend/dist/ ./frontend/dist/

EXPOSE 8080
WORKDIR /app/backend
CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
