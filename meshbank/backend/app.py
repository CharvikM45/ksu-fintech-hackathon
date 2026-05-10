"""
Bankify: Offline Microbank & POS Network
Flask Application Entry Point
"""
import os
import sys
import uuid
from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.database import init_db, seed_demo_data
from routes.auth import auth_bp
from routes.wallet import wallet_bp
from routes.vendor import vendor_bp
from routes.sync import sync_bp
from routes.ai import ai_bp
from routes.credit import credit_bp

app = Flask(__name__,
            static_folder=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend'),
            static_url_path='')

CORS(app)

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(wallet_bp)
app.register_blueprint(vendor_bp)
app.register_blueprint(sync_bp)
app.register_blueprint(ai_bp)
app.register_blueprint(credit_bp)


@app.route('/')
def serve_frontend():
    """Serve the frontend SPA."""
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files."""
    return send_from_directory(app.static_folder, path)


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return {'status': 'ok', 'service': 'Bankify', 'version': '1.0.0'}


@app.route('/api/demo/reset', methods=['POST'])
def reset_demo():
    """Reset the database with demo data."""
    from models.database import get_db
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM loans")
    cursor.execute("DELETE FROM credit_scores")
    cursor.execute("DELETE FROM money_requests")
    cursor.execute("DELETE FROM receipts")
    cursor.execute("DELETE FROM payment_requests")
    cursor.execute("DELETE FROM transactions")
    cursor.execute("DELETE FROM users")
    conn.commit()
    conn.close()
    seed_demo_data()
    return {'success': True, 'message': 'Demo data has been reset!'}


@app.route('/api/users', methods=['GET'])
def list_users():
    """List all users (for demo purposes)."""
    from models.database import get_db
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, phone, balance, is_vendor, qr_data, created_at FROM users")
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {'users': users}


@app.route('/api/user-by-phone/<phone>', methods=['GET'])
def get_user_by_phone(phone):
    """Find a user by their phone number for reporting/searching."""
    from models.database import get_db
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, phone, profile_type, is_vendor FROM users WHERE phone = ?", (phone,))
    user = cursor.fetchone()
    conn.close()
    if user:
        return jsonify(dict(user))
    return jsonify({'error': 'User not found'}), 404

@app.route('/api/report-fraud', methods=['POST'])
def report_fraud():
    """Submit a fraud report for fake money or other scams."""
    from models.database import get_db
    data = request.json
    reporter_id = data.get('reporter_id')
    reported_id = data.get('reported_id')
    transaction_id = data.get('transaction_id')
    reason = data.get('reason')
    details = data.get('details', '')

    if not reporter_id or not reported_id or not reason:
        return jsonify({'error': 'Missing required fields'}), 400

    conn = get_db()
    try:
        cursor = conn.cursor()
        report_id = f"FRD-{uuid.uuid4().hex[:8].upper()}"
        cursor.execute(
            """INSERT INTO fraud_reports (id, reporter_id, reported_id, transaction_id, reason, details, status) 
            VALUES (?, ?, ?, ?, ?, ?, 'pending')""",
            (report_id, reporter_id, reported_id, transaction_id, reason, details)
        )
        conn.commit()
        return jsonify({'message': 'Report submitted successfully. Our security team will review it.', 'report_id': report_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


if __name__ == '__main__':
    # Initialize database
    init_db()
    seed_demo_data()

    print("""
    ╔══════════════════════════════════════════╗
    ║        🏦 Bankify Server v1.0            ║
    ║    Offline Microbank & POS Network       ║
    ╠══════════════════════════════════════════╣
    ║  Local:   http://localhost:5001           ║
    ║  Network: http://192.168.4.1:5001        ║
    ║                                          ║
    ║  Demo accounts seeded:                   ║
    ║  • Alice  (5551001) PIN: 1234            ║
    ║  • Bob    (5551002) PIN: 5678            ║
    ║  • David  (5551004) PIN: 4321            ║
    ║  • Charlie's Coffee (5551003) PIN: 9999  ║
    ╚══════════════════════════════════════════╝
    """)

    app.run(host='0.0.0.0', port=5001, debug=True)
