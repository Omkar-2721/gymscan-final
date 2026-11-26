/**
 * Stage 6 Reliability: Deterministic hash & local cache by image content hash or barcode
 * so repeat scans return instantaneously without wasting API/OCR quota.
 */

const CACHE_STORAGE_KEY = 'gymscan_scan_cache_v2';
const MAX_CACHE_ENTRIES = 25;

/**
 * Computes a fast deterministic hash across one or more base64 images or strings.
 */
export async function computeScanHash(inputs) {
  let parts = [];
  if (inputs && typeof inputs === 'object' && !Array.isArray(inputs)) {
    const imgs = Array.isArray(inputs.blobsOrStrings) ? inputs.blobsOrStrings : [];
    parts = [
      ...imgs.map((s) => `${String(s || '').slice(0, 64)}:${String(s || '').length}:${String(s || '').slice(-64)}`),
      inputs.cropRect ? JSON.stringify(inputs.cropRect) : '',
      inputs.barcode || '',
      inputs.manualText || '',
    ];
  } else {
    parts = (Array.isArray(inputs) ? inputs : [inputs]).map((s) => String(s || ''));
  }

  const joined = parts.filter(Boolean).join('|::|');

  if (!joined) return null;

  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    try {
      const encoded = new TextEncoder().encode(joined);
      const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 32);
    } catch (_) {
      // Fallback to FNV-1a below
    }
  }

  let h = 2166136261;
  for (let i = 0; i < joined.length; i += Math.max(1, Math.floor(joined.length / 4096))) {
    h ^= joined.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv_${(h >>> 0).toString(16)}_${joined.length}`;
}

export function getCachedExtraction(key) {
  if (!key || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    const entry = map?.[key];
    if (!entry) return null;
    return entry.extracted || null;
  } catch (_) {
    return null;
  }
}

export function setCachedExtraction(key, extracted) {
  if (!key || !extracted || typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const keys = Object.keys(map);
    if (keys.length >= MAX_CACHE_ENTRIES) {
      // Evict oldest key
      keys.sort((a, b) => (map[a]?.ts || 0) - (map[b]?.ts || 0));
      delete map[keys[0]];
    }
    map[key] = { ts: Date.now(), extracted };
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(map));
  } catch (_) {
    // Ignore storage quota errors cleanly
  }
}
