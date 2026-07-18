import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.abspath('backend'))
load_dotenv(os.path.abspath('backend/.env'), override=True)

from db.connection import get_db_conn

def reset_users():
    conn = get_db_conn()
    cur = conn.cursor()
    
    try:
        # Delete customers
        cur.execute("DELETE FROM table_sessions")
        sessions_deleted = cur.rowcount
        
        cur.execute("DELETE FROM nfc_cards")
        nfc_deleted = cur.rowcount
        
        # Delete owners except default-owner
        cur.execute("DELETE FROM owners WHERE id != 'default-owner'")
        owners_deleted = cur.rowcount
        
        conn.commit()
        print(f"Deleted {sessions_deleted} sessions, {nfc_deleted} NFC cards, {owners_deleted} owners.")
    except Exception as e:
        conn.rollback()
        print(f"Error resetting: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    reset_users()
