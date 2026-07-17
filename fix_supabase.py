import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.abspath('backend'))
load_dotenv(os.path.abspath('backend/.env'), override=True)

from db.study_cafe_db import get_all_stores, update_store_metadata
from db.connection import get_db_conn

def fix_db():
    stores = get_all_stores()
    
    new_names = ["운정 산내점", "일산 주엽점", "합정 안내점", "인천 석남점", "서울 종로점"]
    
    for i in range(min(len(stores), len(new_names))):
        store = stores[i]
        old_name = store['name']
        new_name = new_names[i]
        update_store_metadata(store['id'], new_name, store.get('ceo_name', ''), store.get('metadata', {}))
        print(f"Updated store {store['id']}: {old_name} -> {new_name}")

    first_store_id = stores[0]['id'] if stores else 'ST001'
    
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE stcafe.sessions
                SET store_id = %s
            """, (first_store_id,))
            print(f"Updated all sessions to store_id {first_store_id}. Rows affected: {cur.rowcount}")
        conn.commit()

if __name__ == '__main__':
    fix_db()
