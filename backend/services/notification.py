import os
import sys
from datetime import datetime

from db import study_cafe_db
from websocket_manager import manager

async def send_system_message_to_customer(session_id: str, text: str, store_id: str):
    """자동 알림 메시지를 고객 채팅 및 점주 패널로 동시 전송"""
    sess = study_cafe_db.get_session(session_id)
    if sess:
        sess_meta = sess.get("metadata") or {}
        messages = sess_meta.get("messages", [])
        msg = {
            "sender": "admin",  # 시스템 알림이므로 admin 이름으로 발송
            "text": text,
            "timestamp": datetime.now().isoformat(),
        }
        messages.append(msg)
        sess_meta["messages"] = messages
        study_cafe_db.update_session_metadata(session_id, sess_meta)

        # 고객 WebSocket으로 실시간 메시지 발송
        await manager.send_to_customer(session_id, {
            "type": "admin_message",
            "message": msg,
        })
        # 점주/관리자 WebSocket으로 실시간 연동
        await manager.broadcast_to_admins({
            "type": "admin_reply",
            "session_id": session_id,
            "message": msg,
        })
