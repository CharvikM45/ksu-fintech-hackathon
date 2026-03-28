"""
TrustScore Engine — Trust-Based Financial Identity Scoring
Evaluates users based on their profile type, transaction behavior,
payment consistency, and business reliability. Not just about debt —
it's about trust in business transactions.
"""
import uuid
import numpy as np
from datetime import datetime, timedelta


# Profile trust multipliers — businessmen are more trusted than students
PROFILE_MULTIPLIERS = {
    'businessman': 1.5,
    'vendor': 1.4,
    'freelancer': 1.0,
    'student': 0.7,
    'individual': 0.8,
}

# Base loan caps per profile type (before payment score scaling)
PROFILE_LOAN_CAPS = {
    'businessman': 500.0,
    'vendor': 1000.0,
    'freelancer': 200.0,
    'student': 50.0,
    'individual': 75.0,
}

# Trust level labels
TRUST_LEVELS = {
    'excellent': {'label': 'Highly Trusted', 'emoji': '🛡️'},
    'good': {'label': 'Trusted', 'emoji': '✅'},
    'moderate': {'label': 'Building Trust', 'emoji': '📊'},
    'high_risk': {'label': 'Low Trust', 'emoji': '⚠️'},
    'unscored': {'label': 'New User', 'emoji': '🆕'},
}


