"""
NanoCredit Loan Engine Routes
Handles credit score calculation, loan issuance, and repayment.
"""
from flask import Blueprint, request, jsonify
import uuid
from datetime import datetime, timedelta
from models.database import get_db
from services.credit_scoring import calculate_credit_score

credit_bp = Blueprint('credit', __name__)


@credit_bp.route('/api/credit-score/<user_id>', methods=['GET'])
def get_credit_score(user_id):
    """Calculate and return the user's Financial Identity Score."""
    conn = get_db()
    try:
        result = calculate_credit_score(user_id, conn)
        if not result:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@credit_bp.route('/api/loans/<user_id>', methods=['GET'])
def get_loans(user_id):
    """Get all loans for a user."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'User not found'}), 404

    cursor.execute("""
        SELECT * FROM loans WHERE user_id = ?
        ORDER BY created_at DESC
    """, (user_id,))
    loans = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({
        'loans': loans,
        'count': len(loans)
    })


@credit_bp.route('/api/loan/apply', methods=['POST'])
def apply_for_loan():
    """Apply for a nano-loan based on credit score."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    user_id = data.get('user_id', '').strip()
    requested_amount = data.get('amount', 0)

    if not user_id or not requested_amount:
        return jsonify({'error': 'User ID and amount are required'}), 400

    try:
        requested_amount = float(requested_amount)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid amount'}), 400

    if requested_amount <= 0:
        return jsonify({'error': 'Amount must be greater than 0'}), 400

    conn = get_db()
    try:
        cursor = conn.cursor()

        # Calculate fresh credit score
        score_result = calculate_credit_score(user_id, conn)
        if not score_result:
            return jsonify({'error': 'User not found'}), 404

        # Check eligibility
        if score_result['max_loan_eligible'] <= 0:
            if score_result['active_loans'] > 0:
                return jsonify({'error': 'You must repay your current loan before applying for a new one'}), 400
            return jsonify({'error': 'Your Financial Identity Score is too low for a loan. Keep transacting to build your score!'}), 400

        if requested_amount > score_result['max_loan_eligible']:
            return jsonify({
                'error': f'Requested amount exceeds your limit of ${score_result["max_loan_eligible"]:.2f}',
                'max_eligible': score_result['max_loan_eligible']
            }), 400

        # Determine interest rate based on score
        score = score_result['score']
        if score >= 700:
            interest_rate = 0.02  # 2%
        elif score >= 500:
            interest_rate = 0.05  # 5%
        elif score >= 300:
            interest_rate = 0.08  # 8%
        else:
            interest_rate = 0.12  # 12%

        total_due = round(requested_amount * (1 + interest_rate), 2)
        due_date = (datetime.now() + timedelta(days=30)).isoformat()
        loan_id = f"LOAN-{uuid.uuid4().hex[:8].upper()}"

        # Create loan record
        cursor.execute("""
            INSERT INTO loans (id, user_id, amount, interest_rate, total_due, due_date)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (loan_id, user_id, requested_amount, interest_rate, total_due, due_date))

        # Deposit loan amount into user's wallet
        cursor.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (requested_amount, user_id))

        # Record as deposit transaction
        txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
        cursor.execute("""
            INSERT INTO transactions (id, sender_id, receiver_id, amount, type, status, risk_level, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (txn_id, user_id, user_id, requested_amount, 'deposit', 'completed', 'low',
              f'NanoCredit loan disbursement ({loan_id})'))

        conn.commit()

        # Get new balance
        cursor.execute("SELECT balance FROM users WHERE id = ?", (user_id,))
        new_balance = cursor.fetchone()['balance']

        return jsonify({
            'success': True,
            'loan': {
                'id': loan_id,
                'amount': requested_amount,
                'interest_rate': interest_rate,
                'total_due': total_due,
                'due_date': due_date,
                'status': 'active'
            },
            'new_balance': new_balance,
            'message': f'Loan of ${requested_amount:.2f} approved and deposited! Repay ${total_due:.2f} by due date.'
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@credit_bp.route('/api/loan/repay', methods=['POST'])
def repay_loan():
    """Repay an active loan (partial or full)."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    user_id = data.get('user_id', '').strip()
    loan_id = data.get('loan_id', '').strip()
    payment_amount = data.get('amount', 0)

    if not user_id or not loan_id:
        return jsonify({'error': 'User ID and loan ID are required'}), 400

    try:
        payment_amount = float(payment_amount)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid amount'}), 400

    if payment_amount <= 0:
        return jsonify({'error': 'Payment must be greater than 0'}), 400

    conn = get_db()
    try:
        conn.execute("BEGIN IMMEDIATE")
        cursor = conn.cursor()

        # Get loan
        cursor.execute("SELECT * FROM loans WHERE id = ? AND user_id = ? AND status = 'active'", (loan_id, user_id))
        loan = cursor.fetchone()
        if not loan:
            conn.rollback()
            return jsonify({'error': 'Active loan not found'}), 404

        # Get user balance
        cursor.execute("SELECT balance FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if user['balance'] < payment_amount:
            conn.rollback()
            return jsonify({'error': 'Insufficient balance for repayment'}), 400

        remaining = loan['total_due'] - loan['amount_paid']
        actual_payment = min(payment_amount, remaining)

        new_paid = loan['amount_paid'] + actual_payment
        is_fully_repaid = new_paid >= loan['total_due']

        # Deduct from balance
        cursor.execute("UPDATE users SET balance = balance - ? WHERE id = ?", (actual_payment, user_id))

        # Update loan
        if is_fully_repaid:
            cursor.execute("""
                UPDATE loans SET amount_paid = ?, status = 'repaid', repaid_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (new_paid, loan_id))
        else:
            cursor.execute("UPDATE loans SET amount_paid = ? WHERE id = ?", (new_paid, loan_id))

        # Record repayment transaction
        txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
        cursor.execute("""
            INSERT INTO transactions (id, sender_id, receiver_id, amount, type, status, risk_level, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (txn_id, user_id, user_id, actual_payment, 'withdrawal', 'completed', 'low',
              f'Loan repayment for {loan_id}'))

        conn.commit()

        cursor.execute("SELECT balance FROM users WHERE id = ?", (user_id,))
        new_balance = cursor.fetchone()['balance']

        msg = f'Repaid ${actual_payment:.2f}.'
        if is_fully_repaid:
            msg += ' 🎉 Loan fully repaid! Your credit score will increase.'

        return jsonify({
            'success': True,
            'payment': actual_payment,
            'remaining': round(max(0, remaining - actual_payment), 2),
            'fully_repaid': is_fully_repaid,
            'new_balance': new_balance,
            'message': msg
        })

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
