# GymScan — Supplement Label OCR, Vision AI & WADA Safety Scanner

AI-powered supplement label auditing web application built with **React 18**, **Vite**, **Tailwind CSS 3**, **Gemini Vision Primary Extraction (`POST /api/scan/extract`)**, **tesseract.js Fallback OCR**, **Node.js + Express** (Razorpay billing & Gemini proxy), and a **Python FastAPI ML Service** (`scikit-learn`, `pandas`, `rapidfuzz`).

---

## 6-Stage Scan Pipeline Architecture

```
[1. CAPTURE]
  Up to 4 product photos (Front / Ingredients / Nutrition / Warnings),
  Live Camera Guide Box, Barcode (Open Food Facts), or Manual Entry
        │
        ▼
[2. EXTRACTION] ──► Cache hit (image hash)? ──► Instant Return
  Primary: Express POST /api/scan/extract (Gemini Vision + Zod schema, reader only)
  Fallback: Client tesseract.js (EXIF fix, CLAHE, Sauvola, Deskew, Section Finder)
  ──► Editable Review Screen (user can fix/verify fields before safety audit)
        │
        ▼
[3. NORMALIZATION]
  Canonical mapping via src/data/ingredientDictionary.js (300+ ingredients, synonyms, E-numbers)
  Unrecognized ingredients flagged transparently and counted as uncertainty risk
        │
        ▼
[4. DETERMINISTIC ANALYSIS (Pure JS/Python Code — ZERO LLM safety guesses)]
  • WADA Banned & Contamination screening (exact + fuzzy >= 0.85, cap <= 20)
  • Combination stacking rules (stimulants > 300mg, emulsifier pairs, glycemic masks, diuretics)
  • Marketing claim vs label reality checks ("Sugar Free", "100% Isolate", "Clinically Dosed")
  • Amino-spiking & proprietary blend penalties (-10 blend, <= 45 spiking cap)
  • Personal Health Profile overrides (Tested Athlete, Vegan, Under 18, Diabetic, Allergies)
  • Python ML /spiking + /score ensemble when online
        │
        ▼
[5. RESULT & SMART SWAPS]
  0–100 Purity Ring + SAFE / CAUTION / AVOID / BANNED badges + Why This Score
  Smart Swap >= 3 cleaner alternatives from src/data/products.json (when < 60 or flagged)
  PDF Download, Print Audit, Compare Mode, History & Favorites
        │
        ▼
[6. RELIABILITY]
  Image-hash localStorage cache, 25 req/min IP rate limits, 5-stage progress bar,
  honest N/A ("Not enough readable data" / "This doesn't look like a product label"),
  and collapsible Debug Panel (engine used, fieldConfidence, triggered rules, raw JSON)
```

---

## Setup & Installation

### 1. Frontend & Express Backend Dependencies
```bash
npm install
npm --prefix server install
```

### 2. Python ML Environment & Model Training
```bash
npm run ml:setup
```
*(Creates `ml-service/.venv`, installs `ml-service/requirements.txt`, and trains `.joblib` models into `ml-service/models/`.)*

### 3. Free Gemini API Key & Environment Configuration (`server/.env`)
Create `server/.env` from `server/.env.example`:
1. Get a free Google AI Studio API key at [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Add your secrets to `server/.env` (**NEVER** put API keys in React `src/`):
```env
GEMINI_API_KEY=your_free_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_test_key_secret_here
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
```
*(If `GEMINI_API_KEY` is omitted or offline, GymScan automatically falls back to multi-variant `tesseract.js` OCR and indicates the engine used.)*

---

## Running the App

```bash
npm run dev:all
```
Launches concurrently:
1. **Python FastAPI ML Service**: `http://127.0.0.1:8000` (`/health`, `/classify`, `/spiking`, `/score`, `/ocr`)
2. **Express API & Payment Server**: `http://localhost:5000` (`/api/scan/extract`, `/api/scan/status`, `/api/payment/*`, `/api/ml/*`)
3. **Vite React Frontend**: `http://localhost:3000`

---

## Automated Tests & Production Build

```bash
npm run test:scan      # End-to-end 10 PNG+JSON image scan pipeline test suite + score spread check
npm run test:scoring   # Verifies clean, average, sugary, spiked & banned scoring calibration
npm run test:ocr       # Benchmarks multi-variant OCR & fuzzy matching on /test-images
npm run build          # Builds production bundle into dist/
```

---

> **Disclaimer:** Informational only, not medical or legal advice. Check the official WADA Prohibited List and your sport's anti-doping body.
