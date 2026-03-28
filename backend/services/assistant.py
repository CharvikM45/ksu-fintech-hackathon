"""
Offline AI Assistant Service
Integrates Dialo-GPT for full conversation + contextual data injection.
"""
from datetime import datetime
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

# Initialize the model and tokenizer globally (loads once when app starts)
try:
    print("Loading DialoGPT model...")
    tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-small")
    model = AutoModelForCausalLM.from_pretrained("microsoft/DialoGPT-small")
    print("DialoGPT model loaded successfully.")
except Exception as e:
    print(f"Failed to load DialoGPT: {e}")
    tokenizer = None
    model = None


def generate_dialo_response(user_message, user_data):
    """Generate a response using Dialo-GPT with injected context."""
    msg_lower = user_message.lower()
    
    # Intercept specific financial fact inquiries
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

    if not tokenizer or not model:
        return "Sorry, my AI brain (DialoGPT) is currently offline or failed to load."

    # Build context string for general chat
    context_str = f"Balance: ${user_data['balance']:.2f}. Limit: ${user_data['limit_left']:.2f}. "
    if user_data['transactions']:
        context_str += "Recent: " + ", ".join(
            [f"{t['direction']} ${t['amount']:.2f}" for t in user_data['transactions']]
        )
    else:
        context_str += "No recent transactions."

    prompt = f"[Context: {context_str}]\nUser: {user_message}\nAssistant:"

    input_ids = tokenizer.encode(prompt, return_tensors='pt')
    
    # Generate the response
    try:
        response_ids = model.generate(
            input_ids,
            max_length=150,
            pad_token_id=tokenizer.eos_token_id,
            num_return_sequences=1,
            no_repeat_ngram_size=3,
            do_sample=True,
            top_k=50,
            top_p=0.95,
            temperature=0.7
        )
        
        output = tokenizer.decode(response_ids[:, input_ids.shape[-1]:][0], skip_special_tokens=True)
        return output.strip()
    except Exception as e:
        print(f"Error generating response: {e}")
        return "I encountered an error trying to process that request."


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
