import psycopg2
import hashlib

DB_URL = "postgresql://postgres.txdpdcarkeecejmsyklu:minkim5053supabase@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    phone = "010-8281-7377"
    cur.execute("SELECT id, phone, password_hash FROM stcafe.owners WHERE phone = %s", (phone,))
    owner = cur.fetchone()
    
    if owner:
        print(f"Found owner: {owner}")
        new_hash = hashlib.sha256('1212'.encode()).hexdigest()
        cur.execute("UPDATE stcafe.owners SET password_hash = %s WHERE phone = %s", (new_hash, phone))
        conn.commit()
        print(f"Password for {phone} has been reset to 1212 (hash: {new_hash})")
    else:
        print(f"Owner {phone} NOT FOUND.")
        
    conn.close()

if __name__ == "__main__":
    main()
