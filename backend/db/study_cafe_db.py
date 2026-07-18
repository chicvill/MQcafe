import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict
from psycopg2.extras import RealDictCursor
from .connection import get_db_conn

def _now() -> str:
    return datetime.now().isoformat()

def _dumps(v) -> str:
    return json.dumps(v, ensure_ascii=False)

def _convert_row(row) -> dict:
    d = dict(row)
    if 'metadata' in d and isinstance(d['metadata'], str):
        try:
            d['metadata'] = json.loads(d['metadata'])
        except Exception:
            d['metadata'] = {}
    return d

def _row_to_dict(row) -> Optional[dict]:
    if row is None:
        return None
    return _convert_row(row)

import threading
def _fire_and_forget(func, *args, **kwargs):
    """Run a function in a background thread to prevent blocking."""
    threading.Thread(target=func, args=args, kwargs=kwargs, daemon=True).start()

def get_all_stores() -> List[dict]:
    conn = get_db_conn()
    if not conn:
        return []
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM stores ORDER BY created_at ASC")
        return [_convert_row(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"[get_all_stores] ERROR: {e}")
        return []
    finally:
        conn.close()

def get_stores_by_owner(owner_id: str) -> List[dict]:
    conn = get_db_conn()
    if not conn:
        return []
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM stores WHERE owner_id = %s ORDER BY created_at ASC", (owner_id,))
        return [_convert_row(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"[get_stores_by_owner] ERROR: {e}")
        return []
    finally:
        conn.close()

def get_owner_by_phone(phone: str) -> Optional[dict]:
    conn = get_db_conn()
    if not conn:
        return None
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM owners WHERE phone = %s", (phone,))
        return _row_to_dict(cur.fetchone())
    except Exception as e:
        print(f"[get_owner_by_phone] ERROR: {e}")
        return None
    finally:
        conn.close()

def get_owner_by_id(owner_id: str) -> Optional[dict]:
    conn = get_db_conn()
    if not conn:
        return None
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM owners WHERE id = %s", (owner_id,))
        return _row_to_dict(cur.fetchone())
    except Exception as e:
        print(f"[get_owner_by_id] ERROR: {e}")
        return None
    finally:
        conn.close()

def create_owner(owner_id: str, phone: str, password_hash: str, metadata: dict = {}) -> bool:
    conn = get_db_conn()
    if not conn:
        return False
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO owners (id, phone, password_hash, metadata)
            VALUES (%s, %s, %s, %s::jsonb)
        """, (owner_id, phone, password_hash, _dumps(metadata)))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"[create_owner] ERROR: {e}")
        return False
    finally:
        conn.close()

def update_owner_metadata(owner_id: str, metadata: dict) -> bool:
    conn = get_db_conn()
    if not conn:
        return False
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE owners
            SET metadata = %s::jsonb
            WHERE id = %s
        """, (_dumps(metadata), owner_id))
        conn.commit()
        return cur.rowcount > 0
    except Exception as e:
        conn.rollback()
        print(f"[update_owner_metadata] ERROR: {e}")
        return False
    finally:
        conn.close()

def get_store_by_id(store_id: str) -> Optional[dict]:
    conn = get_db_conn()
    if not conn:
        return None
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM stores WHERE id = %s", (store_id,))
        return _row_to_dict(cur.fetchone())
    except Exception as e:
        print(f"[get_store_by_id] ERROR: {e}")
        return None
    finally:
        conn.close()

def get_next_store_id() -> str:
    """DB에 등록된 매장 ID 중 ST로 시작하는 가장 마지막 번호를 찾아서 다음 번호(STxxx)를 반환"""
    conn = get_db_conn()
    if not conn:
        return "ST001"
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM stores WHERE id LIKE 'ST%' ORDER BY id DESC LIMIT 1")
        row = cur.fetchone()
        if row and row[0]:
            last_id = row[0] # e.g. ST001
            try:
                num = int(last_id[2:])
                return f"ST{num + 1:03d}"
            except ValueError:
                pass
        return "ST001"
    except Exception as e:
        print(f"[get_next_store_id] ERROR: {e}")
        return f"ST{uuid.uuid4().hex[:3].upper()}" # 에러 시 랜덤 fallback
    finally:
        conn.close()

def create_store(store_id: str, name: str, ceo_name: str, metadata: dict, owner_id: str) -> bool:
    conn = get_db_conn()
    if not conn:
        return False
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO stores (id, name, ceo_name, metadata, owner_id)
            VALUES (%s, %s, %s, %s::jsonb, %s)
        """, (store_id, name, ceo_name, _dumps(metadata), owner_id))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"[create_store] ERROR: {e}")
        return False
    finally:
        conn.close()

def update_store_metadata(store_id: str, name: str, ceo_name: str, metadata: dict) -> bool:
    conn = get_db_conn()
    if not conn:
        return False
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE stores
            SET name = %s, ceo_name = %s, metadata = %s::jsonb
            WHERE id = %s
        """, (name, ceo_name, _dumps(metadata), store_id))
        conn.commit()
        return cur.rowcount > 0
    except Exception as e:
        conn.rollback()
        print(f"[update_store_metadata] ERROR: {e}")
        return False
    finally:
        conn.close()

