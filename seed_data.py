import sys
import os
import json
import hashlib
import uuid
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

sys.path.append(os.path.abspath('backend'))
load_dotenv(os.path.abspath('backend/.env'), override=True)

from db.connection import get_db_conn

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def seed_data():
    conn = get_db_conn()
    cur = conn.cursor()
    
    try:
        # Delete existing sessions/owners/nfc_cards again just to be safe
        cur.execute("DELETE FROM stcafe.table_sessions")
        cur.execute("DELETE FROM stcafe.nfc_cards")
        cur.execute("DELETE FROM stcafe.owners WHERE id != 'default-owner'")
        
        # 1. Add Owners
        owners_data = [
            ('owner-min', '010-3269-3343', hash_pw('1212'), json.dumps({"name": "민흥식", "email": "himin50@naver.com"})),
            ('owner-kim', '010-8281-7377', hash_pw('1212'), json.dumps({"name": "김종심", "email": "himin53@naver.com"}))
        ]
        
        for o_id, phone, pw_hash, metadata in owners_data:
            cur.execute("""
                INSERT INTO stcafe.owners (id, phone, password_hash, metadata)
                VALUES (%s, %s, %s, %s)
            """, (o_id, phone, pw_hash, metadata))
            
        # 2. Link Stores
        cur.execute("UPDATE stcafe.stores SET owner_id = 'owner-min' WHERE id IN ('ST001', 'ST002')")
        cur.execute("UPDATE stcafe.stores SET owner_id = 'owner-kim' WHERE id IN ('ST003', 'ST004', 'ST005')")
        
        # 3. Add Customers (Sessions)
        customers = [
            ("일하나", "010-0000-0001", "1212", "ST001"),
            ("둘 이", "010-0000-0002", "1212", "ST002"),
            ("셋 삼", "010-0000-0003", "1212", "ST003"),
            ("넷 사", "010-0000-0004", "1212", "ST004"),
            ("오다섯", "010-0000-0005", "1212", "ST005")
        ]
        
        now = datetime.now(timezone.utc)
        start_time = now.isoformat()
        end_time = (now + timedelta(hours=2)).isoformat()
        
        for name, phone, pw, store_id in customers:
            session_id = f"sess-{uuid.uuid4().hex[:8]}"
            metadata = {
                "user_name": name,
                "phone": phone,
                "password": hash_pw(pw),
                "scheduled_entry_time": start_time,
                "scheduled_exit_time": end_time,
                "ticket_type": "time",
                "duration_minutes": 120,
                "amount": 3000,
                "use_locker": False
            }
            cur.execute("""
                INSERT INTO stcafe.table_sessions (session_id, store_id, table_id, status, checkin_time, metadata, version)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (session_id, store_id, "seat-1", "active", start_time, json.dumps(metadata), 1))
            
        conn.commit()
        print("Test data seeded successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"Error seeding data: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    seed_data()
