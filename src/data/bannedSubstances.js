/**
 * Prohibited (WADA-category) & Athletic Contamination-Risk Substances Database.
 *
 * DISCLAIMER: This list is INFORMATIONAL ONLY and is modeled on public WADA
 * Prohibited List categories (S1 Anabolic Agents, S2 Peptide Hormones, S3 Beta-2 Agonists,
 * S4 Hormone & Metabolic Modulators, S5 Diuretics, S6 Stimulants) plus known dietary
 * supplement adulterants & contamination warnings. Always verify ingredients against
 * the official current WADA Prohibited List and your sport's anti-doping body.
 */

export const BANNED_LIST_DISCLAIMER =
  "Informational only, not medical or legal advice. Check the official WADA list and your sport's anti-doping body.";

export const BANNED_SUBSTANCES = [
  // --- S6 PROHIBITED STIMULANTS ---
  {
    name: 'DMAA (1,3-Dimethylamylamine)',
    synonyms: [
      'dmaa',
      '1,3-dimethylamylamine',
      '1 3 dimethylamylamine',
      'methylhexanamine',
      'methylhexaneamine',
      'geranamine',
      'geranium extract',
      'geranium stem extract',
      'geranium oil',
      'pelargonium graveolens',
      'forthan',
      'floradrene',
    ],
    category: 'WADA S6 Prohibited Stimulant',
    severity: 'banned',
    whyProblem:
      'Unsafe synthetic sympathomimetic amphetamine-like stimulant banned in tested sports and linked to severe hypertension, stroke, and cardiac events.',
  },
  {
    name: 'DMBA (AMP Citrate)',
    synonyms: [
      'dmba',
      '1,3-dimethylbutylamine',
      '1 3 dimethylbutylamine',
      'amp citrate',
      '4-amino-2-methylpentane citrate',
      'pouchong tea extract',
    ],
    category: 'WADA S6 Prohibited Stimulant',
    severity: 'banned',
    whyProblem:
      'Unapproved DMAA analogue prohibited in competitive sport due to cardiovascular toxicity and absence of human safety data.',
  },
  {
    name: 'DMHA (Octodrine)',
    synonyms: [
      'dmha',
      'octodrine',
      '2-amino-6-methylheptane',
      '2-aminoisoheptane',
      '2 aminoisoheptane',
      'kigelia africana extract',
      'kigelia africana',
      'juglans regia extract',
      'english walnut extract',
      'aconite',
    ],
    category: 'WADA S6 Prohibited Stimulant',
    severity: 'banned',
    whyProblem:
      'Prohibited synthetic aliphatic amine stimulant often disguised behind plant bark/fruit names; causes dangerous blood pressure spikes.',
  },
  {
    name: 'Higenamine',
    synonyms: ['higenamine', 'norcoclaurine', 'nandina domestica', 'nelumbo nucifera', 'lotus plumule'],
    category: 'WADA S3 Beta-2 Agonist',
    severity: 'banned',
    whyProblem:
      'Prohibited by WADA in and out of competition as a beta-2 agonist; causes tachycardia and arrhythmias.',
  },
  {
    name: 'Ephedrine / Ephedra (Ma Huang)',
    synonyms: [
      'ephedrine',
      'ephedra',
      'ephedra sinica',
      'ma huang',
      'ma huang extract',
      'methylephedrine',
      'pseudoephedrine',
      'norephedrine',
    ],
    category: 'WADA S6 Prohibited Stimulant',
    severity: 'banned',
    whyProblem:
      'Potent sympathetic nervous system alkaloid prohibited above urinary WADA thresholds; linked to myocardial infarction and seizures.',
  },
  {
    name: 'Sibutramine',
    synonyms: ['sibutramine', 'meridia', 'reductil', 'desmethylsibutramine'],
    category: 'WADA S6 Stimulant / Withdrawn Drug Adulterant',
    severity: 'banned',
    whyProblem:
      'Prescription weight-loss drug withdrawn worldwide for heart attack and stroke risk; commonly spikes illicit fat burners.',
  },
  {
    name: 'Oxilofrine (Methylsynephrine)',
    synonyms: ['oxilofrine', 'methylsynephrine', 'p-hydroxyephedrine'],
    category: 'WADA S6 Prohibited Stimulant',
    severity: 'banned',
    whyProblem:
      'Banned athletic stimulant with strong vasopressor effects that stresses heart rhythm under exertion.',
  },
  {
    name: 'BMPEA',
    synonyms: ['bmpea', 'beta-methylphenethylamine', 'acacia rigidula extract'],
    category: 'WADA S6 Prohibited Stimulant',
    severity: 'banned',
    whyProblem:
      'Unstudied amphetamine isomer banned by WADA and frequently disguised as Acacia rigidula extract.',
  },
  {
    name: 'Modafinil / Adrafinil',
    synonyms: ['modafinil', 'adrafinil', 'provigil', 'phenylpiracetam'],
    category: 'WADA S6 Prohibited Wakefulness Stimulant',
    severity: 'banned',
    whyProblem:
      'Prescription eugeroic / CNS stimulant prohibited by WADA.',
  },

  // --- S1 / S2 / S4 SARMS, BETA-2 AGONISTS & METABOLIC MODULATORS ---
  {
    name: 'Clenbuterol',
    synonyms: ['clenbuterol', 'clenbuterol hcl', 'spiropent'],
    category: 'WADA S1.2 Anabolic Agent / Beta-2 Agonist',
    severity: 'banned',
    whyProblem:
      'Powerful veterinary/bronchodilator drug banned year-round by WADA; causes tremor, hypokalemia, and cardiac hypertrophy.',
  },
  {
    name: 'Ostarine (MK-2866)',
    synonyms: ['ostarine', 'mk-2866', 'mk 2866', 'mk2866', 'enobosarm', 'gtx-024'],
    category: 'WADA S1.2 Prohibited SARM',
    severity: 'banned',
    whyProblem:
      'Unapproved Selective Androgen Receptor Modulator banned year-round by WADA; suppresses endogenous testosterone and stresses the liver.',
  },
  {
    name: 'Ligandrol (LGD-4033)',
    synonyms: ['ligandrol', 'lgd-4033', 'lgd 4033', 'lgd4033', 'vk5211'],
    category: 'WADA S1.2 Prohibited SARM',
    severity: 'banned',
    whyProblem:
      'Unapproved SARM prohibited by WADA; associated with acute liver toxicity, HDL suppression, and HPTA shutdown.',
  },
  {
    name: 'RAD-140 (Testolone)',
    synonyms: ['rad-140', 'rad 140', 'rad140', 'testolone'],
    category: 'WADA S1.2 Prohibited SARM',
    severity: 'banned',
    whyProblem:
      'Investigational anabolic SARM prohibited in sport; hepatotoxic and endocrine-disrupting.',
  },
  {
    name: 'Andarine (S-4)',
    synonyms: ['andarine', 's-4', 's4 sarm', 'gtx-007'],
    category: 'WADA S1.2 Prohibited SARM',
    severity: 'banned',
    whyProblem:
      'Prohibited SARM known for ocular vision tinting/night-blindness side effects and hormone suppression.',
  },
  {
    name: 'Cardarine (GW501516)',
    synonyms: ['cardarine', 'gw501516', 'gw-501516', 'gw 501516', 'endurobol'],
    category: 'WADA S4.4 Prohibited Metabolic Modulator',
    severity: 'banned',
    whyProblem:
      'PPAR-delta agonist abandoned in clinical trials due to rapid multi-organ carcinogenicity in animal studies.',
  },
  {
    name: 'YK-11',
    synonyms: ['yk-11', 'yk 11', 'yk11'],
    category: 'WADA S1.2 Prohibited Steroidal SARM',
    severity: 'banned',
    whyProblem:
      'Methylated steroidal SARM / myostatin inhibitor with zero human safety approval and high hepatotoxicity.',
  },
  {
    name: 'Ibutamoren (MK-677)',
    synonyms: ['ibutamoren', 'mk-677', 'mk 677', 'mk677', 'nutrobal'],
    category: 'WADA S2 Prohibited GH Secretagogue',
    severity: 'banned',
    whyProblem:
      'Ghrelin mimetic increasing GH/IGF-1; prohibited year-round in tested athletics and worsens insulin resistance.',
  },
  {
    name: 'Stenabolic (SR9009)',
    synonyms: ['stenabolic', 'sr9009', 'sr-9009'],
    category: 'WADA S4 Prohibited Metabolic Modulator',
    severity: 'banned',
    whyProblem:
      'Research-only Rev-ErbA agonist prohibited in competition.',
  },
  {
    name: 'S-23 / ACP-105',
    synonyms: ['s-23', 's23 sarm', 'acp-105', 'acp105'],
    category: 'WADA S1.2 Prohibited SARM',
    severity: 'banned',
    whyProblem:
      'Potent suppressive experimental SARMs prohibited by WADA.',
  },

  // --- S1 ANABOLIC STEROIDS & PROHORMONES ---
  {
    name: 'Androstenedione',
    synonyms: ['androstenedione', '4-androstenedione', '4-ad', 'andro', 'androstene'],
    category: 'WADA S1.1 Prohibited Anabolic Prohormone',
    severity: 'banned',
    whyProblem:
      'Direct steroid hormone precursor to testosterone/estrone; banned by WADA and causes adverse doping findings and endocrine toxicity.',
  },
  {
    name: '1-Androstenediol / 1-Androsterone',
    synonyms: ['1-androstenediol', '1 androstenediol', '1-ad', '1-androsterone', '1-andro'],
    category: 'WADA S1.1 Prohibited Anabolic Prohormone',
    severity: 'banned',
    whyProblem:
      'Designer prohormone converted to 1-testosterone; prohibited anabolic agent carrying serious liver/lipid toxicity.',
  },
  {
    name: 'DHEA (Dehydroepiandrosterone)',
    synonyms: ['dhea', 'dehydroepiandrosterone', '7-keto dhea', 'prasterone'],
    category: 'WADA S1.1 Prohibited Endogenous Anabolic Agent',
    severity: 'banned',
    whyProblem:
      'Although sold OTC in some jurisdictions, DHEA is strictly prohibited year-round under WADA S1 (triggers positive IRMS doping tests).',
  },
  {
    name: 'Methasterone (Superdrol)',
    synonyms: ['methasterone', 'superdrol', 'methyldrostanolone'],
    category: 'WADA S1.1 Prohibited Designer Anabolic Steroid',
    severity: 'banned',
    whyProblem:
      'Orally active 17-alpha-alkylated designer steroid frequently linked to severe cholestatic liver injury.',
  },
  {
    name: 'Trenbolone',
    synonyms: ['trenbolone', 'trenbolone acetate', 'trenavar', 'estratriene'],
    category: 'WADA S1.1 Prohibited Anabolic Steroid',
    severity: 'banned',
    whyProblem:
      'Potent veterinary/synthetic anabolic-androgenic steroid banned globally in sport.',
  },
  {
    name: 'Methyltestosterone / Anabolic Steroids',
    synonyms: [
      'methyltestosterone',
      'oxandrolone',
      'stanozolol',
      'boldenone',
      'nandrolone',
      'turinabol',
      'halodrol',
      'epistane',
    ],
    category: 'WADA S1.1 Prohibited Anabolic Steroid',
    severity: 'banned',
    whyProblem:
      'Controlled anabolic-androgenic steroids prohibited year-round with severe hepatic and cardiovascular toxicity.',
  },
  {
    name: 'Arimistane / SERMs / Aromatase Inhibitors',
    synonyms: [
      'arimistane',
      'androst-3,5-diene-7,17-dione',
      'clomiphene',
      'tamoxifen',
      'letrozole',
      'anastrozole',
      'exemestane',
    ],
    category: 'WADA S4 Prohibited Hormone & Anti-Estrogenic Modulator',
    severity: 'banned',
    whyProblem:
      'Anti-estrogenic agents and aromatase inhibitors banned year-round by WADA.',
  },

  // --- S5 PROHIBITED DIURETICS & MASKING AGENTS ---
  {
    name: 'Furosemide',
    synonyms: ['furosemide', 'lasix'],
    category: 'WADA S5 Prohibited Loop Diuretic / Masking Agent',
    severity: 'banned',
    whyProblem:
      'Potent loop diuretic prohibited by WADA because it masks banned substances and causes severe dehydration/electrolyte imbalance.',
  },
  {
    name: 'Hydrochlorothiazide (HCTZ)',
    synonyms: ['hydrochlorothiazide', 'hctz', 'chlorothiazide'],
    category: 'WADA S5 Prohibited Thiazide Diuretic',
    severity: 'banned',
    whyProblem:
      'Prescription thiazide diuretic found as a hidden weight-cut adulterant; banned as a masking agent.',
  },
  {
    name: 'Other WADA S5 Diuretics',
    synonyms: ['spironolactone', 'triamterene', 'amiloride', 'bumetanide', 'acetazolamide'],
    category: 'WADA S5 Prohibited Diuretic',
    severity: 'banned',
    whyProblem:
      'Prohibited diuretic class monitored across all competitive drug-tested federations.',
  },

  // --- UNDECLARED PHARMACEUTICAL ADULTERANTS (PDE5 INHIBITORS) ---
  {
    name: 'Tadalafil',
    synonyms: ['tadalafil', 'cialis', 'nortadalafil'],
    category: 'Undeclared Pharmaceutical Adulterant (PDE5 Inhibitor)',
    severity: 'banned',
    whyProblem:
      'Prescription erectile-dysfunction drug illegally spiked into "testosterone boosters" and pump blends; dangerous hypotension with nitrates.',
  },
  {
    name: 'Sildenafil / Vardenafil',
    synonyms: ['sildenafil', 'viagra', 'vardenafil', 'acetildenafil'],
    category: 'Undeclared Pharmaceutical Adulterant (PDE5 Inhibitor)',
    severity: 'banned',
    whyProblem:
      'Undeclared prescription PDE5 inhibitor adulterant causing severe blood-pressure drops and cardiac risk.',
  },

  // --- CONTAMINATION RISK / REGULATORY WARNING FLAGS (YELLOW) ---
  {
    name: 'Tribulus Terrestris',
    synonyms: ['tribulus', 'tribulus terrestris', 'puncture vine'],
    category: 'Athlete Contamination Risk',
    severity: 'contamination_risk',
    whyProblem:
      'Commonly flagged by anti-doping agencies (USADA/UKAD) for high cross-contamination risk with undeclared prohormones or norandrosterone.',
  },
  {
    name: 'Bitter Orange / Synephrine',
    synonyms: ['synephrine', 'p-synephrine', 'bitter orange', 'bitter orange extract', 'citrus aurantium'],
    category: 'WADA Monitoring / Contamination Risk',
    severity: 'contamination_risk',
    whyProblem:
      'Monitored stimulant often co-contaminated with WADA-prohibited octopamine or oxilofrine.',
  },
  {
    name: 'Yohimbine / Rauwolscine',
    synonyms: ['yohimbine', 'yohimbe', 'yohimbe bark extract', 'alpha yohimbine', 'rauwolscine'],
    category: 'High-Risk Sympathomimetic / Regulatory Warning',
    severity: 'contamination_risk',
    whyProblem:
      'Restricted in several countries (AU/EU/CA); highly variable alkaloid dosing causes anxiety, tachycardia, and label-compliance failures.',
  },
  {
    name: 'Hordenine / Phenylethylamine',
    synonyms: ['hordenine', 'phenylethylamine', 'beta-phenylethylamine', 'pea stimulant'],
    category: 'Sympathomimetic / Cross-Contamination Risk',
    severity: 'contamination_risk',
    whyProblem:
      'Appears on multiple sport-federation watchlists (NCAA/DoD) and may cross-react or carry prohibited amine impurities.',
  },
  {
    name: 'Mucuna Pruriens / L-Dopa',
    synonyms: ['mucuna pruriens', 'l-dopa', 'velvet bean extract'],
    category: 'Contamination / Endocrine Caution',
    severity: 'contamination_risk',
    whyProblem:
      'Dopamine-precursor herb often blended into proprietary "HGH/test" formulas with high adulteration risk.',
  },
  {
    name: 'Deer Antler Velvet (IGF-1 claims)',
    synonyms: ['deer antler velvet', 'velvet antler extract'],
    category: 'Contamination / WADA S2 IGF-1 Risk',
    severity: 'contamination_risk',
    whyProblem:
      'Marketed as an IGF-1 source; WADA warns athletes that contaminated deer antler batches can trigger S2 doping violations.',
  },
];

