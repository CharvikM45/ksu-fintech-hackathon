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
    try:
        conn.execute("ALTER TABLE transactions ADD COLUMN risk_reasons TEXT")
    except sqlite3.OperationalError:
        pass # Column already exists
        
    conn.commit()
    conn.close()


def seed_demo_data():
    """Seed demo data for hackathon demonstration."""
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
            'balance': 5000.00,
            'is_vendor': 0,
            'created_at': (now - datetime.timedelta(days=10)).isoformat()
        },
        {
            'id': 'USR-002',
            'name': 'Bob Smith',
            'phone': '5551002',
            'pin': '5678',
            'balance': 3000.00,
            'is_vendor': 0,
            'created_at': (now - datetime.timedelta(days=5)).isoformat()
        },
        {
            'id': 'USR-003',
            'name': "Charlie's Coffee",
            'phone': '5551003',
            'pin': '9999',
            'balance': 10000.00,
            'is_vendor': 1,
            'created_at': (now - datetime.timedelta(days=30)).isoformat()
        }
    ]

    for user in demo_users:
        pin_hash = bcrypt.hashpw(user['pin'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        qr_data = f"meshbank://pay/{user['id']}"
        cursor.execute(
            "INSERT INTO users (id, name, phone, pin_hash, balance, is_vendor, qr_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (user['id'], user['name'], user['phone'], pin_hash, user['balance'], user['is_vendor'], qr_data, user['created_at'])
        )

    # Seed transactions for Alice (10 days) and Bob (5 days)
    demo_txns = []
    
    # Alice spends $20 daily over the last 9 days
    for i in range(1, 10):
        demo_txns.append({
            'sender_id': 'USR-001',
            'receiver_id': 'USR-003',
            'amount': 20.00 + i,
            'type': 'vendor',
            'note': 'Coffee order',
            'created_at': (now - datetime.timedelta(days=i, hours=2)).isoformat()
        })
        
    # Bob spends $50 daily over the last 4 days
    for i in range(1, 5):
        demo_txns.append({
            'sender_id': 'USR-002',
            'receiver_id': 'USR-003',
            'amount': 50.00 + i,
            'type': 'vendor',
            'note': 'Lunch',
            'created_at': (now - datetime.timedelta(days=i, hours=5)).isoformat()
        })
        
    # Alice sends Bob some money mutually
    demo_txns.append({
            'sender_id': 'USR-001',
            'receiver_id': 'USR-002',
            'amount': 150.00,
            'type': 'p2p',
            'note': 'Owe you for dinner',
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

    conn.commit()
    conn.close()
    print("✅ Demo data seeded successfully with historical ranges!")
