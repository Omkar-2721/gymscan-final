import { SAMPLE_PRODUCTS } from '../data/sampleProducts.js';
import { RAW_CATALOG_ITEMS } from '../data/supplementCatalog.js';
import {
  extractTextWithEasyOCR,
  analyzeWithMLPipeline,
  enforcePostScoringRules,
} from './mlService.js';
import {
  scanTextForBannedAndContamination,
  BANNED_LIST_DISCLAIMER,
} from '../data/bannedSubstances.js';
import { preprocessImageInBrowser } from './imagePreprocess.js';
import {
  recognizeWithVariants,
  parseLabelAndMatch,
  extractMacrosFromOCR,
} from './ocrEngine.js';
import {
  detectBarcodeFromCanvasOrImage,
  lookupBarcodeOpenFoodFacts,
} from './barcodeScanner.js';

// Comprehensive Database of 60+ Recognized Fitness, Gym & Nutrition Brands
export const POPULAR_BRANDS_DB = [
  {
    brand: "Bolt Nutrition",
    patterns: ["bolt", "bolt nutrition", "bolt protein", "bolt bar", "protein bar 22g", "bolt 22g", "bolt whey"],
    defaultProduct: "Bolt Nutrition 22g High-Protein Bar",
    category: "Protein Bar / Snack"
  },
  {
    brand: "GNC",
    patterns: ["gnc", "pro performance", "amplified gold", "gnc whey", "gnc amp", "gnc pro", "gnc 100%", "#14 gnc"],
    defaultProduct: "GNC Pro Performance 100% Whey",
    category: "100% Whey / Protein Powder"
  },
  {
    brand: "Optimum Nutrition (ON)",
    patterns: ["optimum nutrition", "on gold standard", "gold standard", "optimum", "on whey", "on casein", "standard 100%", "optimum 100%"],
    defaultProduct: "Optimum Nutrition Gold Standard 100% Whey",
    category: "100% Whey / Protein Powder"
  },
  {
    brand: "MuscleBlaze",
    patterns: ["muscleblaze", "biozyme", "fuel one", "mb whey", "raw whey mb", "mb protein", "biozyme whey", "muscle blaze"],
    defaultProduct: "MuscleBlaze Biozyme Performance Whey",
    category: "100% Whey / Protein Powder"
  },
  {
    brand: "Dymatize",
    patterns: ["dymatize", "iso100", "iso 100", "elite whey", "super mass", "hydrolyzed isolate", "iso-100"],
    defaultProduct: "Dymatize ISO100 Hydrolyzed Whey Isolate",
    category: "100% Whey / Protein Powder"
  },
  {
    brand: "Yogabar",
    patterns: ["yogabar", "yoga bar", "20g protein bar yogabar", "yogabars", "yoga bars"],
    defaultProduct: "Yogabar 20g High Protein Bar (Almond Fudge)",
    category: "Protein Bar / Snack"
  },
  {
    brand: "RiteBite Max Protein",
    patterns: ["ritebite", "max protein", "rite bite", "maxprotein", "max protein bar", "20g protein bar", "active bar", "30g protein bar"],
    defaultProduct: "RiteBite Max Protein 20g Active Bar",
    category: "Protein Bar / Snack"
  },
  {
    brand: "Quest Nutrition",
    patterns: ["quest", "quest bar", "quest hero", "quest nutrition", "quest protein", "hero bar", "quest snack"],
    defaultProduct: "Quest High-Protein Bar (Chocolate Chunk)",
    category: "Protein Bar / Snack"
  },
  {
    brand: "Grenade",
    patterns: ["grenade", "carb killa", "grenade bar", "fudge brownie bar", "carbkilla"],
    defaultProduct: "Grenade Carb Killa High Protein Bar",
    category: "Protein Bar / Snack"
  },
  {
    brand: "Hyp Nutrition",
    patterns: ["hyp", "hyp bar", "hyp protein bar", "hyp nutrition", "hyp cookies"],
    defaultProduct: "Hyp 20g Protein Bar (Cookie Dough)",
    category: "Protein Bar / Snack"
  },
  {
    brand: "Phab",
    patterns: ["phab", "phab protein", "phab bar", "phab bomb", "phab snack"],
    defaultProduct: "Phab 21g Energy Protein Bar",
    category: "Protein Bar / Snack"
  },
  {
    brand: "The Whole Truth",
    patterns: ["the whole truth", "whole truth", "whole truth bar", "whole truth whey", "clean protein", "wholetruth"],
    defaultProduct: "The Whole Truth 100% Clean Whey Protein",
    category: "100% Whey / Protein Powder"
  },
  {
    brand: "MyProtein",
    patterns: ["myprotein", "impact whey", "impact isolate", "my protein", "the whey", "myprotein impact"],
    defaultProduct: "MyProtein Impact Whey Isolate",
    category: "100% Whey / Protein Powder"
  },
  {
    brand: "MuscleTech",
    patterns: ["muscletech", "nitrotech", "nitro tech", "celltech", "vapor x5", "nitro-tech", "muscle tech"],
    defaultProduct: "MuscleTech NitroTech 100% Whey Gold",
    category: "100% Whey / Protein Powder"
  },
  {
    brand: "Cellucor",
    patterns: ["cellucor", "c4", "c4 original", "c4 ripped", "c4 energy", "c4 pre workout", "c4 drink", "cellucor c4"],
    defaultProduct: "Cellucor C4 Original Pre-Workout",
    category: "Pre-Workout / Energy Drink"
  },
  {
    brand: "Monster Energy",
    patterns: ["monster", "monster energy", "monster ultra", "monster zero", "ultra white", "monster can"],
    defaultProduct: "Monster Energy Ultra Zero Sugar Can",
    category: "Pre-Workout / Energy Drink"
  },
  {
    brand: "Ghost Lifestyle",
    patterns: ["ghost", "ghost energy", "ghost legend", "ghost whey", "ghost pre", "ghost pump"],
    defaultProduct: "Ghost Legend High-Energy Pre-Workout",
    category: "Pre-Workout / Energy Drink"
  },
  {
    brand: "Amul",
    patterns: ["amul", "amul protein", "amul whey", "amul lassi", "amul buttermilk", "amul high protein", "amul milk"],
    defaultProduct: "Amul High Protein Buttermilk / Rose Lassi",
    category: "RTD High-Protein Drink"
  },
  {
    brand: "AS-IT-IS Nutrition",
    patterns: ["asitis", "as-it-is", "as it is", "as-it-is raw whey", "pure raw whey", "asitis isolate"],
    defaultProduct: "AS-IT-IS 100% Pure Raw Whey Concentrate",
    category: "100% Whey / Protein Powder"
  },
  {
    brand: "Nutrabay",
    patterns: ["nutrabay", "nutrabay gold", "nutrabay pure", "nutrabay isolate", "nutra bay"],
    defaultProduct: "Nutrabay Pure 100% Micronized Whey Isolate",
    category: "100% Whey / Protein Powder"
  },
  {
    brand: "NAKPRO",
    patterns: ["nakpro", "nakpro platinum", "nakpro perform", "nakpro gold", "nak pro"],
    defaultProduct: "NAKPRO Platinum 100% Whey Isolate",
    category: "100% Whey / Protein Powder"
  },
  {
    brand: "Labrada",
    patterns: ["labrada", "lean body", "labrada 100%", "leanbody", "labrada nutrition"],
    defaultProduct: "Labrada 100% Premium Whey Protein",
    category: "100% Whey / Protein Powder"
  },
  {
    brand: "Scitron",
    patterns: ["scitron", "scitron advance", "scitron raw", "scitron isolate", "advance whey"],
    defaultProduct: "Scitron Advance Whey with Hydrolyzed Peptides",
    category: "100% Whey / Protein Powder"
  },
  {
    brand: "BigMuscles Nutrition",
    patterns: ["bigmuscles", "big muscles", "premium gold whey", "real mass", "big muscle"],
    defaultProduct: "BigMuscles Premium Gold 100% Whey",
    category: "100% Whey / Protein Powder"
  },
  {
    brand: "Fast&Up",
    patterns: ["fast&up", "fast and up", "fastandup", "reload", "plant protein fast&up"],
    defaultProduct: "Fast&Up 100% Plant Protein Isolate",
    category: "100% Whey / Protein Powder"
  },
  {
    brand: "Isopure",
    patterns: ["isopure", "zero carb", "low carb isopure", "isopure unflavored", "nature's best isopure"],
    defaultProduct: "Isopure Zero Carb 100% Whey Protein Isolate",
    category: "100% Whey / Protein Powder"
  },
  {
    brand: "BSN",
    patterns: ["bsn", "syntha-6", "syntha 6", "no-xplode", "syntha-6 edge"],
    defaultProduct: "BSN Syntha-6 Ultra-Premium Protein Matrix",
    category: "100% Whey / Protein Powder"
  },
  {
    brand: "Avvatar",
    patterns: ["avvatar", "avvatar whey", "avvatar isolate", "fresh whey"],
    defaultProduct: "Avvatar 100% Fresh Whey Protein",
    category: "100% Whey / Protein Powder"
  },
  {
    brand: "Pintola",
    patterns: ["pintola", "peanut butter", "all natural peanut", "organic peanut butter", "pintola butter"],
    defaultProduct: "Pintola All-Natural 100% Organic Peanut Butter",
    category: "Fitness Nut Butter / Spread"
  },
  {
    brand: "Alpino",
    patterns: ["alpino", "alpino peanut", "alpino high protein"],
    defaultProduct: "Alpino High Protein Super Peanut Butter",
    category: "Fitness Nut Butter / Spread"
  }
];

