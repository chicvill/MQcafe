import psycopg2
from psycopg2 import pool as pg_pool
from psycopg2.extras import RealDictCursor
import os
import json
from datetime import datetime
from dotenv import load_dotenv, find_dotenv

# .env 파일 로드
load_dotenv(find_dotenv(), override=True)
DATABASE_URL = os.getenv("DATABASE_URL")
CLOUD_DATABASE_URL = os.getenv("CLOUD_DATABASE_URL")

_connection_pool = None
_cloud_connection_pool = None

def _get_pool():
    global _connection_pool
    if not DATABASE_URL:
        # 로컬 테스트 편의를 위해 환경변수가 없을 경우 에러 대신 안내 처리
        raise ValueError("DATABASE_URL environment variable is missing!")
    if _connection_pool is None or _connection_pool.closed:
        _connection_pool = pg_pool.ThreadedConnectionPool(2, 10, dsn=DATABASE_URL)
    return _connection_pool

def _get_cloud_pool():
    global _cloud_connection_pool
    if not CLOUD_DATABASE_URL:
        raise ValueError("CLOUD_DATABASE_URL environment variable is missing!")
    if _cloud_connection_pool is None or _cloud_connection_pool.closed:
        _cloud_connection_pool = pg_pool.ThreadedConnectionPool(1, 5, dsn=CLOUD_DATABASE_URL)
    return _cloud_connection_pool

class SafeConnectionWrapper:
    def __init__(self, conn):
        self._conn = conn
        self._closed = False

    def cursor(self, *args, **kwargs):
        cur = self._conn.cursor(*args, **kwargs)
        return SafeCursorWrapper(cur, self)

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        if not self._closed:
            try:
                self._conn.close()
            except:
                pass
            self._closed = True

    def __getattr__(self, name):
        return getattr(self._conn, name)

    def __del__(self):
        self.close()

class SafeCursorWrapper:
    def __init__(self, cur, conn_wrapper):
        self._cur = cur
        self._conn_wrapper = conn_wrapper
        self._closed = False

    def close(self):
        if not self._closed:
            try:
                self._cur.close()
            except:
                pass
            self._closed = True

    def __iter__(self):
        return iter(self._cur)

    def __next__(self):
        return next(self._cur)

    def __getattr__(self, name):
        return getattr(self._cur, name)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def __del__(self):
        self.close()

class PooledConnectionWrapper(SafeConnectionWrapper):
    def __init__(self, conn, pool):
        super().__init__(conn)
        self._pool = pool

    def close(self):
        if not self._closed:
            try:
                if not self._conn.closed:
                    self._conn.rollback()
                self._pool.putconn(self._conn)
            except Exception:
                try:
                    self._conn.close()
                except Exception:
                    pass
            self._closed = True

    def __del__(self):
        self.close()

def get_db_conn():
    try:
        pool = _get_pool()
        raw = pool.getconn()
        raw.autocommit = False
        raw.set_client_encoding('UTF8')
        return PooledConnectionWrapper(raw, pool)
    except Exception as e:
        print(f"DB Connection Error: {e}")
        raise e

def get_cloud_db_conn():
    try:
        pool = _get_cloud_pool()
        raw = pool.getconn()
        raw.autocommit = False
        raw.set_client_encoding('UTF8')
        return PooledConnectionWrapper(raw, pool)
    except Exception as e:
        print(f"Cloud DB Connection Error: {e}")
        return None

