import os
import sys
# Add backend to path to import db modules
sys.path.append(os.path.abspath('backend'))

from db.study_cafe_db import get_owner_by_phone
from db.connection import get_db_conn
import hashlib

phone = "010-8281-7377"
owner = get_owner_by_phone(phone)
if owner:
    print(f"Owner found! ID: {owner['id']}")
    print(f"Password hash in DB: {owner['password_hash']}")
    
    # Check if hash matches '1212'
    test_hash = hashlib.sha256('1212'.encode()).hexdigest()
    print(f"Hash of '1212':      {test_hash}")
    
    if owner['password_hash'] == test_hash:
        print("Passwords match!")
    else:
        print("Passwords DO NOT match!")
        
        # Reset password to 1212
        print("Resetting password to 1212...")
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute("UPDATE owners SET password_hash = %s WHERE phone = %s", (test_hash, phone))
        conn.commit()
        conn.close()
        print("Password reset successfully!")
else:
    print(f"Owner with phone {phone} NOT found in DB!")
