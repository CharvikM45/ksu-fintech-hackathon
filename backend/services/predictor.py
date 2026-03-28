"""
Balance Trend Predictor Service
Simple linear regression on recent spending to predict balance depletion.
"""
import numpy as np
from datetime import datetime, timedelta


def predict_balance(user_id, conn):
    """
    Predict future balance based on spending trends.
    Uses simple linear regression on daily net spending.
    """
    cursor = conn.cursor()

    # Get user info
    cursor.execute("SELECT balance, name FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        return None

    current_balance = user['balance']

    # Get daily spending for the last 14 days
    cursor.execute("""
        SELECT date(created_at) as day,
               COALESCE(SUM(CASE WHEN sender_id = ? THEN amount ELSE 0 END), 0) as spent,
               COALESCE(SUM(CASE WHEN receiver_id = ? THEN amount ELSE 0 END), 0) as received
        FROM transactions
        WHERE (sender_id = ? OR receiver_id = ?) 
        AND created_at > datetime('now', '-14 days')
        AND type != 'deposit'
        GROUP BY day
        ORDER BY day
    """, (user_id, user_id, user_id, user_id))

    daily_data = cursor.fetchall()

    if len(daily_data) < 2:
        return {
            'user_id': user_id,
            'current_balance': current_balance,
            'prediction': None,
            'message': 'Not enough data to make predictions. Keep transacting!',
            'confidence': 'low'
        }

    # Calculate daily net spending (spent - received)
    days = []
    net_spending = []
    for i, row in enumerate(daily_data):
        days.append(i)
        net_spending.append(row['spent'] - row['received'])

    days = np.array(days, dtype=float)
    net_spending = np.array(net_spending, dtype=float)

    # Simple linear regression
    n = len(days)
    if n < 2:
        avg_daily_net = 0
    else:
        mean_x = np.mean(days)
        mean_y = np.mean(net_spending)
        
        numerator = np.sum((days - mean_x) * (net_spending - mean_y))
        denominator = np.sum((days - mean_x) ** 2)
        
        if denominator == 0:
            slope = 0
        else:
            slope = numerator / denominator
        
        avg_daily_net = mean_y + slope * (n - mean_x)

    # Predict days until balance runs out
    predictions = []
    projected_balance = current_balance

    if avg_daily_net > 0:
        days_until_zero = int(current_balance / avg_daily_net)
        days_until_zero = min(days_until_zero, 365)  # Cap at 1 year

        for day in range(1, min(days_until_zero + 1, 31)):
            projected_balance = current_balance - (avg_daily_net * day)
            predictions.append({
                'day': day,
                'projected_balance': max(round(projected_balance, 2), 0)
            })

        if days_until_zero <= 3:
            message = f"⚠️ At your current spending rate, you may run out of balance in {days_until_zero} day(s)! We highly suggest immediately halting non-essential transfers."
            confidence = 'medium'
        elif days_until_zero <= 7:
            message = f"📉 At this pace, your balance may last about {days_until_zero} more days. Consider lowering your daily spending by 20% to extend your runtime."
            confidence = 'medium'
        elif days_until_zero <= 30:
            message = f"📊 Your balance should last approximately {days_until_zero} days at current rates. Try tracking your vendor purchases to stabilize your net flow."
            confidence = 'low'
        else:
            message = f"✅ Your balance looks healthy! Estimated to last {days_until_zero}+ days."
            confidence = 'low'
    else:
        # User is receiving more than spending
        message = "📈 Great news! You're earning more than you're spending. Your balance is growing!"
        confidence = 'medium'
        for day in range(1, 8):
            projected_balance = current_balance + (abs(avg_daily_net) * day)
            predictions.append({
                'day': day,
                'projected_balance': round(projected_balance, 2)
            })

    return {
        'user_id': user_id,
        'current_balance': current_balance,
        'avg_daily_net_spending': round(avg_daily_net, 2),
        'prediction': predictions,
        'message': message,
        'confidence': confidence,
        'data_points': n
    }
