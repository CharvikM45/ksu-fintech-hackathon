from flask import Blueprint, request, jsonify
from models.database import get_db
from services.fraud_detection import get_fraud_report
from services.insights import get_insights
from services.assistant import process_message
from services.predictor import predict_balance

ai_bp = Blueprint('ai', __name__)


@ai_bp.route('/api/ai/fraud/<user_id>', methods=['GET'])
def fraud_check(user_id):
    """Get fraud risk assessment for a user."""
    conn = get_db()
    report = get_fraud_report(user_id, conn)
    conn.close()

    if not report:
        return jsonify({'error': 'User not found'}), 404

    return jsonify(report)


@ai_bp.route('/api/ai/insights/<user_id>', methods=['GET'])
def financial_insights(user_id):
    """Get AI-powered financial insights for a user."""
    conn = get_db()
    insights = get_insights(user_id, conn)
    conn.close()

    if not insights:
        return jsonify({'error': 'User not found'}), 404

    return jsonify(insights)


@ai_bp.route('/api/ai/assistant', methods=['POST'])
def chat_assistant():
    """Offline AI assistant - chat endpoint."""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    message = data.get('message', '').strip()
    user_id = data.get('user_id', '').strip()

    if not message:
        return jsonify({'error': 'Message is required'}), 400

    conn = get_db()
    response = process_message(message, user_id, conn)
    conn.close()

    return jsonify(response)


@ai_bp.route('/api/ai/predict/<user_id>', methods=['GET'])
def balance_prediction(user_id):
    """Get balance trend prediction for a user."""
    conn = get_db()
    prediction = predict_balance(user_id, conn)
    conn.close()

    if not prediction:
        return jsonify({'error': 'User not found'}), 404

    return jsonify(prediction)