def update_owner_password(owner_id: str, old_password_hash: str, new_password_hash: str) -> bool:
    """점주의 기존 비밀번호 해시를 확인하고 새 비밀번호 해시로 업데이트"""
    conn = get_db_conn()
    if not conn:
        return False
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE owners
            SET password_hash = %s
            WHERE id = %s AND password_hash = %s
        """, (new_password_hash, owner_id, old_password_hash))
        conn.commit()
        return cur.rowcount > 0
    except Exception as e:
        conn.rollback()
        print(f"[update_owner_password] ERROR: {e}")
        return False
    finally:
        conn.close()

def save_session(session_id: str, store_id: str, table_id: str, metadata: dict, status: str = "active") -> bool:
    """새로운 스터디 카페 이용 세션 생성 (결제 완료 시 호출)"""
    conn = get_db_conn()
    if not conn:
        return False
    try:
        cur = conn.cursor()
        # 해당 좌석의 기존 활성 세션이 있을 경우 먼저 강제 종료 처리
        cur.execute("""
            UPDATE table_sessions
            SET status = 'closed', checkout_time = %s, version = version + 1
            WHERE store_id = %s AND table_id = %s AND status != 'closed'
        """, (_now(), store_id, table_id))
        
        # 신규 세션 삽입
        cur.execute("""
            INSERT INTO table_sessions
                (session_id, store_id, table_id, status, checkin_time, metadata, version)
            VALUES
                (%s, %s, %s, %s, %s, %s::jsonb, 1)
        """, (session_id, store_id, table_id, status, _now(), _dumps(metadata)))
        conn.commit()
        
        # 클라우드 동기화 
        try:
            from services.cloud_sync import sync_session_to_cloud
            # 새 세션을 다시 읽어서 동기화
            cur.execute("SELECT * FROM table_sessions WHERE session_id = %s", (session_id,))
            new_session = _row_to_dict(cur.fetchone())
            if new_session:
                _fire_and_forget(sync_session_to_cloud, new_session)
        except Exception as sync_e:
            print(f"[save_session] Sync error: {sync_e}")
            
        return True
    except Exception as e:
        conn.rollback()
        print(f"[save_session] ERROR: {e}")
        return False
    finally:
        conn.close()

def get_session(session_id: str) -> Optional[dict]:
    conn = get_db_conn()
    if not conn:
        return None
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM table_sessions WHERE session_id = %s", (session_id,))
        return _row_to_dict(cur.fetchone())
    except Exception as e:
        print(f"[get_session] ERROR: {e}")
        return None
    finally:
        conn.close()

def get_active_session_by_table(store_id: str, table_id: str) -> Optional[dict]:
    """좌석 번호 기준으로 현재 활성(이용 중 또는 외출 중) 상태인 세션을 가져옴"""
    conn = get_db_conn()
    if not conn:
        return None
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT * FROM table_sessions 
            WHERE store_id = %s AND table_id = %s AND status != 'closed'
            LIMIT 1
        """, (store_id, table_id))
        return _row_to_dict(cur.fetchone())
    except Exception as e:
        print(f"[get_active_session_by_table] ERROR: {e}")
        return None
    finally:
        conn.close()

