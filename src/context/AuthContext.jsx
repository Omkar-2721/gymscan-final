import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PLANS, DAILY_FREE_SCAN_LIMIT } from '../data/plans';

const AuthContext = createContext();

function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getBillingStorageKey(email) {
  return email ? `gymscan_billing_${email}` : 'gymscan_billing_guest';
}

function createDefaultBillingState() {
  return {
    currentPlan: {
      planId: 'free',
      planName: PLANS.free.name,
      status: 'active',
      activatedAt: null,
      expiresAt: null,
      lastPaymentId: null,
      lastOrderId: null,
    },
    dailyUsage: {
      date: getTodayKey(),
      count: 0,
    },
    paymentHistory: [],
  };
}

function normalizeBillingState(raw) {
  const base = createDefaultBillingState();
  if (!raw || typeof raw !== 'object') return base;

  const today = getTodayKey();
  const planId = PLANS[raw?.currentPlan?.planId] ? raw.currentPlan.planId : 'free';
  const expiresAt = raw?.currentPlan?.expiresAt || null;

  // Check if a paid plan has expired
  const isExpired =
    planId !== 'free' && expiresAt && new Date(expiresAt).getTime() < Date.now();

  const effectivePlanId = isExpired ? 'free' : planId;
  const effectivePlan = PLANS[effectivePlanId];

  const rawUsage = raw.dailyUsage || {};
  const dailyUsage =
    rawUsage.date === today
      ? { date: today, count: Number(rawUsage.count) || 0 }
      : { date: today, count: 0 };

  return {
    currentPlan: {
      planId: effectivePlan.id,
      planName: effectivePlan.name,
      status: isExpired ? 'expired' : 'active',
      activatedAt: isExpired ? null : raw?.currentPlan?.activatedAt || null,
      expiresAt: isExpired ? null : expiresAt,
      lastPaymentId: raw?.currentPlan?.lastPaymentId || null,
      lastOrderId: raw?.currentPlan?.lastOrderId || null,
    },
    dailyUsage,
    paymentHistory: Array.isArray(raw.paymentHistory) ? raw.paymentHistory : [],
  };
}

function readBillingState(email) {
  try {
    const raw = localStorage.getItem(getBillingStorageKey(email));
    return normalizeBillingState(raw ? JSON.parse(raw) : null);
  } catch (e) {
    return createDefaultBillingState();
  }
}

