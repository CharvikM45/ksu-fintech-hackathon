# 🏦 MeshBank — Offline Microbank & POS Network

> Bank without borders. Bank without internet.

MeshBank is an offline-first banking system that runs on a Raspberry Pi (or any computer). Users connect via Wi-Fi and can create accounts, transfer money, pay vendors, and receive AI-powered financial insights — all without internet.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- pip

### Setup (macOS / Linux)

```bash
# 1. Install dependencies
cd /path/to/meshbank
pip install -r requirements.txt

# 2. Start the server
cd backend
python app.py
```

### Setup (Windows)

```bash
# 1. Install dependencies
cd \path\to\meshbank
pip install -r requirements.txt

# 2. Start the server
cd backend
python app.py
```

### Open the App
Navigate to **http://localhost:5000** in your browser.

---

## 🧪 Demo Accounts

| User | Phone | PIN | Balance | Role |
|------|-------|-----|---------|------|
| Alice Johnson | 5551001 | 1234 | $5,000 | User |
| Bob Smith | 5551002 | 5678 | $3,000 | User |
| Charlie's Coffee | 5551003 | 9999 | $10,000 | Vendor |

---

## 📁 Project Structure

```
meshbank/
├── backend/
│   ├── app.py                 # Flask entry point
│   ├── models/
│   │   └── database.py        # DB init, seed data
│   ├── routes/
│   │   ├── auth.py            # Register, login
│   │   ├── wallet.py          # Balance, transfer, history
│   │   ├── vendor.py          # POS mode
│   │   ├── sync.py            # Cloud sync
│   │   └── ai.py              # AI endpoints
│   └── services/
│       ├── fraud_detection.py # Anomaly detection
│       ├── insights.py        # Financial insights
│       ├── assistant.py       # Chat bot
│       └── predictor.py       # Balance forecast
├── frontend/
│   ├── index.html             # SPA shell
│   ├── styles/main.css        # Design system
│   └── js/
│       ├── app.js             # Core app logic
│       ├── qr.js              # QR code generator
│       └── assistant.js       # Chat module
├── database/
│   └── schema.sql             # SQLite schema
├── requirements.txt
├── PRESENTATION_GUIDE.md
└── README.md
```

---

## 🔌 Raspberry Pi Hotspot Simulation

To simulate the Pi environment on your laptop:

1. **macOS**: Go to System Settings → General → Sharing → Internet Sharing. Share your connection from Ethernet/USB to Wi-Fi. Connect other devices to the hotspot.
2. **Windows**: Settings → Network → Mobile Hotspot → Turn on. 
3. Point connected devices to `http://<your-ip>:5000`

For actual Raspberry Pi deployment:
```bash
# Install hostapd and dnsmasq for hotspot
sudo apt install hostapd dnsmasq
# Configure to create a "MeshBank" Wi-Fi network
# Set Pi's IP to 192.168.4.1
```

---

## 🧠 AI Features

| Feature | How It Works |
|---------|-------------|
| **Fraud Detection** | Multi-rule scoring: rapid transfers, large amounts, activity spikes, balance percentage |
| **Financial Insights** | Spending patterns, frequent recipients, cash flow analysis |
| **Chat Assistant** | Intent-matching NLP with regex patterns — works fully offline |
| **Balance Prediction** | Linear regression on daily net spending |

---

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Create account |
| POST | `/api/login` | Authenticate |
| GET | `/api/balance/<id>` | Get balance |
| POST | `/api/transfer` | P2P transfer |
| GET | `/api/transactions/<id>` | Transaction history |
| POST | `/api/vendor/request` | Create payment request |
| POST | `/api/vendor/pay` | Pay vendor |
| POST | `/api/sync` | Sync to cloud |
| GET | `/api/ai/fraud/<id>` | Fraud report |
| GET | `/api/ai/insights/<id>` | Financial insights |
| POST | `/api/ai/assistant` | Chat assistant |
| GET | `/api/ai/predict/<id>` | Balance prediction |
| POST | `/api/demo/reset` | Reset demo data |

---

## License

MIT — Built for hackathon demonstration purposes.