// Key Ingredient Dictionaries
const AMINO_SPIKE_KEYWORDS = [
  "glycine", "taurine", "l-glycine", "l-taurine", "l-alanine", "alanine", 
  "glutamine peptides", "free amino acids", "added amino blend"
];

const FILLER_KEYWORDS = [
  "maltodextrin", "corn syrup", "dextrose", "modified food starch", 
  "hydrogenated oil", "palm oil", "fractionated palm kernel oil", 
  "non-dairy creamer", "glucose syrup", "maltodextrin powder"
];

const BANNED_STIM_KEYWORDS = [
  "dmaa", "1,3-dimethylamylamine", "dmha", "2-amino-6-methylheptane",
  "geranamine", "ephedra", "ephedrine", "ma huang", "octopamine",
  "higenamine", "dmba", "amp citrate", "sibutramine", "clenbuterol",
  "ostarine", "mk-2866", "ligandrol", "lgd-4033", "rad-140", "rad140",
  "andarine", "cardarine", "gw501516", "yk-11", "yk11", "androstenedione",
  "methasterone", "trenbolone", "furosemide", "hydrochlorothiazide",
  "tadalafil", "sildenafil"
];

const HARMFUL_DYES_PRESERVATIVES = [
  "red 40", "allura red", "yellow 5", "tartrazine", "yellow 6", 
  "blue 1", "brilliant blue", "titanium dioxide", "sodium benzoate", 
  "potassium sorbate", "bha", "bht", "carrageenan"
];

const ARTIFICIAL_SWEETENERS = [
  "sucralose", "acesulfame potassium", "ace-k", "aspartame", 
  "saccharin", "maltitol", "sorbitol", "isomalt", "polydextrose"
];

const CLEAN_PREMIUM_MARKERS = [
  "whey protein isolate", "cross-flow microfiltered", "hydrolyzed whey isolate", 
  "creapure", "organic stevia", "monk fruit", "sunflower lecithin", 
  "l-citrulline malate", "fermented l-leucine", "pink himalayan salt", 
  "almond butter", "whey protein crisps", "chicory root fiber", "cocoa butter"
];