function saveBillingState(email, billingState) {
  try {
    localStorage.setItem(getBillingStorageKey(email), JSON.stringify(billingState));
  } catch (e) {}
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('gymscan_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [billing, setBilling] = useState(() => readBillingState(user?.email));

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState(null);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);

  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [pricingBannerMessage, setPricingBannerMessage] = useState(null);

  // Sync user record to localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('gymscan_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('gymscan_user');
      }
    } catch (e) {}
  }, [user]);

  // Reload and normalize billing profile whenever the signed-in user changes
  useEffect(() => {
    setBilling(readBillingState(user?.email));
  }, [user?.email]);

  // Persist billing state cleanly (structured for future DB migration)
  useEffect(() => {
    saveBillingState(user?.email, billing);
  }, [user?.email, billing]);

  const openPricingModal = (bannerMessage = null) => {
    setPricingBannerMessage(bannerMessage);
    setIsPricingOpen(true);
  };

  const closePricingModal = () => {
    setIsPricingOpen(false);
    setPricingBannerMessage(null);
  };

  // Strict email regex and domain typo validation
  const validateEmail = (email) => {
    if (!email) return false;
    const clean = String(email).trim().toLowerCase();

    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!re.test(clean)) return false;

    const parts = clean.split('@');
    if (parts.length !== 2) return false;
    const [userPart, domainPart] = parts;
    if (userPart.length < 2 || domainPart.length < 4) return false;

    const typoDomains = [
      'gmial.com', 'gmai.com', 'gamil.com', 'gmaill.com', 'gmail.co', 'gmaik.com', 'gmali.com', 'gmaol.com', 'gmeil.com',
      'yaho.com', 'yahooo.com', 'ymail.co', 'yahou.com',
      'hotmial.com', 'hotmai.com', 'hotmali.com',
      'outlok.com', 'outloo.com', 'outlock.com'
    ];

    if (typoDomains.includes(domainPart)) {
      return false;
    }

    const domainParts = domainPart.split('.');
    if (domainParts.length < 2) return false;
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2 || tld.length > 10) return false;

    return true;
  };

  const loginWithEmail = (rawEmail) => {
    const cleanEmail = String(rawEmail).trim().toLowerCase();

    const parts = cleanEmail.split('@');
    if (parts.length === 2) {
      const domain = parts[1];
      if (['gmial.com', 'gmai.com', 'gamil.com', 'gmaill.com', 'gmali.com', 'gmaol.com', 'gmeil.com'].includes(domain)) {
        return { success: false, error: "Typo detected: Did you mean '@gmail.com'? Please enter your correct email." };
      }
      if (['yaho.com', 'yahooo.com', 'yahou.com'].includes(domain)) {
        return { success: false, error: "Typo detected: Did you mean '@yahoo.com'? Please enter your correct email." };
      }
      if (['hotmial.com', 'hotmai.com'].includes(domain)) {
        return { success: false, error: "Typo detected: Did you mean '@hotmail.com'? Please enter your correct email." };
      }
      if (['outlok.com', 'outloo.com'].includes(domain)) {
        return { success: false, error: "Typo detected: Did you mean '@outlook.com'? Please enter your correct email." };
      }
    }

    if (!validateEmail(cleanEmail)) {
      return { success: false, error: 'Please enter a valid active email address (e.g. athlete@gmail.com)' };
    }

    let usedScans = 0;
    try {
      const storedData = localStorage.getItem('gymscan_user_' + cleanEmail);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        usedScans = parsed.usedScans || 0;
      }
    } catch (e) {}

    // If a paid plan was purchased as guest right before signing in, merge it onto the user's billing record
    const guestBilling = readBillingState(null);
    const userBilling = readBillingState(cleanEmail);
    if (guestBilling.currentPlan.planId !== 'free' && userBilling.currentPlan.planId === 'free') {
      const merged = {
        ...userBilling,
        currentPlan: guestBilling.currentPlan,
        paymentHistory: [...guestBilling.paymentHistory, ...userBilling.paymentHistory],
      };
      saveBillingState(cleanEmail, merged);
      saveBillingState(null, createDefaultBillingState());
    }

    const newUser = {
      email: cleanEmail,
      freeScans: DAILY_FREE_SCAN_LIMIT,
      usedScans,
      signedInAt: new Date().toISOString(),
    };

    setUser(newUser);
    try {
      localStorage.setItem('gymscan_user_' + cleanEmail, JSON.stringify(newUser));
      localStorage.setItem('gymscan_user', JSON.stringify(newUser));
    } catch (e) {}

    setIsAuthModalOpen(false);
    setShowCelebrationModal(true);

    try {
      confetti({
        particleCount: 110,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#E11D48', '#FDA4AF', '#10B981', '#F59E0B', '#3B82F6']
      });
    } catch (e) {}

    return { success: true, user: newUser };
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('gymscan_user');
    } catch (e) {}
  };

  /**
   * Saves a verified paid plan & appends a payment record to localStorage.
   */
  const activatePaidPlan = ({ planId, paymentId, orderId, amount, currency = 'INR', verifiedAt }) => {
    const plan = PLANS[planId];
    if (!plan || plan.id === 'free') return;

    const now = verifiedAt ? new Date(verifiedAt) : new Date();
    const expiresAt = new Date(now.getTime() + (plan.durationDays || 30) * 24 * 60 * 60 * 1000);

    const record = {
      id: `txn_${Date.now()}`,
      paymentId,
      orderId,
      planId: plan.id,
      planName: plan.name,
      amount: Number(amount) || plan.amountPaise,
      currency: currency || plan.currency,
      status: 'verified',
      paidAt: now.toISOString(),
    };

    setBilling((prev) => {
      const normalized = normalizeBillingState(prev);
      const next = {
        ...normalized,
        currentPlan: {
          planId: plan.id,
          planName: plan.name,
          status: 'active',
          activatedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          lastPaymentId: paymentId,
          lastOrderId: orderId,
        },
        paymentHistory: [record, ...normalized.paymentHistory],
      };
      saveBillingState(user?.email, next);
      return next;
    });

    try {
      confetti({
        particleCount: 130,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#10B981', '#E11D48', '#F59E0B', '#FFFFFF'],
      });
    } catch (e) {}
  };

  const currentPlanId = billing.currentPlan.planId;
  const currentPlan = PLANS[currentPlanId] || PLANS.free;
  const isPaidPlan = currentPlan.id !== 'free';
  const hasUnlimitedScans = Boolean(currentPlan.unlimitedScans);
  const hasDetailedRiskReport = Boolean(currentPlan.detailedRiskReport);

  const today = getTodayKey();
  const dailyUsedCount = billing.dailyUsage.date === today ? billing.dailyUsage.count : 0;
  const dailyScansRemaining = hasUnlimitedScans
    ? Infinity
    : Math.max(0, DAILY_FREE_SCAN_LIMIT - dailyUsedCount);

  // Consume 1 scan from user quota (respects daily limit on Free, unlimited on Pro/Premium)
  const consumeScan = () => {
    if (!user) {
      requireAuth('Please sign in with your email to unlock your 5 Free Daily AI Supplement Scans!');
      return false;
    }

    if (!hasUnlimitedScans && dailyScansRemaining <= 0) {
      openPricingModal(
        `You have used all ${DAILY_FREE_SCAN_LIMIT} free scans for today. Upgrade to Pro or Premium for unlimited daily scans & full clinical risk reports!`
      );
      return false;
    }

    if (!hasUnlimitedScans) {
      setBilling((prev) => {
        const normalized = normalizeBillingState(prev);
        const nextCount = (normalized.dailyUsage.date === today ? normalized.dailyUsage.count : 0) + 1;
        const next = {
          ...normalized,
          dailyUsage: { date: today, count: nextCount },
        };
        saveBillingState(user?.email, next);
        return next;
      });
    }

    const updatedUser = {
      ...user,
      freeScans: hasUnlimitedScans ? '∞' : Math.max(0, dailyScansRemaining - 1),
      usedScans: (user.usedScans || 0) + 1,
    };

    setUser(updatedUser);
    try {
      localStorage.setItem('gymscan_user_' + user.email, JSON.stringify(updatedUser));
      localStorage.setItem('gymscan_user', JSON.stringify(updatedUser));
    } catch (e) {}

    return true;
  };

  // Require auth interceptor
  const requireAuth = (customPrompt = 'Please sign in with your email to continue') => {
    if (user) return true;
    setAuthPromptMessage(customPrompt);
    setIsAuthModalOpen(true);
    return false;
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoggedIn: !!user,
      currentPlanId,
      currentPlan,
      subscription: billing.currentPlan,
      paymentHistory: billing.paymentHistory,
      isPaidPlan,
      hasUnlimitedScans,
      hasDetailedRiskReport,
      dailyScansRemaining,
      dailyUsedCount,
      freeScansRemaining: hasUnlimitedScans ? '∞' : dailyScansRemaining,
      validateEmail,
      loginWithEmail,
      logout,
      activatePaidPlan,
      consumeScan,
      requireAuth,
      isAuthModalOpen,
      setIsAuthModalOpen,
      authPromptMessage,
      setAuthPromptMessage,
      showCelebrationModal,
      setShowCelebrationModal,
      isPricingOpen,
      openPricingModal,
      closePricingModal,
      pricingBannerMessage,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
