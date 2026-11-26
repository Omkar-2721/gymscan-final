import PRODUCTS_DB from '../data/products.json' with { type: 'json' };

function normalizeCatGroup(category) {
  const c = (category || '').toLowerCase();
  if (/pre[\s-]*workout|energy|fat burner|stim/.test(c)) return 'preworkout';
  if (/creatine/.test(c)) return 'creatine';
  if (/gainer|mass/.test(c)) return 'gainer';
  if (/bar|snack/.test(c)) return 'bar';
  return 'protein';
}

/**
 * Stage 5 Smart Swap recommendations from local products.json (marked sampleData: true).
 * Returns >= 3 cleaner alternatives when purityScore < 60, banned substance detected, or amino spiking flagged.
 */
export function suggestSmartSwaps({
  category = '',
  purityScore = 100,
  hasBanned = false,
  hasSpiking = false,
  excludeName = '',
  limit = 3,
} = {}) {
  const shouldRecommend =
    Boolean(hasBanned) ||
    Boolean(hasSpiking) ||
    (typeof purityScore === 'number' && purityScore < 60);

  if (!shouldRecommend) {
    return { triggered: false, items: [] };
  }

  const targetGroup = normalizeCatGroup(category);
  const excludedLower = (excludeName || '').toLowerCase();

  const eligible = PRODUCTS_DB.filter(
    (p) => !excludedLower || !p.name.toLowerCase().includes(excludedLower)
  );

  const sameCategory = eligible
    .filter((p) => normalizeCatGroup(p.category) === targetGroup)
    .sort((a, b) => b.purityScore - a.purityScore);

  const others = eligible
    .filter((p) => normalizeCatGroup(p.category) !== targetGroup)
    .sort((a, b) => b.purityScore - a.purityScore);

  const picked = [...sameCategory, ...others].slice(0, Math.max(3, limit));

  return {
    triggered: true,
    reason: hasBanned
      ? 'Banned or high-risk compounds flagged — consider switching to a cleaner, third-party tested alternative:'
      : hasSpiking
      ? 'Amino spiking or hidden blend detected — verified transparent formulas:'
      : 'Purity score below 60/100 — higher-purity verified alternatives:',
    items: picked.map((p) => ({
      ...p,
      sampleData: true,
    })),
  };
}
