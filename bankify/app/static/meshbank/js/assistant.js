/**
 * MeshBank AI Chat Assistant Module
 */
const Assistant = {
    sendMessage: async function(message, userId) {
        try {
            const res = await fetch('/api/ai/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, user_id: userId })
            });
            return await res.json();
        } catch (err) {
            return {
                intent: 'error',
                response: '❌ Could not connect to MeshBot. Make sure the server is running.'
            };
        }
    }
};