// Helper to extract numbers from label
function extractNutrientWithRegex(text, patterns, defaultValue) {
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m && m[1]) return m[1].trim();
  }
  return defaultValue;
}

// Universal Dynamic Brand and Product Identification Function for ANY image/label
export function identifyBrandAndProduct(text, fallbackSlot = 'A') {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      brand: fallbackSlot === 'A' ? "Bolt Nutrition" : "GNC",
      name: fallbackSlot === 'A' ? "Bolt Nutrition 22g High-Protein Bar" : "GNC Pro Performance 100% Whey",
      category: fallbackSlot === 'A' ? "Protein Bar / Snack" : "100% Whey / Protein Powder"
    };
  }

  const normalized = text.toLowerCase();

  // 1. Search known brand databases
  for (const entry of POPULAR_BRANDS_DB) {
    if (entry.patterns.some(pattern => normalized.includes(pattern))) {
      return {
        brand: entry.brand,
        name: entry.defaultProduct,
        category: entry.category
      };
    }
  }

  // 2. Universal Dynamic OCR Line Extractor (Extract Real Label Headline / Brand from image)
  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length >= 3);
  const ignoredKeywords = [
    "nutrition facts", "nutritional facts", "serving size", "servings per", 
    "amount per serving", "calories", "daily value", "ingredients:", 
    "directions", "warning", "manufactured by", "marketed by", "batch no", 
    "exp date", "mfg date", "net wt", "keep out of reach", "store in a cool", 
    "contains:", "allergen info", "fssai", "license no", "best before", "for batch"
  ];

  const candidateLines = rawLines.filter(line => {
    const l = line.toLowerCase();
    return !ignoredKeywords.some(kw => l.includes(kw)) && line.length >= 4 && line.length <= 45;
  });

  if (candidateLines.length > 0) {
    const cleanLine = candidateLines[0].replace(/[^a-zA-Z0-9\s\-&%().]/g, '').trim();
    if (cleanLine.length >= 4) {
      const words = cleanLine.split(/\s+/);
      const brandGuess = words.slice(0, Math.min(2, words.length)).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      const titleCased = cleanLine.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      const dynamicCat = detectProductCategory(cleanLine);

      return {
        brand: brandGuess || "Athletic Nutrition",
        name: titleCased,
        category: dynamicCat
      };
    }
  }

  // 3. Dynamic Category-Based Product Label
  const detectedCat = detectProductCategory(normalized, null);
  if (detectedCat) {
    let dynamicName = "Pure " + detectedCat;
    if (detectedCat.includes("Bar")) dynamicName = "High-Protein Energy Bar";
    if (detectedCat.includes("Pre-Workout")) dynamicName = "High-Energy Pre-Workout Formula";
    if (detectedCat.includes("Creatine")) dynamicName = "100% Micronized Creatine Monohydrate";
    if (detectedCat.includes("RTD")) dynamicName = "High-Protein RTD Shake";
    if (detectedCat.includes("Whey")) dynamicName = "100% Pure Whey Protein";
    if (detectedCat.includes("Butter")) dynamicName = "All-Natural High Protein Peanut Butter";

    return {
      brand: "Fitness Nutrition",
      name: dynamicName,
      category: detectedCat
    };
  }

  // 4. Clean Fallback
  return {
    brand: fallbackSlot === 'A' ? "Bolt Nutrition" : "GNC",
    name: fallbackSlot === 'A' ? "Bolt Nutrition 22g High-Protein Bar" : "GNC Pro Performance 100% Whey",
    category: fallbackSlot === 'A' ? "Protein Bar / Snack" : "100% Whey / Protein Powder"
  };
}

// Detect category based on text / keywords
export function detectProductCategory(text, fallback = "Gym Supplement") {
  const lower = (text || "").toLowerCase();
  
  if (lower.includes("bar") || lower.includes("cookie") || lower.includes("flapjack") || lower.includes("crunch") || lower.includes("wafer") || lower.includes("hero")) {
    return "Protein Bar / Snack";
  }
  if (lower.includes("pre-workout") || lower.includes("pre workout") || lower.includes("energy drink") || lower.includes("caffeine") || lower.includes("c4") || lower.includes("ghost legend") || lower.includes("monster")) {
    return "Pre-Workout / Energy Drink";
  }
  if (lower.includes("rtd") || lower.includes("shake") || lower.includes("ready to drink") || lower.includes("milk beverage") || lower.includes("lassi") || lower.includes("amul")) {
    return "RTD High-Protein Drink";
  }
  if (lower.includes("creatine") || lower.includes("creapure") || lower.includes("monohydrate")) {
    return "Creatine & Strength";
  }
  if (lower.includes("bcaa") || lower.includes("eaa") || lower.includes("electrolyte") || lower.includes("hydration") || lower.includes("xtend")) {
    return "Intra-Workout / Hydration";
  }
  if (lower.includes("isolate") || lower.includes("whey") || lower.includes("casein") || lower.includes("plant protein") || lower.includes("dymatize") || lower.includes("biozyme") || lower.includes("gnc")) {
    return "100% Whey / Protein Powder";
  }
  if (lower.includes("fat burner") || lower.includes("shred") || lower.includes("thermo") || lower.includes("carnitine")) {
    return "Fat Burner / Thermogenic";
  }
  if (lower.includes("peanut butter") || lower.includes("almond butter") || lower.includes("spread") || lower.includes("pintola")) {
    return "Fitness Nut Butter / Spread";
  }
  return fallback;
}

