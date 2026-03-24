"""
Offline AI Assistant Service
Rule-based intent matching for chat-style interface.
Works completely offline with no external dependencies.
"""
import re
from datetime import datetime


# Intent patterns with regex matching
INTENT_PATTERNS = {
    'balance': [
        r'\b(balance|how much|money|funds|wallet|account)\b',
        r'\b(what.*balance|check.*balance|show.*balance)\b',
        r'\b(how much.*have|how much.*left)\b',
    ],
    'transactions': [
        r'\b(transactions?|history|recent|activity|payments?)\b',
        r'\b(show.*transactions?|recent.*transactions?)\b',
        r'\b(what.*sent|what.*received|who.*paid)\b',
    ],
    'send_help': [
        r'\b(send|transfer|pay|give)\b.*\b(money|funds|cash)\b',
        r'\b(how.*send|how.*transfer|how.*pay)\b',
    ],
    'receive_help': [
        r'\b(receive|get|request)\b.*\b(money|payment|funds)\b',
        r'\b(how.*receive|how.*get.*money|qr.*code)\b',
    ],
    'vendor_help': [
        r'\b(vendor|merchant|pos|shop|store|business)\b',
        r'\b(how.*vendor|set.*up.*vendor|pos.*mode)\b',
    ],
    'security': [
        r'\b(security|safe|fraud|hack|protect|pin|password)\b',
        r'\b(is.*safe|is.*secure|change.*pin)\b',
    ],
    'greeting': [
        r'\b(hello|hi|hey|good morning|good afternoon|good evening)\b',
        r'\b(what.*can.*you.*do|help|assist)\b',
    ],
    'sync': [
        r'\b(sync|cloud|internet|online|backup|upload)\b',
        r'\b(how.*sync|when.*sync)\b',
    ],
    'insights': [
        r'\b(insights?|spending|analysis|report|statistics?|stats?)\b',
        r'\b(show.*insights?|my.*spending|analyze)\b',
    ],
    'about': [
        r'\b(what.*meshbank|about|who.*made|what.*is.*this)\b',
        r'\b(explain|tell.*about|info)\b',
    ],
}


# Response templates
RESPONSES = {
    'balance': {
        'needs_data': True,
        'template': "💰 Your current balance is **${balance:.2f}**.\n\nYou can view your full dashboard for more details.",
    },
    'transactions': {
        'needs_data': True,
        'template': "📋 Here are your recent transactions:\n\n{transaction_list}\n\nView your full transaction history in the Transactions tab.",
    },
    'send_help': {
        'needs_data': False,
        'response': "📤 **How to Send Money:**\n\n1. Go to the **Send Money** tab\n2. Enter the recipient's phone number or scan their QR code\n3. Enter the amount you want to send\n4. Confirm with your PIN\n5. You'll see an instant receipt!\n\n💡 Tip: You can also send money by scanning someone's QR code from the Receive tab.",
    },
    'receive_help': {
        'needs_data': False,
        'response': "📥 **How to Receive Money:**\n\n1. Go to the **Receive / QR** tab\n2. Show your QR code to the sender\n3. They scan it and enter the amount\n4. You'll receive the funds instantly!\n\n💡 Your unique QR code is linked to your account.",
    },
    'vendor_help': {
        'needs_data': False,
        'response': "🏪 **Vendor POS Mode:**\n\n1. Enable **Vendor Mode** from your profile\n2. Go to the **POS** tab\n3. Enter the payment amount\n4. A QR code is generated for the customer\n5. Customer scans and confirms with PIN\n6. Payment is instant!\n\n📊 Track your sales on the Vendor Dashboard.",
    },
    'security': {
        'needs_data': False,
        'response': "🔒 **Security Features:**\n\n• Your PIN is securely hashed (bcrypt)\n• All transactions require PIN confirmation\n• Duplicate transaction protection\n• AI-powered fraud detection monitors for suspicious activity\n• Negative balance prevention\n\n💡 Tip: Never share your PIN with anyone!",
    },
    'greeting': {
        'needs_data': False,
        'response': "👋 **Hello! I'm MeshBot, your offline AI assistant.**\n\nI can help you with:\n• 💰 Check your balance\n• 📋 View transactions\n• 📤 How to send money\n• 📥 How to receive money\n• 🏪 Vendor POS setup\n• 🔒 Security info\n• 📊 Financial insights\n• ☁️ Sync status\n\nJust ask me anything!",
    },
    'sync': {
        'needs_data': False,
        'response': "☁️ **Cloud Sync:**\n\nMeshBank works entirely offline. When internet is available:\n\n1. Go to **Settings** or Dashboard\n2. Tap **Sync to Cloud**\n3. All unsynced transactions are uploaded\n4. You'll see a confirmation with sync status\n\n💡 Your data is always safe locally, even without internet!",
    },
    'insights': {
        'needs_data': False,
        'response': "📊 **AI Financial Insights:**\n\nMeshBank analyzes your transactions to provide:\n• 💸 Daily spending summaries\n• 🔄 Frequent payment patterns\n• 📈 Cash flow analysis\n• ⚠️ Spending alerts\n• 🔮 Balance predictions\n\nCheck the **AI Insights** tab for your personalized report!",
    },
    'about': {
        'needs_data': False,
        'response': "🏦 **About MeshBank:**\n\nMeshBank is an **offline-first microbanking system** that runs on a Raspberry Pi.\n\n**Features:**\n• Create accounts without internet\n• Send & receive money offline\n• Vendor POS payments\n• AI-powered fraud detection\n• Smart financial insights\n• Cloud sync when internet available\n\n**Mission:** Financial inclusion for everyone, everywhere — even without internet!",
    },
    'unknown': {
        'needs_data': False,
        'response': "🤔 I'm not sure I understand that. Here's what I can help with:\n\n• **\"What's my balance?\"**\n• **\"Show my transactions\"**\n• **\"How do I send money?\"**\n• **\"How to receive money?\"**\n• **\"Tell me about vendor mode\"**\n• **\"Is my money safe?\"**\n• **\"Show my insights\"**\n\nTry asking one of these!",
    },
}


