from flask import Blueprint, request, jsonify
import uuid
import bcrypt
import json
from models.database import get_db

vendor_bp = Blueprint('vendor', __name__)


@vendor_bp.route('/api/vendor/request', methods=['POST'])
def create_payment_request():
    """Vendor creates a payment request (QR code)."""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    vendor_id = data.get('vendor_id', '').strip()
    amount = data.get('amount', 0)

    try:
        amount = float(amount)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid amount'}), 400

    if amount <= 0:
        return jsonify({'error': 'Amount must be greater than 0'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ? AND is_vendor = 1", (vendor_id,))
    vendor = cursor.fetchone()

    if not vendor:
        conn.close()
        return jsonify({'error': 'Vendor not found or user is not a vendor'}), 404

    request_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"
    qr_data = f"meshbank://vendor-pay/{request_id}/{vendor_id}/{amount}"

    cursor.execute(
        "INSERT INTO payment_requests (id, vendor_id, amount) VALUES (?, ?, ?)",
        (request_id, vendor_id, amount)
    )
    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'payment_request': {
            'id': request_id,
            'vendor_id': vendor_id,
            'vendor_name': vendor['name'],
            'amount': amount,
            'qr_data': qr_data
        },
        'message': f'Payment request for ${amount:.2f} created'
    })


@vendor_bp.route('/api/vendor/pay', methods=['POST'])
def pay_vendor():
    """Customer pays a vendor payment request."""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    request_id = data.get('request_id', '').strip()
    customer_id = data.get('customer_id', '').strip()
    pin = data.get('pin', '').strip()

    if not request_id or not customer_id or not pin:
        return jsonify({'error': 'Request ID, customer ID, and PIN are required'}), 400

    conn = get_db()
    cursor = conn.cursor()

    # Get payment request
    cursor.execute("SELECT * FROM payment_requests WHERE id = ? AND status = 'pending'", (request_id,))
    pay_req = cursor.fetchone()
    if not pay_req:
        conn.close()
        return jsonify({'error': 'Payment request not found or already completed'}), 404

    vendor_id = pay_req['vendor_id']
    amount = pay_req['amount']

    # Verify customer
    cursor.execute("SELECT * FROM users WHERE id = ?", (customer_id,))
    customer = cursor.fetchone()
    if not customer:
        conn.close()
        return jsonify({'error': 'Customer not found'}), 404

    # Verify PIN
    if not bcrypt.checkpw(pin.encode('utf-8'), customer['pin_hash'].encode('utf-8')):
        conn.close()
        return jsonify({'error': 'Invalid PIN'}), 401

    # Check balance
    if customer['balance'] < amount:
        conn.close()
        return jsonify({'error': 'Insufficient balance'}), 400

    # Prevent self-payment
    if customer_id == vendor_id:
        conn.close()
        return jsonify({'error': 'Cannot pay yourself'}), 400

    # Get vendor info
    cursor.execute("SELECT * FROM users WHERE id = ?", (vendor_id,))
    vendor = cursor.fetchone()

    # Fraud check
    from services.fraud_detection import assess_risk
    risk_result = assess_risk(customer_id, amount, conn, receiver_id=vendor_id)
    risk_level = risk_result['level']

    if risk_level == 'high':
        conn.close()
        return jsonify({
            'error': 'Transaction flagged for suspicious activity',
            'risk_level': risk_level,
            'risk_reasons': risk_result['reasons']
        }), 403

    # Execute payment
    cursor.execute("UPDATE users SET balance = balance - ? WHERE id = ?", (amount, customer_id))
    cursor.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (amount, vendor_id))

    txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
    cursor.execute(
        "INSERT INTO transactions (id, sender_id, receiver_id, amount, type, status, risk_level, risk_reasons, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (txn_id, customer_id, vendor_id, amount, 'vendor', 'completed', risk_level, json.dumps(risk_result['reasons']), f'Payment to {vendor["name"]}')
    )

    # Create receipt
    receipt_id = f"RCP-{uuid.uuid4().hex[:8].upper()}"
    cursor.execute(
        "INSERT INTO receipts (id, transaction_id, sender_name, receiver_name, amount, type, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (receipt_id, txn_id, customer['name'], vendor['name'], amount, 'vendor', 'completed')
    )

    # Mark payment request as completed
    cursor.execute("UPDATE payment_requests SET status = 'completed' WHERE id = ?", (request_id,))

    conn.commit()

    cursor.execute("SELECT balance FROM users WHERE id = ?", (customer_id,))
    new_balance = cursor.fetchone()['balance']
    conn.close()

    return jsonify({
        'success': True,
        'transaction': {
            'id': txn_id,
            'sender': customer['name'],
            'receiver': vendor['name'],
            'amount': amount,
            'type': 'vendor',
            'status': 'completed',
            'risk_level': risk_level,
            'receipt_id': receipt_id
        },
        'new_balance': new_balance,
        'message': f'Payment of ${amount:.2f} to {vendor["name"]} successful!'
    })



