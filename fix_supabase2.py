import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.abspath('backend'))
load_dotenv(os.path.abspath('backend/.env'), override=True)

from db.study_cafe_db import get_all_stores
from db.connection import get_db_conn

def fix_db():
    stores = get_all_stores()
    first_store_id = stores[0]['id'] if stores else 'ST001'
    print(f"First store ID: {first_store_id}")
    
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("""
        UPDATE stcafe.table_sessions
        SET store_id = %s
    """, (first_store_id,))
    print(f"Updated all sessions to store_id {first_store_id}. Rows affected: {cur.rowcount}")
    conn.commit()
    cur.close()
    conn.close()

if __name__ == '__main__':
    fix_db()
