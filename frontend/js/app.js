/**
 * MeshBank - Main Application Logic
 * Core SPA navigation, API calls, auth state, page rendering
 */

const API = '';  // Same-origin

// ============ STATE ============
let currentUser = null;
let allTransactions = [];
let userKeys = null; // { publicKey, privateKey }

// ============ UTILS ============
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============ CRYPTO HELPERS ============
async function initKeys() {
    const stored = localStorage.getItem(`mb_keys_${currentUser?.id || 'guest'}`);
    if (stored) {
        try {
            const keys = JSON.parse(stored);
            const pub = await window.crypto.subtle.importKey("spki", base64ToUint8Array(keys.pub), { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
            const priv = await window.crypto.subtle.importKey("pkcs8", base64ToUint8Array(keys.priv), { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
            userKeys = { publicKey: pub, privateKey: priv, pubPem: keys.pubPem };
            return;
        } catch (e) { console.error("Key import failed", e); }
    }
    
    // Generate new if none
    const keyPair = await window.crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const pubExport = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const privExport = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    
    const pubBase64 = uint8ArrayToBase64(new Uint8Array(pubExport));
    const privBase64 = uint8ArrayToBase64(new Uint8Array(privExport));
    const pubPem = `-----BEGIN PUBLIC KEY-----\n${pubBase64}\n-----END PUBLIC KEY-----`;
    
    userKeys = { ...keyPair, pubPem };
    if (currentUser) {
        localStorage.setItem(`mb_keys_${currentUser.id}`, JSON.stringify({ pub: pubBase64, priv: privBase64, pubPem }));
    }
}

function uint8ArrayToBase64(arr) {
    return btoa(String.fromCharCode.apply(null, arr));
}

function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return arr;
}

async function signTransaction(dataObj) {
    if (!userKeys) await initKeys();
    const dataStr = `${dataObj.sender_id}|${dataObj.receiver_phone || ''}|${dataObj.amount}|${dataObj.timestamp}|${dataObj.idempotency_key}`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(dataStr);
    const signature = await window.crypto.subtle.sign({ name: "ECDSA", hash: { name: "SHA-256" } }, userKeys.privateKey, encoded);
    return uint8ArrayToBase64(new Uint8Array(signature));
}

async function apiCall(endpoint, options = {}) {
    try {
        const res = await fetch(API + endpoint, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        const data = await res.json();
        if (!res.ok) {
            const err = new Error(data.error || 'Something went wrong');
            err.risk_reasons = data.risk_reasons || [];
            err.risk_level = data.risk_level || null;
            throw err;
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
        await initKeys(); // Load or generate keys
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
        await initKeys(); // Generate keys for new user
        const data = await apiCall('/api/register', {
            method: 'POST',
            body: JSON.stringify({ name, phone, pin, is_vendor: isVendor, public_key: userKeys.pubPem })
        });
        currentUser = data.user;
        localStorage.setItem(`mb_keys_${currentUser.id}`, localStorage.getItem('mb_keys_guest')); // Migration
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
    if (currentUser) {
        document.getElementById('header-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
    }
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
        case 'settings':
            loadSettingsPage();
            break;
        case 'dashboard':
            refreshDashboard();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'receive':
            loadQRCode();
            loadPendingRequests();
            break;
        case 'send':
            loadPendingRequests();
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
        
        // Update Daily Limit
        const dailyLimitEl = document.getElementById('dashboard-daily-limit');
        if (dailyLimitEl) {
            const fraud = await apiCall(`/api/ai/fraud/${currentUser.id}`);
            const limitLeft = (fraud.velocity_limit || 0) - (fraud.risk_factors?.amount_last_24h || 0);
            dailyLimitEl.textContent = formatCurrency(Math.max(0, limitLeft));
        }

        const headerBal = document.getElementById('header-balance');
        if (headerBal) headerBal.textContent = formatCurrency(userData.balance);
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

    // Update pending requests badge
    loadPendingRequests();
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
    document.querySelectorAll('#page-transactions .segment').forEach(t => t.classList.remove('active'));
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
        const idempotency_key = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        const payload = {
            sender_id: currentUser.id,
            receiver_phone: phone,
            amount: parseFloat(amount),
            pin,
            note,
            idempotency_key,
            timestamp
        };
        
        // Sign the transaction
        payload.signature = await signTransaction(payload);

        const data = await apiCall('/api/transfer', {
            method: 'POST',
            body: JSON.stringify(payload)
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
        let msg = err.message || 'Transfer failed';
        if (err.risk_reasons && err.risk_reasons.length > 0) {
            msg += '\n\nFlagged because:\n• ' + err.risk_reasons.join('\n• ');
        }
        showToast(msg, 'error');
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

async function payVendorDirect() {
    const vendorId = document.getElementById('pay-vendor-id').value.trim();
    const amount = document.getElementById('pay-vendor-amount').value;
    const pin = document.getElementById('pay-vendor-pin').value.trim();

    if (!vendorId || !amount || !pin) {
        showToast('Please fill all fields', 'error');
        return;
    }

    try {
        const data = await apiCall('/api/vendor/pay-direct', {
            method: 'POST',
            body: JSON.stringify({
                vendor_id: vendorId,
                customer_id: currentUser.id,
                amount: parseFloat(amount),
                pin
            })
        });

        document.getElementById('success-amount').textContent = formatCurrency(data.transaction.amount);
        document.getElementById('success-message').textContent = `Paid to ${data.transaction.receiver}`;
        document.getElementById('success-receipt').innerHTML = `
            <div style="margin-top:16px;font-size:0.8rem;">
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
        document.getElementById('pay-vendor-id').value = '';
        document.getElementById('pay-vendor-amount').value = '';
        document.getElementById('pay-vendor-pin').value = '';
        refreshDashboard();
    } catch (err) {
        showToast(err.message || 'Payment failed', 'error');
    }
}

// ============ AI ============
function showAITab(tab, btn) {
    document.querySelectorAll('#page-ai .segment').forEach(t => t.classList.remove('active'));
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
        }

        if (data.flagged_transactions && data.flagged_transactions.length > 0) {
            html += `<div class="section-title mt-4">Flagged Transactions</div>`;
            for (const t of data.flagged_transactions) {
                // ... (existing logic)
            }
        }
        
        // Add Daily Limit Visual
        const limitLeft = (data.velocity_limit || 0) - (data.risk_factors?.amount_last_24h || 0);
        const usagePct = data.velocity_limit > 0 ? (data.risk_factors.amount_last_24h / data.velocity_limit * 100) : 0;
        
        html += `
            <div class="section-title mt-4">Daily Spending Limit</div>
            <div class="glass-panel">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <span style="font-size:0.85rem;color:var(--text-secondary);">Used Today</span>
                    <span style="font-weight:600;">${formatCurrency(data.risk_factors.amount_last_24h)} / ${formatCurrency(data.velocity_limit)}</span>
                </div>
                <div style="height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;">
                    <div style="height:100%;width:${Math.min(usagePct, 100)}%;background:${usagePct > 80 ? 'var(--danger)' : 'var(--primary)'};transition:width 0.5s ease;"></div>
                </div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:8px;">
                    Your limit is based on account age (${data.risk_factors.account_age_days} days).
                </div>
            </div>`;

        container.innerHTML = html;
    } catch (err) {}
}

function showFraudDetail(txnId) {
    const txn = allTransactions.find(t => t.id === txnId);
    if (!txn) return;
    
    let reasons = txn.risk_reasons || [];
    if (typeof reasons === 'string') {
        try { reasons = JSON.parse(reasons); } catch(e) { reasons = []; }
    }
    
    let msg = `Transaction: ${txnId}\nAmount: ${formatCurrency(txn.amount)}\n\nRisk Assessment:\n`;
    if (reasons.length > 0) {
        msg += '• ' + reasons.join('\n• ');
    } else {
        msg += 'No specific risk factors recorded.';
    }
    alert(msg);
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

// ============ MONEY REQUESTS ============
async function sendMoneyRequest() {
    const phone = document.getElementById('request-phone').value.trim();
    const amount = document.getElementById('request-amount').value;
    const note = document.getElementById('request-note').value.trim();

    if (!phone || !amount) {
        showToast('Phone and amount are required', 'error');
        return;
    }

    try {
        const data = await apiCall('/api/money-request', {
            method: 'POST',
            body: JSON.stringify({
                requester_id: currentUser.id,
                target_phone: phone,
                amount: parseFloat(amount),
                note
            })
        });
        showToast(data.message, 'success');
        document.getElementById('request-phone').value = '';
        document.getElementById('request-amount').value = '';
        document.getElementById('request-note').value = '';
    } catch (err) {
        showToast(err.message || 'Failed to send request', 'error');
    }
}

async function loadPendingRequests() {
    if (!currentUser) return;
    try {
        const data = await apiCall(`/api/money-requests/${currentUser.id}`);
        const receiveContainer = document.getElementById('pending-requests-list');
        const sendContainer = document.getElementById('pending-requests-list-send');
        const badge = document.getElementById('pending-count-badge');
        
        if (badge) {
            if (data.requests && data.requests.length > 0) {
                badge.textContent = data.requests.length;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }

        const renderList = (requests) => {
            if (!requests || requests.length === 0) {
                return '<div class="glass-panel" style="text-align:center;color:var(--text-muted);padding:20px;">No pending requests</div>';
            }
            return requests.map(r => `
                <div class="glass-panel mb-3" style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div style="font-weight:600;color:#fff;">${r.requester_name} requests</div>
                        <div style="font-size:1.2rem;font-weight:700;color:var(--primary);">${formatCurrency(r.amount)}</div>
                        ${r.note ? `<div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px;">${r.note}</div>` : ''}
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-primary btn-sm" onclick="fulfillRequest('${r.id}', ${r.amount})">Pay</button>
                        <button class="btn btn-secondary btn-sm" onclick="declineRequest('${r.id}')">Decline</button>
                    </div>
                </div>
            `).join('');
        };

        if (receiveContainer) receiveContainer.innerHTML = renderList(data.requests);
        if (sendContainer) sendContainer.innerHTML = renderList(data.requests);
    } catch (err) {
        console.error('Failed to load requests', err);
    }
}

async function fulfillRequest(requestId, amount) {
    const modal = document.getElementById('pin-modal');
    const input = document.getElementById('pin-modal-input');
    const msg = document.getElementById('pin-modal-message');
    const confirmBtn = document.getElementById('pin-modal-confirm');

    if (!modal || !input) return;

    input.value = '';
    msg.textContent = `Confirm payment of ${formatCurrency(amount)}`;
    modal.classList.add('active');
    setTimeout(() => input.focus(), 100);

    // Handle confirm
    confirmBtn.onclick = async () => {
        const pin = input.value.trim();
        if (!pin) {
            showToast('Please enter your PIN', 'error');
            return;
        }

        try {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Processing...';
            const idempotency_key = crypto.randomUUID();
            const timestamp = new Date().toISOString();
            const payload = {
                request_id: requestId,
                action: 'pay',
                payer_id: currentUser.id,
                pin,
                idempotency_key,
                timestamp
            };
            
            // Sign the response
            payload.signature = await signTransaction({
                sender_id: currentUser.id,
                amount: amount,
                timestamp,
                idempotency_key
            });

            const data = await apiCall('/api/money-request/respond', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            showToast(data.message, 'success');
            closeModals();
            loadPendingRequests();
            refreshDashboard();
        } catch (err) {
            let errorMsg = err.message || 'Payment failed';
            if (err.risk_reasons && err.risk_reasons.length > 0) {
                errorMsg += '\n\nReasons:\n• ' + err.risk_reasons.join('\n• ');
            }
            showToast(errorMsg, 'error');
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm';
        }
    };

    // Handle enter key
    input.onkeydown = (e) => {
        if (e.key === 'Enter') confirmBtn.click();
    };
}

async function declineRequest(requestId) {
    try {
        await apiCall('/api/money-request/respond', {
            method: 'POST',
            body: JSON.stringify({
                request_id: requestId,
                action: 'decline',
                payer_id: currentUser.id
            })
        });
        showToast('Request declined', 'success');
        loadPendingRequests();
    } catch (err) {
        showToast(err.message || 'Failed', 'error');
    }
}

// ============ SETTINGS ============
function loadSettingsPage() {
    if (!currentUser) return;
    
    const initial = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('header-avatar').textContent = initial;
    document.getElementById('settings-avatar').textContent = initial;
    document.getElementById('settings-name').textContent = currentUser.name;
    document.getElementById('settings-phone').textContent = currentUser.phone;
    
    const vendorSection = document.getElementById('settings-vendor-section');
    if (currentUser.is_vendor) {
        vendorSection.style.display = 'block';
        document.getElementById('settings-vendor-id').textContent = currentUser.id;
    } else {
        vendorSection.style.display = 'none';
    }
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
