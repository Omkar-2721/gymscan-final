/**
 * Barcode Detection (Native BarcodeDetector API + @zxing/browser fallback)
 * and Open Food Facts v2 API Lookup (no API key required).
 */

let nativeDetectorPromise = null;
let zxingReaderPromise = null;

const SUPPORTED_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];

async function getNativeBarcodeDetector() {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
    return null;
  }
  if (!nativeDetectorPromise) {
    nativeDetectorPromise = (async () => {
      try {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        const formats = SUPPORTED_FORMATS.filter((f) => supported.includes(f));
        return new window.BarcodeDetector({
          formats: formats.length > 0 ? formats : undefined,
        });
      } catch (e) {
        return new window.BarcodeDetector();
      }
    })();
  }
  return nativeDetectorPromise;
}

async function getZxingReader() {
  if (!zxingReaderPromise) {
    zxingReaderPromise = import('@zxing/browser').then(
      ({ BrowserMultiFormatReader }) => new BrowserMultiFormatReader()
    );
  }
  return zxingReaderPromise;
}

/**
 * Attempts to detect a product barcode from a Canvas or Image element.
 * Uses native BarcodeDetector first, then falls back to @zxing/browser.
 * @returns {Promise<string|null>}
 */
export async function detectBarcodeFromCanvasOrImage(elementOrDataUrl) {
  let targetEl = elementOrDataUrl;

  if (typeof elementOrDataUrl === 'string') {
    targetEl = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not decode image for barcode check'));
      img.src = elementOrDataUrl;
    });
  }

  // 1. Native BarcodeDetector API (fast hardware-backed path on Chrome/Android/Edge)
  try {
    const detector = await getNativeBarcodeDetector();
    if (detector) {
      const codes = await detector.detect(targetEl);
      if (codes && codes.length > 0 && codes[0].rawValue) {
        return String(codes[0].rawValue).trim();
      }
    }
  } catch (e) {
    // Fall through to @zxing/browser
  }

  // 2. Cross-browser fallback via @zxing/browser
  try {
    const reader = await getZxingReader();
    let imgEl = targetEl;
    if (targetEl instanceof HTMLCanvasElement) {
      const dataUrl = targetEl.toDataURL('image/png');
      imgEl = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
      });
    }
    const result = await reader.decodeFromImageElement(imgEl);
    if (result && result.getText()) {
      return String(result.getText()).trim();
    }
  } catch (e) {
    // No barcode present in frame/image
  }

  return null;
}

/**
 * Queries Open Food Facts API v2 for a barcode (no API key required).
 * Returns `{ found: true, barcode, name, brand, ingredientsText, macros }`
 * or `{ found: false, barcode, message: "Product not in database, scanning label instead" }`.
 */
export async function lookupBarcodeOpenFoodFacts(barcode) {
  const cleanCode = String(barcode || '').replace(/[^0-9]/g, '');
  if (!cleanCode || cleanCode.length < 6) {
    return {
      found: false,
      barcode: cleanCode,
      message: 'Product not in database, scanning label instead',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        found: false,
        barcode: cleanCode,
        message: 'Product not in database, scanning label instead',
      };
    }

    const data = await res.json();
    const product = data?.product;
    const ingredientsText =
      product?.ingredients_text_en ||
      product?.ingredients_text ||
      '';

    if (data?.status !== 1 || !product || !ingredientsText.trim()) {
      return {
        found: false,
        barcode: cleanCode,
        message: 'Product not in database, scanning label instead',
      };
    }

    const nutriments = product.nutriments || {};
    return {
      found: true,
      barcode: cleanCode,
      name: product.product_name || product.generic_name || `Scanned Product (${cleanCode})`,
      brand: product.brands || 'Open Food Facts Verified',
      ingredientsText: ingredientsText.trim(),
      macros: {
        proteinG: nutriments.proteins_serving ?? nutriments.proteins_100g ?? null,
        sugarG: nutriments.sugars_serving ?? nutriments.sugars_100g ?? null,
        carbsG: nutriments.carbohydrates_serving ?? nutriments.carbohydrates_100g ?? null,
        fatG: nutriments.fat_serving ?? nutriments.fat_100g ?? null,
        calories: nutriments['energy-kcal_serving'] ?? nutriments['energy-kcal_100g'] ?? null,
        servingSizeG: parseFloat(product.serving_quantity) || null,
      },
    };
  } catch (err) {
    clearTimeout(timeout);
    return {
      found: false,
      barcode: cleanCode,
      message: 'Product not in database, scanning label instead',
    };
  }
}
