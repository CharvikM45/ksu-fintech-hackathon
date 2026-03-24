/**
 * MeshBank - Main Application Logic
 * Core SPA navigation, API calls, auth state, page rendering
 */

const API = '';  // Same-origin

// ============ STATE ============
let currentUser = null;
let allTransactions = [];

// ============ UTILS ============
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

async function apiCall(endpoint, options = {}) {
    try {
        const res = await fetch(API + endpoint, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Something went wrong');
        }
        return data;
    } catch (err) {
        if (err.message === 'Failed to fetch') {
            showToast('Cannot connect to server', 'error');
        }
        throw err;
    }
}

function formatCurrency(amount) {
    return '$' + parseFloat(amount).toFixed(2);
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============ AUTH ============
function showLogin() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function demoLogin(phone, pin) {
    document.getElementById('login-phone').value = phone;
    document.getElementById('login-pin').value = pin;
    handleLogin();
}

async function handleLogin() {
    const phone = document.getElementById('login-phone').value.trim();
    const pin = document.getElementById('login-pin').value.trim();

    if (!phone || !pin) {
        showToast('Please enter phone and PIN', 'error');
        return;
    }

    try {
        const data = await apiCall('/api/login', {
            method: 'POST',
            body: JSON.stringify({ phone, pin })
        });
        currentUser = data.user;
        showToast(`Welcome back, ${currentUser.name}!`);
        showApp();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleRegister() {
    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const pin = document.getElementById('reg-pin').value.trim();
    const isVendor = document.getElementById('reg-vendor-toggle').classList.contains('active') ? 1 : 0;

    if (!name || !phone || !pin) {
        showToast('Please fill all fields', 'error');
        return;
    }
    if (pin.length < 4) {
        showToast('PIN must be at least 4 digits', 'error');
        return;
    }

    try {
        const data = await apiCall('/api/register', {
            method: 'POST',
            body: JSON.stringify({ name, phone, pin, is_vendor: isVendor })
        });
        currentUser = data.user;
        showToast('Account created!');
        showApp();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function handleLogout() {
    currentUser = null;
    document.getElementById('auth-screen').style.display = '';
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('login-phone').value = '';
    document.getElementById('login-pin').value = '';
    showLogin();
}

// ============ APP ============
function showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'flex';
    refreshDashboard();
    navigateTo('dashboard');
}

// ============ NAVIGATION ============
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');

    const navEl = document.getElementById('nav-' + page);
    if (navEl) navEl.classList.add('active');

    // Trigger page-specific loads
    switch(page) {
        case 'dashboard':
            refreshDashboard();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'receive':
            loadQRCode();
            break;
        case 'vendor':
            loadVendorPage();
            break;
        case 'ai':
            loadAIInsights();
            break;
    }
}

// ============ DASHBOARD ============
async function refreshDashboard() {
    if (!currentUser) return;

    try {
        const userData = await apiCall(`/api/balance/${currentUser.id}`);
        currentUser.balance = userData.balance;
        document.getElementById('dashboard-balance').textContent = formatCurrency(userData.balance);
    } catch (err) {}

    // Load recent transactions
    try {
        const data = await apiCall(`/api/transactions/${currentUser.id}`);
        allTransactions = data.transactions;
        renderTransactionList('dashboard-transactions', data.transactions.slice(0, 5));
    } catch (err) {}

    // Load alerts
    try {
        const fraud = await apiCall(`/api/ai/fraud/${currentUser.id}`);
        renderAlerts(fraud);
    } catch (err) {}
}

function renderAlerts(fraudData) {
    const container = document.getElementById('dashboard-alerts');
    if (!fraudData.alerts || fraudData.alerts.length === 0) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    for (const alert of fraudData.alerts) {
        const cls = alert.type === 'warning' ? 'alert-warning' : 'alert-info';
        html += `<div class="alert ${cls}"><span>⚡</span> ${alert.message}</div>`;
    }
    container.innerHTML = html;
}

// ============ TRANSACTIONS ============
function renderTransactionList(containerId, transactions) {
    const container = document.getElementById(containerId);

    if (!transactions || transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p class="empty-state-text">No transactions yet</p>
            </div>`;
        return;
    }

    let html = '';
    for (const txn of transactions) {
        const isSent = txn.direction === 'sent';
        const icon = isSent ? '📤' : '📥';
        const iconClass = isSent ? 'sent' : 'received';
        const name = isSent ? txn.receiver_name : txn.sender_name;
        const sign = isSent ? '-' : '+';
        const amountClass = isSent ? 'negative' : 'positive';
        const riskBadge = txn.risk_level && txn.risk_level !== 'low'
            ? `<span class="badge badge-${txn.risk_level === 'medium' ? 'warning' : 'danger'}">${txn.risk_level}</span>` : '';

        html += `
            <div class="txn-item">
                <div class="txn-icon ${iconClass}">${icon}</div>
                <div class="txn-details">
                    <div class="txn-name">${name} ${riskBadge}</div>
                    <div class="txn-meta">${txn.type} • ${formatTime(txn.created_at)} ${txn.note ? '• ' + txn.note : ''}</div>
                </div>
                <div class="txn-amount ${amountClass}">${sign}${formatCurrency(txn.amount)}</div>
            </div>`;
    }
    container.innerHTML = html;
}

async function loadTransactions() {
    if (!currentUser) return;
    try {
        const data = await apiCall(`/api/transactions/${currentUser.id}`);
        allTransactions = data.transactions;
        renderTransactionList('transactions-list', data.transactions);
    } catch (err) {
        showToast('Failed to load transactions', 'error');
    }
}

function filterTransactions(filter, btn) {
    document.querySelectorAll('#page-transactions .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    let filtered = allTransactions;
    if (filter === 'sent') filtered = allTransactions.filter(t => t.direction === 'sent');
    if (filter === 'received') filtered = allTransactions.filter(t => t.direction === 'received');
    renderTransactionList('transactions-list', filtered);
}

// ============ SEND MONEY ============
async function handleSend() {
    const phone = document.getElementById('send-phone').value.trim();
    const amount = document.getElementById('send-amount').value;
    const note = document.getElementById('send-note').value.trim();
    const pin = document.getElementById('send-pin').value.trim();

    if (!phone || !amount || !pin) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    try {
        const data = await apiCall('/api/transfer', {
            method: 'POST',
            body: JSON.stringify({
                sender_id: currentUser.id,
                receiver_phone: phone,
                amount: parseFloat(amount),
                pin,
                note
            })
        });

        // Show success
        document.getElementById('success-amount').textContent = formatCurrency(data.transaction.amount);
        document.getElementById('success-message').textContent = `Sent to ${data.transaction.receiver}`;
        document.getElementById('success-receipt').innerHTML = `
            <div class="card" style="margin-top: 16px; font-size: 0.8rem;">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <span style="color:var(--text-muted)">Transaction ID</span>
                    <span style="font-weight:600">${data.transaction.id}</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <span style="color:var(--text-muted)">Status</span>
                    <span class="badge badge-success">${data.transaction.status}</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <span style="color:var(--text-muted)">Risk Level</span>
                    <span class="badge badge-${data.transaction.risk_level === 'low' ? 'success' : data.transaction.risk_level === 'medium' ? 'warning' : 'danger'}">${data.transaction.risk_level}</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                    <span style="color:var(--text-muted)">New Balance</span>
                    <span style="font-weight:700">${formatCurrency(data.new_balance)}</span>
                </div>
            </div>`;
        document.getElementById('success-modal').classList.add('active');

        // Clear form
        document.getElementById('send-phone').value = '';
        document.getElementById('send-amount').value = '';
        document.getElementById('send-note').value = '';
        document.getElementById('send-pin').value = '';

        currentUser.balance = data.new_balance;
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ============ RECEIVE / QR ============
function loadQRCode() {
    if (!currentUser) return;
    const canvas = document.getElementById('user-qr-canvas');
    QRCode.generate(canvas, currentUser.qr_data || currentUser.id, 200);
    document.getElementById('qr-user-name').textContent = currentUser.name;
    document.getElementById('qr-user-id').textContent = currentUser.id;
}

// ============ VENDOR ============
function loadVendorPage() {
    if (!currentUser) return;
    const toggle = document.getElementById('vendor-mode-toggle');
    const panel = document.getElementById('vendor-pos-panel');
    const stats = document.getElementById('vendor-stats');

    if (currentUser.is_vendor) {
        toggle.classList.add('active');
        panel.style.display = 'block';
        loadVendorStats();
    } else {
        toggle.classList.remove('active');
        panel.style.display = 'none';
    }
}

async function toggleVendorMode() {
    if (!currentUser) return;
    try {
        const data = await apiCall(`/api/user/${currentUser.id}/toggle-vendor`, { method: 'POST' });
        currentUser.is_vendor = data.is_vendor;
        showToast(data.message);
        loadVendorPage();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function loadVendorStats() {
    if (!currentUser || !currentUser.is_vendor) return;
    try {
        const data = await apiCall(`/api/vendor/dashboard/${currentUser.id}`);
        document.getElementById('vendor-stats').style.display = 'block';
        document.getElementById('vendor-total-revenue').textContent = formatCurrency(data.stats.total_revenue);
        document.getElementById('vendor-total-txns').textContent = data.stats.total_transactions;
        document.getElementById('vendor-today-revenue').textContent = formatCurrency(data.stats.today_revenue);
        document.getElementById('vendor-today-txns').textContent = data.stats.today_transactions;
    } catch (err) {}
}

async function createPaymentRequest() {
    const amount = document.getElementById('vendor-amount').value;
    if (!amount || parseFloat(amount) <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    try {
        const data = await apiCall('/api/vendor/request', {
            method: 'POST',
            body: JSON.stringify({
                vendor_id: currentUser.id,
                amount: parseFloat(amount)
            })
        });

        document.getElementById('vendor-qr-result').style.display = 'block';
        document.getElementById('vendor-amount-display').textContent = formatCurrency(data.payment_request.amount);
        document.getElementById('vendor-request-id').textContent = data.payment_request.id;

        const canvas = document.getElementById('vendor-qr-canvas');
        QRCode.generate(canvas, data.payment_request.qr_data, 200);

        showToast('Payment request created!');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function payVendor() {
    const requestId = document.getElementById('pay-request-id').value.trim();
    const pin = document.getElementById('pay-vendor-pin').value.trim();

    if (!requestId || !pin) {
        showToast('Please fill all fields', 'error');
        return;
    }

    try {
        const data = await apiCall('/api/vendor/pay', {
            method: 'POST',
            body: JSON.stringify({
                request_id: requestId,
                customer_id: currentUser.id,
                pin
            })
        });

        document.getElementById('success-amount').textContent = formatCurrency(data.transaction.amount);
        document.getElementById('success-message').textContent = `Paid to ${data.transaction.receiver}`;
        document.getElementById('success-receipt').innerHTML = `
            <div class="card" style="margin-top: 16px; font-size: 0.8rem;">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <span style="color:var(--text-muted)">Transaction ID</span>
                    <span style="font-weight:600">${data.transaction.id}</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                    <span style="color:var(--text-muted)">New Balance</span>
                    <span style="font-weight:700">${formatCurrency(data.new_balance)}</span>
                </div>
            </div>`;
        document.getElementById('success-modal').classList.add('active');

        document.getElementById('pay-request-id').value = '';
        document.getElementById('pay-vendor-pin').value = '';
        currentUser.balance = data.new_balance;
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ============ AI ============
function showAITab(tab, btn) {
    document.querySelectorAll('#page-ai .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.ai-panel').forEach(p => p.style.display = 'none');
    document.getElementById(`ai-${tab}-panel`).style.display = 'block';

    switch(tab) {
        case 'insights': loadAIInsights(); break;
        case 'fraud': loadFraudReport(); break;
        case 'predict': loadPrediction(); break;
    }
}

async function loadAIInsights() {
    if (!currentUser) return;
    try {
        const data = await apiCall(`/api/ai/insights/${currentUser.id}`);
        const container = document.getElementById('ai-insights-list');

        if (!data.insights || data.insights.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><p class="empty-state-text">No insights yet</p></div>';
            return;
        }

        let html = '';
        for (const insight of data.insights) {
            html += `
                <div class="insight-card">
                    <div class="insight-icon">${insight.icon}</div>
                    <div class="insight-content">
                        <div class="insight-title">${insight.title}</div>
                        <div class="insight-message">${insight.message}</div>
                    </div>
                </div>`;
        }
        container.innerHTML = html;
    } catch (err) {}
}

async function loadFraudReport() {
    if (!currentUser) return;
    try {
        const data = await apiCall(`/api/ai/fraud/${currentUser.id}`);
        const container = document.getElementById('ai-fraud-report');

        let html = `
            <div class="risk-meter">
                <span style="font-weight:700;font-size:0.85rem;">Risk Level</span>
                <div class="risk-bar">
                    <div class="risk-bar-fill ${data.overall_risk}"></div>
                </div>
                <span class="risk-label ${data.overall_risk}">${data.overall_risk.toUpperCase()}</span>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${data.risk_factors.txns_last_24h}</div>
                    <div class="stat-label">Txns (24h)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatCurrency(data.risk_factors.amount_last_24h)}</div>
                    <div class="stat-label">Amount (24h)</div>
                </div>
            </div>`;

        if (data.alerts && data.alerts.length > 0) {
            for (const alert of data.alerts) {
                const cls = alert.type === 'warning' ? 'alert-warning' : 'alert-info';
                html += `<div class="alert ${cls}"><span>🛡️</span> ${alert.message}</div>`;
            }
        } else {
            html += `<div class="alert alert-success"><span>✅</span> No suspicious activity detected. Your account is safe.</div>`;
        }

        if (data.flagged_transactions && data.flagged_transactions.length > 0) {
            html += `<div class="section-header" style="margin-top:20px;"><span class="section-title">Flagged Transactions</span></div>`;
            for (const txn of data.flagged_transactions) {
                html += `
                    <div class="txn-item">
                        <div class="txn-icon sent">⚠️</div>
                        <div class="txn-details">
                            <div class="txn-name">${txn.id} <span class="badge badge-${txn.risk_level === 'medium' ? 'warning' : 'danger'}">${txn.risk_level}</span></div>
                            <div class="txn-meta">${formatCurrency(txn.amount)} • ${formatTime(txn.created_at)}</div>
                        </div>
                    </div>`;
            }
        }

        container.innerHTML = html;
    } catch (err) {}
}

async function loadPrediction() {
    if (!currentUser) return;
    try {
        const data = await apiCall(`/api/ai/predict/${currentUser.id}`);
        const container = document.getElementById('ai-prediction-report');

        let html = `
            <div class="card" style="text-align:center; padding: 24px;">
                <div style="font-size:2rem;margin-bottom:8px;">🔮</div>
                <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px;">${data.message}</div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${formatCurrency(data.current_balance)}</div>
                        <div class="stat-label">Current Balance</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${formatCurrency(Math.abs(data.avg_daily_net_spending || 0))}</div>
                        <div class="stat-label">${(data.avg_daily_net_spending || 0) > 0 ? 'Avg Daily Spend' : 'Avg Daily Income'}</div>
                    </div>
                </div>
            </div>`;

        if (data.prediction && data.prediction.length > 0) {
            html += `<div class="section-header" style="margin-top:16px;"><span class="section-title">7-Day Projection</span></div>`;
            html += `<div class="card"><div style="padding: 8px 0;">`;
            for (const p of data.prediction.slice(0, 7)) {
                const pct = data.current_balance > 0 ? (p.projected_balance / data.current_balance * 100) : 100;
                const color = pct > 50 ? 'var(--success)' : pct > 20 ? 'var(--warning)' : 'var(--danger)';
                html += `
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
                        <span style="font-size:0.75rem;color:var(--text-muted);min-width:50px;">Day ${p.day}</span>
                        <div style="flex:1;height:6px;background:var(--bg-input);border-radius:3px;overflow:hidden;">
                            <div style="height:100%;width:${Math.max(pct, 2)}%;background:${color};border-radius:3px;transition:width 0.5s ease;"></div>
                        </div>
                        <span style="font-size:0.8rem;font-weight:600;min-width:60px;text-align:right;">${formatCurrency(p.projected_balance)}</span>
                    </div>`;
            }
            html += `</div></div>`;
        }

        container.innerHTML = html;
    } catch (err) {}
}

// ============ CHAT ============
async function sendChat() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    const container = document.getElementById('chat-messages');

    // User bubble
    container.innerHTML += `<div class="chat-bubble user">${escapeHtml(message)}</div>`;
    input.value = '';
    container.scrollTop = container.scrollHeight;

    // Get response
    const data = await Assistant.sendMessage(message, currentUser ? currentUser.id : '');

    // Bot bubble
    const responseHtml = data.response.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    container.innerHTML += `<div class="chat-bubble bot">${responseHtml}</div>`;
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============ MODALS ============
function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

function showDepositModal() {
    document.getElementById('deposit-modal').classList.add('active');
}

async function handleDeposit() {
    const amount = document.getElementById('deposit-amount').value;
    if (!amount || parseFloat(amount) <= 0) {
        showToast('Enter a valid amount', 'error');
        return;
    }

    try {
        const data = await apiCall('/api/deposit', {
            method: 'POST',
            body: JSON.stringify({
                user_id: currentUser.id,
                amount: parseFloat(amount)
            })
        });

        currentUser.balance = data.new_balance;
        showToast(data.message);
        closeModals();
        document.getElementById('deposit-amount').value = '';
        refreshDashboard();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ============ SYNC ============
async function syncToCloud() {
    try {
        const data = await apiCall('/api/sync', { method: 'POST' });
        showToast(data.message, data.synced_count > 0 ? 'success' : 'info');
    } catch (err) {
        showToast('Sync failed', 'error');
    }
}

// ============ INIT ============
// Close modals on backdrop click
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModals();
    });
});