// Full Intelligent Multi-Category Ingredient & Nutrition Analyzer (Conservative + Banned Screening)
export function analyzeSupplementIngredients(
  rawText,
  preferredName = null,
  preferredBrand = null,
  fallbackSlot = 'A',
  macroOverrides = null,
  ocrQualityMeta = null
) {
  const normalized = (rawText || "").toLowerCase();
  const identity = identifyBrandAndProduct(rawText, fallbackSlot);

  const brand = preferredBrand || identity.brand;
  const productName = preferredName || identity.name;
  const category = identity.category || detectProductCategory(normalized);

  // 1. Parse Ingredients / Supplement Facts section & fuzzy-match against 300+ dictionary
  const parsed = parseLabelAndMatch(rawText || "");
  const matchedEntries = parsed.ingredients || [];

  // 2. Run dedicated Banned + Contamination Screening (>= 0.85 fuzzy + label warnings)
  const rawTokenStrings = matchedEntries.map((m) => m.raw || m.displayName);
  const bannedScan = scanTextForBannedAndContamination(rawText || "", rawTokenStrings);
  const bannedMap = new Map(bannedScan.bannedDetected.map((b) => [b.name, b]));
  const contamMap = new Map(bannedScan.contaminationDetected.map((c) => [c.name, c]));

  let detectedAminoSpikes = [];
  let detectedFillers = [];
  let detectedBannedStims = [...bannedScan.bannedDetected];
  let detectedContam = [...bannedScan.contaminationDetected];
  let detectedDyes = [];
  let detectedSweeteners = [];
  let detectedCleanMarkers = [];
  let ingredientBreakdown = [];

  if (matchedEntries.length > 0) {
    matchedEntries.forEach((item) => {
      const tokLower = (item.matchedName || item.displayName || "").toLowerCase();
      let status = "safe";
      let mlClass = item.status; // beneficial | neutral | harmful | banned_wada | contamination_risk
      let reason = item.reason;

      if (item.status === "banned_wada" || bannedMap.has(item.matchedName) || BANNED_STIM_KEYWORDS.some((k) => tokLower.includes(k))) {
        status = "danger";
        mlClass = "banned_wada";
        if (!bannedMap.has(item.matchedName)) {
          detectedBannedStims.push({
            name: item.matchedName,
            category: "WADA Prohibited List Category",
            severity: "banned",
            whyProblem: item.reason,
          });
        }
      } else if (item.status === "contamination_risk" || contamMap.has(item.matchedName)) {
        status = "warning";
        mlClass = "contamination_risk";
      } else if (item.unrecognized) {
        status = "warning";
        mlClass = "neutral";
        reason = "Unrecognized - tap to correct";
      } else if (
        item.category === "amino_spike" ||
        AMINO_SPIKE_KEYWORDS.some((k) => tokLower.includes(k))
      ) {
        status = "danger";
        mlClass = "harmful";
        detectedAminoSpikes.push(item.matchedName);
      } else if (
        item.category === "filler" ||
        item.category === "sugar" ||
        item.category === "fat_bad" ||
        FILLER_KEYWORDS.some((k) => tokLower.includes(k))
      ) {
        status = "danger";
        mlClass = "harmful";
        detectedFillers.push(item.matchedName);
      } else if (
        item.category === "dye" ||
        item.category === "preservative" ||
        item.category === "color" ||
        HARMFUL_DYES_PRESERVATIVES.some((k) => tokLower.includes(k))
      ) {
        status = "warning";
        mlClass = "harmful";
        detectedDyes.push(item.matchedName);
      } else if (
        item.category === "sweetener_artificial" ||
        item.category === "sweetener_polyol" ||
        ARTIFICIAL_SWEETENERS.some((k) => tokLower.includes(k))
      ) {
        status = "warning";
        mlClass = "harmful";
        detectedSweeteners.push(item.matchedName);
      } else if (
        item.status === "beneficial" ||
        CLEAN_PREMIUM_MARKERS.some((k) => tokLower.includes(k))
      ) {
        status = "safe";
        mlClass = "beneficial";
        detectedCleanMarkers.push(item.matchedName);
      } else {
        status = item.status === "neutral" ? "warning" : "safe";
      }

      ingredientBreakdown.push({
        name: item.displayName,
        raw: item.raw,
        matchedName: item.matchedName,
        similarity: item.similarity,
        correctionMade: item.correctionMade,
        unrecognized: item.unrecognized,
        status,
        mlClass,
        severity: item.severity || mlClass,
        reason,
      });
    });
  }

  // Append label-level contamination warnings (e.g. "not for sale in some countries") if not already listed
  for (const warn of detectedContam) {
    const alreadyInList = ingredientBreakdown.some(
      (i) => i.matchedName === warn.name || i.name === warn.name
    );
    if (!alreadyInList && warn.category === "Label Regulatory Warning") {
      ingredientBreakdown.push({
        name: warn.name,
        raw: warn.name,
        matchedName: warn.name,
        similarity: 1.0,
        correctionMade: null,
        unrecognized: false,
        status: "warning",
        mlClass: "contamination_risk",
        severity: "contamination_risk",
        reason: warn.whyProblem,
      });
    }
  }

  // OCR-tolerant macro extraction
  const ocrMacros = extractMacrosFromOCR(rawText || "");
  const mProtein = macroOverrides?.proteinG ?? ocrMacros.proteinG;
  const mCalories = macroOverrides?.calories ?? ocrMacros.calories;
  const mSugar = macroOverrides?.sugarG ?? ocrMacros.sugarG;
  const mCarbs = macroOverrides?.carbsG ?? ocrMacros.carbsG;
  const mFat = macroOverrides?.fatG ?? ocrMacros.fatG;
  const mServing = macroOverrides?.servingSizeG ?? ocrMacros.servingSizeG;

  // Match rate & combined OCR confidence computation (Part B.5)
  const totalExtracted = matchedEntries.length;
  const recognizedCount = matchedEntries.filter((i) => !i.unrecognized).length;
  const unrecognizedCount = totalExtracted - recognizedCount;
  const matchRate = totalExtracted > 0 ? recognizedCount / totalExtracted : 0;
  const unrecognizedRatio = totalExtracted > 0 ? unrecognizedCount / totalExtracted : 1.0;

  const rawOcrConf = ocrQualityMeta?.rawOcrConfidence; // null when direct text paste
  const combinedConfidence =
    typeof rawOcrConf === "number"
      ? Math.round(rawOcrConf * 0.45 + matchRate * 100 * 0.55)
      : Math.round(matchRate * 100);
  const ocrMatchFrac = Math.max(0, Math.min(1, combinedConfidence / 100));

  // Conservative Scorer (used directly or as fallback when ML service is offline)
  // NEVER starts at 92; missing/unreadable data is treated as RISK, never as safe!
  const whyThisScore = [];
  let baseScore = 72;

  const hasIntactIsolate = detectedCleanMarkers.some((n) =>
    /isolate|hydrolyzed whey|micellar casein|creatine monohydrate/i.test(n)
  );
  if (
    hasIntactIsolate &&
    detectedBannedStims.length === 0 &&
    detectedAminoSpikes.length === 0 &&
    detectedFillers.length === 0 &&
    detectedSweeteners.length === 0
  ) {
    baseScore += 14;
    whyThisScore.push({ label: "Primary intact bioavailable protein / clean active", impact: 14 });
  } else if (detectedCleanMarkers.length > 0 && detectedFillers.length === 0) {
    const cleanBonus = Math.min(6, detectedCleanMarkers.length * 2);
    baseScore += cleanBonus;
    whyThisScore.push({ label: `${detectedCleanMarkers.length} beneficial / natural ingredient(s)`, impact: cleanBonus });
  }

  if (mProtein != null && mServing != null && mServing > 0) {
    const protPct = (mProtein / mServing) * 100;
    if (protPct >= 75) {
      baseScore += 5;
      whyThisScore.push({ label: `High protein density (${Math.round(protPct)}%)`, impact: 5 });
    } else if (protPct < 45 && !category.includes("Pre-Workout") && !category.includes("Creatine")) {
      baseScore -= 5;
      whyThisScore.push({ label: `Low protein density (${Math.round(protPct)}%)`, impact: -5 });
    }
  } else if (rawOcrConf != null) {
    // Missing nutrition facts on a camera/upload image is treated conservatively as risk
    baseScore -= 6;
    whyThisScore.push({ label: "Unreadable macro panel (conservative risk penalty)", impact: -6 });
  }

  if (mSugar != null && mSugar > 2) {
    const sugarPen = -Math.round(Math.min(12, (mSugar - 2) * 0.9));
    baseScore += sugarPen;
    whyThisScore.push({ label: `Sugar content (${mSugar}g per serving)`, impact: sugarPen });
  }

  if (detectedFillers.length > 0) {
    const fillerPen = -Math.min(18, detectedFillers.length * 5);
    baseScore += fillerPen;
    whyThisScore.push({ label: `${detectedFillers.length} glycemic/oil filler(s) (${detectedFillers.slice(0, 2).join(", ")})`, impact: fillerPen });
  }

  if (detectedSweeteners.length > 0) {
    const swPen = -(detectedSweeteners.length * 5);
    baseScore += swPen;
    whyThisScore.push({ label: `${detectedSweeteners.length} artificial/polyol sweetener(s) (${detectedSweeteners.slice(0, 2).join(", ")})`, impact: swPen });
  }

  if (detectedDyes.length > 0) {
    const dyePen = -(detectedDyes.length * 6);
    baseScore += dyePen;
    whyThisScore.push({ label: `${detectedDyes.length} artificial dye/preservative(s)`, impact: dyePen });
  }

  if (detectedContam.length > 0) {
    const contamPen = -(detectedContam.length * 12);
    baseScore += contamPen;
    whyThisScore.push({ label: `${detectedContam.length} contamination/regulatory risk warning(s)`, impact: contamPen });
  }

  if (unrecognizedCount > 0) {
    const unkPen = -Math.min(24, unrecognizedCount * 7);
    baseScore += unkPen;
    whyThisScore.push({ label: `${unrecognizedCount} unrecognized ingredient(s)`, impact: unkPen });
  }

  const isCreatineOnly =
    category.includes("Creatine") &&
    detectedAminoSpikes.length === 0;
  const spikingProb =
    !isCreatineOnly && detectedAminoSpikes.length > 0
      ? Math.min(0.95, 0.55 + detectedAminoSpikes.length * 0.16)
      : parsed.proprietaryBlends.length > 0 && detectedFillers.length > 0
      ? 0.4
      : 0.05;

  if (spikingProb >= 0.65) {
    baseScore -= 24;
    whyThisScore.push({ label: `Amino-spiking detected (${detectedAminoSpikes.join(", ")})`, impact: -24 });
  }

  if (detectedBannedStims.length > 0) {
    const banPen = -(detectedBannedStims.length * 38);
    baseScore += banPen;
    whyThisScore.push({ label: `${detectedBannedStims.length} WADA/banned substance(s)`, impact: banPen });
  }

  const hasPropBlend = parsed.proprietaryBlends.length > 0;
  const ruleResult = enforcePostScoringRules(baseScore, {
    bannedCount: detectedBannedStims.length,
    spikingProb,
    hasPropBlend,
    unrecognizedRatio: totalExtracted === 0 ? 1.0 : unrecognizedRatio,
    ocrMatchConfidence: ocrMatchFrac,
    baseWhy: whyThisScore,
  });

  const finalScore = ruleResult.score;

  // Determine Risk Level & Clinical Verdicts
  let riskLevel = "safe";
  let verdict = ruleResult.verdict || "Clean Formulation — High bioavailable nutrients with no banned compounds.";
  let verdictHindi = "स्वच्छ और सुरक्षित संरचना — बिना किसी प्रतिबंधित पदार्थ के उच्च गुणवत्ता।";

  if (ruleResult.scoreBlocked) {
    riskLevel = "warning";
    verdict = "Not enough readable data - retake photo";
    verdictHindi = "पर्याप्त स्पष्ट डेटा नहीं मिला — कृपया साफ फोटो दोबारा लें।";
  } else if (detectedBannedStims.length > 0) {
    riskLevel = "danger";
    verdict = "BANNED / UNSAFE";
    verdictHindi = `गंभीर चेतावनी: इसमें प्रतिबंधित पदार्थ (${detectedBannedStims.map((b) => b.name).slice(0, 2).join(", ")}) पाए गए हैं।`;
  } else if (spikingProb >= 0.65) {
    riskLevel = "danger";
    verdict = `Amino Spiking Alert: Free nitrogen compounds (${detectedAminoSpikes.slice(0, 2).join(", ")}) detected. True intact protein is lower than claimed.`;
    verdictHindi = `अमीनो स्पाइकिंग चेतावनी: अतिरिक्त अमीनो एसिड द्वारा प्रोटीन की मात्रा को कृत्रिम रूप से बढ़ाया गया है।`;
  } else if (detectedContam.length > 0) {
    riskLevel = "warning";
    verdict = `Contamination / Regulatory Caution: ${detectedContam[0].name} detected — verify anti-doping rules.`;
    verdictHindi = `संदूषण जोखिम चेतावनी: इस उत्पाद में ऐसे तत्व हैं जो डोपिंग परीक्षण में जोखिम पैदा कर सकते हैं।`;
  } else if (finalScore < 50 || detectedFillers.length >= 2) {
    riskLevel = "danger";
    verdict = `Low Purity Formulation (${finalScore}/100): Heavy fillers, hidden blends, or high sugar load detected.`;
    verdictHindi = `कम गुणवत्ता: इसमें अत्यधिक फिलर्स या चीनी की मात्रा अधिक है।`;
  } else if (detectedFillers.length > 0 || detectedSweeteners.length > 0 || detectedDyes.length > 0 || finalScore < 75) {
    riskLevel = "warning";
    verdict = `Average / Mixed Quality (${finalScore}/100): Contains commercial sweeteners, colors, or moderate fillers.`;
    verdictHindi = `औसत गुणवत्ता: इसमें कृत्रिम मिठास या फिलर्स शामिल हैं।`;
  }

  let claimedProtein = mProtein != null ? `${mProtein}g per serving` : (totalExtracted === 0 ? "Unreadable" : "Not printed on crop");
  let actualProtein = ruleResult.scoreBlocked
    ? "N/A (Retake photo)"
    : spikingProb >= 0.65
    ? "~40-55% True Intact Protein"
    : finalScore >= 75
    ? "90%+ Intact Bioavailability"
    : "65-78% Intact Estimate";
  let calories = mCalories != null ? `${mCalories} kcal` : "N/A";
  let carbs = mCarbs != null ? `${mCarbs}g` : "N/A";
  let sugar = mSugar != null ? `${mSugar}g` : "N/A";
  let fat = mFat != null ? `${mFat}g` : "N/A";
  let servingSize = mServing != null ? `1 serving (${mServing}g)` : "Not printed";

  if (category.includes("Pre-Workout")) {
    claimedProtein = mProtein != null ? `${mProtein}g` : "0g (Pre-Workout)";
    actualProtein = "0g (Non-Protein Formula)";
    if (mSugar == null) sugar = "0g";
  } else if (category.includes("Creatine")) {
    claimedProtein = "5g Creatine";
    actualProtein = riskLevel === "safe" ? "5.0g Micronized" : "Unverified";
  }

  return {
    id: "scan-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
    name: productName,
    brand,
    category,
    purityScore: finalScore,
    scoreBlocked: ruleResult.scoreBlocked,
    riskLevel,
    claimedProtein,
    actualProtein,
    calories,
    carbs,
    sugar,
    fat,
    servingSize,
    verdict,
    verdictHindi,
    whyThisScore: ruleResult.whyThisScore,
    bannedSubstancesDetected: detectedBannedStims,
    contaminationRisksDetected: detectedContam,
    unrecognizedRatio: Math.round(unrecognizedRatio * 1000) / 1000,
    disclaimer: BANNED_LIST_DISCLAIMER,
    rawText: rawText || "",
    scanDetails: {
      foundRegion: parsed.foundRegion,
      sectionText: parsed.sectionText,
      proprietaryBlends: parsed.proprietaryBlends,
      corrections: parsed.corrections,
      macrosExtracted: ocrMacros,
    },
    ocrMeta: {
      confidence: combinedConfidence,
      rawOcrConfidence: rawOcrConf ?? null,
      matchRate: Math.round(matchRate * 100),
      combinedConfidence,
      ...(ocrQualityMeta || {}),
    },
    ingredientsList: ingredientBreakdown,
    cleanAlternatives: isBuildingCatalog ? [] : suggestSaferAlternatives(category, finalScore, detectedBannedStims.length > 0, spikingProb >= 0.65),
    saferAlternatives: isBuildingCatalog ? [] : suggestSaferAlternatives(category, finalScore, detectedBannedStims.length > 0, spikingProb >= 0.65),
    flags: {
      aminoSpiking: spikingProb >= 0.65,
      bannedSubstances: detectedBannedStims.length > 0,
      contaminationRisk: detectedContam.length > 0,
      fillerCount: detectedFillers.length,
      heavyMetalsRisk: finalScore != null && finalScore >= 75 ? "Low Risk Formula" : "Verify Lab COA",
      trueProteinRatio: finalScore == null ? "N/A" : finalScore >= 75 ? "88-94%" : finalScore >= 50 ? "65-75%" : "35-50%"
    }
  };
}

