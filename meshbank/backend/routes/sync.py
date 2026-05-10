from flask import Blueprint, request, jsonify
from models.database import get_db
import json

sync_bp = Blueprint('sync', __name__)


@sync_bp.route('/api/sync', methods=['POST'])
def sync_to_cloud():
    """Sync all unsynced transactions to mock cloud backend."""
    conn = get_db()
    cursor = conn.cursor()

    # Get all unsynced transactions
    cursor.execute("""
        SELECT t.*, 
               s.name as sender_name, 
               r.name as receiver_name
        FROM transactions t
        JOIN users s ON t.sender_id = s.id
        JOIN users r ON t.receiver_id = r.id
        WHERE t.synced = 0
        ORDER BY t.created_at ASC
    """)

    unsynced = [dict(row) for row in cursor.fetchall()]

    if not unsynced:
        conn.close()
        return jsonify({
            'success': True,
            'synced_count': 0,
            'message': 'All transactions are already synced!'
        })

    # Simulate cloud sync (in production, this would POST to Firebase/REST API)
    synced_ids = []
    for txn in unsynced:
        # Simulate successful cloud push
        synced_ids.append(txn['id'])

    # Mark all as synced
    placeholders = ','.join(['?' for _ in synced_ids])
    cursor.execute(f"UPDATE transactions SET synced = 1 WHERE id IN ({placeholders})", synced_ids)
    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'synced_count': len(synced_ids),
        'synced_transactions': synced_ids,
        'message': f'Successfully synced {len(synced_ids)} transactions to cloud!'
    })


@sync_bp.route('/api/sync/status', methods=['GET'])
def sync_status():
    """Get sync status overview."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total FROM transactions")
    total = cursor.fetchone()['total']

    cursor.execute("SELECT COUNT(*) as synced FROM transactions WHERE synced = 1")
    synced = cursor.fetchone()['synced']

    cursor.execute("SELECT COUNT(*) as unsynced FROM transactions WHERE synced = 0")
    unsynced = cursor.fetchone()['unsynced']

    conn.close()

    return jsonify({
        'total_transactions': total,
        'synced': synced,
        'unsynced': unsynced,
        'sync_percentage': round((synced / total * 100) if total > 0 else 100, 1)
    })
