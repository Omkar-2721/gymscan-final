import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';

const router = express.Router();

// Accept larger JSON payloads for up to 4 base64 label photos on /api/scan only
router.use(express.json({ limit: '18mb' }));

// Simple per-IP sliding window rate limiter (Stage 6 Reliability)
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQ = 25;
const ipHits = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const prev = (ipHits.get(ip) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  if (prev.length >= RATE_MAX_REQ) {
    ipHits.set(ip, prev);
    return false;
  }
  prev.push(now);
  ipHits.set(ip, prev);
  return true;
}

// Strict Zod schema validating Gemini extracted JSON (LLM reads text ONLY, never judges safety)
const NutritionSnapshotSchema = z
  .object({
    calories: z.number().nullable().optional(),
    protein_g: z.number().nullable().optional(),
    carbs_g: z.number().nullable().optional(),
    sugar_g: z.number().nullable().optional(),
    fat_g: z.number().nullable().optional(),
  })
  .nullable()
  .optional();

export const ExtractedLabelSchema = z.object({
  isProductLabel: z.boolean().default(true),
  productName: z.string().nullable().default(null),
  brand: z.string().nullable().default(null),
  category: z.string().nullable().default(null),
  frontClaims: z.array(z.string()).default([]),
  ingredients: z.array(z.string()).default([]),
  proprietaryBlends: z
    .array(
      z.object({
        name: z.string(),
        totalAmount: z.string().nullable().default(null),
        components: z.array(z.string()).default([]),
      })
    )
    .default([]),
  nutritionPer100g: NutritionSnapshotSchema.default(null),
  nutritionPerServing: NutritionSnapshotSchema.default(null),
  servingSize: z.string().nullable().default(null),
  protein_g: z.number().nullable().default(null),
  sugar_g: z.number().nullable().default(null),
  caffeine_mg: z.number().nullable().default(null),
  allergens: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  rawText: z.string().nullable().default(null),
  fieldConfidence: z.record(z.number()).default({}),
});

const GEMINI_RESPONSE_JSON_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isProductLabel: {
      type: Type.BOOLEAN,
      description: 'True if any uploaded photo shows a food/supplement package, nutrition facts, or ingredient label; false for unrelated scenes like selfies, landscapes, or random objects.',
    },
    productName: { type: Type.STRING, nullable: true },
    brand: { type: Type.STRING, nullable: true },
    category: {
      type: Type.STRING,
      nullable: true,
      description: 'e.g. Whey Isolate, Whey Blend, Mass Gainer, Creatine, Pre-Workout, BCAA, Protein Bar, Fat Burner, Energy Drink, or null',
    },
    frontClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
    ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
    proprietaryBlends: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          totalAmount: { type: Type.STRING, nullable: true },
          components: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['name', 'components'],
      },
    },
    nutritionPer100g: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        calories: { type: Type.NUMBER, nullable: true },
        protein_g: { type: Type.NUMBER, nullable: true },
        carbs_g: { type: Type.NUMBER, nullable: true },
        sugar_g: { type: Type.NUMBER, nullable: true },
        fat_g: { type: Type.NUMBER, nullable: true },
      },
    },
    nutritionPerServing: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        calories: { type: Type.NUMBER, nullable: true },
        protein_g: { type: Type.NUMBER, nullable: true },
        carbs_g: { type: Type.NUMBER, nullable: true },
        sugar_g: { type: Type.NUMBER, nullable: true },
        fat_g: { type: Type.NUMBER, nullable: true },
      },
    },
    servingSize: { type: Type.STRING, nullable: true },
    protein_g: { type: Type.NUMBER, nullable: true },
    sugar_g: { type: Type.NUMBER, nullable: true },
    caffeine_mg: { type: Type.NUMBER, nullable: true },
    allergens: { type: Type.ARRAY, items: { type: Type.STRING } },
    warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
    rawText: { type: Type.STRING, nullable: true },
    fieldConfidence: {
      type: Type.OBJECT,
      properties: {
        productName: { type: Type.NUMBER },
        ingredients: { type: Type.NUMBER },
        nutrition: { type: Type.NUMBER },
        overall: { type: Type.NUMBER },
      },
    },
  },
  required: ['isProductLabel', 'ingredients'],
};

