/**
 * Razorpay Test Mode Checkout & Verification Client Utilities
 * All orders and HMAC signature verification go through /api/payment/*.
 */

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Dynamically loads the Razorpay Checkout script once and caches the result.
 * @returns {Promise<boolean>}
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Calls the Express backend to create a Razorpay order using server-authoritative pricing.
 */
export async function createRazorpayOrder({ planId, userEmail }) {
  const response = await fetch('/api/payment/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planId,
      userEmail: userEmail || 'guest@gymscan.app',
    }),
  });

  let data = {};
  try {
    data = await response.json();
  } catch (e) {
    throw new Error('Payment server returned an invalid response. Ensure the backend server is running.');
  }

  if (!response.ok || !data.orderId) {
    throw new Error(data.error || 'Unable to create Razorpay order. Check server configuration.');
  }

  return data;
}

/**
 * Sends the Razorpay payment callback payload to the backend for HMAC-SHA256 verification.
 */
export async function verifyRazorpayPayment({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  planId,
}) {
  const response = await fetch('/api/payment/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
    }),
  });

  let data = {};
  try {
    data = await response.json();
  } catch (e) {
    throw new Error('Could not parse verification response from server.');
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Payment verification failed on the server.');
  }

  return data;
}

/**
 * Opens the Razorpay Checkout popup supporting UPI, Cards, Netbanking, and Wallets.
 * Calls lifecycle callbacks for verification, dismissal, and failures.
 */
export function openRazorpayCheckout({
  orderData,
  plan,
  userEmail,
  onVerifying,
  onSuccess,
  onFailure,
  onDismiss,
}) {
  if (!window.Razorpay) {
    onFailure('Razorpay Checkout SDK failed to initialize.');
    return;
  }

  let settled = false;

  const options = {
    key: orderData.keyId,
    amount: orderData.amount,
    currency: orderData.currency || 'INR',
    name: 'GymScan AI Lab',
    description: `${plan.name} (${plan.billingCycle === 'yearly' ? 'Annual Plan' : 'Monthly Plan'}) — Test Mode`,
    order_id: orderData.orderId,
    prefill: {
      email: userEmail || 'athlete@gymscan.app',
      contact: '9999999999',
    },
    notes: {
      planId: plan.id,
      environment: 'razorpay_test_mode',
    },
    method: {
      upi: true,
      card: true,
      netbanking: true,
      wallet: true,
    },
    theme: {
      color: '#E11D48',
    },
    handler: async (paymentResponse) => {
      settled = true;
      try {
        if (onVerifying) onVerifying();
        const verified = await verifyRazorpayPayment({
          ...paymentResponse,
          planId: plan.id,
        });
        onSuccess(verified);
      } catch (err) {
        onFailure(err.message || 'Payment signature verification failed.');
      }
    },
    modal: {
      ondismiss: () => {
        if (!settled && onDismiss) {
          onDismiss();
        }
      },
    },
  };

  const rzp = new window.Razorpay(options);

  rzp.on('payment.failed', (failureResponse) => {
    settled = true;
    const description =
      failureResponse?.error?.description ||
      failureResponse?.error?.reason ||
      'Payment authorization failed. Please try another test card or UPI.';
    onFailure(description);
  });

  rzp.open();
}