def find_active_session_by_user(user_name: str, phone_number: str) -> Optional[dict]:
    """이름과 전화번호 기준으로 현재 활성 상태(reserved, active, outing)인 세션을 검색 (하이픈 무관 지원)"""
    conn = get_db_conn()
    if not conn:
        return None
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 하이픈이 없는 버전과 하이픈 포맷팅 버전 둘 다 준비
        phone_clean = phone_number.replace('-', '')
        phone_hyphen = f"{phone_clean[:3]}-{phone_clean[3:7]}-{phone_clean[7:]}" if len(phone_clean) == 11 else phone_number
        
        cur.execute("""
            SELECT * FROM table_sessions 
            WHERE (metadata->>'user_name') = %s 
              AND (metadata->>'phone_number') IN (%s, %s) 
              AND status != 'closed'
            ORDER BY checkin_time DESC
            LIMIT 1
        """, (user_name, phone_clean, phone_hyphen))
        return _row_to_dict(cur.fetchone())
    except Exception as e:
        print(f"[find_active_session_by_user] ERROR: {e}")
        return None
    finally:
        conn.close()

def find_active_session_by_phone(phone_number: str) -> Optional[dict]:
    """전화번호 기준으로 현재 활성 상태(reserved, active, outing)인 세션을 검색 (하이픈 무관 지원)"""
    conn = get_db_conn()
    if not conn:
        return None
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        phone_clean = phone_number.replace('-', '')
        phone_hyphen = f"{phone_clean[:3]}-{phone_clean[3:7]}-{phone_clean[7:]}" if len(phone_clean) == 11 else phone_number
        
        cur.execute("""
            SELECT * FROM table_sessions 
            WHERE (metadata->>'phone_number') IN (%s, %s) 
              AND status != 'closed'
            ORDER BY checkin_time DESC
            LIMIT 1
        """, (phone_clean, phone_hyphen))
        return _row_to_dict(cur.fetchone())
    except Exception as e:
        print(f"[find_active_session_by_phone] ERROR: {e}")
        return None
    finally:
        conn.close()


def get_all_active_sessions(store_id: str) -> List[dict]:
    """매장 전체의 현재 이용 중/외출 중인 세션 목록 반환"""
    conn = get_db_conn()
    if not conn:
        return []
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT * FROM table_sessions 
            WHERE store_id = %s AND status != 'closed'
        """, (store_id,))
        return [_convert_row(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"[get_all_active_sessions] ERROR: {e}")
        return []
    finally:
        conn.close()


def get_admin_knowledge(store_id: str, bundle_type: str = 'StudyCafeStats', limit: int = 5) -> List[dict]:
    conn = get_db_conn()
    if not conn:
        return []
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT * FROM knowledge_bundles 
            WHERE store_id = %s AND type = %s 
            ORDER BY timestamp DESC LIMIT %s
        """, (store_id, bundle_type, limit))
        return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"[get_admin_knowledge] ERROR: {e}")
        return []
    finally:
        conn.close()

def get_owner_by_phone(phone: str) -> Optional[dict]:
    conn = get_db_conn()
    if not conn:
        return None
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM owners WHERE phone = %s", (phone,))
        row = cur.fetchone()
        return dict(row) if row else None
    except Exception as e:
        print(f"[get_owner_by_phone] ERROR: {e}")
        return None
    finally:
        conn.close()

def update_session_status(session_id: str, status: str, checkout_time: Optional[str] = None) -> bool:
    """세션 상태 업데이트 (active -> outing 또는 closed 등)"""
    conn = get_db_conn()
    if not conn:
        return False
    try:
        cur = conn.cursor()
        if status == 'closed':
            t = checkout_time or _now()
            cur.execute("""
                UPDATE table_sessions
                SET status = %s, checkout_time = %s, version = version + 1
                WHERE session_id = %s
            """, (status, t, session_id))
        else:
            cur.execute("""
                UPDATE table_sessions
                SET status = %s, version = version + 1
                WHERE session_id = %s
            """, (status, session_id))
        conn.commit()
        try:
            from services.cloud_sync import sync_session_to_cloud
            cur.execute("SELECT * FROM table_sessions WHERE session_id = %s", (session_id,))
            new_session = _row_to_dict(cur.fetchone())
            if new_session:
                _fire_and_forget(sync_session_to_cloud, new_session)
        except Exception as sync_e:
            pass
        return cur.rowcount > 0
    except Exception as e:
        conn.rollback()
        print(f"[update_session_status] ERROR: {e}")
        return False
    finally:
        conn.close()

