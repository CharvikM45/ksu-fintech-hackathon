-- MeshBank Database Schema
-- SQLite local ledger-based banking system

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    pin_hash TEXT NOT NULL,
    balance REAL DEFAULT 0.0,
    is_vendor INTEGER DEFAULT 0,
    qr_data TEXT,
    public_key TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('p2p', 'vendor', 'deposit', 'withdrawal')),
    status TEXT DEFAULT 'completed' CHECK(status IN ('completed', 'pending', 'failed', 'flagged')),
    risk_level TEXT DEFAULT 'low' CHECK(risk_level IN ('low', 'medium', 'high')),
    risk_reasons TEXT,
    note TEXT,
    idempotency_key TEXT,
    signature TEXT,
    synced INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL UNIQUE,
    sender_name TEXT NOT NULL,
    receiver_name TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

CREATE TABLE IF NOT EXISTS payment_requests (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS money_requests (
    id TEXT PRIMARY KEY,
    requester_id TEXT NOT NULL,
    target_phone TEXT NOT NULL,
    amount REAL NOT NULL,
    note TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'declined')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS credit_scores (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    score INTEGER DEFAULT 0,
    income_stability REAL DEFAULT 0,
    spending_consistency REAL DEFAULT 0,
    payment_regularity REAL DEFAULT 0,
    balance_trend REAL DEFAULT 0,
    account_age_days INTEGER DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    risk_category TEXT DEFAULT 'unscored' CHECK(risk_category IN ('unscored', 'high_risk', 'moderate', 'good', 'excellent')),
    max_loan_eligible REAL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    interest_rate REAL DEFAULT 0.05,
    total_due REAL NOT NULL,
    amount_paid REAL DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'repaid', 'defaulted', 'pending')),
    due_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    repaid_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_transactions_synced ON transactions(synced);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_credit_scores_user ON credit_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_money_requests_target ON money_requests(target_phone);

