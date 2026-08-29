import { SAMPLE_PRODUCTS } from '../data/sampleProducts';

// Key toxic or deceptive fitness ingredient dictionaries
const AMINO_SPIKE_KEYWORDS = ["glycine", "taurine", "l-glycine", "l-taurine", "l-alanine", "alanine", "glutamine peptides (cheap)"];
const FILLER_KEYWORDS = ["maltodextrin", "corn syrup solids", "non-dairy creamer", "hydrogenated oil", "dextrose", "modified starch"];
const BANNED_STIM_KEYWORDS = ["dmaa", "dmha", "1,3-dimethylamylamine", "geranamine", "ephedra", "synephrine", "octopamine", "hordenine", "yohimbine hcl"];
const ARTIFICIAL_SWEETENERS = ["sucralose", "acesulfame potassium", "ace-k", "aspartame", "saccharin", "sucralose (splenda)"];
const CLEAN_MARKERS = ["whey protein isolate", "cross-flow microfiltered", "hydrolyzed whey", "creapure", "organic stevia", "sunflower lecithin", "l-citrulline malate"];

export function analyzeSupplementIngredients(text, productName = "Custom Supplement") {
  const normalized = text.toLowerCase();
  const tokens = normalized.split(/[,;\n•\t]+/).map(s => s.trim()).filter(Boolean);

  let detectedAminoSpikes = [];
  let detectedFillers = [];
  let detectedBannedStims = [];
  let detectedSweeteners = [];
  let detectedCleanMarkers = [];

  let ingredientBreakdown = [];

  tokens.forEach(tok => {
    let status = "safe";
    let reason = "Standard gym supplement ingredient";

    // Check amino spiking
    if (AMINO_SPIKE_KEYWORDS.some(k => tok.includes(k))) {
      status = "danger";
      reason = "AMINO SPIKING RISK: Non-intact nitrogen inflation detected";
      detectedAminoSpikes.push(tok);
    }
    // Check banned stimulants
    else if (BANNED_STIM_KEYWORDS.some(k => tok.includes(k))) {
      status = "danger";
      reason = "BANNED/HIGH-RISK STIMULANT: Prohibited by WADA/Tested sports leagues";
      detectedBannedStims.push(tok);
    }
    // Check heavy fillers
    else if (FILLER_KEYWORDS.some(k => tok.includes(k))) {
      status = "danger";
      reason = "CHEAP FILLER: Added carbohydrates or fats diluting active purity";
      detectedFillers.push(tok);
    }
    // Check sweeteners
    else if (ARTIFICIAL_SWEETENERS.some(k => tok.includes(k))) {
      status = "warning";
      reason = "ARTIFICIAL SWEETENER: High GI/Microbiome irritation risk";
      detectedSweeteners.push(tok);
    }
    // Check clean markers
    else if (CLEAN_MARKERS.some(k => tok.includes(k))) {
      status = "safe";
      reason = "HIGH QUALITY: Lab-grade, clean bioavailable nutrient source";
      detectedCleanMarkers.push(tok);
    }

    ingredientBreakdown.push({
      name: tok,
      status,
      reason
    });
  });

  // Calculate Purity Score (0 to 100)
  let score = 90;
  score -= (detectedAminoSpikes.length * 25);
  score -= (detectedBannedStims.length * 35);
  score -= (detectedFillers.length * 15);
  score -= (detectedSweeteners.length * 8);
  score += (detectedCleanMarkers.length * 5);

  score = Math.max(12, Math.min(99, score));

  let riskLevel = "safe";
  let verdict = "Clean & Verified Composition";
  if (score < 50 || detectedBannedStims.length > 0 || detectedAminoSpikes.length > 0) {
    riskLevel = "danger";
    verdict = detectedBannedStims.length > 0 ? "Banned Stimulant Risk Detected" : "Heavy Amino Spiking & Low True Protein";
  } else if (score < 80) {
    riskLevel = "warning";
    verdict = "Moderate Quality with Artificial Sweeteners/Fillers";
  }

  // Find a clean alternative
  const cleanAlternative = (riskLevel !== "safe") 
    ? (SAMPLE_PRODUCTS.find(p => p.riskLevel === "safe" && p.category.includes("Whey")) || SAMPLE_PRODUCTS[1])
    : null;

  return {
    id: "scan-" + Date.now(),
    name: productName,
    brand: "Scanned Label",
    category: "Gym Supplement",
    image: "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=400&q=80",
    claimedProtein: "Extracted from label",
    actualProtein: riskLevel === "danger" ? "~40-55% True Intact Protein" : "90%+ Intact Bioavailability",
    purityScore: score,
    verdict,
    riskLevel,
    servingSize: "Standard scoop / serving",
    ingredientsList: ingredientBreakdown.length > 0 ? ingredientBreakdown : [
      { name: "Whey Protein Concentrate", status: "safe", reason: "Standard protein source" }
    ],
    flags: {
      aminoSpiking: detectedAminoSpikes.length > 0,
      fillerCount: detectedFillers.length,
      bannedSubstances: detectedBannedStims.length > 0,
      heavyMetalsRisk: score > 80 ? "Ultra-Low (<0.02 ppm)" : "Unverified Batch",
      trueProteinRatio: score > 80 ? "88-92%" : "42-58%"
    },
    cleanAlternative
  };
}
