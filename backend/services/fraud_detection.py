"""
Fraud Detection Service
Rule-based + statistical anomaly detection for offline operation.
"""
import numpy as np
import json
from datetime import datetime, timedelta


def assess_risk(user_id, amount, conn, receiver_id=None):
    """
    Assess the fraud risk level for a transaction.
    Returns: dict with 'level', 'reasons', and 'score'
    """
    cursor = conn.cursor()
    risk_score = 0
    reasons = []

    # --- Rule 1: Rapid repeated transfers (last 5 minutes) ---
    cursor.execute("""
        SELECT COUNT(*) as count FROM transactions
        WHERE sender_id = ? AND created_at > datetime('now', '-5 minutes')
    """, (user_id,))
    recent_count = cursor.fetchone()['count']
    if recent_count >= 5:
        risk_score += 40
        reasons.append(f'{recent_count} transfers in 5 min — rapid-fire pattern')
    elif recent_count >= 3:
        risk_score += 20
        reasons.append(f'{recent_count} transfers in 5 min — elevated frequency')

    # --- Rule 2: Unusually large transaction vs history ---
    cursor.execute("""
        SELECT AVG(amount) as avg_amount, 
               MAX(amount) as max_amount,
               COUNT(*) as total
        FROM transactions WHERE sender_id = ?
    """, (user_id,))
    stats = cursor.fetchone()

    if stats['total'] and stats['total'] > 2:
        avg = stats['avg_amount']
        if amount > avg * 5:
            risk_score += 35
            reasons.append(f'Amount is {amount/avg:.1f}x your average — highly unusual')
        elif amount > avg * 3:
            risk_score += 20
            reasons.append(f'Amount is {amount/avg:.1f}x your average — above normal')
        elif amount > avg * 2:
            risk_score += 10

    # --- Rule 3: Sudden activity spike (last hour vs average) ---
    cursor.execute("""
        SELECT COUNT(*) as hourly_count FROM transactions
        WHERE sender_id = ? AND created_at > datetime('now', '-1 hour')
    """, (user_id,))
    hourly = cursor.fetchone()['hourly_count']

    cursor.execute("""
        SELECT COUNT(*) as total,
               MIN(created_at) as first_txn
        FROM transactions WHERE sender_id = ?
    """, (user_id,))
    history = cursor.fetchone()

    if history['total'] and history['total'] > 5:
        # Calculate average hourly rate
        first_txn = history['first_txn']
        if first_txn:
            try:
                first_dt = datetime.fromisoformat(first_txn.replace('Z', '+00:00'))
                hours_active = max((datetime.now(first_dt.tzinfo) - first_dt).total_seconds() / 3600, 1)
                avg_hourly = history['total'] / hours_active
                if hourly > avg_hourly * 3:
                    risk_score += 25
            except (ValueError, TypeError):
                pass

    # --- Rule 4: Large percentage of balance ---
    cursor.execute("SELECT balance FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if user and user['balance'] > 0:
        pct = amount / user['balance'] * 100
        if pct > 80:
            risk_score += 15
            reasons.append(f'Sending {pct:.0f}% of your total balance')
        elif pct > 50:
            risk_score += 5

    # --- Rule 5: Dynamic Velocity Limits (Account Age) ---
    cursor.execute("SELECT created_at FROM users WHERE id = ?", (user_id,))
    user_row = cursor.fetchone()
    if user_row and user_row['created_at']:
        try:
            created_dt = datetime.fromisoformat(user_row['created_at'].replace('Z', '+00:00'))
            age_days = (datetime.now(created_dt.tzinfo) - created_dt).days
            
            if age_days < 1:
                daily_cap = 1000
            elif age_days < 7:
                daily_cap = 5000
            else:
                daily_cap = 10000
                
            cursor.execute("""
                SELECT COALESCE(SUM(amount), 0) as total_24h
                FROM transactions 
                WHERE sender_id = ? AND created_at > datetime('now', '-24 hours')
            """, (user_id,))
            total_24h = cursor.fetchone()['total_24h']
            
            if total_24h + amount > daily_cap:
                risk_score += 60
                reasons.append(f'Exceeds ${daily_cap} daily limit for {age_days}-day old account')
        except (ValueError, TypeError):
            pass

    # --- Rule 6: Social Graph Trust (Burner Check) ---
    if receiver_id:
        # 1st degree
        cursor.execute("""
            SELECT 1 FROM transactions 
            WHERE (sender_id = ? AND receiver_id = ?) 
               OR (sender_id = ? AND receiver_id = ?)
            LIMIT 1
        """, (user_id, receiver_id, receiver_id, user_id))
        if not cursor.fetchone():
            # 2nd degree
            cursor.execute("""
                SELECT contact_id FROM (
                    SELECT receiver_id as contact_id FROM transactions WHERE sender_id = ?
                    UNION SELECT sender_id as contact_id FROM transactions WHERE receiver_id = ?
                )
                INTERSECT
                SELECT contact_id FROM (
                    SELECT receiver_id as contact_id FROM transactions WHERE sender_id = ?
                    UNION SELECT sender_id as contact_id FROM transactions WHERE receiver_id = ?
                )
                LIMIT 1
            """, (user_id, user_id, receiver_id, receiver_id))
            if not cursor.fetchone():
                risk_score += 30
                reasons.append('No transaction history or mutual connections with this recipient')

    # Determine risk level
    if risk_score >= 60:
        level = 'high'
    elif risk_score >= 30:
        level = 'medium'
    else:
        level = 'low'
    return {'level': level, 'reasons': reasons, 'score': risk_score}


def get_fraud_report(user_id, conn):
    """Generate a full fraud risk report for a user."""
    cursor = conn.cursor()

    # Get user info
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        return None

    # Calculate average transaction amount for baseline
    cursor.execute("SELECT AVG(amount) as avg FROM transactions WHERE sender_id = ?", (user_id,))
    row = cursor.fetchone()
    avg_amount = row['avg'] if row and row['avg'] else 0

    # Current risk assessment
    risk_result = assess_risk(user_id, avg_amount, conn)
    risk_level = risk_result['level']

    # Recent flagged transactions with reasons
    cursor.execute("""
        SELECT * FROM transactions 
        WHERE (sender_id = ?) AND risk_level IN ('medium', 'high')
        ORDER BY created_at DESC LIMIT 5
    """, (user_id,))
    flagged_rows = cursor.fetchall()
    flagged = []
    for row in flagged_rows:
        txn = dict(row)
        if txn.get('risk_reasons'):
            try:
                txn['risk_reasons'] = json.loads(txn['risk_reasons'])
            except:
                txn['risk_reasons'] = []
        else:
            txn['risk_reasons'] = []
        flagged.append(txn)

    # Activity patterns
    cursor.execute("""
        SELECT COUNT(*) as count,
               strftime('%H', created_at) as hour
        FROM transactions WHERE sender_id = ?
        GROUP BY hour ORDER BY count DESC LIMIT 3
    """, (user_id,))
    peak_hours = [dict(row) for row in cursor.fetchall()]

    # Transaction volume last 24h
    cursor.execute("""
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
        FROM transactions 
        WHERE sender_id = ? AND created_at > datetime('now', '-24 hours')
    """, (user_id,))
    last_24h = dict(cursor.fetchone())

    alerts = []
    if risk_level == 'high':
        alerts.append({
            'type': 'danger',
            'message': 'High risk detected based on recent activity patterns'
        })
    elif risk_level == 'medium':
        alerts.append({
            'type': 'warning',
            'message': 'Moderate suspicious activity detected'
        })

    if last_24h['count'] > 10:
        alerts.append({
            'type': 'info',
            'message': f'High activity: {last_24h["count"]} transactions in last 24 hours'
        })
    
    # Calculate velocity limits
    limit_cap = 10000
    age_days = 0
    try:
        user_created_dt = datetime.fromisoformat(user['created_at'].replace('Z', '+00:00'))
        age_days = (datetime.now(user_created_dt.tzinfo) - user_created_dt).days
        limit_cap = 1000 if age_days < 1 else (5000 if age_days < 7 else 10000)
    except Exception:
        pass

    limit_remaining = max(0, limit_cap - last_24h['total'])
    
    if last_24h['total'] > limit_cap * 0.8:
        alerts.append({
            'type': 'warning',
            'message': f'Close to daily limit: ${limit_remaining:.2f} remaining'
        })
    else:
        alerts.append({
            'type': 'info',
            'message': f'Daily Limit: ${limit_remaining:.2f} remaining of ${limit_cap}'
        })

    return {
        'user_id': user_id,
        'overall_risk': risk_level,
        'risk_factors': {
            'recent_flagged': len(flagged),
            'txns_last_24h': last_24h['count'],
            'amount_last_24h': last_24h['total'],
            'limit_cap': limit_cap,
            'limit_remaining': limit_remaining,
            'account_age_days': age_days,
            'peak_hours': peak_hours
        },
        'flagged_transactions': flagged,
        'alerts': alerts
    }
