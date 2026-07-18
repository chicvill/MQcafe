import psycopg2

DB_URL = "postgresql://postgres:mysecretpassword@localhost:5432/mqcafe_db"

def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    # Check if 01082817377 exists
    cur.execute("SELECT id FROM owners WHERE phone = '01082817377'")
    if cur.fetchone():
        print("Found old phone format. Updating to 010-8281-7377...")
        cur.execute("UPDATE owners SET phone = '010-8281-7377' WHERE phone = '01082817377'")
        conn.commit()
        print("Phone updated successfully!")
    else:
        print("Old phone format not found. Maybe already updated?")
        
    conn.close()

if __name__ == "__main__":
    main()