def init_db():
    """mqcafe 스키마 생성 및 전용 테이블 구축"""
    conn = get_db_conn()
    try:
        cur = conn.cursor()
        
        # 0. 스터디 카페 전용 스키마 생성
        cur.execute("CREATE SCHEMA IF NOT EXISTS mqcafe;")
        
        # 1. 매장 및 점주 테이블 생성
        cur.execute("""
            CREATE TABLE IF NOT EXISTS owners (
                id TEXT PRIMARY KEY,
                phone TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)

        # 1.5 Render 및 DB Keep-Alive 유휴방지 테이블 생성
        cur.execute("""
            CREATE TABLE IF NOT EXISTS mqcafe.keep_alive (
                id SERIAL PRIMARY KEY,
                val INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS stores (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                ceo_name TEXT NOT NULL,
                metadata JSONB DEFAULT '{}',
                owner_id TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        conn.commit() # Commit table creations before attempting ALTERs
        
        # 기존 테이블이 있을 수 있으므로 컬럼 추가
        try:
            cur.execute("ALTER TABLE stores ADD COLUMN metadata JSONB DEFAULT '{}';")
            conn.commit()
        except Exception:
            conn.rollback()
            cur = conn.cursor()
            
        try:
            cur.execute("ALTER TABLE owners ADD COLUMN metadata JSONB DEFAULT '{}';")
            conn.commit()
        except Exception:
            conn.rollback()
            cur = conn.cursor()
            
        try:
            cur.execute("ALTER TABLE stores ADD COLUMN owner_id TEXT;")
            conn.commit()
        except Exception:
            conn.rollback()
            cur = conn.cursor()
        
        # 2. 세션 대장 테이블 (table_sessions)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS table_sessions (
                session_id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL,
                table_id TEXT NOT NULL,
                status TEXT DEFAULT 'active', -- active, outing, closed
                checkin_time TEXT NOT NULL,
                checkout_time TEXT,
                metadata JSONB DEFAULT '{}',
                version INTEGER NOT NULL DEFAULT 1
            )
        """)
        
        # 3. AI 지식 창고 및 매출 요약 테이블 (knowledge_bundles)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS knowledge_bundles (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL, -- e.g., 'StudyCafeStats'
                store_id TEXT NOT NULL,
                title TEXT NOT NULL,
                items JSONB NOT NULL DEFAULT '[]',
                timestamp TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        
        # 4. NFC 등록 카드 테이블 (nfc_cards)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS nfc_cards (
                uid TEXT PRIMARY KEY,
                user_name TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        # 5. 인덱스 생성
        cur.execute("CREATE INDEX IF NOT EXISTS idx_mqcafe_sessions_store_table ON table_sessions(store_id, table_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_mqcafe_knowledge_store ON knowledge_bundles(store_id);")
        
        # 6. 테스트용 기본 매장 데이터 삽입 (없는 경우에만)
        default_metadata = {
            "business_registration_number": "123-45-67890",
            "business_address": "기본 매장 주소",
            "seat_config": {
                "open": 12,
                "focus": 6,
                "study_room": 2
            },
            "ticket_prices": {
                "time": [
                    {"hours": 2, "price": 3000},
                    {"hours": 4, "price": 5000},
                    {"hours": 6, "price": 7000},
                    {"hours": 12, "price": 10000}
                ],
                "day": [
                    {"hours": 12, "price": 10000}
                ],
                "period": [
                    {"days": 14, "price": 60000},
                    {"days": 28, "price": 110000}
                ]
            }
        }
        
        cur.execute("SELECT COUNT(*) FROM owners WHERE id = 'default-owner';")
        if cur.fetchone()[0] == 0:
            cur.execute("""
                INSERT INTO owners (id, phone, password_hash)
                VALUES (%s, %s, %s);
            """, ('default-owner', '01012345678', 'dummy_hash'))

        cur.execute("SELECT COUNT(*) FROM stores WHERE id = 'ST001';")
        if cur.fetchone()[0] == 0:
            cur.execute("""
                INSERT INTO stores (id, name, ceo_name, metadata, owner_id)
                VALUES (%s, %s, %s, %s::jsonb, %s);
            """, ('ST001', 'MQcafe 합정 안내점', '민병철', json.dumps(default_metadata), 'default-owner'))
            
        cur.execute("SELECT COUNT(*) FROM stores WHERE id = 'mqcafe-store-2';")
        if cur.fetchone()[0] == 0:
            cur.execute("""
                INSERT INTO stores (id, name, ceo_name, metadata, owner_id)
                VALUES (%s, %s, %s, %s::jsonb, %s);
            """, ('mqcafe-store-2', 'MQcafe 일산 주엽점', '홍길동', json.dumps(default_metadata), 'default-owner'))
            
        # 기존에 생성된 매장들에 대한 마이그레이션
        cur.execute("UPDATE stores SET metadata = %s::jsonb WHERE metadata = '{}'::jsonb OR metadata IS NULL;", (json.dumps(default_metadata),))
        cur.execute("UPDATE stores SET owner_id = 'default-owner' WHERE owner_id IS NULL;")
        
        conn.commit()
        cur.close()
        conn.close()
        print("[OK] mqcafe schema & tables initialized successfully.")
    except Exception as e:
        conn.rollback()
        print(f"[ERR] DB Init Error: {e}")
        raise e

