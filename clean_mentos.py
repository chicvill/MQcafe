import sys
import os
import json
from dotenv import load_dotenv

sys.path.append(os.path.abspath('backend'))
load_dotenv(os.path.abspath('backend/.env'), override=True)

from db.connection import get_db_conn

def clean_mentos():
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute('SELECT id, metadata FROM stores')
    stores = cur.fetchall()
    changed = 0
    for s in stores:
        meta_str = json.dumps(s[1], ensure_ascii=False)
        if '멘토스' in meta_str:
            new_meta = json.loads(meta_str.replace('멘토스', 'MQnet'))
            cur.execute('UPDATE stores SET metadata = %s WHERE id = %s', (json.dumps(new_meta), s[0]))
            changed += 1
    conn.commit()
    print(f'Updated {changed} stores in DB.')

if __name__ == '__main__':
    clean_mentos()