def calculate_credit_score(user_id, conn):
    """
    Generate a TrustScore based on transaction behavior and user profile.
    Uses feature engineering on: income frequency, spending patterns,
    payment consistency, balance trends, account maturity, and profile type.
    Returns a score 0-850, trust level, and profile-scaled loan limit.
    """
    cursor = conn.cursor()

    # Get user info
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        return None

    profile_type = user['profile_type'] or 'individual'
    profile_multiplier = PROFILE_MULTIPLIERS.get(profile_type, 0.8)

    # ---- Feature 1: Account Age (max 100 pts) ----
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
        cv = (std_income / mean_income) if mean_income > 0 else 1.0
        income_stability = max(0, 1 - cv)
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

    if total_out > 0:
        balance_ratio = total_in / total_out
        balance_trend = min(1.0, balance_ratio / 2)
    elif total_in > 0:
        balance_trend = 1.0
    else:
        balance_trend = 0.0
    balance_score = balance_trend * 150

    # ---- Feature 6: Payment Regularity (max 100 pts) ----
    cursor.execute("""
        SELECT COUNT(DISTINCT date(created_at)) as active_days
        FROM transactions
        WHERE (sender_id = ? OR receiver_id = ?)
        AND created_at > datetime('now', '-30 days')
    """, (user_id, user_id))
    active = cursor.fetchone()
    active_days = active['active_days'] or 0
    regularity = min(1.0, active_days / 15)
    regularity_score = regularity * 100

    # ---- Feature 7: Profile Trust Bonus (max 150 pts) ----
    # Businessmen and vendors get a trust advantage
    profile_bonus_score = min(150, 100 * profile_multiplier)

    # Extra bonus for having a registered business
    if user['business_name']:
        profile_bonus_score = min(150, profile_bonus_score + 30)

    # ---- Feature 9: Fraud Penalties (Subtraction) ----
    cursor.execute("SELECT COUNT(*) as fraud_count FROM fraud_reports WHERE reported_id = ? AND status = 'confirmed'", (user_id,))
    fraud_count = cursor.fetchone()['fraud_count'] or 0
    fraud_penalty = fraud_count * 75  # 75 points per confirmed report

    # ---- Composite Score (max 1000 raw, normalized to 850) ----
    raw_score = age_score + volume_score + income_score + spending_score + balance_score + regularity_score + profile_bonus_score
    # Normalize: max possible raw ~1000, scale to 850
    final_score = int(min(850, max(0, (raw_score * 0.85) - fraud_penalty)))

    # Determine trust level
    if final_score >= 700:
        risk_category = 'excellent'
    elif final_score >= 500:
        risk_category = 'good'
    elif final_score >= 300:
        risk_category = 'moderate'
    elif final_score >= 100:
        risk_category = 'high_risk'
    else:
        risk_category = 'unscored'

    # ---- Payment-Scaled Loan Limit ----
    # Base cap comes from profile type
    base_cap = PROFILE_LOAN_CAPS.get(profile_type, 75.0)

    # Payment score (0-1) combines regularity, spending consistency, and balance trend
    payment_score = 0
    if regularity > 0 or spending_consistency > 0 or balance_trend > 0:
        payment_score = (regularity * 0.4) + (spending_consistency * 0.3) + (balance_trend * 0.3)

    # Scale loan limit: payment_score determines what % of the cap you can access
    # Minimum 10% of cap (if score > 0), max 100%
    if final_score >= 100:
        loan_pct = max(0.1, min(1.0, payment_score))
        max_loan = round(base_cap * loan_pct, 2)
    else:
        max_loan = 0

    # Check for existing active loans
    cursor.execute("SELECT COUNT(*) as active_loans FROM loans WHERE user_id = ? AND status = 'active'", (user_id,))
    active_loans = cursor.fetchone()['active_loans']
    if active_loans > 0:
        max_loan = 0

    # Repayment history bonus
    cursor.execute("SELECT COUNT(*) as repaid FROM loans WHERE user_id = ? AND status = 'repaid'", (user_id,))
    repaid_count = cursor.fetchone()['repaid']
    
    # Community Badges Logic
    community_badges = []
    if repaid_count > 0:
        community_badges.append({'label': 'On-Time Payer ⚡', 'desc': 'Reliably repays loans before due date'})
    
    # Check for bounces (failed transactions by this sender)
    cursor.execute("SELECT COUNT(*) as failed FROM transactions WHERE sender_id = ? AND status = 'failed'", (user_id,))
    failed_count = cursor.fetchone()['failed']
    if total_txns > 5 and failed_count == 0:
        community_badges.append({'label': 'Zero Bounces ✅', 'desc': 'No transactions failed due to insufficient funds'})
    
    if profile_type in ['businessman', 'vendor'] and total_txns > 20:
        community_badges.append({'label': 'Trusted Merchant ☕', 'desc': 'Consistent history of business transactions'})
    
    if fraud_count > 0:
        community_badges.append({'label': 'Flagged Activity ⚠️', 'desc': 'Profile has confirmed fraud reports'})

    repayment_bonus = min(100, repaid_count * 25)
    final_score = min(850, final_score + repayment_bonus)
    # Apply fraud penalty again at the very end to ensure it sticks
    final_score = max(0, final_score - fraud_penalty)

    if active_loans == 0 and repaid_count > 0:
        # Each repaid loan increases limit by 10% of base cap
        max_loan = min(base_cap, max_loan + repaid_count * (base_cap * 0.1))

    # Build trust level info
    trust_info = TRUST_LEVELS.get(risk_category, TRUST_LEVELS['unscored'])

    # Upsert credit score record
    score_id = f"CS-{uuid.uuid4().hex[:8].upper()}"
    cursor.execute("SELECT id FROM credit_scores WHERE user_id = ?", (user_id,))
    existing = cursor.fetchone()

    if existing:
        cursor.execute("""
            UPDATE credit_scores SET
                score = ?, income_stability = ?, spending_consistency = ?,
                payment_regularity = ?, balance_trend = ?, account_age_days = ?,
                total_transactions = ?, profile_bonus = ?, risk_category = ?, max_loan_eligible = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        """, (final_score, round(income_stability, 3), round(spending_consistency, 3),
              round(regularity, 3), round(balance_trend, 3), account_age_days,
              total_txns, round(profile_bonus_score, 1), risk_category, max_loan, user_id))
    else:
        cursor.execute("""
            INSERT INTO credit_scores (id, user_id, score, income_stability, spending_consistency,
                payment_regularity, balance_trend, account_age_days, total_transactions,
                profile_bonus, risk_category, max_loan_eligible)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (score_id, user_id, final_score, round(income_stability, 3),
              round(spending_consistency, 3), round(regularity, 3),
              round(balance_trend, 3), account_age_days, total_txns,
              round(profile_bonus_score, 1), risk_category, max_loan))

    conn.commit()

    return {
        'user_id': user_id,
        'score': final_score,
        'max_score': 850,
        'risk_category': risk_category,
        'trust_level': trust_info['label'],
        'trust_emoji': trust_info['emoji'],
        'max_loan_eligible': round(max_loan, 2),
        'profile_loan_cap': base_cap,
        'payment_score': round(payment_score, 3),
        'community_badges': community_badges,
        'active_loans': active_loans,
        'repaid_loans': repaid_count,
        'fraud_reports': fraud_count,
        'profile': {
            'name': user['name'],
            'type': profile_type,
            'type_label': profile_type.replace('_', ' ').title(),
            'occupation': user['occupation'] or 'Not specified',
            'monthly_income': user['monthly_income'] or 0,
            'business_name': user['business_name'],
            'balance': user['balance'],
            'account_age_days': account_age_days,
            'multiplier': profile_multiplier,
        },
        'breakdown': {
            'account_age': {'score': round(age_score, 1), 'max': 100, 'days': account_age_days},
            'transaction_volume': {'score': round(volume_score, 1), 'max': 150, 'count': total_txns, 'volume': round(total_volume, 2)},
            'income_stability': {'score': round(income_score, 1), 'max': 200, 'value': round(income_stability, 3)},
            'spending_consistency': {'score': round(spending_score, 1), 'max': 150, 'value': round(spending_consistency, 3)},
            'balance_trend': {'score': round(balance_score, 1), 'max': 150, 'value': round(balance_trend, 3)},
            'payment_regularity': {'score': round(regularity_score, 1), 'max': 100, 'active_days': active_days},
            'profile_trust': {'score': round(profile_bonus_score, 1), 'max': 150, 'multiplier': profile_multiplier, 'type': profile_type},
            'repayment_bonus': {'score': repayment_bonus, 'max': 100, 'loans_repaid': repaid_count}
        }
    }
