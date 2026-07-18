import asyncio
from db.connection import get_cloud_db_conn
from db.study_cafe_db import _dumps, _row_to_dict

def sync_store_to_cloud(store: dict):
    """로컬에 저장된 매장 정보를 클라우드로 동기화 (UPSERT)"""
    conn = get_cloud_db_conn()
    if not conn:
        return
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO stores (id, name, ceo_name, metadata, owner_id)
            VALUES (%s, %s, %s, %s::jsonb, %s)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                ceo_name = EXCLUDED.ceo_name,
                metadata = EXCLUDED.metadata,
                owner_id = EXCLUDED.owner_id
        """, (
            store["id"], store["name"], store["ceo_name"],
            _dumps(store.get("metadata", {})), store["owner_id"]
        ))
        conn.commit()
    except Exception as e:
        print(f"[CloudSync] Error syncing store {store.get('id')}: {e}")
    finally:
        conn.close()

def sync_session_to_cloud(session: dict):
    """로컬에 저장된 세션 정보를 클라우드로 동기화 (UPSERT)"""
    conn = get_cloud_db_conn()
    if not conn:
        return
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO table_sessions (session_id, store_id, table_id, status, checkin_time, checkout_time, metadata, version)
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s)
            ON CONFLICT (session_id) DO UPDATE SET
                table_id = EXCLUDED.table_id,
                status = EXCLUDED.status,
                checkout_time = EXCLUDED.checkout_time,
                metadata = EXCLUDED.metadata,
                version = EXCLUDED.version
        """, (
            session["session_id"], session["store_id"], session["table_id"],
            session["status"], session["checkin_time"], session.get("checkout_time"),
            _dumps(session.get("metadata", {})), session["version"]
        ))
        conn.commit()
    except Exception as e:
        print(f"[CloudSync] Error syncing session {session.get('session_id')}: {e}")
    finally:
        conn.close()