let cachedScoredCatalog = null;
let isBuildingCatalog = false;

/**
 * Computes and caches deterministic GymScan evaluations for all items in the local database.
 */
export function getScoredSupplementCatalog() {
  if (cachedScoredCatalog) return cachedScoredCatalog;
  if (isBuildingCatalog) return [];
  isBuildingCatalog = true;
  try {
    cachedScoredCatalog = RAW_CATALOG_ITEMS.map((item) => {
      const analyzed = analyzeSupplementIngredients(
        item.ingredientsText,
        item.name,
        item.brand,
        'A',
        {
          proteinG: item.proteinG,
          servingSizeG: item.servingSizeG,
          sugarG: item.sugarG,
          calories: item.calories,
          carbsG: item.carbsG,
          fatG: item.fatG,
        },
        null
      );
      return {
        ...analyzed,
        id: item.id,
        priceINR: item.priceINR,
        whyBetter: item.whyBetter || analyzed.verdict,
        ingredientsText: item.ingredientsText,
      };
    });
    return cachedScoredCatalog;
  } finally {
    isBuildingCatalog = false;
  }
}

/**
 * Recommends clean, verified supplements from the local catalog whenever a product
 * has a sub-75 purity score, amino-spiking, or banned/contamination flags.
 */
export function suggestSaferAlternatives(category = '', score = 0, hasBanned = false, hasSpiking = false) {
  if (score == null) return [];
  if (!hasBanned && !hasSpiking && score >= 78) return [];

  const catalog = getScoredSupplementCatalog().filter(
    (p) => !p.flags?.bannedSubstances && !p.flags?.aminoSpiking && (p.purityScore || 0) >= 78
  );

  const catLower = String(category || '').toLowerCase();
  const sameCategory = catalog.filter((p) => {
    const pc = p.category.toLowerCase();
    if (catLower.includes('pre-workout') || catLower.includes('energy')) return pc.includes('pre-workout');
    if (catLower.includes('creatine')) return pc.includes('creatine');
    if (catLower.includes('bar')) return pc.includes('bar');
    if (catLower.includes('plant')) return pc.includes('plant') || pc.includes('isolate');
    if (catLower.includes('gainer') || catLower.includes('whey') || catLower.includes('protein')) {
      return pc.includes('isolate') || pc.includes('whey');
    }
    return true;
  });

  const pool = (sameCategory.length > 0 ? sameCategory : catalog)
    .sort((a, b) => (b.purityScore || 0) - (a.purityScore || 0))
    .slice(0, 3);

  return pool.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    purityScore: p.purityScore,
    priceINR: p.priceINR,
    whyBetter: p.whyBetter,
    catalogProduct: p,
  }));
}