def update_session_metadata(session_id: str, metadata: dict) -> bool:
    """세션의 metadata(남은 시간, 외출 기록 등)를 통째로 갱신"""
    conn = get_db_conn()
    if not conn:
        return False
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE table_sessions
            SET metadata = metadata || %s::jsonb, version = version + 1
            WHERE session_id = %s
        """, (_dumps(metadata), session_id))
        conn.commit()
        try:
            from services.cloud_sync import sync_session_to_cloud
            cur.execute("SELECT * FROM table_sessions WHERE session_id = %s", (session_id,))
            new_session = _row_to_dict(cur.fetchone())
            if new_session:
                _fire_and_forget(sync_session_to_cloud, new_session)
        except Exception as sync_e:
            pass
        return cur.rowcount > 0
    except Exception as e:
        conn.rollback()
        print(f"[update_session_metadata] ERROR: {e}")
        return False
    finally:
        conn.close()

def change_session_table(session_id: str, new_table_id: str) -> bool:
    """이용 세션의 배정 좌석(table_id)을 변경"""
    conn = get_db_conn()
    if not conn:
        return False
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE table_sessions
            SET table_id = %s, version = version + 1
            WHERE session_id = %s
        """, (new_table_id, session_id))
        conn.commit()
        try:
            from services.cloud_sync import sync_session_to_cloud
            cur.execute("SELECT * FROM table_sessions WHERE session_id = %s", (session_id,))
            new_session = _row_to_dict(cur.fetchone())
            if new_session:
                _fire_and_forget(sync_session_to_cloud, new_session)
        except Exception as sync_e:
            pass
        return cur.rowcount > 0
    except Exception as e:
        conn.rollback()
        print(f"[change_session_table] ERROR: {e}")
        return False
    finally:
        conn.close()

def get_expired_sessions(store_id: str) -> List[dict]:
    """만료된(종료일시가 지났거나 상태가 closed인) 세션 목록 조회 (아카이빙용)"""
    conn = get_db_conn()
    if not conn:
        return []
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # closed 상태이거나, 종료 예정 시각(endTime)이 지난 활성 세션 조회
        # 여기서는 세션 테이블 중 상태가 closed인 데이터 혹은 만료일시가 지난 데이터 추출
        cur.execute("""
            SELECT * FROM table_sessions 
            WHERE store_id = %s AND (
                status = 'closed' OR 
                (metadata->>'remaining_time_minutes')::int <= 0 OR
                (metadata->>'locker_end_time' IS NOT NULL AND (metadata->>'locker_end_time') < %s)
            )
        """, (store_id, _now()))
        return [_convert_row(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"[get_expired_sessions] ERROR: {e}")
        return []
    finally:
        conn.close()

def delete_sessions(session_ids: List[str]) -> bool:
    """아카이빙 완료된 세션을 물리적으로 영구 삭제"""
    if not session_ids:
        return True
    conn = get_db_conn()
    if not conn:
        return False
    try:
        cur = conn.cursor()
        cur.execute("""
            DELETE FROM table_sessions
            WHERE session_id = ANY(%s)
        """, (session_ids,))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"[delete_sessions] ERROR: {e}")
        return False
    finally:
        conn.close()

def save_knowledge_bundle(bundle_id: str, type: str, store_id: str, title: str, items: list) -> bool:
    """AI가 분석 요약한 운영/매출 요약 보고서를 지식 창고에 적재"""
    conn = get_db_conn()
    if not conn:
        return False
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO knowledge_bundles
                (id, type, store_id, title, items, timestamp)
            VALUES
                (%s, %s, %s, %s, %s::jsonb, NOW())
            ON CONFLICT (id) DO UPDATE 
            SET title = EXCLUDED.title, items = EXCLUDED.items, timestamp = NOW()
        """, (bundle_id, type, store_id, title, _dumps(items)))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"[save_knowledge_bundle] ERROR: {e}")
        return False
    finally:
        conn.close()

def get_knowledge_history(store_id: str) -> List[dict]:
    """저장된 요약 보고서 이력 조회 (사장님이 AI에게 질문할 때 RAG 컨텍스트로 공급됨)"""
    conn = get_db_conn()
    if not conn:
        return []
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT * FROM knowledge_bundles 
            WHERE store_id = %s
            ORDER BY timestamp DESC
        """, (store_id,))
        rows = cur.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            if isinstance(d.get('items'), str):
                d['items'] = json.loads(d['items'])
            result.append(d)
        return result
    except Exception as e:
        print(f"[get_knowledge_history] ERROR: {e}")
        return []
    finally:
        conn.close()

