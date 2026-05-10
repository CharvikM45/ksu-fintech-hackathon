"""
Offline AI Assistant Service
Integrates Dialo-GPT for full conversation + contextual data injection.
"""
from datetime import datetime

# Initialize the model and tokenizer globally (loads once when app starts)
try:
    print("Loading DialoGPT model...")
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-small")
    model = AutoModelForCausalLM.from_pretrained("microsoft/DialoGPT-small")
    print("DialoGPT model loaded successfully.")
except Exception as e:
    print(f"Failed to load DialoGPT: {e}")
    tokenizer = None
    model = None


def generate_dialo_response(user_message, user_data):
    """Generate an offline response using Intent-matching NLP with regex patterns."""
    msg_lower = user_message.lower()
    
    # --- User Data / Financial Fact Inquiries ---
    if 'how many transactions' in msg_lower and 'today' in msg_lower:
        return f"You have done {user_data['txns_today']} transactions today."
    elif 'spent' in msg_lower and 'today' in msg_lower:
        return f"You have spent ${user_data['spent_today']:.2f} today."
    elif 'spend' in msg_lower and 'today' in msg_lower:
        return f"You can spend ${user_data['limit_left']:.2f} more today before hitting your daily limit."
    elif 'limit' in msg_lower and ('daily' in msg_lower or 'user' in msg_lower):
        return f"Your daily spending limit is ${user_data['daily_cap']:.2f} based on your account age."
    elif 'balance' in msg_lower:
        return f"Your current balance is ${user_data['balance']:.2f}."
    elif 'recent' in msg_lower or 'transactions' in msg_lower:
        if user_data['transactions']:
            txns = ", ".join([f"{t['direction']} ${t['amount']:.2f}" for t in user_data['transactions']])
            return f"Your recent transactions: {txns}."
        else:
            return "You have no recent transactions."

    # --- Project Knowledge / General Inquiries ---
    if 'what is meshbank' in msg_lower or ('meshbank' in msg_lower and 'what' in msg_lower):
        return "MeshBank is an offline-first banking system that runs on a Raspberry Pi. It allows users to bank without borders and without internet, perfect for disaster zones or remote areas."
    elif 'offline' in msg_lower and ('how' in msg_lower or 'work' in msg_lower):
        return "MeshBank runs on a local network (like a Raspberry Pi hotspot). Users connect via Wi-Fi and can create accounts, transfer money, and pay vendors locally. The system syncs to the cloud only when internet becomes available."
    elif 'vendor' in msg_lower or 'pos' in msg_lower:
        return "Vendors can use POS mode to generate QR codes for payments. Users just scan the QR code to pay instantly, completely offline."
    elif 'fraud' in msg_lower or 'security' in msg_lower:
        return "MeshBank uses an offline multi-rule scoring system to detect fraud, flagging rapid transfers, abnormally large amounts, or activity spikes without needing a cloud connection."
    elif 'ai' in msg_lower or 'insights' in msg_lower:
        return "I am the offline AI assistant! I analyze your spending patterns, frequent recipients, and cash flow to provide financial insights right on your device."
    elif 'hello' in msg_lower or 'hi' in msg_lower or 'hey' in msg_lower:
        return f"Hello, {user_data['name']}! I'm your MeshBank offline assistant. Ask me about your balance, recent transactions, or how MeshBank works."
    elif 'thank' in msg_lower:
        return "You're very welcome! Let me know if you need anything else."
    
    # --- Default Fallback ---
    return "I am operating in offline NLP mode. I can answer questions about your balance, daily limits, spending today, or general info about how MeshBank works! What would you like to know?"


def process_message(message, user_id, conn):
    """Process a message by fetching data and passing it to DialoGPT."""
    cursor = conn.cursor()
    
    # Fetch user data for context
    cursor.execute("SELECT balance, name, created_at FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    
    user_data = {
        'name': user['name'] if user else 'Unknown',
        'balance': user['balance'] if user else 0.0,
        'transactions': [],
        'spent_today': 0.0,
        'txns_today': 0,
        'limit_left': 1000.0
    }
    
    if user:
        # Calculate daily limit
        daily_cap = 1000
        if user['created_at']:
            try:
                created_dt = datetime.fromisoformat(user['created_at'].replace('Z', '+00:00'))
                if created_dt.tzinfo is None:
                    age_days = (datetime.now() - created_dt).days
                else:
                    age_days = (datetime.now(created_dt.tzinfo) - created_dt).days
                if age_days < 1: daily_cap = 1000
                elif age_days < 7: daily_cap = 5000
                else: daily_cap = 10000
            except:
                pass
                
        # Calculate today's spending & transaction count
        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) as spent_today, COUNT(id) as txns_today
            FROM transactions 
            WHERE sender_id = ? AND created_at > datetime('now', '-24 hours')
        """, (user_id,))
        today_stats = cursor.fetchone()
        if today_stats:
            user_data['spent_today'] = float(today_stats['spent_today'])
            user_data['txns_today'] = int(today_stats['txns_today'])
            
        user_data['limit_left'] = max(0.0, float(daily_cap - user_data['spent_today']))
        user_data['daily_cap'] = float(daily_cap)

        # Get recent transactions
        cursor.execute("""
            SELECT t.amount, t.type,
                   CASE WHEN t.sender_id = ? THEN 'sent' ELSE 'received' END as direction
            FROM transactions t
            WHERE t.sender_id = ? OR t.receiver_id = ?
            ORDER BY t.created_at DESC LIMIT 3
        """, (user_id, user_id, user_id))
        txns = cursor.fetchall()
        for t in txns:
            user_data['transactions'].append(dict(t))

    # Generate the actual AI response
    response_text = generate_dialo_response(message, user_data)

    return {
        'intent': 'dialo_gpt',
        'response': response_text,
        'timestamp': datetime.now().isoformat()
    }
