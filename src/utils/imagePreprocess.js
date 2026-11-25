/**
 * Image Preprocessing & Frame Quality Pipeline for Supplement Label OCR.
 * Works identically on raw RGBA pixel buffers in both Browser Canvas and Node.js.
 *
 * Pipeline stages:
 *   1. Scale normalization: downscale > 2000px, upscale small text crops toward ~300 DPI equiv
 *   2. Grayscale luminance conversion
 *   3. Auto-deskew via horizontal text-line projection variance (-6 deg to +6 deg)
 *   4. 3x3 median denoising
 *   5. High-contrast stretch + unsharp sharpening
 *   6. Adaptive thresholding (Sauvola local integral-image + Otsu global fallback)
 */

export const MAX_IMAGE_SIDE = 2000;
export const TARGET_MIN_WIDTH = 1100;

/**
 * Resize raw RGBA buffer using bilinear interpolation.
 */
export function resizeRGBA(srcData, srcW, srcH, dstW, dstH) {
  if (srcW === dstW && srcH === dstH) {
    return new Uint8ClampedArray(srcData);
  }
  const dst = new Uint8ClampedArray(dstW * dstH * 4);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    const sy = y * yRatio;
    const y0 = Math.min(srcH - 1, Math.floor(sy));
    const y1 = Math.min(srcH - 1, y0 + 1);
    const wy = sy - y0;

    for (let x = 0; x < dstW; x++) {
      const sx = x * xRatio;
      const x0 = Math.min(srcW - 1, Math.floor(sx));
      const x1 = Math.min(srcW - 1, x0 + 1);
      const wx = sx - x0;

      const idx00 = (y0 * srcW + x0) * 4;
      const idx10 = (y0 * srcW + x1) * 4;
      const idx01 = (y1 * srcW + x0) * 4;
      const idx11 = (y1 * srcW + x1) * 4;
      const outIdx = (y * dstW + x) * 4;

      for (let c = 0; c < 3; c++) {
        const top = srcData[idx00 + c] * (1 - wx) + srcData[idx10 + c] * wx;
        const bot = srcData[idx01 + c] * (1 - wx) + srcData[idx11 + c] * wx;
        dst[outIdx + c] = Math.round(top * (1 - wy) + bot * wy);
      }
      dst[outIdx + 3] = 255;
    }
  }
  return dst;
}

/**
 * Computes target dimensions:
 * - Downscale if max(width, height) > 2000
 * - Upscale small labels toward ~300 DPI equivalent (min 1100px wide, capped at 2000px)
 */
export function computeTargetDimensions(width, height) {
  let w = width;
  let h = height;
  const maxSide = Math.max(w, h);

  if (maxSide > MAX_IMAGE_SIDE) {
    const scale = MAX_IMAGE_SIDE / maxSide;
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  } else if (w < TARGET_MIN_WIDTH) {
    const scale = Math.min(2.6, TARGET_MIN_WIDTH / Math.max(1, w), MAX_IMAGE_SIDE / Math.max(1, maxSide));
    if (scale > 1.05) {
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
  }

  return { width: Math.max(1, w), height: Math.max(1, h) };
}

/**
 * Convert RGBA buffer to single-channel Uint8Array grayscale.
 */
export function rgbaToGrayscale(rgba, width, height) {
  const gray = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = Math.round(0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]);
  }
  return gray;
}

/**
 * Convert grayscale channel back to RGBA Uint8ClampedArray.
 */
export function grayscaleToRGBA(gray, width, height) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    const v = gray[i];
    rgba[p] = v;
    rgba[p + 1] = v;
    rgba[p + 2] = v;
    rgba[p + 3] = 255;
  }
  return rgba;
}

/**
 * Rotate a grayscale buffer around its center by `angleDeg` degrees (white background fill).
 */
export function rotateGrayscale(gray, width, height, angleDeg) {
  if (Math.abs(angleDeg) < 0.25) return new Uint8Array(gray);
  const rad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const cx = width / 2;
  const cy = height / 2;
  const out = new Uint8Array(width * height);
  out.fill(255);

  for (let y = 0; y < height; y++) {
    const dy = y - cy;
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const sx = dx * cosA + dy * sinA + cx;
      const sy = -dx * sinA + dy * cosA + cy;
      const ix = Math.round(sx);
      const iy = Math.round(sy);
      if (ix >= 0 && ix < width && iy >= 0 && iy < height) {
        out[y * width + x] = gray[iy * width + ix];
      }
    }
  }
  return out;
}

