from flask import Blueprint, request, jsonify
import uuid
import bcrypt
import json
from models.database import get_db
import base64
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.exceptions import InvalidSignature

wallet_bp = Blueprint('wallet', __name__)

def verify_ec_signature(public_key_pem, signature_b64, data_str):
    """Verify an ECDSA signature (secp256r1/P-256)."""
    if not public_key_pem or not signature_b64:
        return False
    try:
        # Load the public key
        public_key = serialization.load_pem_public_key(public_key_pem.encode())
        # Decode signature
        signature = base64.b64decode(signature_b64)
        # Verify
        public_key.verify(signature, data_str.encode(), ec.ECDSA(hashes.SHA256()))
        return True
    except Exception as e:
        print(f"Signature verification failed: {e}")
        return False


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
    idempotency_key = data.get('idempotency_key', '').strip()
    signature = data.get('signature', '').strip()
    timestamp = data.get('timestamp', '')

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
    try:
        # Use IMMEDIATE to lock the database for writing and prevent race conditions
        conn.execute("BEGIN IMMEDIATE")
        cursor = conn.cursor()

        # Verify sender
        cursor.execute("SELECT * FROM users WHERE id = ?", (sender_id,))
        sender = cursor.fetchone()
        if not sender:
            conn.rollback()
            return jsonify({'error': 'Sender not found'}), 404

        # Verify PIN
        if not bcrypt.checkpw(pin.encode('utf-8'), sender['pin_hash'].encode('utf-8')):
            conn.rollback()
            return jsonify({'error': 'Invalid PIN'}), 401

        # Check balance
        if sender['balance'] < amount:
            conn.rollback()
            return jsonify({'error': 'Insufficient balance'}), 400

        # Find receiver
        if receiver_phone and not receiver_id:
            cursor.execute("SELECT * FROM users WHERE phone = ?", (receiver_phone,))
            receiver = cursor.fetchone()
            if not receiver:
                conn.rollback()
                return jsonify({'error': 'Receiver not found'}), 404
            receiver_id = receiver['id']
        else:
            cursor.execute("SELECT * FROM users WHERE id = ?", (receiver_id,))
            receiver = cursor.fetchone()
            if not receiver:
                conn.rollback()
                return jsonify({'error': 'Receiver not found'}), 404

        # Prevent self-transfer
        if sender_id == receiver_id:
            conn.rollback()
            return jsonify({'error': 'Cannot transfer to yourself'}), 400

        # --- Idempotency Check ---
        if idempotency_key:
            cursor.execute("SELECT id FROM transactions WHERE idempotency_key = ?", (idempotency_key,))
            existing = cursor.fetchone()
            if existing:
                conn.rollback()
                return jsonify({'error': 'Transaction already processed', 'transaction_id': existing['id']}), 409
        else:
            # Fallback to time-based duplicate check if no key provided
            cursor.execute("""
                SELECT id FROM transactions 
                WHERE sender_id = ? AND receiver_id = ? AND amount = ? 
                AND created_at > datetime('now', '-10 seconds')
            """, (sender_id, receiver_id, amount))
            if cursor.fetchone():
                conn.rollback()
                return jsonify({'error': 'Duplicate transaction detected. Please wait a moment.'}), 429

        # --- Digital Signature Verification ---
        if 'public_key' in sender.keys() and sender['public_key']:
            # Data string matches client-side signing: sender_id|phone|amount|timestamp|idempotency_key
            data_to_verify = f"{sender_id}|{receiver_phone}|{amount}|{timestamp}|{idempotency_key}"
            if not verify_ec_signature(sender['public_key'], signature, data_to_verify):
                conn.rollback()
                return jsonify({'error': 'Invalid transaction signature. Potential tampering detected.'}), 401

        # Perform fraud check
        from services.fraud_detection import assess_risk
        risk_result = assess_risk(sender_id, amount, conn, receiver_id=receiver_id)
        risk_level = risk_result['level']

        # Execute transfer
        txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
        txn_status = 'completed' if risk_level != 'high' else 'flagged'

        if txn_status == 'flagged':
            conn.rollback()
            return jsonify({
                'error': 'Transaction flagged for suspicious activity',
                'risk_level': risk_level,
                'risk_reasons': risk_result['reasons'],
                'transaction_id': txn_id
            }), 403

        # Deduct and add balances
        cursor.execute("UPDATE users SET balance = balance - ? WHERE id = ?", (amount, sender_id))
        cursor.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (amount, receiver_id))

        # Record transaction
        cursor.execute(
            "INSERT INTO transactions (id, sender_id, receiver_id, amount, type, status, risk_level, risk_reasons, note, idempotency_key, signature) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (txn_id, sender_id, receiver_id, amount, 'p2p', txn_status, risk_level, json.dumps(risk_result['reasons']), note, idempotency_key, signature)
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
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'An internal database error occurred', 'details': str(e)}), 500
    finally:
        conn.close()


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


