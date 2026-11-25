import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  X,
  CheckCircle2,
  Sparkles,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Crown,
  Zap,
  Receipt,
  Calendar,
  Lock,
  ArrowRight,
  Infinity as InfinityIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PLAN_LIST, PLANS, DAILY_FREE_SCAN_LIMIT, formatInrFromPaise } from '../data/plans';
import {
  loadRazorpayScript,
  createRazorpayOrder,
  openRazorpayCheckout,
} from '../utils/paymentService';

export default function PricingModal({ isOpen, onClose, onStartScanning }) {
  const {
    user,
    currentPlanId,
    currentPlan,
    subscription,
    paymentHistory,
    hasUnlimitedScans,
    hasDetailedRiskReport,
    dailyScansRemaining,
    activatePaidPlan,
    pricingBannerMessage,
  } = useAuth();

  // Payment lifecycle state: 'idle' | 'creating_order' | 'loading_sdk' | 'checkout_open' | 'verifying' | 'success' | 'error'
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [activePlanTarget, setActivePlanTarget] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successReceipt, setSuccessReceipt] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setPaymentStatus('idle');
      setErrorMessage('');
      setActivePlanTarget(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isBusy =
    paymentStatus === 'creating_order' ||
    paymentStatus === 'loading_sdk' ||
    paymentStatus === 'checkout_open' ||
    paymentStatus === 'verifying';

  const statusLabelMap = {
    creating_order: 'Creating secure Razorpay test order...',
    loading_sdk: 'Loading Razorpay Checkout SDK...',
    checkout_open: 'Complete payment in the Razorpay popup (UPI, Card, or Netbanking)...',
    verifying: 'Verifying payment signature (HMAC-SHA256)...',
  };

  const handlePayNow = async (plan) => {
    if (!plan || plan.id === 'free' || isBusy) return;

    setActivePlanTarget(plan);
    setErrorMessage('');
    setSuccessReceipt(null);
    setPaymentStatus('creating_order');

    try {
      // 1. Create authoritative order on the Express backend
      const orderData = await createRazorpayOrder({
        planId: plan.id,
        userEmail: user?.email,
      });

      // 2. Dynamically load Razorpay checkout.js
      setPaymentStatus('loading_sdk');
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        throw new Error(
          'Could not load Razorpay Checkout (checkout.razorpay.com). Please check your internet connection and retry.'
        );
      }

      // 3. Open Razorpay Checkout Popup & verify response on backend
      setPaymentStatus('checkout_open');
      openRazorpayCheckout({
        orderData,
        plan,
        userEmail: user?.email,
        onVerifying: () => {
          setPaymentStatus('verifying');
        },
        onSuccess: (verified) => {
          activatePaidPlan({
            planId: plan.id,
            paymentId: verified.paymentId,
            orderId: verified.orderId,
            amount: verified.amount || orderData.amount,
            currency: verified.currency || orderData.currency,
            verifiedAt: verified.verifiedAt,
          });
          setSuccessReceipt({
            planName: plan.name,
            planId: plan.id,
            paymentId: verified.paymentId,
            orderId: verified.orderId,
            amount: verified.amount || orderData.amount,
            currency: verified.currency || orderData.currency,
            paidAt: verified.verifiedAt || new Date().toISOString(),
          });
          setPaymentStatus('success');
        },
        onFailure: (reason) => {
          setErrorMessage(reason || 'Payment failed. Please retry.');
          setPaymentStatus('error');
        },
        onDismiss: () => {
          setErrorMessage('Checkout window was closed before completing payment.');
          setPaymentStatus('error');
        },
      });
    } catch (err) {
      setErrorMessage(
        err?.message || 'Network error while initializing payment. Make sure the backend server is running.'
      );
      setPaymentStatus('error');
    }
  };

  const handleRetry = () => {
    if (activePlanTarget) {
      handlePayNow(activePlanTarget);
    } else {
      setPaymentStatus('idle');
      setErrorMessage('');
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch (e) {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-xl overflow-y-auto font-josefin">
      <div className="relative w-full max-w-6xl glass-hud rounded-3xl p-5 sm:p-8 lg:p-10 my-4 sm:my-8 border border-rose-500/30 shadow-2xl max-h-[94vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={paymentStatus === 'verifying'}
          aria-label="Close Pricing Modal"
          className="absolute top-4 right-4 sm:top-6 sm:right-6 w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 hover:bg-rose-500/20 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-rose-500 dark:hover:text-white transition cursor-pointer z-20 disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-rose-500/10 px-3.5 py-1 text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400 border border-rose-500/30 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>GYMSCAN PLANS & UPGRADE</span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span className="text-emerald-600 dark:text-emerald-400">RAZORPAY TEST MODE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-maroon-950 dark:text-white leading-tight">
            Unlock Unlimited Lab Purity Scans
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-rose-200/75 mt-2 font-sans">
            Stop guessing what is inside your tub. Upgrade for unlimited daily scans and deep clinical ingredient-risk reports.
          </p>
        </div>

        {/* Gate / Quota Prompt Banner */}
        {pricingBannerMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-start sm:items-center gap-3 font-sans text-xs sm:text-sm text-amber-800 dark:text-amber-200">
            <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
            <span className="font-semibold">{pricingBannerMessage}</span>
          </div>
        )}

        {/* Loading State Overlay Banner */}
        {isBusy && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 font-sans animate-pulse">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-rose-500 animate-spin shrink-0" />
              <div>
                <p className="text-sm font-bold text-maroon-950 dark:text-white">
                  {statusLabelMap[paymentStatus] || 'Processing payment...'}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-rose-200/70">
                  {activePlanTarget ? `${activePlanTarget.name} • ${activePlanTarget.priceDisplay}` : 'Razorpay Test Checkout'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 uppercase">
              Please Wait
            </span>
          </div>
        )}

        {/* Success Modal / Confirmation Card */}
        {paymentStatus === 'success' && successReceipt && (
          <div className="mb-8 p-6 sm:p-7 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.2)] font-sans animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-black flex items-center justify-center shrink-0 shadow-lg">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    PAYMENT VERIFIED & PLAN ACTIVATED
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black font-josefin text-maroon-950 dark:text-white">
                    Welcome to {successReceipt.planName}!
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-emerald-100/80">
                    Unlimited scans and Detailed Ingredient-Risk Reports are now unlocked on your account.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2 text-[11px] font-mono text-slate-600 dark:text-emerald-200/90">
                    <span>Amount: <strong>{formatInrFromPaise(successReceipt.amount, successReceipt.currency)}</strong></span>
                    <span>•</span>
                    <span>Payment ID: <strong>{successReceipt.paymentId}</strong></span>
                    <span>•</span>
                    <span>Order ID: <strong>{successReceipt.orderId}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
                {onStartScanning && (
                  <button
                    onClick={() => {
                      onClose();
                      onStartScanning();
                    }}
                    className="flex-1 md:flex-initial px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
                  >
                    <span>Start Unlimited Scanning</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setPaymentStatus('idle')}
                  className="px-4 py-3 rounded-xl border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs cursor-pointer hover:bg-emerald-500/10 transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Failure / Cancelled / Retry Panel */}
        {paymentStatus === 'error' && errorMessage && (
          <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-rose-500/10 border border-rose-500/40 font-sans animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-maroon-950 dark:text-white">
                    Payment Not Completed
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-rose-200/85 mt-1">
                    {errorMessage}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleRetry}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition shadow"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Payment</span>
                </button>
                <button
                  onClick={() => {
                    setPaymentStatus('idle');
                    setErrorMessage('');
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer hover:bg-black/10 dark:hover:bg-white/20 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3 Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mb-10 font-sans">
          {PLAN_LIST.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const isPopular = Boolean(plan.popular);
            const isThisBusy = isBusy && activePlanTarget?.id === plan.id;

            return (
              <div
                key={plan.id}
                className={`p-6 rounded-3xl flex flex-col justify-between relative transition-all ${
                  isPopular
                    ? 'glass-hud border-2 border-rose-500 shadow-[0_0_40px_rgba(225,29,72,0.22)]'
                    : 'glass-card-neo border border-rose-500/20'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white px-3.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                        isPopular ? 'text-rose-500' : plan.id === 'premium_yearly' ? 'text-amber-500' : 'text-slate-400'
                      }`}
                    >
                      {plan.badge}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-black uppercase">
                        Active
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-black font-josefin text-maroon-950 dark:text-white mt-1.5 flex items-center gap-2">
                    <span>{plan.name}</span>
                    {plan.id === 'premium_yearly' && <Crown className="w-4 h-4 text-amber-400" />}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-rose-200/70 mt-1">
                    {plan.description}
                  </p>

                  <div className="mt-4 mb-5 pb-4 border-b border-rose-500/15">
                    <span className="text-4xl font-black font-mono text-maroon-950 dark:text-white">
                      {plan.priceDisplay}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                      {plan.periodLabel}
                    </span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-700 dark:text-rose-100/90">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                {plan.id === 'free' ? (
                  <button
                    onClick={onClose}
                    className="mt-7 w-full py-3 rounded-xl glass-card-neo border border-rose-500/20 text-maroon-950 dark:text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    {isCurrent ? 'Current Plan' : 'Included Free Tier'}
                  </button>
                ) : (
                  <button
                    onClick={() => handlePayNow(plan)}
                    disabled={isBusy}
                    className={`mt-7 w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 ${
                      isPopular
                        ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white shadow-lg hover:opacity-95 active:scale-95'
                        : 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg hover:opacity-95 active:scale-95'
                    }`}
                  >
                    {isThisBusy ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>{isCurrent ? 'Extend / Pay Now' : 'Pay Now'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Current Plan & Payment History Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-6 border-t border-rose-500/20 font-sans">
          {/* Current Plan Summary */}
          <div className="lg:col-span-5 p-5 rounded-2xl glass-card-neo border border-rose-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Current Plan Status</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {subscription.status || 'active'}
              </span>
            </div>

            <div>
              <h4 className="text-xl font-black font-josefin text-maroon-950 dark:text-white">
                {currentPlan.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-rose-200/70 mt-0.5">
                Account: <span className="font-mono font-semibold">{user?.email || 'Guest Session'}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-black/5 dark:bg-black/40 border border-rose-500/15">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block uppercase">
                  Daily Scan Quota
                </span>
                <span className="font-black text-maroon-950 dark:text-white flex items-center gap-1 mt-0.5">
                  {hasUnlimitedScans ? (
                    <>
                      <InfinityIcon className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Unlimited</span>
                    </>
                  ) : (
                    <span>
                      {dailyScansRemaining} / {DAILY_FREE_SCAN_LIMIT} left today
                    </span>
                  )}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/5 dark:bg-black/40 border border-rose-500/15">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block uppercase">
                  Clinical Risk Report
                </span>
                <span
                  className={`font-black mt-0.5 block ${
                    hasDetailedRiskReport
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {hasDetailedRiskReport ? 'Unlocked' : 'Locked (Free)'}
                </span>
              </div>
            </div>

            {subscription.expiresAt && (
              <div className="text-[11px] font-mono text-slate-500 dark:text-rose-200/70 flex items-center gap-1.5 pt-1">
                <Calendar className="w-3.5 h-3.5 text-rose-500" />
                <span>Valid until: {formatDate(subscription.expiresAt)}</span>
              </div>
            )}
          </div>

          {/* Payment History */}
          <div className="lg:col-span-7 p-5 rounded-2xl glass-card-neo border border-rose-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                <Receipt className="w-4 h-4" />
                <span>Payment History</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {paymentHistory.length} verified {paymentHistory.length === 1 ? 'transaction' : 'transactions'}
              </span>
            </div>

            {paymentHistory.length === 0 ? (
              <div className="py-8 text-center rounded-xl bg-black/5 dark:bg-black/30 border border-dashed border-rose-500/20">
                <Zap className="w-6 h-6 text-rose-500/60 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-rose-200/75">
                  No paid transactions yet.
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Select Pro Monthly or Premium Yearly above to test Razorpay Checkout.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {paymentHistory.map((txn) => (
                  <div
                    key={txn.id || txn.paymentId}
                    className="p-3 rounded-xl bg-black/5 dark:bg-black/40 border border-rose-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-maroon-950 dark:text-white">
                          {txn.planName}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-mono font-black uppercase">
                          {txn.status || 'verified'}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 break-all">
                        ID: {txn.paymentId}
                      </p>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <span className="font-black font-mono text-emerald-600 dark:text-emerald-400 block">
                        {formatInrFromPaise(txn.amount, txn.currency)}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {formatDate(txn.paidAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
