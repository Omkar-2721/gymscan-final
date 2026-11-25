/**
 * GymScan Subscription Plans Catalog (Frontend Display Metadata)
 * Authoritative billing amounts are enforced on the Express backend (/server/index.js).
 */
export const DAILY_FREE_SCAN_LIMIT = 5;

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free Lifter',
    badge: 'STARTER',
    priceDisplay: '₹0',
    amountPaise: 0,
    currency: 'INR',
    periodLabel: '/ forever',
    billingCycle: 'free',
    dailyLimit: DAILY_FREE_SCAN_LIMIT,
    unlimitedScans: false,
    detailedRiskReport: false,
    description: 'Essential supplement screening for casual gym-goers.',
    features: [
      `${DAILY_FREE_SCAN_LIMIT} AI supplement scans per day`,
      'Basic amino-spiking indicator',
      'Standard purity score & macro preview',
      'Compare up to 2 supplement labels',
    ],
  },
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Pro Athlete',
    badge: 'MOST POPULAR',
    priceDisplay: '₹199',
    amountPaise: 19900,
    currency: 'INR',
    periodLabel: '/ month',
    billingCycle: 'monthly',
    durationDays: 30,
    dailyLimit: Infinity,
    unlimitedScans: true,
    detailedRiskReport: true,
    popular: true,
    description: 'Full clinical ingredient forensics for serious athletes.',
    features: [
      'Unlimited daily AI OCR label scans',
      'Detailed Ingredient-Risk & Clinical Report',
      'WADA & FSSAI banned stimulant diagnostics',
      'Bioavailability & nitrogen-spike audit matrix',
      'Unlimited side-by-side Compare Showdowns',
    ],
  },
  premium_yearly: {
    id: 'premium_yearly',
    name: 'Premium Elite',
    badge: 'YEARLY • SAVE 37%',
    priceDisplay: '₹1,499',
    amountPaise: 149900,
    currency: 'INR',
    periodLabel: '/ year',
    billingCycle: 'yearly',
    durationDays: 365,
    dailyLimit: Infinity,
    unlimitedScans: true,
    detailedRiskReport: true,
    description: 'Complete year-round lab protection for lifters & coaches.',
    features: [
      'Everything in Pro Athlete (Unlimited Scans)',
      'Full Heavy Metal & Sweetener Load Breakdown',
      'Exportable / Printable Clinical Risk Reports',
      'Priority AI OCR & multi-category deep checks',
      'Early access to Coach Roster & API exports',
    ],
  },
};

export const PLAN_LIST = [PLANS.free, PLANS.pro_monthly, PLANS.premium_yearly];

/**
 * Formats an amount in paise (e.g. 19900) into a readable INR currency string.
 */
export function formatInrFromPaise(amountPaise, currency = 'INR') {
  const value = Number(amountPaise || 0) / 100;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch (e) {
    return `₹${value.toFixed(0)}`;
  }
}