/**
 * Estimate skew angle (-6 to +6 deg) using horizontal projection profile variance.
 * Crisp horizontal text lines maximize variance between dark text rows and bright gaps.
 */
export function estimateSkewAngle(gray, width, height) {
  // Sample onto a small grid (~320px wide) for sub-5ms angle search
  const targetW = Math.min(320, width);
  const scale = targetW / width;
  const targetH = Math.max(20, Math.round(height * scale));
  const thumb = new Uint8Array(targetW * targetH);

  for (let y = 0; y < targetH; y++) {
    const sy = Math.min(height - 1, Math.floor(y / scale));
    for (let x = 0; x < targetW; x++) {
      const sx = Math.min(width - 1, Math.floor(x / scale));
      thumb[y * targetW + x] = gray[sy * width + sx];
    }
  }

  let bestAngle = 0;
  let bestScore = -1;
  let zeroScore = 0;

  for (let angle = -6; angle <= 6; angle += 1) {
    const rotated = angle === 0 ? thumb : rotateGrayscale(thumb, targetW, targetH, angle);
    const rowSums = new Float64Array(targetH);
    for (let y = 0; y < targetH; y++) {
      let s = 0;
      const offset = y * targetW;
      for (let x = 0; x < targetW; x++) {
        s += 255 - rotated[offset + x];
      }
      rowSums[y] = s;
    }

    let mean = 0;
    for (let y = 0; y < targetH; y++) mean += rowSums[y];
    mean /= targetH;

    let variance = 0;
    for (let y = 0; y < targetH; y++) {
      const d = rowSums[y] - mean;
      variance += d * d;
    }
    variance /= targetH;

    if (angle === 0) zeroScore = variance;
    if (variance > bestScore) {
      bestScore = variance;
      bestAngle = angle;
    }
  }

  // Only deskew if the rotated projection variance meaningfully beats 0 deg
  if (bestAngle !== 0 && bestScore > zeroScore * 1.04) {
    return bestAngle;
  }
  return 0;
}

/**
 * 3x3 median filter for salt-and-pepper / sensor noise removal while keeping text edges sharp.
 */
export function medianDenoise3x3(gray, width, height) {
  const out = new Uint8Array(gray);
  const win = new Uint8Array(9);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const row = (y + dy) * width;
        for (let dx = -1; dx <= 1; dx++) {
          win[k++] = gray[row + x + dx];
        }
      }
      // Partial insertion sort to find median at index 4
      for (let i = 1; i < 9; i++) {
        const v = win[i];
        let j = i - 1;
        while (j >= 0 && win[j] > v) {
          win[j + 1] = win[j];
          j--;
        }
        win[j + 1] = v;
      }
      out[y * width + x] = win[4];
    }
  }
  return out;
}

/**
 * Contrast stretching (2%-98% percentile) + subtle unsharp sharpening.
 */
export function boostContrastAndSharpen(gray, width, height) {
  const hist = new Int32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;

  const total = gray.length;
  const lowTarget = Math.floor(total * 0.02);
  const highTarget = Math.floor(total * 0.98);

  let cum = 0;
  let minV = 0;
  let maxV = 255;
  for (let i = 0; i < 256; i++) {
    cum += hist[i];
    if (cum >= lowTarget) {
      minV = i;
      break;
    }
  }
  cum = 0;
  for (let i = 255; i >= 0; i--) {
    cum += hist[i];
    if (total - cum <= highTarget) {
      maxV = i;
      break;
    }
  }

  const range = Math.max(16, maxV - minV);
  const stretched = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    const norm = ((gray[i] - minV) * 255) / range;
    stretched[i] = norm < 0 ? 0 : norm > 255 ? 255 : Math.round(norm);
  }

  // Light 3x3 unsharp mask to crisp up small 6pt ingredient fonts
  const sharpened = new Uint8Array(stretched);
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = row + x;
      const center = stretched[idx];
      const neighbors =
        stretched[idx - 1] +
        stretched[idx + 1] +
        stretched[idx - width] +
        stretched[idx + width];
      const blur = (center * 4 + neighbors) / 8;
      const val = center + 0.65 * (center - blur);
      sharpened[idx] = val < 0 ? 0 : val > 255 ? 255 : Math.round(val);
    }
  }

  return sharpened;
}