const EXTRACTION_SYSTEM_PROMPT = `You are a strict visual OCR transcription reader for dietary supplements and packaged fitness products (whey protein, creatine, pre-workout, mass gainers, BCAAs, protein bars, fat burners, energy drinks).
You receive 1 to 4 photos of the SAME product (front label, ingredients panel, nutrition table, warning block).
Rules:
1. Extract ONLY what is visibly printed across the images. Merge multi-image facts cleanly without duplicating ingredients.
2. NEVER judge safety, NEVER assign scores, NEVER guess unreadable values. Any field not clearly visible must be null (or [] for arrays).
3. If none of the images depict a packaged product or nutrition/ingredient label, set isProductLabel=false and return empty ingredients.
4. Keep every listed ingredient exact as printed (include E-numbers, proprietary blend sub-components, sweeteners, amino acids).
5. Put confidence values in fieldConfidence on a 0..100 scale.`;

function parseDataUrlToPart(input) {
  const str = String(input || '').trim();
  const m = str.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (m) {
    return {
      inlineData: {
        mimeType: m[1] === 'image/jpg' ? 'image/jpeg' : m[1],
        data: m[2],
      },
    };
  }
  return {
    inlineData: {
      mimeType: 'image/jpeg',
      data: str.replace(/^.*base64,/, ''),
    },
  };
}

function getGeminiConfig() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
  const configured = Boolean(apiKey && !apiKey.includes('your_gemini_api_key_here'));
  return { configured, apiKey, model };
}

// GET /api/scan/status
router.get('/status', (_req, res) => {
  const cfg = getGeminiConfig();
  res.json({
    geminiConfigured: cfg.configured,
    model: cfg.configured ? cfg.model : null,
    fallbackEngine: 'tesseract.js',
  });
});

// POST /api/scan/extract
router.post('/extract', async (req, res) => {
  const clientIp = req.ip || req.socket?.remoteAddress || 'local';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      ok: false,
      fallbackRequired: true,
      error: 'Rate limit exceeded (max 25 extraction requests per minute). Using local Tesseract OCR fallback.',
    });
  }

  const cfg = getGeminiConfig();
  if (!cfg.configured) {
    return res.status(200).json({
      ok: false,
      engine: 'none',
      fallbackRequired: true,
      reason: 'GEMINI_API_KEY not set in server/.env — seamlessly falling back to client Tesseract.js OCR.',
    });
  }

  const rawImages = Array.isArray(req.body?.images)
    ? req.body.images
    : req.body?.image
    ? [req.body.image]
    : [];

  if (rawImages.length === 0 || rawImages.length > 4) {
    return res.status(400).json({
      ok: false,
      fallbackRequired: false,
      error: 'Provide between 1 and 4 label images.',
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 16000);

  try {
    const ai = new GoogleGenAI({ apiKey: cfg.apiKey });
    const parts = [
      { text: EXTRACTION_SYSTEM_PROMPT },
      ...rawImages.map(parseDataUrlToPart),
    ];

    const response = await ai.models.generateContent({
      model: cfg.model,
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: GEMINI_RESPONSE_JSON_SCHEMA,
        temperature: 0.1,
        abortSignal: controller.signal,
      },
    });

    const rawJsonText = response?.text || '';
    let parsedJson;
    try {
      parsedJson = JSON.parse(rawJsonText);
    } catch (_) {
      return res.status(200).json({
        ok: false,
        engine: 'gemini',
        fallbackRequired: true,
        reason: 'Gemini returned malformed JSON — falling back to Tesseract.js OCR.',
      });
    }

    const validated = ExtractedLabelSchema.safeParse(parsedJson);
    if (!validated.success) {
      return res.status(200).json({
        ok: false,
        engine: 'gemini',
        fallbackRequired: true,
        reason: 'Gemini JSON failed schema validation — falling back to Tesseract.js OCR.',
      });
    }

    return res.status(200).json({
      ok: true,
      engine: `gemini:${cfg.model}`,
      data: validated.data,
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      engine: 'gemini',
      fallbackRequired: true,
      reason:
        err?.name === 'AbortError'
          ? 'Gemini Vision request timed out — fell back to Tesseract.js OCR.'
          : `Gemini API error (${err?.message || 'network'}) — fell back to Tesseract.js OCR.`,
    });
  } finally {
    clearTimeout(timer);
  }
});

export default router;
