import sys
import os
import json
from dotenv import load_dotenv

sys.path.append(os.path.abspath('backend'))
load_dotenv(os.path.abspath('backend/.env'), override=True)

from db.connection import get_db_conn

conn = get_db_conn()
cur = conn.cursor()
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'nfc_cards'")
print(cur.fetchall())
cur.close()
conn.close()