/**
 * Compute global Otsu threshold.
 */
export function computeOtsuThreshold(gray) {
  const hist = new Int32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;

  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];

  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const betweenVar = wB * wF * (mB - mF) * (mB - mF);
    if (betweenVar > maxVar) {
      maxVar = betweenVar;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * Sauvola local adaptive thresholding in O(W*H) using integral images.
 * Handles shadows, curved protein tubs, and shiny foil glare cleanly.
 * Automatically normalizes dark-on-light polarity (black text on white background).
 */
export function applySauvolaThreshold(gray, width, height, radius = 14, k = 0.2) {
  const stride = width + 1;
  const integral = new Float64Array(stride * (height + 1));
  const integralSq = new Float64Array(stride * (height + 1));

  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    let rowSumSq = 0;
    const gRow = y * width;
    const iRow = (y + 1) * stride;
    const prevRow = y * stride;

    for (let x = 0; x < width; x++) {
      const val = gray[gRow + x];
      rowSum += val;
      rowSumSq += val * val;
      integral[iRow + x + 1] = integral[prevRow + x + 1] + rowSum;
      integralSq[iRow + x + 1] = integralSq[prevRow + x + 1] + rowSumSq;
    }
  }

  const out = new Uint8Array(width * height);
  const otsuT = computeOtsuThreshold(gray);
  let darkCount = 0;

  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - radius);
    const y2 = Math.min(height - 1, y + radius);
    const r1 = y1 * stride;
    const r2 = (y2 + 1) * stride;

    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - radius);
      const x2 = Math.min(width - 1, x + radius);
      const area = (x2 - x1 + 1) * (y2 - y1 + 1);

      const sum =
        integral[r2 + x2 + 1] -
        integral[r1 + x2 + 1] -
        integral[r2 + x1] +
        integral[r1 + x1];
      const sumSq =
        integralSq[r2 + x2 + 1] -
        integralSq[r1 + x2 + 1] -
        integralSq[r2 + x1] +
        integralSq[r1 + x1];

      const mean = sum / area;
      const variance = Math.max(0, sumSq / area - mean * mean);
      const stdDev = Math.sqrt(variance);

      // Blend Sauvola local threshold with Otsu guard to avoid noise speckles in blank regions
      const sauvolaT = mean * (1 + k * (stdDev / 128 - 1));
      const blendedT = stdDev < 10 ? otsuT : sauvolaT;
      const val = gray[y * width + x] > blendedT ? 255 : 0;
      out[y * width + x] = val;
      if (val === 0) darkCount++;
    }
  }

  // Ensure light background + dark text (if > 65% of pixels are black, invert white-on-black labels)
  if (darkCount > out.length * 0.65) {
    for (let i = 0; i < out.length; i++) {
      out[i] = 255 - out[i];
    }
  }

  return out;
}

/**
 * Generates 3 OCR-ready RGBA variants from a raw RGBA pixel buffer:
 *   1. grayscale
 *   2. high_contrast
 *   3. thresholded (Sauvola + Otsu)
 */
