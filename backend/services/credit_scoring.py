"""
Financial Identity AI - Credit Scoring Engine
Analyzes mobile wallet transaction behavior to generate alternative credit scores
for individuals without traditional banking history.
"""
import uuid
import numpy as np
from datetime import datetime, timedelta


def calculate_credit_score(user_id, conn):
    """
    Generate a Financial Identity Score based on transaction behavior.
    Uses feature engineering on: income frequency, spending patterns,
    payment consistency, balance trends, and account maturity.
    Returns a score 0-850 and risk category.
    """
    cursor = conn.cursor()

    # Get user info
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        return None

    # ---- Feature 1: Account Age (max 100 pts) ----
    created_at = datetime.fromisoformat(user['created_at'].replace('Z', '+00:00')) if user['created_at'] else datetime.now()
    account_age_days = (datetime.now(created_at.tzinfo) if created_at.tzinfo else datetime.now() - created_at).days if hasattr(created_at, 'tzinfo') else 0
    try:
        account_age_days = (datetime.now() - datetime.fromisoformat(str(user['created_at']).replace('Z', '').split('+')[0])).days
    except:
        account_age_days = 0
    age_score = min(100, account_age_days * 3.3)  # 30 days = full score

    # ---- Feature 2: Transaction Volume (max 150 pts) ----
    cursor.execute("""
        SELECT COUNT(*) as total,
               COALESCE(SUM(amount), 0) as total_volume
        FROM transactions
        WHERE (sender_id = ? OR receiver_id = ?)
        AND created_at > datetime('now', '-30 days')
    """, (user_id, user_id))
    vol = cursor.fetchone()
    total_txns = vol['total'] or 0
    total_volume = vol['total_volume'] or 0
    volume_score = min(150, total_txns * 5)  # 30 txns = full score

    # ---- Feature 3: Income Stability (max 200 pts) ----
    # Look at regular incoming transactions
    cursor.execute("""
        SELECT date(created_at) as day,
               COALESCE(SUM(amount), 0) as daily_income
        FROM transactions
        WHERE receiver_id = ?
        AND created_at > datetime('now', '-30 days')
        GROUP BY day
        ORDER BY day
    """, (user_id,))
    income_days = cursor.fetchall()

    if len(income_days) >= 2:
        incomes = [row['daily_income'] for row in income_days]
        mean_income = np.mean(incomes)
        std_income = np.std(incomes) if len(incomes) > 1 else mean_income
        # Coefficient of variation: lower = more stable
        cv = (std_income / mean_income) if mean_income > 0 else 1.0
        income_stability = max(0, 1 - cv)  # 0 to 1
        income_score = income_stability * 200
    else:
        income_stability = 0
        income_score = 0

    # ---- Feature 4: Spending Consistency (max 150 pts) ----
    cursor.execute("""
        SELECT date(created_at) as day,
               COALESCE(SUM(amount), 0) as daily_spent
        FROM transactions
        WHERE sender_id = ?
        AND created_at > datetime('now', '-30 days')
        GROUP BY day
        ORDER BY day
    """, (user_id,))
    spending_days = cursor.fetchall()

    if len(spending_days) >= 2:
        spends = [row['daily_spent'] for row in spending_days]
        mean_spend = np.mean(spends)
        std_spend = np.std(spends) if len(spends) > 1 else mean_spend
        cv = (std_spend / mean_spend) if mean_spend > 0 else 1.0
        spending_consistency = max(0, 1 - cv)
        spending_score = spending_consistency * 150
    else:
        spending_consistency = 0
        spending_score = 0

    # ---- Feature 5: Balance Trend (max 150 pts) ----
    # Positive balance trend = earning more than spending
    cursor.execute("""
        SELECT 
            COALESCE(SUM(CASE WHEN receiver_id = ? THEN amount ELSE 0 END), 0) as total_in,
            COALESCE(SUM(CASE WHEN sender_id = ? THEN amount ELSE 0 END), 0) as total_out
        FROM transactions
        WHERE (sender_id = ? OR receiver_id = ?)
        AND created_at > datetime('now', '-14 days')
    """, (user_id, user_id, user_id, user_id))
    flow = cursor.fetchone()
    total_in = flow['total_in'] or 0
    total_out = flow['total_out'] or 0
    net_flow = total_in - total_out

    if total_out > 0:
        balance_ratio = total_in / total_out  # >1 means positive flow
        balance_trend = min(1.0, balance_ratio / 2)  # ratio of 2 = full score
    elif total_in > 0:
        balance_trend = 1.0
    else:
        balance_trend = 0.0
    balance_score = balance_trend * 150

    # ---- Feature 6: Payment Regularity (max 100 pts) ----
    # How many unique days had transactions in the last 30 days
    cursor.execute("""
        SELECT COUNT(DISTINCT date(created_at)) as active_days
        FROM transactions
        WHERE (sender_id = ? OR receiver_id = ?)
        AND created_at > datetime('now', '-30 days')
    """, (user_id, user_id))
    active = cursor.fetchone()
    active_days = active['active_days'] or 0
    regularity = min(1.0, active_days / 15)  # 15 active days = full score
    regularity_score = regularity * 100

    # ---- Composite Score (max 850) ----
    raw_score = age_score + volume_score + income_score + spending_score + balance_score + regularity_score
    final_score = int(min(850, max(0, raw_score)))

    # Determine risk category
    if final_score >= 700:
        risk_category = 'excellent'
        max_loan = 20.0
    elif final_score >= 500:
        risk_category = 'good'
        max_loan = 15.0
    elif final_score >= 300:
        risk_category = 'moderate'
        max_loan = 10.0
    elif final_score >= 100:
        risk_category = 'high_risk'
        max_loan = 5.0
    else:
        risk_category = 'unscored'
        max_loan = 0

    # Check for existing active loans - reduce eligibility
    cursor.execute("SELECT COUNT(*) as active_loans FROM loans WHERE user_id = ? AND status = 'active'", (user_id,))
    active_loans = cursor.fetchone()['active_loans']
    if active_loans > 0:
        max_loan = 0  # Must repay current loan first

    # Check repayment history bonus
    cursor.execute("SELECT COUNT(*) as repaid FROM loans WHERE user_id = ? AND status = 'repaid'", (user_id,))
    repaid_count = cursor.fetchone()['repaid']
    # Each repaid loan adds 25 points and $2 to eligible amount
    repayment_bonus = min(100, repaid_count * 25)
    final_score = min(850, final_score + repayment_bonus)
    if active_loans == 0:
        max_loan = min(20, max_loan + repaid_count * 2)

    # Upsert credit score record
    score_id = f"CS-{uuid.uuid4().hex[:8].upper()}"
    cursor.execute("SELECT id FROM credit_scores WHERE user_id = ?", (user_id,))
    existing = cursor.fetchone()

    if existing:
        cursor.execute("""
            UPDATE credit_scores SET
                score = ?, income_stability = ?, spending_consistency = ?,
                payment_regularity = ?, balance_trend = ?, account_age_days = ?,
                total_transactions = ?, risk_category = ?, max_loan_eligible = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        """, (final_score, round(income_stability, 3), round(spending_consistency, 3),
              round(regularity, 3), round(balance_trend, 3), account_age_days,
              total_txns, risk_category, max_loan, user_id))
    else:
        cursor.execute("""
            INSERT INTO credit_scores (id, user_id, score, income_stability, spending_consistency,
                payment_regularity, balance_trend, account_age_days, total_transactions,
                risk_category, max_loan_eligible)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (score_id, user_id, final_score, round(income_stability, 3),
              round(spending_consistency, 3), round(regularity, 3),
              round(balance_trend, 3), account_age_days, total_txns,
              risk_category, max_loan))

    conn.commit()

    return {
        'user_id': user_id,
        'score': final_score,
        'max_score': 850,
        'risk_category': risk_category,
        'max_loan_eligible': max_loan,
        'active_loans': active_loans,
        'repaid_loans': repaid_count,
        'breakdown': {
            'account_age': {'score': round(age_score, 1), 'max': 100, 'days': account_age_days},
            'transaction_volume': {'score': round(volume_score, 1), 'max': 150, 'count': total_txns},
            'income_stability': {'score': round(income_score, 1), 'max': 200, 'value': round(income_stability, 3)},
            'spending_consistency': {'score': round(spending_score, 1), 'max': 150, 'value': round(spending_consistency, 3)},
            'balance_trend': {'score': round(balance_score, 1), 'max': 150, 'value': round(balance_trend, 3)},
            'payment_regularity': {'score': round(regularity_score, 1), 'max': 100, 'active_days': active_days},
            'repayment_bonus': {'score': repayment_bonus, 'max': 100, 'loans_repaid': repaid_count}
        }
    }
