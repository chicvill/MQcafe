import asyncio
from datetime import datetime
from db.study_cafe_db import get_all_stores, get_all_active_sessions, update_session_metadata
from websocket_manager import manager
from routers.nfc_access import _send_system_chat

async def check_expired_sessions_loop():
    """
    1분마다 실행되며, 이용 시간이 초과된 활성 세션을 찾아 5분 간격으로 알림을 전송합니다.
    """
    while True:
        try:
            stores = get_all_stores()
            for store in stores:
                store_id = store["id"]
                sessions = get_all_active_sessions(store_id)
                for session in sessions:
                    sess_meta = session.get("metadata", {})
                    exit_time_str = sess_meta.get("scheduled_exit_time")
                    
                    if not exit_time_str:
                        continue
                        
                    try:
                        exit_dt = datetime.fromisoformat(exit_time_str)
                        now = datetime.now()
                        if exit_dt.tzinfo is not None:
                            now = now.astimezone(exit_dt.tzinfo)
                            
                        # 시간이 초과되었는지 확인
                        if (now - exit_dt).total_seconds() > 0:
                            last_reminder_str = sess_meta.get("last_reminder_time")
                            should_send_reminder = False
                            
                            if last_reminder_str:
                                last_reminder_dt = datetime.fromisoformat(last_reminder_str)
                                if last_reminder_dt.tzinfo is not None:
                                    last_reminder_dt = last_reminder_dt.astimezone(now.tzinfo)
                                elif now.tzinfo is not None:
                                    last_reminder_dt = last_reminder_dt.replace(tzinfo=now.tzinfo)
                                    
                                if (now - last_reminder_dt).total_seconds() >= 5 * 60:
                                    should_send_reminder = True
                            else:
                                should_send_reminder = True
                                
                            if should_send_reminder:
                                # 5분이 지났거나 처음 초과된 경우 알림 전송
                                msg_text = "이용 시간이 초과되었습니다. 신속히 퇴실 및 연장 결제를 완료해 주시기 바랍니다."
                                timestamp_str = datetime.now().strftime('%Y%m%d %H:%M')
                                
                                # 메타데이터 업데이트 (last_reminder_time)
                                # tzinfo를 포함하여 저장
                                sess_meta["last_reminder_time"] = datetime.now().astimezone().isoformat()
                                update_session_metadata(session["session_id"], sess_meta)
                                
                                # 채팅 메시지 저장 및 전송
                                _send_system_chat(session["session_id"], f"{msg_text} [{timestamp_str}]")
                                
                    except Exception as e:
                        print(f"Error processing session {session.get('session_id')}: {e}")
        except Exception as e:
            print(f"Error in check_expired_sessions_loop: {e}")
            
        # 1분 대기
        await asyncio.sleep(60)
