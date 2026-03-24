"""
Fraud Detection Service
Rule-based + statistical anomaly detection for offline operation.
"""
import numpy as np
from datetime import datetime, timedelta


def assess_risk(user_id, amount, conn):
    """
    Assess the fraud risk level for a transaction.
    Returns: 'low', 'medium', or 'high'
    """
    cursor = conn.cursor()
    risk_score = 0

    # --- Rule 1: Rapid repeated transfers (last 5 minutes) ---
    cursor.execute("""
        SELECT COUNT(*) as count FROM transactions
        WHERE sender_id = ? AND created_at > datetime('now', '-5 minutes')
    """, (user_id,))
    recent_count = cursor.fetchone()['count']
    if recent_count >= 5:
        risk_score += 40
    elif recent_count >= 3:
        risk_score += 20

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
        elif amount > avg * 3:
            risk_score += 20
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
        elif pct > 50:
            risk_score += 5

    # Determine risk level
    if risk_score >= 60:
        return 'high'
    elif risk_score >= 30:
        return 'medium'
    return 'low'


def get_fraud_report(user_id, conn):
    """Generate a full fraud risk report for a user."""
    cursor = conn.cursor()

    # Get user info
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        return None

    # Calculate current risk assessment
    avg_amount = 0
    cursor.execute("SELECT AVG(amount) as avg FROM transactions WHERE sender_id = ?", (user_id,))
    row = cursor.fetchone()
    if row and row['avg']:
        avg_amount = row['avg']

    risk_level = assess_risk(user_id, avg_amount, conn)

    # Recent flagged transactions
    cursor.execute("""
        SELECT * FROM transactions 
        WHERE (sender_id = ? OR receiver_id = ?) AND risk_level != 'low'
        ORDER BY created_at DESC LIMIT 5
    """, (user_id, user_id))
    flagged = [dict(row) for row in cursor.fetchall()]

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
    last_24h = cursor.fetchone()

    alerts = []
    if len(flagged) > 0:
        alerts.append({
            'type': 'warning',
            'message': f'{len(flagged)} transaction(s) flagged for suspicious activity'
        })
    if last_24h['count'] > 10:
        alerts.append({
            'type': 'info',
            'message': f'High activity: {last_24h["count"]} transactions in last 24 hours'
        })
    if last_24h['total'] > user['balance'] * 0.5 and user['balance'] > 0:
        alerts.append({
            'type': 'warning',
            'message': f'Over 50% of balance used in the last 24 hours'
        })

    return {
        'user_id': user_id,
        'overall_risk': risk_level,
        'risk_factors': {
            'recent_flagged': len(flagged),
            'txns_last_24h': last_24h['count'],
            'amount_last_24h': last_24h['total'],
            'peak_hours': peak_hours
        },
        'flagged_transactions': flagged,
        'alerts': alerts
    }