def match_intent(message):
    """Match user message to an intent using regex patterns."""
    message_lower = message.lower().strip()

    best_intent = 'unknown'
    best_score = 0

    for intent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            matches = re.findall(pattern, message_lower)
            score = len(matches)
            if score > best_score:
                best_score = score
                best_intent = intent

    return best_intent


def process_message(message, user_id, conn):
    """Process a message and return a response."""
    intent = match_intent(message)
    response_config = RESPONSES[intent]

    if not response_config.get('needs_data'):
        return {
            'intent': intent,
            'response': response_config['response'],
            'timestamp': datetime.now().isoformat()
        }

    # Fetch user data for data-dependent responses
    cursor = conn.cursor()

    if intent == 'balance':
        cursor.execute("SELECT balance, name FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if user:
            response_text = response_config['template'].format(balance=user['balance'])
        else:
            response_text = "❌ I couldn't find your account. Please log in again."

    elif intent == 'transactions':
        cursor.execute("""
            SELECT t.amount, t.type, t.created_at,
                   CASE WHEN t.sender_id = ? THEN 'sent' ELSE 'received' END as direction,
                   CASE WHEN t.sender_id = ? THEN r.name ELSE s.name END as other_party
            FROM transactions t
            JOIN users s ON t.sender_id = s.id
            JOIN users r ON t.receiver_id = r.id
            WHERE t.sender_id = ? OR t.receiver_id = ?
            ORDER BY t.created_at DESC LIMIT 5
        """, (user_id, user_id, user_id, user_id))
        txns = cursor.fetchall()

        if txns:
            lines = []
            for t in txns:
                emoji = '📤' if t['direction'] == 'sent' else '📥'
                sign = '-' if t['direction'] == 'sent' else '+'
                lines.append(f"{emoji} {sign}${t['amount']:.2f} — {t['other_party']} ({t['type']})")
            transaction_list = '\n'.join(lines)
        else:
            transaction_list = "No transactions yet."

        response_text = response_config['template'].format(transaction_list=transaction_list)
    else:
        response_text = RESPONSES['unknown']['response']

    return {
        'intent': intent,
        'response': response_text,
        'timestamp': datetime.now().isoformat()
    }