@wallet_bp.route('/api/money-request', methods=['POST'])
def create_money_request():
    """Create a money request sent to another user by phone."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    requester_id = data.get('requester_id', '').strip()
    target_phone = data.get('target_phone', '').strip()
    amount = data.get('amount', 0)
    note = data.get('note', '').strip()

    if not requester_id or not target_phone or not amount:
        return jsonify({'error': 'Requester ID, target phone, and amount are required'}), 400

    try:
        amount = float(amount)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid amount'}), 400

    if amount <= 0:
        return jsonify({'error': 'Amount must be greater than 0'}), 400

    conn = get_db()
    cursor = conn.cursor()

    # Verify target exists
    cursor.execute("SELECT id, name FROM users WHERE phone = ?", (target_phone,))
    target = cursor.fetchone()
    if not target:
        conn.close()
        return jsonify({'error': 'No user found with that phone number'}), 404

    # Prevent self-request
    if target['id'] == requester_id:
        conn.close()
        return jsonify({'error': 'Cannot request money from yourself'}), 400

    req_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"
    cursor.execute(
        "INSERT INTO money_requests (id, requester_id, target_phone, amount, note) VALUES (?, ?, ?, ?, ?)",
        (req_id, requester_id, target_phone, amount, note)
    )
    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'request_id': req_id,
        'message': f'Request for ${amount:.2f} sent to {target["name"]}'
    })


@wallet_bp.route('/api/money-requests/<user_id>', methods=['GET'])
def get_pending_requests(user_id):
    """Fetch pending money requests for a user (requests they need to pay)."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT phone FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return jsonify({'error': 'User not found'}), 404

    cursor.execute("""
        SELECT mr.*, u.name as requester_name
        FROM money_requests mr
        JOIN users u ON mr.requester_id = u.id
        WHERE mr.target_phone = ? AND mr.status = 'pending'
        ORDER BY mr.created_at DESC
    """, (user['phone'],))
    requests = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({'requests': requests})


@wallet_bp.route('/api/money-request/respond', methods=['POST'])
def respond_to_request():
    """Fulfill or decline a money request."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    request_id = data.get('request_id', '').strip()
    action = data.get('action', '').strip()  # 'pay' or 'decline'
    payer_id = data.get('payer_id', '').strip()
    pin = data.get('pin', '').strip()
    idempotency_key = data.get('idempotency_key', '').strip()
    signature = data.get('signature', '').strip()
    timestamp = data.get('timestamp', '')

    if not request_id or not action or not payer_id:
        return jsonify({'error': 'Missing required fields'}), 400

    conn = get_db()
    try:
        # Use IMMEDIATE to lock for writing
        conn.execute("BEGIN IMMEDIATE")
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM money_requests WHERE id = ? AND status = 'pending'", (request_id,))
        req = cursor.fetchone()
        if not req:
            conn.rollback()
            return jsonify({'error': 'Request not found or already processed'}), 404

        if action == 'decline':
            cursor.execute("UPDATE money_requests SET status = 'declined' WHERE id = ?", (request_id,))
            conn.commit()
            return jsonify({'success': True, 'message': 'Request declined'})

        # action == 'pay'
        if not pin:
            conn.rollback()
            return jsonify({'error': 'PIN required to pay'}), 400

        cursor.execute("SELECT * FROM users WHERE id = ?", (payer_id,))
        payer = cursor.fetchone()
        if not payer:
            conn.rollback()
            return jsonify({'error': 'Payer not found'}), 404

        if not bcrypt.checkpw(pin.encode('utf-8'), payer['pin_hash'].encode('utf-8')):
            conn.rollback()
            return jsonify({'error': 'Invalid PIN'}), 401

        # --- Idempotency Check ---
        if idempotency_key:
            cursor.execute("SELECT id FROM transactions WHERE idempotency_key = ?", (idempotency_key,))
            existing = cursor.fetchone()
            if existing:
                conn.rollback()
                return jsonify({'error': 'Transaction already processed', 'transaction_id': existing['id']}), 409

        # --- Digital Signature Verification ---
        if 'public_key' in payer.keys() and payer['public_key']:
            # Data string matches client-side signing: payer_id||amount|timestamp|idempotency_key
            amount_str = f"{req['amount']:g}"
            data_to_verify = f"{payer_id}||{amount_str}|{timestamp}|{idempotency_key}"
            if not verify_ec_signature(payer['public_key'], signature, data_to_verify):
                conn.rollback()
                return jsonify({'error': 'Invalid transaction signature. Potential tampering detected.'}), 401

        amount = req['amount']
        receiver_id = req['requester_id']

        if payer['balance'] < amount:
            conn.rollback()
            return jsonify({'error': 'Insufficient balance'}), 400

        # Fraud check
        from services.fraud_detection import assess_risk
        risk_result = assess_risk(payer_id, amount, conn, receiver_id=receiver_id)
        risk_level = risk_result['level']

        if risk_level == 'high':
            conn.rollback()
            return jsonify({
                'error': 'Transaction flagged for suspicious activity',
                'risk_level': risk_level,
                'risk_reasons': risk_result['reasons']
            }), 403

        cursor.execute("UPDATE users SET balance = balance - ? WHERE id = ?", (amount, payer_id))
        cursor.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (amount, receiver_id))

        txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
        cursor.execute(
            "INSERT INTO transactions (id, sender_id, receiver_id, amount, type, status, risk_level, risk_reasons, note, idempotency_key, signature) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (txn_id, payer_id, receiver_id, amount, 'p2p', 'completed', risk_level, json.dumps(risk_result['reasons']), f'Fulfilled request {request_id}', idempotency_key, signature)
        )
        cursor.execute("UPDATE money_requests SET status = 'completed' WHERE id = ?", (request_id,))
        conn.commit()

        cursor.execute("SELECT balance FROM users WHERE id = ?", (payer_id,))
        new_balance = cursor.fetchone()['balance']
        
        return jsonify({
            'success': True,
            'new_balance': new_balance,
            'message': f'Paid ${amount:.2f} successfully'
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'An internal database error occurred', 'details': str(e)}), 500
    finally:
        conn.close()
