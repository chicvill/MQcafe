import psycopg2
import hashlib

DB_URL = "postgresql://postgres:mysecretpassword@localhost:5432/mqcafe_db"

def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    phone = "010-8281-7377"
    cur.execute("SELECT id, phone, password_hash FROM owners WHERE phone = %s", (phone,))
    owner = cur.fetchone()
    
    if owner:
        print(f"Found owner: {owner}")
        new_hash = hashlib.sha256('1212'.encode()).hexdigest()
        cur.execute("UPDATE owners SET password_hash = %s WHERE phone = %s", (new_hash, phone))
        conn.commit()
        print(f"Password for {phone} has been reset to 1212 (hash: {new_hash})")
    else:
        print(f"Owner {phone} NOT FOUND.")
        
    conn.close()

if __name__ == "__main__":
    main()
