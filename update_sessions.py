import sys
import os
import json
from dotenv import load_dotenv

sys.path.append(os.path.abspath('backend'))
load_dotenv(os.path.abspath('backend/.env'), override=True)

from db.connection import get_db_conn

def update_sessions():
    conn = get_db_conn()
    cur = conn.cursor()
    
    try:
        # Fetch current active sessions
        cur.execute("SELECT session_id, store_id, metadata FROM table_sessions WHERE status = 'active'")
        sessions = cur.fetchall()
        
        # Map store to the new table and name
        mapping = {
            "ST001": {"table_id": "seat-1", "user_name": "일하나"},
            "ST002": {"table_id": "seat-2", "user_name": "둘 이"},
            "ST003": {"table_id": "seat-3", "user_name": "삼 셋"},
            "ST004": {"table_id": "seat-4", "user_name": "넷 사"},
            "ST005": {"table_id": "seat-5", "user_name": "오다섯"}
        }
        
        for sess in sessions:
            session_id = sess[0]
            store_id = sess[1]
            meta = sess[2]
            
            if store_id in mapping:
                target = mapping[store_id]
                new_table = target["table_id"]
                
                # update metadata for user_name and ticket type
                meta["user_name"] = target["user_name"]
                meta["ticket_type"] = "day"
                meta["duration_minutes"] = 1440  # 1 day
                
                cur.execute("""
                    UPDATE table_sessions
                    SET table_id = %s, metadata = %s
                    WHERE session_id = %s
                """, (new_table, json.dumps(meta), session_id))
                
        conn.commit()
        print("Sessions updated successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"Error updating sessions: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    update_sessions()
