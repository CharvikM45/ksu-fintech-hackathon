"""
Smart Financial Insights Service
Generates contextual spending/earning insights from transaction data.
"""
from datetime import datetime


def get_insights(user_id, conn):
    """Generate financial insights for a user."""
    cursor = conn.cursor()

    # Get user info
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        return None

    insights = []

    # --- Insight 1: Today's spending as percentage of balance ---
    cursor.execute("""
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE sender_id = ? AND date(created_at) = date('now')
        AND type != 'deposit'
    """, (user_id,))
    today_spent = cursor.fetchone()['total']

    if user['balance'] > 0 and today_spent > 0:
        pct = round(today_spent / (user['balance'] + today_spent) * 100, 1)
        if pct > 50:
            insights.append({
                'type': 'warning',
                'icon': '⚠️',
                'title': 'High Spending Alert',
                'message': f"You've spent {pct}% of your starting balance today (${today_spent:.2f})",
                'category': 'spending'
            })
        elif pct > 20:
            insights.append({
                'type': 'info',
                'icon': '💸',
                'title': 'Daily Spending',
                'message': f"You've spent {pct}% of your balance today (${today_spent:.2f})",
                'category': 'spending'
            })

    # --- Insight 2: Frequent recipients ---
    cursor.execute("""
        SELECT r.name, COUNT(*) as count, SUM(t.amount) as total
        FROM transactions t
        JOIN users r ON t.receiver_id = r.id
        WHERE t.sender_id = ? AND t.type != 'deposit'
        GROUP BY t.receiver_id
        ORDER BY count DESC LIMIT 3
    """, (user_id,))
    freq_recipients = cursor.fetchall()

    for rec in freq_recipients:
        if rec['count'] >= 3:
            insights.append({
                'type': 'info',
                'icon': '🔄',
                'title': 'Frequent Payments',
                'message': f"You frequently pay {rec['name']} ({rec['count']} times, total ${rec['total']:.2f})",
                'category': 'patterns'
            })

    # --- Insight 3: Spending trend this week ---
    cursor.execute("""
        SELECT COALESCE(SUM(amount), 0) as week_total,
               COUNT(*) as week_count
        FROM transactions
        WHERE sender_id = ? AND created_at > datetime('now', '-7 days')
        AND type != 'deposit'
    """, (user_id,))
    week_stats = cursor.fetchone()

    if week_stats['week_count'] > 0:
        daily_avg = week_stats['week_total'] / 7
        insights.append({
            'type': 'info',
            'icon': '📊',
            'title': 'Weekly Summary',
            'message': f"This week: ${week_stats['week_total']:.2f} spent across {week_stats['week_count']} transactions (avg ${daily_avg:.2f}/day)",
            'category': 'summary'
        })

    # --- Insight 4: Income vs spending ---
    cursor.execute("""
        SELECT COALESCE(SUM(amount), 0) as received
        FROM transactions
        WHERE receiver_id = ? AND created_at > datetime('now', '-7 days')
        AND type != 'deposit'
    """, (user_id,))
    received = cursor.fetchone()['received']

    if week_stats['week_total'] > 0 or received > 0:
        net = received - week_stats['week_total']
        if net > 0:
            insights.append({
                'type': 'success',
                'icon': '📈',
                'title': 'Positive Cash Flow',
                'message': f"You received ${net:.2f} more than you spent this week",
                'category': 'cashflow'
            })
        elif net < 0:
            insights.append({
                'type': 'warning',
                'icon': '📉',
                'title': 'Negative Cash Flow',
                'message': f"You spent ${abs(net):.2f} more than you received this week",
                'category': 'cashflow'
            })

    # --- Insight 5: Largest transaction ---
    cursor.execute("""
        SELECT amount, r.name as receiver_name, t.created_at
        FROM transactions t
        JOIN users r ON t.receiver_id = r.id
        WHERE t.sender_id = ?
        ORDER BY t.amount DESC LIMIT 1
    """, (user_id,))
    largest = cursor.fetchone()
    if largest:
        insights.append({
            'type': 'info',
            'icon': '💰',
            'title': 'Largest Transaction',
            'message': f"Your largest payment was ${largest['amount']:.2f} to {largest['receiver_name']}",
            'category': 'records'
        })

    # --- Vendor-specific insights ---
    if user['is_vendor']:
        cursor.execute("""
            SELECT COUNT(DISTINCT sender_id) as unique_customers,
                   COALESCE(SUM(amount), 0) as total_revenue
            FROM transactions
            WHERE receiver_id = ? AND type = 'vendor'
        """, (user_id,))
        vendor_stats = cursor.fetchone()

        insights.append({
            'type': 'success',
            'icon': '🏪',
            'title': 'Business Overview',
            'message': f"{vendor_stats['unique_customers']} unique customers, ${vendor_stats['total_revenue']:.2f} total revenue",
            'category': 'vendor'
        })

    # Always return at least one insight
    if not insights:
        insights.append({
            'type': 'info',
            'icon': '👋',
            'title': 'Getting Started',
            'message': 'Start transacting to see personalized financial insights!',
            'category': 'general'
        })

    return {
        'user_id': user_id,
        'balance': user['balance'],
        'insights': insights,
        'generated_at': datetime.now().isoformat()
    }
