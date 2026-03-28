import sqlite3
import os
import uuid
import bcrypt

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'database', 'meshbank.db')
SCHEMA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'database', 'schema.sql')


def get_db():
    """Get a database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Initialize the database with schema."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db()
    with open(SCHEMA_PATH, 'r') as f:
        conn.executescript(f.read())
    
    # Quick migration for existing databases
    migrations = [
        "ALTER TABLE transactions ADD COLUMN risk_reasons TEXT",
        "ALTER TABLE users ADD COLUMN public_key TEXT",
        "ALTER TABLE transactions ADD COLUMN idempotency_key TEXT",
        "ALTER TABLE transactions ADD COLUMN signature TEXT",
        "ALTER TABLE users ADD COLUMN profile_type TEXT DEFAULT 'individual'",
        "ALTER TABLE users ADD COLUMN occupation TEXT",
        "ALTER TABLE users ADD COLUMN monthly_income REAL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN business_name TEXT",
        "ALTER TABLE credit_scores ADD COLUMN profile_bonus REAL DEFAULT 0",
        """CREATE TABLE IF NOT EXISTS fraud_reports (
            id TEXT PRIMARY KEY,
            reporter_id TEXT NOT NULL,
            reported_id TEXT NOT NULL,
            transaction_id TEXT,
            reason TEXT NOT NULL,
            details TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"""
    ]
    for sql in migrations:
        try:
            conn.execute(sql)
        except sqlite3.OperationalError:
            pass  # Column already exists
        
    conn.commit()
    conn.close()


def seed_demo_data():
    """Seed demo data for hackathon demonstration with diverse TrustScore profiles."""
    conn = get_db()
    cursor = conn.cursor()

    # Check if data already seeded
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

    import datetime
    now = datetime.datetime.now()
    demo_users = [
        {
            'id': 'USR-001',
            'name': 'Alice Johnson',
            'phone': '5551001',
            'pin': '1234',
            'balance': 800.00,
            'is_vendor': 0,
            'profile_type': 'student',
            'occupation': 'College Student — Part-time Barista',
            'monthly_income': 450.00,
            'business_name': None,
            'created_at': (now - datetime.timedelta(days=14)).isoformat()
        },
        {
            'id': 'USR-002',
            'name': 'Bob Smith',
            'phone': '5551002',
            'pin': '5678',
            'balance': 3200.00,
            'is_vendor': 0,
            'profile_type': 'freelancer',
            'occupation': 'Freelance Software Developer',
            'monthly_income': 2800.00,
            'business_name': None,
            'created_at': (now - datetime.timedelta(days=45)).isoformat()
        },
        {
            'id': 'USR-003',
            'name': "Charlie's Coffee",
            'phone': '5551003',
            'pin': '9999',
            'balance': 25000.00,
            'is_vendor': 1,
            'profile_type': 'vendor',
            'occupation': 'Coffee Shop Owner',
            'monthly_income': 8500.00,
            'business_name': "Charlie's Coffee House",
            'created_at': (now - datetime.timedelta(days=120)).isoformat()
        },
        {
            'id': 'USR-004',
            'name': 'David Park',
            'phone': '5551004',
            'pin': '4321',
            'balance': 18000.00,
            'is_vendor': 0,
            'profile_type': 'businessman',
            'occupation': 'CEO & Founder',
            'monthly_income': 12000.00,
            'business_name': "Park Tech Solutions LLC",
            'created_at': (now - datetime.timedelta(days=180)).isoformat()
        },
        {
            'id': 'USR-005',
            'name': 'Elena Rodriguez',
            'phone': '5551005',
            'pin': '1111',
            'balance': 1200.00,
            'is_vendor': 0,
            'profile_type': 'student',
            'occupation': 'Graduate Student — Research Assistant',
            'monthly_income': 1800.00,
            'business_name': None,
            'created_at': (now - datetime.timedelta(days=60)).isoformat()
        }
    ]

    for user in demo_users:
        pin_hash = bcrypt.hashpw(user['pin'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        qr_data = f"meshbank://pay/{user['id']}"
        cursor.execute(
            """INSERT INTO users (id, name, phone, pin_hash, balance, is_vendor, profile_type, occupation, monthly_income, business_name, qr_data, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user['id'], user['name'], user['phone'], pin_hash, user['balance'], user['is_vendor'],
             user['profile_type'], user['occupation'], user['monthly_income'], user['business_name'],
             qr_data, user['created_at'])
        )

    # ---- Transaction Histories ----
    demo_txns = []

    # Alice (Student) — small, sporadic purchases over 12 days
    for i in range(1, 10):
        demo_txns.append({
            'sender_id': 'USR-001',
            'receiver_id': 'USR-003',
            'amount': 5.00 + (i % 4),
            'type': 'vendor',
            'note': 'Coffee & snack',
            'created_at': (now - datetime.timedelta(days=i, hours=8)).isoformat()
        })

    # Bob (Freelancer) — irregular but larger payments, some p2p
    for i in [2, 5, 8, 14, 20, 28]:
        demo_txns.append({
            'sender_id': 'USR-002',
            'receiver_id': 'USR-003',
            'amount': 35.00 + (i * 2),
            'type': 'vendor',
            'note': 'Working lunch',
            'created_at': (now - datetime.timedelta(days=i, hours=12)).isoformat()
        })
    # Bob receives freelance payments
    for i in [3, 10, 18, 25]:
        demo_txns.append({
            'sender_id': 'USR-004',
            'receiver_id': 'USR-002',
            'amount': 500.00 + (i * 10),
            'type': 'p2p',
            'note': 'Contract payment',
            'created_at': (now - datetime.timedelta(days=i, hours=14)).isoformat()
        })

    # David (Businessman) — high-volume, consistent daily transactions
    for i in range(1, 25):
        demo_txns.append({
            'sender_id': 'USR-004',
            'receiver_id': 'USR-003',
            'amount': 25.00 + (i % 5) * 5,
            'type': 'vendor',
            'note': 'Team lunch / supplies',
            'created_at': (now - datetime.timedelta(days=i, hours=12)).isoformat()
        })
    # David also does p2p regularly
    for i in range(1, 10):
        demo_txns.append({
            'sender_id': 'USR-004',
            'receiver_id': 'USR-001',
            'amount': 50.00,
            'type': 'p2p',
            'note': 'Internship stipend',
            'created_at': (now - datetime.timedelta(days=i*3, hours=9)).isoformat()
        })

    # Elena (Grad Student) — very consistent small daily transactions
    for i in range(1, 30):
        demo_txns.append({
            'sender_id': 'USR-005',
            'receiver_id': 'USR-003',
            'amount': 8.00,
            'type': 'vendor',
            'note': 'Daily coffee',
            'created_at': (now - datetime.timedelta(days=i, hours=7)).isoformat()
        })
    # Elena receives monthly stipend
    for i in [5, 35]:
        demo_txns.append({
            'sender_id': 'USR-004',
            'receiver_id': 'USR-005',
            'amount': 900.00,
            'type': 'p2p',
            'note': 'Research stipend',
            'created_at': (now - datetime.timedelta(days=i, hours=10)).isoformat()
        })

    # Alice sends Bob some money
    demo_txns.append({
        'sender_id': 'USR-001',
        'receiver_id': 'USR-002',
        'amount': 25.00,
        'type': 'p2p',
        'note': 'Split dinner',
        'created_at': (now - datetime.timedelta(days=2, hours=10)).isoformat()
    })

    for txn in demo_txns:
        txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
        cursor.execute(
            "INSERT INTO transactions (id, sender_id, receiver_id, amount, type, status, risk_level, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (txn_id, txn['sender_id'], txn['receiver_id'], txn['amount'], txn['type'], 'completed', 'low', txn['note'], txn['created_at'])
        )
        # Create receipt
        sender = next((u for u in demo_users if u['id'] == txn['sender_id']), None)
        receiver = next((u for u in demo_users if u['id'] == txn['receiver_id']), None)
        if sender and receiver:
            cursor.execute(
                "INSERT INTO receipts (id, transaction_id, sender_name, receiver_name, amount, type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (f"RCP-{uuid.uuid4().hex[:8].upper()}", txn_id, sender['name'], receiver['name'], txn['amount'], txn['type'], 'completed', txn['created_at'])
            )
    # ---- Fraud Reports ----
    # Alice reports Bob for 'Fake Money'
    cursor.execute(
        "INSERT INTO fraud_reports (id, reporter_id, reported_id, transaction_id, reason, details, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ('FRD-001', 'USR-001', 'USR-002', None, 'Fake Money', 'Gave me a fake $20 bill at the meetup.', 'confirmed')
    )

    conn.commit()
    conn.close()
    print("✅ Demo data seeded with 5 TrustScore user profiles!")
