import sys
import os
import json
from dotenv import load_dotenv

sys.path.append(os.path.abspath('backend'))
load_dotenv(os.path.abspath('backend/.env'), override=True)

from db.connection import get_db_conn

conn = get_db_conn()
cur = conn.cursor()
cur.execute("SELECT session_id, store_id, status, metadata FROM stcafe.table_sessions")
for row in cur.fetchall():
    print(row)
cur.close()
conn.close()