def save_keep_alive(val: int = 1) -> bool:
    """Render 및 DB 유휴 상태 방지를 위해 keep_alive 테이블의 단일 행 값을 갱신"""
    conn = get_db_conn()
    if not conn:
        return False
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO mqcafe.keep_alive (id, val)
            VALUES (1, %s)
            ON CONFLICT (id)
            DO UPDATE SET val = %s, created_at = NOW()
        """, (val, val))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"[save_keep_alive] ERROR: {e}")
        return False
    finally:
        conn.close()

def register_nfc_card(uid: str, user_name: str, phone_number: str) -> bool:
    """NFC 카드 UID와 회원 정보 매핑 등록"""
    conn = get_db_conn()
    if not conn:
        return False
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO nfc_cards (uid, user_name, phone_number)
            VALUES (%s, %s, %s)
            ON CONFLICT (uid) DO UPDATE 
            SET user_name = EXCLUDED.user_name, phone_number = EXCLUDED.phone_number
        """, (uid, user_name, phone_number))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"[register_nfc_card] ERROR: {e}")
        return False
    finally:
        conn.close()

def get_nfc_card(uid: str) -> Optional[dict]:
    """UID로 등록된 회원 정보 조회"""
    conn = get_db_conn()
    if not conn:
        return None
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM nfc_cards WHERE uid = %s", (uid,))
        row = cur.fetchone()
        return dict(row) if row else None
    except Exception as e:
        print(f"[get_nfc_card] ERROR: {e}")
        return None
    finally:
        conn.close()

def get_owner_nfc_cards(owner_id: str) -> List[dict]:
    """특정 점주로 등록된 모든 NFC 마스터 카드 목록을 조회합니다."""
    conn = get_db_conn()
    if not conn:
        return []
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT uid, user_name, phone_number, created_at FROM nfc_cards WHERE phone_number = %s ORDER BY created_at DESC", (owner_id,))
        return [_convert_row(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"[get_owner_nfc_cards] ERROR: {e}")
        return []
    finally:
        conn.close()

def delete_owner_nfc_card(uid: str, owner_id: str) -> bool:
    """특정 NFC 마스터 카드의 권한을 삭제합니다."""
    conn = get_db_conn()
    if not conn:
        return False
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM nfc_cards WHERE uid = %s AND phone_number = %s", (uid, owner_id))
        conn.commit()
        return cur.rowcount > 0
    except Exception as e:
        conn.rollback()
        print(f"[delete_owner_nfc_card] ERROR: {e}")
        return False
    finally:
        conn.close()

def get_monthly_revenue(store_id: str, yyyy_mm: str) -> int:
    """해당 월의 총 매출액을 table_sessions와 session_archives에서 계산하여 반환"""
    conn = get_db_conn()
    if not conn:
        return 0
    try:
        cur = conn.cursor()
        total = 0
        
        # 1. 활성 세션 (table_sessions)
        cur.execute("""
            SELECT SUM(COALESCE((metadata->>'amount')::integer, 0))
            FROM table_sessions
            WHERE store_id = %s AND TO_CHAR(entry_time, 'YYYY-MM') = %s
        """, (store_id, yyyy_mm))
        res1 = cur.fetchone()
        if res1 and res1[0]:
            total += res1[0]
            
        # 2. 종료된 세션 (session_archives)
        cur.execute("""
            SELECT SUM(COALESCE((metadata->>'amount')::integer, 0))
            FROM mqcafe.session_archives
            WHERE store_id = %s AND TO_CHAR(entry_time, 'YYYY-MM') = %s
        """, (store_id, yyyy_mm))
        res2 = cur.fetchone()
        if res2 and res2[0]:
            total += res2[0]
            
        return int(total)
    except Exception as e:
        print(f"[get_monthly_revenue] ERROR: {e}")
        return 0
    finally:
        conn.close()