export function buildPreprocessedVariantsFromRGBA(rawRGBA, srcWidth, srcHeight) {
  const { width, height } = computeTargetDimensions(srcWidth, srcHeight);
  const resizedRGBA = resizeRGBA(rawRGBA, srcWidth, srcHeight, width, height);

  let gray = rgbaToGrayscale(resizedRGBA, width, height);
  const skewAngle = estimateSkewAngle(gray, width, height);
  if (skewAngle !== 0) {
    gray = rotateGrayscale(gray, width, height, skewAngle);
  }

  const denoised = medianDenoise3x3(gray, width, height);
  const highContrast = boostContrastAndSharpen(denoised, width, height);
  const thresholded = applySauvolaThreshold(highContrast, width, height);

  return {
    width,
    height,
    skewAngle,
    variants: [
      {
        id: 'grayscale',
        label: 'Deskewed Grayscale',
        psm: '6',
        rgba: grayscaleToRGBA(denoised, width, height),
      },
      {
        id: 'high_contrast',
        label: 'High-Contrast Sharpened',
        psm: '6',
        rgba: grayscaleToRGBA(highContrast, width, height),
      },
      {
        id: 'thresholded',
        label: 'Sauvola Adaptive Threshold',
        psm: '4',
        rgba: grayscaleToRGBA(thresholded, width, height),
      },
    ],
  };
}

/**
 * Compute Laplacian variance (sharpness) and average luminance (brightness)
 * on an ImageData / RGBA buffer for Live Camera frame quality gating.
 */
export function computeBlurAndBrightness(rgba, width, height) {
  // Sample stride of 2 for < 3ms live frame evaluation
  const step = width > 400 ? 2 : 1;
  const sw = Math.floor(width / step);
  const sh = Math.floor(height / step);
  const gray = new Uint8Array(sw * sh);

  let brightSum = 0;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const p = (y * step * width + x * step) * 4;
      const luma = Math.round(0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]);
      gray[y * sw + x] = luma;
      brightSum += luma;
    }
  }
  const brightness = brightSum / Math.max(1, gray.length);

  // Discrete 3x3 Laplacian [0,1,0; 1,-4,1; 0,1,0]
  let lapSum = 0;
  let lapSqSum = 0;
  let count = 0;
  for (let y = 1; y < sh - 1; y++) {
    const row = y * sw;
    for (let x = 1; x < sw - 1; x++) {
      const idx = row + x;
      const lap =
        gray[idx - 1] +
        gray[idx + 1] +
        gray[idx - sw] +
        gray[idx + sw] -
        4 * gray[idx];
      lapSum += lap;
      lapSqSum += lap * lap;
      count++;
    }
  }

  const meanLap = lapSum / Math.max(1, count);
  const sharpness = Math.max(0, lapSqSum / Math.max(1, count) - meanLap * meanLap);

  const isTooDark = brightness < 52;
  const isBlurry = sharpness < 55;

  let hint = 'Label in focus — reading...';
  if (isTooDark) {
    hint = 'More light needed (turn on flash)';
  } else if (isBlurry) {
    hint = 'Hold steady / Move closer to label';
  }

  return {
    sharpness: Math.round(sharpness),
    brightness: Math.round(brightness),
    isTooDark,
    isBlurry,
    hint,
  };
}

/**
 * Browser helper: converts an image dataURL (and optional normalized crop rect)
 * into 3 canvas-encoded PNG dataURLs for multi-variant Tesseract OCR.
 */
export async function preprocessImageInBrowser(imageSource, cropRect = null) {
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to load image for preprocessing'));
    el.src = imageSource;
  });

  const sx = cropRect ? Math.round(cropRect.x * img.width) : 0;
  const sy = cropRect ? Math.round(cropRect.y * img.height) : 0;
  const sw = cropRect ? Math.max(20, Math.round(cropRect.width * img.width)) : img.width;
  const sh = cropRect ? Math.max(20, Math.round(cropRect.height * img.height)) : img.height;

  const { width, height } = computeTargetDimensions(sw, sh);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const processed = buildPreprocessedVariantsFromRGBA(imageData.data, width, height);

  const encodedVariants = processed.variants.map((v) => {
    const vCanvas = document.createElement('canvas');
    vCanvas.width = processed.width;
    vCanvas.height = processed.height;
    const vCtx = vCanvas.getContext('2d');
    const outImgData = new ImageData(v.rgba, processed.width, processed.height);
    vCtx.putImageData(outImgData, 0, 0);
    return {
      id: v.id,
      label: v.label,
      psm: v.psm,
      dataUrl: vCanvas.toDataURL('image/png'),
    };
  });

  return {
    width: processed.width,
    height: processed.height,
    skewAngle: processed.skewAngle,
    variants: encodedVariants,
  };
}
