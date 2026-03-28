from flask import Blueprint, request, jsonify
import uuid
import bcrypt
from models.database import get_db

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/api/register', methods=['POST'])
def register():
    """Register a new user account."""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    pin = data.get('pin', '').strip()
    is_vendor = data.get('is_vendor', 0)

    if not name or not phone or not pin:
        return jsonify({'error': 'Name, phone, and PIN are required'}), 400

    if len(pin) < 4:
        return jsonify({'error': 'PIN must be at least 4 digits'}), 400

    conn = get_db()
    cursor = conn.cursor()

    # Check if phone already exists
    cursor.execute("SELECT id FROM users WHERE phone = ?", (phone,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Phone number already registered'}), 409

    user_id = f"USR-{uuid.uuid4().hex[:8].upper()}"
    pin_hash = bcrypt.hashpw(pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    qr_data = f"meshbank://pay/{user_id}"
    public_key = data.get('public_key')

    cursor.execute(
        "INSERT INTO users (id, name, phone, pin_hash, balance, is_vendor, qr_data, public_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (user_id, name, phone, pin_hash, 0.0, is_vendor, qr_data, public_key)
    )
    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'user': {
            'id': user_id,
            'name': name,
            'phone': phone,
            'balance': 0.0,
            'is_vendor': is_vendor,
            'qr_data': qr_data
        },
        'message': 'Account created successfully!'
    }), 201


@auth_bp.route('/api/login', methods=['POST'])
def login():
    """Authenticate user with phone + PIN."""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    phone = data.get('phone', '').strip()
    pin = data.get('pin', '').strip()

    if not phone or not pin:
        return jsonify({'error': 'Phone and PIN are required'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE phone = ?", (phone,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({'error': 'Account not found'}), 404

    if not bcrypt.checkpw(pin.encode('utf-8'), user['pin_hash'].encode('utf-8')):
        return jsonify({'error': 'Invalid PIN'}), 401

    return jsonify({
        'success': True,
        'user': {
            'id': user['id'],
            'name': user['name'],
            'phone': user['phone'],
            'balance': user['balance'],
            'is_vendor': user['is_vendor'],
            'qr_data': user['qr_data']
        },
        'message': 'Login successful!'
    })


@auth_bp.route('/api/user/<user_id>', methods=['GET'])
def get_user(user_id):
    """Get user profile."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, phone, balance, is_vendor, qr_data, created_at FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({
        'user': dict(user)
    })


@auth_bp.route('/api/user/<user_id>/toggle-vendor', methods=['POST'])
def toggle_vendor(user_id):
    """Toggle vendor mode for a user."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT is_vendor FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        return jsonify({'error': 'User not found'}), 404

    new_status = 0 if user['is_vendor'] else 1
    cursor.execute("UPDATE users SET is_vendor = ? WHERE id = ?", (new_status, user_id))
    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'is_vendor': new_status,
        'message': f"Vendor mode {'enabled' if new_status else 'disabled'}"
    })