// Label-level regulatory / adulteration warning phrases (caught via substring / fuzzy scan on full OCR text)
export const CONTAMINATION_LABEL_WARNINGS = [
  {
    pattern: /not\s+for\s+sale\s+in\s+(?:some|certain|all|the\s+(?:uk|eu|us|australia|canada))\s*countries/i,
    label: 'Regulatory Restriction Warning ("Not for sale in some countries")',
    whyProblem: 'Indicates ingredients restricted or banned under regional food/supplement safety laws.',
  },
  {
    pattern: /for\s+research\s+(?:purposes|use)\s+only/i,
    label: 'Grey-Market Notice ("For research purposes only")',
    whyProblem: 'Often used to disguise unapproved SARMs, peptides, or designer stimulants outside food/GMP oversight.',
  },
  {
    pattern: /not\s+for\s+human\s+consumption/i,
    label: 'Illicit Disclaimer ("Not for human consumption")',
    whyProblem: 'Indicates an unregulated research chemical compound unsafe for ingestion.',
  },
  {
    pattern: /banned\s+substance\s+warning|may\s+cause\s+(?:a\s+)?positive\s+(?:drug|doping)\s+test/i,
    label: 'Positive Drug-Test Label Warning',
    whyProblem: 'Manufacturer explicitly warns the formula may fail competitive anti-doping screening.',
  },
  {
    pattern: /prohibited\s+in\s+(?:competitive|tested)\s+sport/i,
    label: 'Competition Prohibition Notice',
    whyProblem: 'Product discloses presence of sport-prohibited compounds.',
  },
];

