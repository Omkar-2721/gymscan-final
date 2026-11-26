import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import scanRouter from './routes/scan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables exclusively from /server/.env
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const ML_SERVICE_URL = (process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

/**
 * Authoritative server-side plan catalog.
 * Amounts are strictly in the smallest currency unit (paise for INR).
 * Client-submitted amounts are NEVER trusted.
 */
const PLAN_CATALOG = {
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Pro Athlete (Monthly)',
    amount: 19900, // INR 199.00
    currency: 'INR',
    billingCycle: 'monthly',
  },
  premium_yearly: {
    id: 'premium_yearly',
    name: 'Premium Elite (Yearly)',
    amount: 149900, // INR 1499.00
    currency: 'INR',
    billingCycle: 'yearly',
  },
};

// Allow requests from the Vite frontend origin (plus standard localhost aliases)
const allowedOrigins = new Set([
  CLIENT_ORIGIN,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
]);

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin / Vite proxy / curl requests with no Origin header
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Mount multi-image Vision Extraction route BEFORE strict 100kb JSON limit
app.use('/api/scan', scanRouter);

app.use(express.json({ limit: '100kb' }));

/**
 * Validates that Razorpay Test Mode keys exist in /server/.env.
 */
function getRazorpayConfig() {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

  if (!keyId || !keySecret || keyId.includes('your_key_id_here') || keySecret.includes('your_test_key_secret_here')) {
    return {
      ok: false,
      status: 503,
      error:
        'Razorpay test keys are not configured. Copy server/.env.example to server/.env and set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
    };
  }

  // Enforce Razorpay TEST MODE only
  if (!keyId.startsWith('rzp_test_')) {
    return {
      ok: false,
      status: 400,
      error: 'Only Razorpay TEST MODE keys (starting with rzp_test_) are permitted in this environment.',
    };
  }

  return { ok: true, keyId, keySecret };
}

/**
 * Resolves a valid paid plan either from planId or by strict matching against allowed catalog amounts.
 */
function resolveServerPlan({ planId, amount, currency }) {
  if (typeof planId === 'string' && planId.trim()) {
    const cleanId = planId.trim().toLowerCase();
    return PLAN_CATALOG[cleanId] || null;
  }

  // Fallback if client sends { amount, currency } without planId: strictly match catalog
  if (amount !== undefined && currency) {
    const numericAmount = Number(amount);
    const upperCurrency = String(currency).trim().toUpperCase();
    return (
      Object.values(PLAN_CATALOG).find(
        (plan) => plan.amount === numericAmount && plan.currency === upperCurrency
      ) || null
    );
  }

  return null;
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  const config = getRazorpayConfig();
  res.json({
    status: 'ok',
    mode: 'test',
    razorpayConfigured: config.ok,
  });
});

/**
 * POST /api/payment/create-order
 * Accepts { planId } (or { amount, currency } strictly matched against PLAN_CATALOG).
 * Never trusts client-provided pricing; creates a Razorpay order and returns
 * { orderId, amount, currency, keyId, planId, planName }.
 */
app.post('/api/payment/create-order', async (req, res, next) => {
  try {
    const config = getRazorpayConfig();
    if (!config.ok) {
      return res.status(config.status).json({ error: config.error });
    }

    const { planId, amount, currency, userEmail } = req.body || {};
    const plan = resolveServerPlan({ planId, amount, currency });

    if (!plan) {
      return res.status(400).json({
        error: 'Invalid or unsupported plan. Choose pro_monthly or premium_yearly.',
      });
    }

    const razorpay = new Razorpay({
      key_id: config.keyId,
      key_secret: config.keySecret,
    });

    const receipt = `gymscan_${plan.id}_${Date.now()}`.slice(0, 40);
    const order = await razorpay.orders.create({
      amount: plan.amount,
      currency: plan.currency,
      receipt,
      notes: {
        planId: plan.id,
        planName: plan.name,
        billingCycle: plan.billingCycle,
        userEmail: typeof userEmail === 'string' ? userEmail.slice(0, 120) : 'guest',
        mode: 'test',
      },
    });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: config.keyId,
      planId: plan.id,
      planName: plan.name,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/payment/verify
 * Verifies Razorpay Checkout signature using HMAC-SHA256 of `${order_id}|${payment_id}`.
 */
app.post('/api/payment/verify', (req, res, next) => {
  try {
    const config = getRazorpayConfig();
    if (!config.ok) {
      return res.status(config.status).json({ success: false, error: config.error });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body || {};

    if (
      typeof razorpay_order_id !== 'string' ||
      !razorpay_order_id.trim() ||
      typeof razorpay_payment_id !== 'string' ||
      !razorpay_payment_id.trim() ||
      typeof razorpay_signature !== 'string' ||
      !razorpay_signature.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification fields (razorpay_order_id, razorpay_payment_id, razorpay_signature).',
      });
    }

    const payload = `${razorpay_order_id.trim()}|${razorpay_payment_id.trim()}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.keySecret)
      .update(payload)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const receivedBuf = Buffer.from(razorpay_signature.trim(), 'utf8');

    const isValid =
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, receivedBuf);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Signature verification failed. Payment could not be verified.',
      });
    }

    const plan = PLAN_CATALOG[String(planId || '').trim().toLowerCase()] || null;

    return res.status(200).json({
      success: true,
      orderId: razorpay_order_id.trim(),
      paymentId: razorpay_payment_id.trim(),
      planId: plan ? plan.id : null,
      planName: plan ? plan.name : null,
      amount: plan ? plan.amount : null,
      currency: plan ? plan.currency : 'INR',
      verifiedAt: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
});

// Forward /api/ml/* requests to the Python FastAPI ML Service when hit directly via Express
app.use('/api/ml', async (req, res) => {
  try {
    const targetPath = req.originalUrl.replace(/^\/api\/ml/, '') || '/health';
    const targetUrl = `${ML_SERVICE_URL}${targetPath}`;
    const headers = { 'Content-Type': 'application/json' };
    const fetchOpts = { method: req.method, headers };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOpts.body = JSON.stringify(req.body || {});
    }
    const upstream = await fetch(targetUrl, fetchOpts);
    const text = await upstream.text();
    res.status(upstream.status).set('Content-Type', upstream.headers.get('content-type') || 'application/json').send(text);
  } catch (err) {
    res.status(503).json({
      status: 'offline',
      models_loaded: false,
      error: `ML service unreachable at ${ML_SERVICE_URL}: ${err.message}`,
    });
  }
});

// JSON 404 handler for unknown API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// Central error handling middleware
app.use((err, _req, res, _next) => {
  console.error('[GymScan Payment Server Error]:', err);
  const statusCode = err.statusCode || 500;
  const message =
    err?.error?.description ||
    err?.message ||
    'Unexpected server error while processing payment.';
  res.status(statusCode).json({
    success: false,
    error: message,
  });
});

app.listen(PORT, () => {
  console.log(`GymScan Payment Server (Test Mode) listening on http://localhost:${PORT}`);
});
