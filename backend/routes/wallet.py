from flask import Blueprint, request, jsonify
import uuid
import bcrypt
from models.database import get_db

wallet_bp = Blueprint('wallet', __name__)


@wallet_bp.route('/api/balance/<user_id>', methods=['GET'])
def get_balance(user_id):
    """Get user's current balance."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT balance, name FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({
        'balance': user['balance'],
        'name': user['name']
    })


@wallet_bp.route('/api/transfer', methods=['POST'])
def transfer():
    """P2P money transfer between users."""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    sender_id = data.get('sender_id', '').strip()
    receiver_id = data.get('receiver_id', '').strip()
    receiver_phone = data.get('receiver_phone', '').strip()
    amount = data.get('amount', 0)
    pin = data.get('pin', '').strip()
    note = data.get('note', '')

    if not sender_id or not pin:
        return jsonify({'error': 'Sender ID and PIN are required'}), 400

    if not receiver_id and not receiver_phone:
        return jsonify({'error': 'Receiver ID or phone number is required'}), 400

    try:
        amount = float(amount)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid amount'}), 400

    if amount <= 0:
        return jsonify({'error': 'Amount must be greater than 0'}), 400

    conn = get_db()
    cursor = conn.cursor()

    # Verify sender
    cursor.execute("SELECT * FROM users WHERE id = ?", (sender_id,))
    sender = cursor.fetchone()
    if not sender:
        conn.close()
        return jsonify({'error': 'Sender not found'}), 404

    # Verify PIN
    if not bcrypt.checkpw(pin.encode('utf-8'), sender['pin_hash'].encode('utf-8')):
        conn.close()
        return jsonify({'error': 'Invalid PIN'}), 401

    # Check balance
    if sender['balance'] < amount:
        conn.close()
        return jsonify({'error': 'Insufficient balance'}), 400

    # Find receiver
    if receiver_phone and not receiver_id:
        cursor.execute("SELECT * FROM users WHERE phone = ?", (receiver_phone,))
        receiver = cursor.fetchone()
        if not receiver:
            conn.close()
            return jsonify({'error': 'Receiver not found'}), 404
        receiver_id = receiver['id']
    else:
        cursor.execute("SELECT * FROM users WHERE id = ?", (receiver_id,))
        receiver = cursor.fetchone()
        if not receiver:
            conn.close()
            return jsonify({'error': 'Receiver not found'}), 404

    # Prevent self-transfer
    if sender_id == receiver_id:
        conn.close()
        return jsonify({'error': 'Cannot transfer to yourself'}), 400

    # Check for duplicate transactions (same sender, receiver, amount within 10 seconds)
    cursor.execute("""
        SELECT id FROM transactions 
        WHERE sender_id = ? AND receiver_id = ? AND amount = ? 
        AND created_at > datetime('now', '-10 seconds')
    """, (sender_id, receiver_id, amount))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Duplicate transaction detected. Please wait a moment.'}), 429

    # Perform fraud check
    from services.fraud_detection import assess_risk
    risk_level = assess_risk(sender_id, amount, conn)

    # Execute transfer
    txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
    txn_status = 'completed' if risk_level != 'high' else 'flagged'

    if txn_status == 'flagged':
        conn.close()
        return jsonify({
            'error': 'Transaction flagged for suspicious activity',
            'risk_level': risk_level,
            'transaction_id': txn_id
        }), 403

    # Deduct and add balances
    cursor.execute("UPDATE users SET balance = balance - ? WHERE id = ?", (amount, sender_id))
    cursor.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (amount, receiver_id))

    # Record transaction
    cursor.execute(
        "INSERT INTO transactions (id, sender_id, receiver_id, amount, type, status, risk_level, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (txn_id, sender_id, receiver_id, amount, 'p2p', txn_status, risk_level, note)
    )

    # Create receipt
    receipt_id = f"RCP-{uuid.uuid4().hex[:8].upper()}"
    cursor.execute(
        "INSERT INTO receipts (id, transaction_id, sender_name, receiver_name, amount, type, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (receipt_id, txn_id, sender['name'], receiver['name'], amount, 'p2p', txn_status)
    )

    conn.commit()

    # Get updated balances
    cursor.execute("SELECT balance FROM users WHERE id = ?", (sender_id,))
    new_balance = cursor.fetchone()['balance']
    conn.close()

    return jsonify({
        'success': True,
        'transaction': {
            'id': txn_id,
            'sender': sender['name'],
            'receiver': receiver['name'],
            'amount': amount,
            'type': 'p2p',
            'status': txn_status,
            'risk_level': risk_level,
            'note': note,
            'receipt_id': receipt_id
        },
        'new_balance': new_balance,
        'message': f'Successfully sent ${amount:.2f} to {receiver["name"]}'
    })


@wallet_bp.route('/api/transactions/<user_id>', methods=['GET'])
def get_transactions(user_id):
    """Get transaction history for a user."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'User not found'}), 404

    cursor.execute("""
        SELECT t.*, 
               s.name as sender_name, 
               r.name as receiver_name
        FROM transactions t
        JOIN users s ON t.sender_id = s.id
        JOIN users r ON t.receiver_id = r.id
        WHERE t.sender_id = ? OR t.receiver_id = ?
        ORDER BY t.created_at DESC
        LIMIT 50
    """, (user_id, user_id))

    transactions = []
    for row in cursor.fetchall():
        txn = dict(row)
        txn['direction'] = 'sent' if txn['sender_id'] == user_id else 'received'
        transactions.append(txn)

    conn.close()

    return jsonify({
        'transactions': transactions,
        'count': len(transactions)
    })


@wallet_bp.route('/api/receipt/<txn_id>', methods=['GET'])
def get_receipt(txn_id):
    """Get digital receipt for a transaction."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM receipts WHERE transaction_id = ?", (txn_id,))
    receipt = cursor.fetchone()
    conn.close()

    if not receipt:
        return jsonify({'error': 'Receipt not found'}), 404

    return jsonify({
        'receipt': dict(receipt)
    })


@wallet_bp.route('/api/deposit', methods=['POST'])
def deposit():
    """Add funds to a user account (demo/testing only)."""
    data = request.get_json()
    user_id = data.get('user_id', '').strip()
    amount = data.get('amount', 0)

    try:
        amount = float(amount)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid amount'}), 400

    if amount <= 0:
        return jsonify({'error': 'Amount must be greater than 0'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        return jsonify({'error': 'User not found'}), 404

    cursor.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (amount, user_id))

    txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
    cursor.execute(
        "INSERT INTO transactions (id, sender_id, receiver_id, amount, type, status, note) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (txn_id, user_id, user_id, amount, 'deposit', 'completed', 'Account deposit')
    )

    conn.commit()
    cursor.execute("SELECT balance FROM users WHERE id = ?", (user_id,))
    new_balance = cursor.fetchone()['balance']
    conn.close()

    return jsonify({
        'success': True,
        'new_balance': new_balance,
        'message': f'Deposited ${amount:.2f} successfully'
    })