// Build searchable flat entries
const FLAT_TARGETS = BANNED_SUBSTANCES.flatMap((entry) => [
  { term: entry.name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(), entry },
  ...entry.synonyms.map((syn) => ({
    term: syn.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(),
    entry,
  })),
]).filter((x) => x.term.length >= 3);

function fixOcrTyposForMatch(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\|/g, 'l')
    .replace(/\b0(?=[a-z]{2,})/g, 'o')
    .replace(/(?<=[a-z])0(?=[a-z])/g, 'o')
    .replace(/(?<=[0-9])o(?=[0-9])/g, '0')
    .replace(/(?<=[a-z])1(?=[a-z])/g, 'l')
    .replace(/(?<=[a-z])5(?=[a-z])/g, 's')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levSim(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

/**
 * Matches an ingredient token against banned & contamination-risk database using:
 *   1. Exact / normalized alias lookup (fixes 0/O, 1/l, 5/S like "0starine" or "LGD 4O33")
 *   2. Substring word-boundary match for longer compounds
 *   3. Fuzzy Levenshtein similarity >= threshold (default 0.85)
 */
export function matchBannedOrContamination(rawToken, threshold = 0.85) {
  const clean = fixOcrTyposForMatch(rawToken);
  if (!clean || clean.length < 3) return null;

  // Strip trailing dosage metrics e.g. "ostarine 20mg" -> "ostarine"
  const cleanNoDose = clean
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|ug|g|ml|iu|%)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const candidates = cleanNoDose && cleanNoDose !== clean ? [cleanNoDose, clean] : [clean];

  let best = null;
  let bestScore = 0;

  for (const probe of candidates) {
    for (const target of FLAT_TARGETS) {
      if (probe === target.term) {
        return {
          ...target.entry,
          matchedTerm: target.term,
          similarity: 1.0,
        };
      }
      if (target.term.length >= 4) {
        const regex = new RegExp(`\\b${target.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        if (regex.test(probe)) {
          return {
            ...target.entry,
            matchedTerm: target.term,
            similarity: 0.96,
          };
        }
      }
      if (Math.abs(probe.length - target.term.length) <= 3) {
        const sim = levSim(probe, target.term);
        if (sim >= threshold && sim > bestScore) {
          bestScore = sim;
          best = {
            ...target.entry,
            matchedTerm: target.term,
            similarity: Math.round(sim * 100) / 100,
          };
        }
      }
    }
  }

  return best;
}

/**
 * Scans full OCR text for both banned/contamination ingredients and label warnings
 * such as "not for sale in some countries".
 */
export function scanTextForBannedAndContamination(rawText, tokens = []) {
  const bannedDetected = [];
  const contaminationDetected = [];
  const seenNames = new Set();

  for (const tok of tokens) {
    const hit = matchBannedOrContamination(tok, 0.85);
    if (!hit || seenNames.has(hit.name)) continue;
    seenNames.add(hit.name);
    const record = {
      name: hit.name,
      matchedToken: tok,
      category: hit.category,
      severity: hit.severity,
      whyProblem: hit.whyProblem,
      similarity: hit.similarity,
    };
    if (hit.severity === 'banned') {
      bannedDetected.push(record);
    } else {
      contaminationDetected.push(record);
    }
  }

  // Also scan rawText directly for multi-word label warnings ("not for sale in some countries", etc.)
  const text = String(rawText || '');
  for (const warn of CONTAMINATION_LABEL_WARNINGS) {
    if (warn.pattern.test(text) && !seenNames.has(warn.label)) {
      seenNames.add(warn.label);
      contaminationDetected.push({
        name: warn.label,
        matchedToken: warn.label,
        category: 'Label Regulatory Warning',
        severity: 'contamination_risk',
        whyProblem: warn.whyProblem,
        similarity: 1.0,
      });
    }
  }

  return {
    bannedDetected,
    contaminationDetected,
    disclaimer: BANNED_LIST_DISCLAIMER,
  };
}
