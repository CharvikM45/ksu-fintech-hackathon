"""
MeshBank: Offline Microbank & POS Network
Flask Application Entry Point
"""
import os
import sys
from flask import Flask, send_from_directory
from flask_cors import CORS

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.database import init_db, seed_demo_data
from routes.auth import auth_bp
from routes.wallet import wallet_bp
from routes.vendor import vendor_bp
from routes.sync import sync_bp
from routes.ai import ai_bp

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
    return {'status': 'ok', 'service': 'MeshBank', 'version': '1.0.0'}


@app.route('/api/demo/reset', methods=['POST'])
def reset_demo():
    """Reset the database with demo data."""
    from models.database import get_db
    conn = get_db()
    cursor = conn.cursor()
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


if __name__ == '__main__':
    # Initialize database
    init_db()
    seed_demo_data()

    print("""
    ╔══════════════════════════════════════════╗
    ║        🏦 MeshBank Server v1.0           ║
    ║    Offline Microbank & POS Network       ║
    ╠══════════════════════════════════════════╣
    ║  Local:   http://localhost:5001           ║
    ║  Network: http://192.168.4.1:5001        ║
    ║                                          ║
    ║  Demo accounts seeded:                   ║
    ║  • Alice  (5551001) PIN: 1234            ║
    ║  • Bob    (5551002) PIN: 5678            ║
    ║  • Charlie's Coffee (5551003) PIN: 9999  ║
    ╚══════════════════════════════════════════╝
    """)

    app.run(host='0.0.0.0', port=5001, debug=True)
