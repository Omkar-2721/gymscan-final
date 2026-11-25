# GymScan 2026 🏋️‍♂️🧪

AI Supplement Purity & Toxicity Scanner built with **React 18**, **Vite**, **Tailwind CSS 3**, **tesseract.js** (client-side OCR), and a **Node.js + Express** payment backend using **Razorpay (Test Mode)**.

---

## ✨ Key Features
- **Client-Side AI OCR Vision Scanner**: Scan Whey Protein, Protein Bars, Pre-Workouts, Creatine, RTD Shakes, and Nut Butters directly in the browser using `tesseract.js` WebAssembly.
- **Dual-Product Showdown (Compare Mode)**: Side-by-side comparison with automated winner detection.
- **Plans & Razorpay Test Mode Checkout**:
  - **Free Lifter (`₹0`)**: 5 scans per day, basic amino-spiking & purity score.
  - **Pro Athlete (`₹199/month`)**: Unlimited daily scans + **Detailed Ingredient-Risk & Clinical Report**.
  - **Premium Elite (`₹1,499/year`)**: Everything in Pro + Heavy Metal / Sweetener Load Breakdown & exportable risk summaries.
- **Payment History & Plan Persistence**: Verified transactions and active subscription state saved cleanly in `localStorage` (structured for straightforward migration to a database).

---

## 🔑 1. How to Get Razorpay Test Mode Keys
> **Important:** Always use **Test Mode** (`rzp_test_...`). Never commit `/server/.env` or expose `RAZORPAY_KEY_SECRET` in frontend code.

1. Log in or sign up at [https://dashboard.razorpay.com/](https://dashboard.razorpay.com/).
2. At the top navigation bar, ensure the toggle is switched to **Test Mode**.
3. Go to **Account & Settings** → **API Keys** (under Website and app settings).
4. Click **Generate Test Key** and copy both:
   - **Key ID** (starts with `rzp_test_...`)
   - **Key Secret**

---

## ⚙️ 2. Setup Steps

### Install Dependencies (Frontend & Backend)
```bash
npm install
npm --prefix server install
```

### Configure Backend Environment Variables
Copy `/server/.env.example` to `/server/.env` and paste your Razorpay **Test Mode** credentials:
```bash
cp server/.env.example server/.env
```
Edit `server/.env`:
```env
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_test_key_secret_here
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
```

---

## 🚀 3. How to Run

### Run Both Frontend & Backend Together (Recommended)
```bash
npm run dev:all
```
- **Frontend (Vite):** [http://localhost:3000](http://localhost:3000) (proxies `/api/*` to `http://localhost:5000`)
- **Backend (Express):** [http://localhost:5000](http://localhost:5000)

### Individual Commands
- Frontend only: `npm run dev`
- Backend only (watch mode): `npm run dev:server`
- Production frontend build: `npm run build`

---

## 🧪 4. Demo Payment Credentials (Razorpay Test Mode)

When the Razorpay Checkout popup opens in **Test Mode**, use any of Razorpay's official sandbox options:

- **Test UPI ID (Instant Success):**
  - `success@razorpay`
- **Test Failure UPI ID (Test Error/Retry Flow):**
  - `failure@razorpay`
- **Test Cards:**
  - Use the test card shortcuts displayed directly inside Razorpay's Test Mode popup (or official Razorpay test cards for Visa/Mastercard/RuPay with any future expiry `12/30` and any 3-digit CVV like `111`).
- **Test Netbanking / Wallet:**
  - Select any bank inside the Test Mode popup and click **Success** or **Failure** on the Razorpay mock authorization screen.

---

## 🔌 5. Backend API Endpoints (`/server/index.js`)
- `GET /api/health` — Returns server status and whether Test Mode keys are configured.
- `POST /api/payment/create-order` — Accepts `{ planId }` (`pro_monthly` or `premium_yearly`), resolves authoritative pricing on the server (never trusts client amounts), and creates a Razorpay Order.
- `POST /api/payment/verify` — Verifies the Razorpay payment signature (`HMAC-SHA256` of `razorpay_order_id|razorpay_payment_id` with `RAZORPAY_KEY_SECRET` using timing-safe comparison) and returns `{ success: true/false }`.

---

## 🌐 Production Build Check
```bash
npm run build
```