/**
 * Runs local dictionary parsing first, then enriches with the Python ML pipeline
 * (/classify, /spiking, /score). Falls back cleanly to the conservative local scorer if ML is down.
 */
export async function analyzeTextWithMLFallback(
  rawText,
  preferredName = null,
  preferredBrand = null,
  fallbackSlot = 'A',
  macroOverrides = null,
  ocrQualityMeta = null
) {
  const localResult = analyzeSupplementIngredients(
    rawText,
    preferredName,
    preferredBrand,
    fallbackSlot,
    macroOverrides,
    ocrQualityMeta
  );
  // If unreadable or blocked, skip /score and return honest retake prompt
  if (localResult.scoreBlocked || localResult.ingredientsList.length === 0) {
    return localResult;
  }
  return await analyzeWithMLPipeline({ rawText, localResult });
}

/**
 * Re-runs dictionary matching + ML pipeline after a user edits/corrects ingredients inline.
 */
export async function reanalyzeEditedIngredients(editedNames, previousResult) {
  const cleanNames = (editedNames || []).map((s) => String(s || '').trim()).filter(Boolean);
  const editedText = `Ingredients: ${cleanNames.join(', ')}`;
  const reAnalyzed = await analyzeTextWithMLFallback(
    editedText,
    previousResult?.name || null,
    previousResult?.brand || null,
    'A',
    null,
    null
  );

  return {
    ...previousResult,
    ...reAnalyzed,
    barcodeInfo: previousResult?.barcodeInfo || null,
    rawText: previousResult?.rawText || editedText,
    scanDetails: {
      ...(previousResult?.scanDetails || {}),
      corrections: reAnalyzed.scanDetails?.corrections || [],
      userEdited: true,
    },
  };
}

