# -*- coding: utf-8 -*-
import sys
import os
import json
from dotenv import load_dotenv

sys.path.append(os.path.abspath('backend'))
load_dotenv(os.path.abspath('backend/.env'), override=True)

from db.connection import get_db_conn

def fix_encoding():
    conn = get_db_conn()
    cur = conn.cursor()
    
    mapping = {
        "010-0000-0001": "일하나",
        "010-0000-0002": "둘 이",
        "010-0000-0003": "삼 셋",
        "010-0000-0004": "넷 사",
        "010-0000-0005": "오다섯"
    }
    
    cur.execute("SELECT session_id, metadata FROM stcafe.table_sessions")
    for row in cur.fetchall():
        session_id = row[0]
        meta = row[1]
        phone = meta.get("phone")
        if phone in mapping:
            meta["user_name"] = mapping[phone]
            cur.execute("UPDATE stcafe.table_sessions SET metadata = %s WHERE session_id = %s", (json.dumps(meta, ensure_ascii=False), session_id))
            
    conn.commit()
    print("Fixed Korean names in DB.")
    cur.close()
    conn.close()

if __name__ == '__main__':
    fix_encoding()
