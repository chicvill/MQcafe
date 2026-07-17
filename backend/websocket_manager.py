"""
websocket_manager.py
====================
FastAPI WebSocket 연결 관리자.

- 고객 채팅: session_id → WebSocket 1:1 매핑
- 관리자 채팅: 다수의 관리자 WebSocket 브로드캐스트
"""
from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    """고객 및 관리자 WebSocket 연결을 중앙에서 관리하는 클래스."""

    def __init__(self):
        # session_id → WebSocket (고객 1:1)
        self.active_customer_connections: Dict[str, WebSocket] = {}
        # 접속 중인 관리자 목록
        self.active_admin_connections: List[WebSocket] = []

    # ── 고객 연결 ──────────────────────────────────────────────────────────────

    async def connect_customer(self, session_id: str, websocket: WebSocket) -> None:
        """고객 WebSocket 수락 및 등록."""
        await websocket.accept()
        self.active_customer_connections[session_id] = websocket

    def disconnect_customer(self, session_id: str) -> None:
        """고객 WebSocket 등록 해제."""
        if session_id in self.active_customer_connections:
            del self.active_customer_connections[session_id]

    async def send_to_customer(self, session_id: str, message: dict) -> None:
        """특정 session_id 고객에게 JSON 메시지 전송."""
        ws = self.active_customer_connections.get(session_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                # 전송 실패 시 조용히 무시 (연결이 이미 끊긴 경우)
                pass

    # ── 관리자 연결 ────────────────────────────────────────────────────────────

    async def connect_admin(self, websocket: WebSocket) -> None:
        """관리자 WebSocket 수락 및 등록."""
        await websocket.accept()
        self.active_admin_connections.append(websocket)

    def disconnect_admin(self, websocket: WebSocket) -> None:
        """관리자 WebSocket 등록 해제."""
        if websocket in self.active_admin_connections:
            self.active_admin_connections.remove(websocket)

    async def broadcast_to_admins(self, message: dict) -> None:
        """접속 중인 모든 관리자에게 JSON 메시지 브로드캐스트."""
        for ws in self.active_admin_connections:
            try:
                await ws.send_json(message)
            except Exception:
                pass


# 앱 전역 싱글턴 인스턴스 — 라우터에서 import하여 사용
manager = ConnectionManager()