@vendor_bp.route('/api/vendor/pay-direct', methods=['POST'])
def pay_vendor_direct():
    """Customer pays a vendor directly by vendor ID and amount."""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    vendor_id = data.get('vendor_id', '').strip()
    customer_id = data.get('customer_id', '').strip()
    amount = data.get('amount', 0)
    pin = data.get('pin', '').strip()

    if not vendor_id or not customer_id or not pin or not amount:
        return jsonify({'error': 'Vendor ID, customer ID, amount, and PIN are required'}), 400

    try:
        amount = float(amount)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid amount'}), 400

    if amount <= 0:
        return jsonify({'error': 'Amount must be greater than 0'}), 400

    conn = get_db()
    cursor = conn.cursor()

    # Verify vendor
    cursor.execute("SELECT * FROM users WHERE id = ? AND is_vendor = 1", (vendor_id,))
    vendor = cursor.fetchone()
    if not vendor:
        conn.close()
        return jsonify({'error': 'Vendor not found or user is not a vendor'}), 404

    # Verify customer
    cursor.execute("SELECT * FROM users WHERE id = ?", (customer_id,))
    customer = cursor.fetchone()
    if not customer:
        conn.close()
        return jsonify({'error': 'Customer not found'}), 404

    # Verify PIN
    if not bcrypt.checkpw(pin.encode('utf-8'), customer['pin_hash'].encode('utf-8')):
        conn.close()
        return jsonify({'error': 'Invalid PIN'}), 401

    # Check balance
    if customer['balance'] < amount:
        conn.close()
        return jsonify({'error': 'Insufficient balance'}), 400

    # Prevent self-payment
    if customer_id == vendor_id:
        conn.close()
        return jsonify({'error': 'Cannot pay yourself'}), 400

    # Fraud check
    from services.fraud_detection import assess_risk
    risk_result = assess_risk(customer_id, amount, conn, receiver_id=vendor_id)
    risk_level = risk_result['level']

    if risk_level == 'high':
        conn.close()
        return jsonify({
            'error': 'Transaction flagged for suspicious activity',
            'risk_level': risk_level,
            'risk_reasons': risk_result['reasons']
        }), 403

    # Execute payment
    cursor.execute("UPDATE users SET balance = balance - ? WHERE id = ?", (amount, customer_id))
    cursor.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (amount, vendor_id))

    txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
    cursor.execute(
        "INSERT INTO transactions (id, sender_id, receiver_id, amount, type, status, risk_level, risk_reasons, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (txn_id, customer_id, vendor_id, amount, 'vendor', 'completed', risk_level, json.dumps(risk_result['reasons']), f'Direct payment to {vendor["name"]}')
    )

    receipt_id = f"RCP-{uuid.uuid4().hex[:8].upper()}"
    cursor.execute(
        "INSERT INTO receipts (id, transaction_id, sender_name, receiver_name, amount, type, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (receipt_id, txn_id, customer['name'], vendor['name'], amount, 'vendor', 'completed')
    )

    conn.commit()

    cursor.execute("SELECT balance FROM users WHERE id = ?", (customer_id,))
    new_balance = cursor.fetchone()['balance']
    conn.close()

    return jsonify({
        'success': True,
        'transaction': {
            'id': txn_id,
            'sender': customer['name'],
            'receiver': vendor['name'],
            'amount': amount,
            'type': 'vendor',
            'status': 'completed',
            'risk_level': risk_level,
            'receipt_id': receipt_id
        },
        'new_balance': new_balance,
        'message': f'Payment of ${amount:.2f} to {vendor["name"]} successful!'
    })


@vendor_bp.route('/api/vendor/dashboard/<user_id>', methods=['GET'])
def vendor_dashboard(user_id):
    """Get vendor dashboard stats."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE id = ? AND is_vendor = 1", (user_id,))
    vendor = cursor.fetchone()
    if not vendor:
        conn.close()
        return jsonify({'error': 'Vendor not found'}), 404

    # Total revenue
    cursor.execute("""
        SELECT COALESCE(SUM(amount), 0) as total_revenue,
               COUNT(*) as total_transactions
        FROM transactions
        WHERE receiver_id = ? AND type = 'vendor' AND status = 'completed'
    """, (user_id,))
    stats = cursor.fetchone()

    # Today's revenue
    cursor.execute("""
        SELECT COALESCE(SUM(amount), 0) as today_revenue,
               COUNT(*) as today_transactions
        FROM transactions
        WHERE receiver_id = ? AND type = 'vendor' AND status = 'completed'
        AND date(created_at) = date('now')
    """, (user_id,))
    today = cursor.fetchone()

    # Recent transactions
    cursor.execute("""
        SELECT t.*, s.name as customer_name
        FROM transactions t
        JOIN users s ON t.sender_id = s.id
        WHERE t.receiver_id = ? AND t.type = 'vendor'
        ORDER BY t.created_at DESC
        LIMIT 10
    """, (user_id,))
    recent = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return jsonify({
        'vendor': {
            'name': vendor['name'],
            'balance': vendor['balance']
        },
        'stats': {
            'total_revenue': stats['total_revenue'],
            'total_transactions': stats['total_transactions'],
            'today_revenue': today['today_revenue'],
            'today_transactions': today['today_transactions']
        },
        'recent_transactions': recent
    })
