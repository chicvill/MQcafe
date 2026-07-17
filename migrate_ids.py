import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.abspath('backend'))
load_dotenv(os.path.abspath('backend/.env'), override=True)

from db.study_cafe_db import get_all_stores
from db.connection import get_db_conn

def migrate_ids():
    stores = get_all_stores()
    # stores should be ordered by created_at ascending
    
    conn = get_db_conn()
    cur = conn.cursor()
    
    try:
        # Step 1: Move all to temporary IDs to avoid Primary Key collisions
        for i, store in enumerate(stores):
            old_id = store['id']
            temp_id = f"TEMP_{i+1:03d}"
            
            cur.execute("UPDATE stcafe.stores SET id = %s WHERE id = %s", (temp_id, old_id))
            cur.execute("UPDATE stcafe.table_sessions SET store_id = %s WHERE store_id = %s", (temp_id, old_id))
            cur.execute("UPDATE stcafe.knowledge_bundles SET store_id = %s WHERE store_id = %s", (temp_id, old_id))
            
            store['temp_id'] = temp_id

        # Step 2: Move from temporary IDs to final STxxx IDs
        for i, store in enumerate(stores):
            temp_id = store['temp_id']
            final_id = f"ST{i+1:03d}"
            name = store['name']
            
            cur.execute("UPDATE stcafe.stores SET id = %s WHERE id = %s", (final_id, temp_id))
            cur.execute("UPDATE stcafe.table_sessions SET store_id = %s WHERE store_id = %s", (final_id, temp_id))
            cur.execute("UPDATE stcafe.knowledge_bundles SET store_id = %s WHERE store_id = %s", (final_id, temp_id))
            
            print(f"Migrated [{name}]: {store['id']} -> {final_id}")
            
        conn.commit()
        print("Migration completed successfully.")
        
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    migrate_ids()