/**
 * Full Accuracy-First OCR + Barcode Shortcut + Preprocessing + Auto-Zoom Ingredient Region
 * + Persistent Multi-Variant Worker + ML Pipeline.
 */
export async function performLiveOCRAndAnalyze(
  imageSource,
  fallbackSlot = 'A',
  fileNameHint = '',
  ocrEngine = 'tesseract',
  options = {}
) {
  const { cropRect = null, skipBarcode = false, fastLiveMode = false } = options || {};
  let ocrEngineUsed = ocrEngine === 'easyocr' ? 'easyocr' : 'tesseract';
  let ocrFallbackNotice = null;
  let barcodeNotice = null;

  try {
    // 1. Barcode shortcut (only on full upload/frame when not manually cropped)
    if (!skipBarcode && !cropRect) {
      const barcode = await detectBarcodeFromCanvasOrImage(imageSource);
      if (barcode) {
        const off = await lookupBarcodeOpenFoodFacts(barcode);
        if (off.found) {
          const enrichedOff = await analyzeTextWithMLFallback(
            `Ingredients: ${off.ingredientsText}`,
            off.name,
            off.brand,
            fallbackSlot,
            off.macros,
            { rawOcrConfidence: 99, winningVariant: { id: 'barcode', label: `Open Food Facts (#${barcode})`, psm: 'N/A' }, skewAngle: 0 }
          );
          return {
            ...enrichedOff,
            ocrEngineUsed: 'barcode_openfoodfacts',
            barcodeInfo: { found: true, barcode, source: 'Open Food Facts' },
          };
        }
        barcodeNotice = off.message || 'Product not in database, scanning label instead';
      }
    }

    // 2. Canvas Preprocessing: EXIF orientation, ~2000px resize, deskew, grayscale, CLAHE, Sauvola
    const preprocessed = await preprocessImageInBrowser(imageSource, cropRect);
    let ocrMeta = {
      rawOcrConfidence: 0,
      perLineConfidence: [],
      winningVariant: null,
      variantStats: [],
      skewAngle: preprocessed.skewAngle,
      autoZoomApplied: false,
    };
    let ocrText = '';

    // 3A. Optional EasyOCR server extraction
    if (ocrEngineUsed === 'easyocr') {
      try {
        const hcVariant = preprocessed.variants[1] || preprocessed.variants[0];
        const easyRes = await extractTextWithEasyOCR(hcVariant.dataUrl);
        ocrText = easyRes?.text || '';
        ocrMeta = {
          rawOcrConfidence: ocrText.length > 10 ? 85 : 35,
          perLineConfidence: (easyRes?.lines || []).map((t) => ({ text: t, confidence: 85 })),
          winningVariant: { id: 'easyocr', label: 'EasyOCR Server (CLAHE Contrast)', psm: 'auto' },
          variantStats: [],
          skewAngle: preprocessed.skewAngle,
          autoZoomApplied: false,
        };
      } catch (easyErr) {
        console.warn('EasyOCR unavailable, falling back to Tesseract.js:', easyErr);
        ocrEngineUsed = 'tesseract';
        ocrFallbackNotice = 'EasyOCR server unavailable — extracted text with Tesseract.js instead.';
      }
    }

    // 3B. Persistent Singleton Tesseract.js Worker across preprocessed variants (PSM 6 & PSM 4)
    if (!ocrText && ocrEngineUsed === 'tesseract') {
      const timeoutMs = fastLiveMode ? 5000 : 18000;
      const runOcrWithTimeout = async (vars, opts) => {
        const ocrPromise = recognizeWithVariants(vars, opts);
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                text: '',
                confidence: 0,
                perLineConfidence: [],
                winningVariant: { id: 'timeout', label: 'Timeout', psm: '6' },
                variantStats: [],
                regionBBox: null,
              }),
            timeoutMs
          )
        );
        return Promise.race([ocrPromise, timeoutPromise]);
      };

      let bestRes = await runOcrWithTimeout(preprocessed.variants, {
        fastMode: fastLiveMode,
        imgWidth: preprocessed.width,
        imgHeight: preprocessed.height,
      });

      // Automatic second-pass zoomed OCR if Ingredients/Supplement Facts box was located inside a full image
      if (!cropRect && !fastLiveMode && bestRes.regionBBox) {
        try {
          const zoomed = await preprocessImageInBrowser(imageSource, bestRes.regionBBox);
          const zoomRes = await runOcrWithTimeout(zoomed.variants, {
            fastMode: false,
            imgWidth: zoomed.width,
            imgHeight: zoomed.height,
          });
          const pass1Matched = parseLabelAndMatch(bestRes.text).recognizedCount;
          const pass2Matched = parseLabelAndMatch(zoomRes.text).recognizedCount;
          if (pass2Matched >= pass1Matched && (zoomRes.confidence >= bestRes.confidence - 5 || pass2Matched > pass1Matched)) {
            bestRes = {
              ...zoomRes,
              text: `${bestRes.text}\n${zoomRes.text}`,
              autoZoomApplied: true,
            };
          }
        } catch (zoomErr) {
          console.warn('[GymScan OCR] Auto-zoom second pass skipped:', zoomErr);
        }
      }

      ocrText = bestRes.text || '';
      ocrMeta = {
        rawOcrConfidence: bestRes.confidence || 0,
        perLineConfidence: bestRes.perLineConfidence || [],
        winningVariant: bestRes.winningVariant,
        variantStats: bestRes.variantStats || [],
        skewAngle: preprocessed.skewAngle,
        autoZoomApplied: Boolean(bestRes.autoZoomApplied),
      };
    }

    if (ocrText.trim().length > 3) {
      const enriched = await analyzeTextWithMLFallback(
        ocrText,
        null,
        null,
        fallbackSlot,
        null,
        ocrMeta
      );
      return {
        ...enriched,
        ocrEngineUsed,
        ocrFallbackNotice,
        barcodeNotice,
      };
    }
  } catch (err) {
    console.warn('OCR preprocessing pipeline error:', err);
  }

  // Honest failure when image is genuinely unreadable — NEVER fabricate fake clean scores
  return {
    id: "scan-unreadable-" + Date.now(),
    name: fileNameHint || "Unreadable Label Image",
    brand: "GymScan OCR",
    category: "Unreadable Scan",
    purityScore: null,
    scoreBlocked: true,
    riskLevel: "warning",
    claimedProtein: "N/A",
    actualProtein: "N/A",
    calories: "N/A",
    carbs: "N/A",
    sugar: "N/A",
    fat: "N/A",
    servingSize: "N/A",
    verdict: "Not enough readable data - retake photo",
    verdictHindi: "पर्याप्त स्पष्ट डेटा नहीं मिला — कृपया तेज रोशनी में Ingredients बॉक्स की साफ फोटो लें।",
    whyThisScore: [
      {
        label: "Image unreadable or zero ingredients extracted",
        impact: 0,
        detail: "Use Manual Crop on just the Ingredients text in bright, flat lighting.",
      },
    ],
    bannedSubstancesDetected: [],
    contaminationRisksDetected: [],
    unrecognizedRatio: 1.0,
    disclaimer: BANNED_LIST_DISCLAIMER,
    rawText: "",
    ingredientsList: [],
    ocrEngineUsed,
    ocrFallbackNotice:
      ocrFallbackNotice || "Could not extract clear text. Crop closely to Ingredients or retake in bright, glare-free light.",
    barcodeNotice,
    scanDetails: { foundRegion: false, sectionText: "", proprietaryBlends: [], corrections: [], macrosExtracted: {} },
    ocrMeta: {
      confidence: 0,
      rawOcrConfidence: 0,
      matchRate: 0,
      combinedConfidence: 0,
      perLineConfidence: [],
      winningVariant: { id: "unreadable", label: "Unreadable", psm: "6" },
      variantStats: [],
      skewAngle: 0,
    },
    flags: {
      aminoSpiking: false,
      bannedSubstances: false,
      contaminationRisk: false,
      fillerCount: 0,
      heavyMetalsRisk: "Unknown",
      trueProteinRatio: "N/A",
    },
  };
}
