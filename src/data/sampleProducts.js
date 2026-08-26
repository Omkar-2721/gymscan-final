export const SAMPLE_PRODUCTS = [
  {
    id: "spiked-budget-whey",
    name: "MegaMass 100% Anabolic Whey",
    brand: "BudgetGainz Lab",
    category: "Whey Protein",
    image: "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=400&q=80",
    claimedProtein: "27g / 34g scoop (79%)",
    actualProtein: "14.2g / 34g scoop (41.7%)",
    purityScore: 32,
    verdict: "Heavy Amino Spiking & Cheap Fillers",
    riskLevel: "danger", // 'danger' | 'warning' | 'safe'
    servingSize: "34g scoop",
    ingredientsList: [
      { name: "Whey Protein Concentrate (Sub-par 35% WPC)", status: "caution", reason: "Low grade WPC high in lactose and ash" },
      { name: "Maltodextrin (10g per scoop)", status: "danger", reason: "Cheap corn starch sugar filler to inflate weight & texture" },
      { name: "L-Glycine (Added 5.8g)", status: "danger", reason: "AMINO SPIKING: Non-protein nitrogen added to fool Kjeldahl test" },
      { name: "L-Taurine (Added 3.2g)", status: "danger", reason: "Cheap non-essential amino acid used as fake protein weight" },
      { name: "Artificial Flavor & Sucralose (Excessive)", status: "warning", reason: "Heavy artificial sweetener masking filler taste; potential gut microbiome irritation" },
      { name: "Silicon Dioxide & Red #40", status: "warning", reason: "Synthetic anti-caking agent and artificial petroleum-derived dye" }
    ],
    flags: {
      aminoSpiking: true,
      fillerCount: 3,
      bannedSubstances: false,
      heavyMetalsRisk: "Moderate",
      trueProteinRatio: "41.7%"
    },
    cleanAlternative: {
      name: "Apex Pure Microfiltered Whey Isolate",
      brand: "Apex Nutrition",
      purityScore: 96,
      whyBetter: "100% Cross-flow microfiltered isolate, 0g added filler aminos, zero maltodextrin, third-party lab batch tested."
    }
  },
  {
    id: "clean-isolate",
    name: "Apex Pure Microfiltered Whey Isolate",
    brand: "Apex Nutrition",
    category: "Whey Isolate",
    image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=400&q=80",
    claimedProtein: "27g / 30g scoop (90%)",
    actualProtein: "27.2g / 30g scoop (90.6%)",
    purityScore: 96,
    verdict: "Lab-Grade Purity & Clean Certification",
    riskLevel: "safe",
    servingSize: "30g scoop",
    ingredientsList: [
      { name: "Cross-Flow Microfiltered Whey Protein Isolate", status: "safe", reason: "Premium cold-processed, non-denatured intact protein with 5.8g natural BCAAs" },
      { name: "Organic Dutch Cocoa Powder", status: "safe", reason: "Natural rich flavor and natural antioxidant polyphenols" },
      { name: "Sunflower Lecithin (0.5%)", status: "safe", reason: "Non-GMO natural emulsifier for instant smooth mixability" },
      { name: "Organic Stevia Leaf Extract", status: "safe", reason: "Zero-glycemic natural sweetener without artificial chemical aftertaste" }
    ],
    flags: {
      aminoSpiking: false,
      fillerCount: 0,
      bannedSubstances: false,
      heavyMetalsRisk: "None Detected (<0.01 ppm)",
      trueProteinRatio: "90.6%"
    },
    cleanAlternative: null
  },
  {
    id: "toxic-preworkout",
    name: "Nuclear Rage XXXtreme Pre-Workout",
    brand: "DarkZone Pharma",
    category: "Pre-Workout",
    image: "https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=400&q=80",
    claimedProtein: "0g (Stimulant Matrix: 9.8g)",
    actualProtein: "N/A",
    purityScore: 24,
    verdict: "High-Risk Banned Stimulants & Overdosed Caffeine",
    riskLevel: "danger",
    servingSize: "12g scoop",
    ingredientsList: [
      { name: "Proprietary Rage Matrix (Hidden dosages)", status: "danger", reason: "Deceptive blend hiding exact constituent amounts" },
      { name: "1,3-Dimethylamylamine (DMAA Analogue / Geranamine)", status: "danger", reason: "PROHIBITED BY WADA & FDA: Severe cardiovascular spike risk and banned in tested sports" },
      { name: "Anhydrous Synthetic Caffeine (450mg)", status: "danger", reason: "Extremely high single dose exceeding safe 200mg acute threshold" },
      { name: "Synephrine HCl (Bitter Orange)", status: "warning", reason: "Synergistic stimulant that multiplies caffeine cardiovascular load" },
      { name: "Artificial Blue #1 & Acesulfame Potassium", status: "warning", reason: "Synthetic food dye and heavy chemical sweetener" }
    ],
    flags: {
      aminoSpiking: false,
      fillerCount: 2,
      bannedSubstances: true,
      heavyMetalsRisk: "Unverified",
      trueProteinRatio: "N/A"
    },
    cleanAlternative: {
      name: "CleanDrive Nitric Endurance",
      brand: "TrueForm Sports",
      purityScore: 94,
      whyBetter: "Full label transparency: 8g L-Citrulline, 3.2g Beta-Alanine, 180mg organic matcha caffeine, zero banned alkaloids."
    }
  },
  {
    id: "clean-creatine",
    name: "Creapure 100% Micronized German Creatine",
    brand: "PureSource Lab",
    category: "Creatine",
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80",
    claimedProtein: "5g Pure Creatine per scoop",
    actualProtein: "5.0g (99.9% Creapure)",
    purityScore: 99,
    verdict: "Gold Standard Single-Ingredient Purity",
    riskLevel: "safe",
    servingSize: "5g scoop",
    ingredientsList: [
      { name: "100% Creapure® Micronized Creatine Monohydrate (Mesh 200)", status: "safe", reason: "Gold-standard German manufacturing with zero dicyandiamide or dihydrotriazine contaminants" }
    ],
    flags: {
      aminoSpiking: false,
      fillerCount: 0,
      bannedSubstances: false,
      heavyMetalsRisk: "Zero (Batch Lab Certified)",
      trueProteinRatio: "100% Active"
    },
    cleanAlternative: null
  }
];
