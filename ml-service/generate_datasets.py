"""
Dataset generator for GymScan ML Service:
1. /ml-service/data/ingredients.csv (>= 240 labeled supplement ingredients)
   NOTE: The 'banned_wada' class is modeled on public WADA Prohibited List
   categories (S1 Anabolic Agents, S4 Hormone Modulators, S5 Diuretics,
   S6 Stimulants). This list is informational and MUST be re-checked against
   the official current WADA Prohibited List before athletic competition.
2. /ml-service/data/spiking.csv (600 synthetic amino-spiking scenarios)
3. /ml-service/data/scores.csv (800 synthetic purity/health score rows)
   NOTE: Score labels are generated from domain-expert rules plus realistic
   Gaussian noise and should be replaced with real lab-tested assay data later.
"""

import csv
from pathlib import Path
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)


def build_ingredients_dataset() -> Path:
    """
    Build >= 240 labeled ingredient rows covering beneficial, neutral,
    harmful, and banned_wada supplement compounds, including common synonyms
    and E-numbers.
    """
    rows = [
        # --- BENEFICIAL (Protein sources, clean ergogenics, natural sweeteners, enzymes) ---
        ("whey protein isolate", "beneficial", "Ultra-filtered intact dairy protein (>90% purity)"),
        ("cross flow microfiltered whey protein isolate", "beneficial", "Cold-processed intact whey isolate preserving microfractions"),
        ("hydrolyzed whey protein isolate", "beneficial", "Pre-digested rapid-absorbing intact whey protein"),
        ("whey protein hydrolysate", "beneficial", "Bioavailable enzymatically hydrolyzed whey protein"),
        ("whey protein concentrate", "beneficial", "Complete intact milk-derived protein source"),
        ("grass fed whey protein concentrate", "beneficial", "Minimally processed intact whey protein"),
        ("micellar casein", "beneficial", "Slow-digesting complete milk protein"),
        ("milk protein isolate", "beneficial", "Complete casein and whey intact dairy protein"),
        ("milk protein concentrate", "beneficial", "Intact milk protein blend"),
        ("calcium caseinate", "beneficial", "Intact slow-release casein protein"),
        ("pea protein isolate", "beneficial", "Clean plant-based complete amino protein"),
        ("organic pea protein", "beneficial", "Allergen-friendly plant protein source"),
        ("brown rice protein isolate", "beneficial", "Complementary plant protein source"),
        ("hemp protein powder", "beneficial", "Whole-food plant protein with omega fats"),
        ("soy protein isolate", "beneficial", "Complete plant protein isolate"),
        ("egg white protein", "beneficial", "Lactose-free complete albumin protein"),
        ("egg albumin", "beneficial", "High biological value intact egg protein"),
        ("whey protein crisps", "beneficial", "High-protein crunchy matrix for bars"),
        ("creapure creatine monohydrate", "beneficial", "99.9% lab-tested micronized creatine monohydrate"),
        ("micronized creatine monohydrate", "beneficial", "Clinically proven strength and ATP ergogenic"),
        ("creatine monohydrate", "beneficial", "Gold-standard strength and power supplement"),
        ("l-leucine", "beneficial", "Primary mTOR-activating essential branched-chain amino acid"),
        ("fermented l-leucine", "beneficial", "Clean plant-fermented essential BCAA"),
        ("l-isoleucine", "beneficial", "Essential branched-chain amino acid"),
        ("l-valine", "beneficial", "Essential branched-chain amino acid"),
        ("instantized bcaa 2:1:1", "beneficial", "Branched-chain amino acid recovery blend"),
        ("essential amino acids", "beneficial", "Complete EAA profile supporting protein synthesis"),
        ("l-citrulline", "beneficial", "Clinically dosed nitric oxide pump precursor"),
        ("l-citrulline malate", "beneficial", "Clean vasodilator and endurance enhancer"),
        ("betaine anhydrous", "beneficial", "Cellular osmolyte supporting power output"),
        ("acetyl l-carnitine", "beneficial", "Mitochondrial fatty-acid transport amino derivative"),
        ("l-carnitine l-tartrate", "beneficial", "Recovery and androgen receptor support compound"),
        ("ashwagandha root extract", "beneficial", "Clinically studied adaptogen for recovery"),
        ("ksm-66 ashwagandha", "beneficial", "Standardized full-spectrum ashwagandha extract"),
        ("rhodiola rosea extract", "beneficial", "Adaptogen supporting fatigue resistance"),
        ("l-theanine", "beneficial", "Calm focus amino acid pairing cleanly with caffeine"),
        ("electrolyte blend", "beneficial", "Hydration minerals supporting muscle contraction"),
        ("pink himalayan salt", "beneficial", "Natural trace mineral electrolyte"),
        ("magnesium glycinate", "beneficial", "Highly bioavailable magnesium chelate"),
        ("magnesium citrate", "beneficial", "Bioavailable electrolyte supporting muscle recovery"),
        ("zinc picolinate", "beneficial", "Essential recovery and immune trace mineral"),
        ("vitamin d3", "beneficial", "Essential hormone and bone support vitamin"),
        ("vitamin b6 pyridoxine", "beneficial", "Supports amino acid metabolism"),
        ("vitamin b12 methylcobalamin", "beneficial", "Bioavailable energy metabolism vitamin"),
        ("digestive enzyme blend", "beneficial", "Enhances protein digestion and reduces bloating"),
        ("bromelain", "beneficial", "Natural pineapple proteolytic digestive enzyme"),
        ("papain", "beneficial", "Natural papaya enzyme aiding protein breakdown"),
        ("lactase enzyme", "beneficial", "Helps digest trace lactose in dairy proteins"),
        ("digezyme", "beneficial", "Multi-enzyme digestive complex"),
        ("probiotic bacillus coagulans", "beneficial", "Gut-friendly spore-forming probiotic"),
        ("chicory root fiber", "beneficial", "Clean prebiotic dietary fiber"),
        ("inulin fiber", "beneficial", "Prebiotic soluble fiber supporting gut flora"),
        ("soluble tapioca fiber", "beneficial", "Clean low-glycemic prebiotic binding fiber"),
        ("organic stevia leaf extract", "beneficial", "Zero-calorie natural plant sweetener"),
        ("stevia leaf extract", "beneficial", "Natural plant-derived zero-sugar sweetener"),
        ("steviol glycosides", "beneficial", "Clean plant extract sweetener (E960)"),
        ("monk fruit extract", "beneficial", "Natural zero-glycemic fruit sweetener"),
        ("luo han guo extract", "beneficial", "Clean monk fruit natural sweetener"),
        ("erythritol", "beneficial", "Low-GI gut-gentle natural sugar alcohol"),
        ("allulose", "beneficial", "Rare low-calorie sugar with minimal blood glucose impact"),
        ("sunflower lecithin", "beneficial", "Clean hexane-free instantizing emulsifier"),
        ("organic sunflower lecithin", "beneficial", "Non-GMO clean powder emulsifier"),
        ("roasted peanuts", "beneficial", "Whole-food protein and monounsaturated fat source"),
        ("roasted almonds", "beneficial", "Nutrient-dense whole nut protein and healthy fats"),
        ("almond butter", "beneficial", "Clean whole-food nut butter base"),
        ("raw cacao powder", "beneficial", "Antioxidant-rich unrefined cocoa flavoring"),
        ("cocoa butter", "beneficial", "Clean natural lipid for protein bars"),
        ("chia seeds", "beneficial", "Omega-3 and fiber-rich whole seed"),
        ("flaxseed powder", "beneficial", "Plant omega-3 and soluble fiber source"),
        ("rolled oats", "beneficial", "Whole-grain complex carbohydrate source"),
        ("medium chain triglycerides", "beneficial", "Clean fast-oxidizing coconut lipid"),
        ("mct oil powder", "beneficial", "Clean coconut-derived energy lipid"),
        ("omega 3 fish oil", "beneficial", "Anti-inflammatory EPA/DHA essential fatty acids"),
        ("coenzyme q10", "beneficial", "Cellular mitochondrial energy cofactor"),
        ("alpha lipoic acid", "beneficial", "Clean metabolic antioxidant"),
        ("bioperine black pepper extract", "beneficial", "Natural nutrient absorption enhancer"),
        ("coconut water powder", "beneficial", "Natural potassium hydration base"),
        ("tart cherry extract", "beneficial", "Polyphenol recovery support extract"),

        # --- NEUTRAL (Standard culinary thickeners, flavors, minerals, processing aids) ---
        ("water", "neutral", "Standard hydration base"),
        ("carbonated water", "neutral", "Standard beverage base"),
        ("cocoa powder", "neutral", "Standard chocolate flavoring ingredient"),
        ("alkalized cocoa powder", "neutral", "Dutch-processed cocoa flavoring"),
        ("natural flavors", "neutral", "Standard food flavoring compounds"),
        ("natural and artificial flavors", "neutral", "Common commercial flavor blend"),
        ("natural vanilla flavor", "neutral", "Standard vanilla flavoring"),
        ("sea salt", "neutral", "Standard flavor enhancer and sodium electrolyte"),
        ("salt", "neutral", "Common mineral seasoning"),
        ("sodium chloride", "neutral", "Standard electrolyte salt"),
        ("potassium chloride", "neutral", "Standard mineral salt"),
        ("citric acid", "neutral", "Standard food acidulant and pH stabilizer"),
        ("malic acid", "neutral", "Common sour fruit acidulant"),
        ("tartaric acid", "neutral", "Standard food acidity regulator"),
        ("xanthan gum", "neutral", "Common soluble thickening stabilizer"),
        ("guar gum", "neutral", "Plant-derived viscosity thickener"),
        ("cellulose gum", "neutral", "Standard texture stabilizer"),
        ("carboxymethyl cellulose", "neutral", "Common suspension thickener"),
        ("acacia gum", "neutral", "Natural plant gum binder"),
        ("soy lecithin", "neutral", "Common dairy/powder instantizing emulsifier"),
        ("sunflower oil", "neutral", "Standard culinary vegetable oil"),
        ("canola oil", "neutral", "Neutral vegetable oil carrier"),
        ("oat flour", "neutral", "Standard cereal flour base"),
        ("rice flour", "neutral", "Common gluten-free carbohydrate base"),
        ("whole wheat flour", "neutral", "Standard grain baking flour"),
        ("skim milk powder", "neutral", "Standard dairy solids base"),
        ("nonfat dry milk", "neutral", "Dairy milk solids carrier"),
        ("buttermilk powder", "neutral", "Cultured dairy flavoring base"),
        ("vegetable glycerin", "neutral", "Standard moisture humectant in protein bars"),
        ("glycerin", "neutral", "Bar moisture-retaining humectant"),
        ("silicon dioxide", "neutral", "Standard anti-caking flow agent"),
        ("calcium silicate", "neutral", "Common anti-caking powder agent"),
        ("tricalcium phosphate", "neutral", "Anti-caking mineral flow agent"),
        ("magnesium stearate", "neutral", "Standard capsule tableting flow agent"),
        ("microcrystalline cellulose", "neutral", "Inert plant fiber capsule filler"),
        ("hypromellose", "neutral", "Vegetarian capsule shell"),
        ("gelatin", "neutral", "Standard capsule or gummy gelling protein"),
        ("pectin", "neutral", "Fruit-derived gelling fiber"),
        ("beeswax", "neutral", "Natural glazing agent"),
        ("calcium carbonate", "neutral", "Standard mineral calcium carrier"),
        ("ascorbic acid", "neutral", "Vitamin C antioxidant preservative"),
        ("mixed tocopherols", "neutral", "Vitamin E natural fat stabilizer"),
        ("rosemary extract", "neutral", "Natural botanical lipid preservative"),
        ("beta carotene", "neutral", "Natural orange-yellow colorant"),
        ("beetroot juice powder", "neutral", "Natural plant colorant"),
        ("turmeric extract", "neutral", "Natural yellow colorant"),
        ("cinnamon powder", "neutral", "Common culinary spice"),
        ("instant coffee powder", "neutral", "Natural coffee flavor and mild caffeine"),
        ("caffeine anhydrous", "neutral", "Standard concentrated stimulant (moderate dose)"),
        ("green tea leaf extract", "neutral", "Standard polyphenol and mild caffeine extract"),
        ("milk chocolate coating", "neutral", "Standard confectionery bar coating"),
        ("dark chocolate chips", "neutral", "Standard cocoa confectionery inclusion"),
        ("whey permeate", "neutral", "Dairy mineral lactose byproduct"),
        ("modified tapioca starch", "neutral", "Processed starch binder"),
        ("baking soda", "neutral", "Standard leavening sodium bicarbonate"),
        ("potassium bicarbonate", "neutral", "Standard buffering mineral salt"),
        ("dicalcium phosphate", "neutral", "Mineral acidity regulator"),
        ("natural caramel flavor", "neutral", "Standard flavor compound"),
        ("rice crispies", "neutral", "Puffed rice texture inclusion"),
        ("corn starch", "neutral", "Standard culinary thickener"),

        # --- HARMFUL (Amino-spiking agents, heavy glycemic fillers, banned/suspect dyes, artificial sweeteners, trans/palm oils) ---
        ("glycine", "harmful", "Cheap non-essential amino acid often used for nitrogen amino spiking"),
        ("l-glycine", "harmful", "Non-protein amino acid inflating Kjeldahl nitrogen protein claims"),
        ("taurine", "harmful", "Cheap free amino acid frequently used in protein amino spiking"),
        ("l-taurine", "harmful", "Free nitrogen compound inflating apparent protein counts"),
        ("l-alanine", "harmful", "Cheap non-essential amino acid used as an amino-spiking diluent"),
        ("alanine", "harmful", "Non-essential amino filler inflating nitrogen test results"),
        ("glutamine peptides", "harmful", "Low-cost peptide filler inflating protein totals"),
        ("free form amino acids", "harmful", "Unbound amino acids often masking lower intact whey"),
        ("added amino acid blend", "harmful", "Suspicious free-amino addition indicating potential amino spiking"),
        ("l-proline", "harmful", "Cheap collagen-linked amino acid used to pad nitrogen scores"),
        ("collagen peptides amino spike", "harmful", "Incomplete protein lowering true muscle-building PDCAAS"),
        ("maltodextrin", "harmful", "High-glycemic carbohydrate filler diluting protein purity"),
        ("maltodextrin powder", "harmful", "Cheap bulking starch causing blood-sugar spikes"),
        ("corn syrup solids", "harmful", "Refined glycemic syrup filler"),
        ("high fructose corn syrup", "harmful", "Lipogenic refined sugar syrup linked to metabolic stress"),
        ("glucose syrup", "harmful", "High-glycemic liquid sugar binder"),
        ("liquid glucose", "harmful", "Cheap refined sugar syrup"),
        ("dextrose", "harmful", "High-glycemic simple sugar filler"),
        ("invert sugar syrup", "harmful", "Added refined simple sugars"),
        ("sucrose", "harmful", "Added refined table sugar"),
        ("hydrogenated palm oil", "harmful", "Processed saturated fat / trans-fat risk oil"),
        ("partially hydrogenated vegetable oil", "harmful", "Industrial trans-fat source harmful to cardiovascular health"),
        ("fractionated palm kernel oil", "harmful", "Cheap heavily saturated confectionery fat"),
        ("palm oil", "harmful", "Low-cost refined oil reducing bar nutritional quality"),
        ("non dairy creamer", "harmful", "Contains corn syrup solids and hydrogenated vegetable oils"),
        ("modified food starch", "harmful", "Processed bulking carbohydrate filler"),
        ("sucralose", "harmful", "High-intensity synthetic sweetener (INS 955) linked to gut dysbiosis"),
        ("e955", "harmful", "Sucralose artificial sweetener"),
        ("acesulfame potassium", "harmful", "Synthetic sweetener (INS 950) often paired with sucralose"),
        ("ace-k", "harmful", "Acesulfame potassium artificial sweetener"),
        ("e950", "harmful", "Acesulfame potassium artificial sweetener"),
        ("aspartame", "harmful", "Synthetic dipeptide sweetener (E951) contraindicated for PKU"),
        ("e951", "harmful", "Aspartame artificial sweetener"),
        ("saccharin", "harmful", "Older synthetic coal-tar derived sweetener (E954)"),
        ("sodium saccharin", "harmful", "Synthetic sweetener with bitter aftertaste"),
        ("neotame", "harmful", "Ultra-potent synthetic aspartame analogue (E961)"),
        ("maltitol", "harmful", "High-GI sugar alcohol causing severe GI bloating and laxative effect"),
        ("maltitol syrup", "harmful", "Hidden high-glycemic polyol in 'sugar-free' protein bars"),
        ("sorbitol", "harmful", "Fermentable polyol causing osmotic diarrhea and cramps"),
        ("polydextrose", "harmful", "Synthetic bulking fiber causing GI gas in high amounts"),
        ("red 40", "harmful", "Synthetic petroleum food dye (Allura Red / E129)"),
        ("allura red", "harmful", "Synthetic azo food dye linked to hyperactivity concerns"),
        ("e129", "harmful", "Red 40 synthetic azo dye"),
        ("yellow 5", "harmful", "Tartrazine synthetic dye (E102) associated with allergic reactions"),
        ("tartrazine", "harmful", "Synthetic yellow azo dye (E102)"),
        ("e102", "harmful", "Yellow 5 tartrazine synthetic color"),
        ("yellow 6", "harmful", "Sunset Yellow synthetic azo dye (E110)"),
        ("sunset yellow", "harmful", "Synthetic petroleum-derived dye"),
        ("blue 1", "harmful", "Brilliant Blue synthetic colorant (E133)"),
        ("brilliant blue", "harmful", "Synthetic petroleum-derived dye"),
        ("titanium dioxide", "harmful", "Whitening nanoparticle additive (E171) restricted in EU food"),
        ("e171", "harmful", "Titanium dioxide whitening agent"),
        ("caramel color class iv", "harmful", "Ammonia-sulfite caramel dye potentially containing 4-MEI"),
        ("sodium benzoate", "harmful", "Synthetic preservative (E211) forming benzene with vitamin C"),
        ("potassium sorbate", "harmful", "Synthetic chemical preservative (E202)"),
        ("bha", "harmful", "Butylated hydroxyanisole synthetic antioxidant (E320)"),
        ("bht", "harmful", "Butylated hydroxytoluene synthetic preservative (E321)"),
        ("carrageenan", "harmful", "Inflammatory seaweed thickener linked to gut irritation"),
        ("propyl gallate", "harmful", "Synthetic fat preservative"),
        ("potassium bromate", "harmful", "Flour improver banned in multiple jurisdictions"),
        ("azodicarbonamide", "harmful", "Industrial dough conditioner linked to respiratory sensitization"),
        ("soybean oil hydrogenated", "harmful", "Hydrogenated industrial vegetable fat"),
        ("artificial chocolate flavor", "harmful", "Synthetic flavoring chemical blend"),
        ("artificial sweetener blend", "harmful", "Unspecified synthetic sweetener mix"),
        ("corn maltodextrin", "harmful", "Refined high-GI corn bulking filler"),
        ("fructose syrup", "harmful", "Added refined fructose sweetener"),
        ("whey nitrogen booster", "harmful", "Suspect non-protein nitrogen filler"),

        # --- BANNED_WADA (Public WADA Prohibited List categories — MUST re-check official WADA list) ---
        ("dmaa", "banned_wada", "WADA S6 Prohibited Stimulant: 1,3-Dimethylamylamine (cardiovascular & doping risk)"),
        ("1,3-dimethylamylamine", "banned_wada", "WADA S6 Prohibited Stimulant (DMAA)"),
        ("methylhexanamine", "banned_wada", "WADA S6 Prohibited Stimulant (DMAA alias)"),
        ("geranamine", "banned_wada", "WADA S6 Prohibited Stimulant (DMAA trade alias)"),
        ("geranium stem extract", "banned_wada", "Frequently masks WADA S6 prohibited DMAA"),
        ("dmha", "banned_wada", "WADA S6 Prohibited Stimulant: Octodrine / 2-amino-6-methylheptane"),
        ("2-amino-6-methylheptane", "banned_wada", "WADA S6 Prohibited Stimulant (DMHA)"),
        ("octodrine", "banned_wada", "WADA S6 Prohibited Stimulant (DMHA)"),
        ("2-aminoisoheptane", "banned_wada", "WADA S6 Prohibited Stimulant (DMHA alias)"),
        ("kigelia africana extract", "banned_wada", "Botanical alias commonly hiding prohibited DMHA"),
        ("juglans regia extract", "banned_wada", "Walnut bark alias frequently hiding synthetic DMHA"),
        ("dmba", "banned_wada", "WADA S6 Prohibited Stimulant: AMP Citrate / 1,3-dimethylbutylamine"),
        ("amp citrate", "banned_wada", "WADA S6 Prohibited Stimulant (DMBA)"),
        ("1,3-dimethylbutylamine", "banned_wada", "WADA S6 Prohibited Stimulant (DMBA)"),
        ("ephedrine", "banned_wada", "WADA S6 Prohibited Stimulant (exceeds urine threshold / unsafe)"),
        ("ephedra sinica", "banned_wada", "Source of WADA S6 prohibited ephedrine alkaloids"),
        ("ma huang extract", "banned_wada", "Botanical source of prohibited ephedrine"),
        ("methylephedrine", "banned_wada", "WADA S6 Prohibited Stimulant"),
        ("pseudoephedrine", "banned_wada", "WADA S6 Prohibited Stimulant above threshold"),
        ("methylsynephrine", "banned_wada", "WADA S6 Prohibited Stimulant (Oxilofrine)"),
        ("oxilofrine", "banned_wada", "WADA S6 Prohibited Stimulant"),
        ("synephrine", "banned_wada", "Monitored / restricted sympathomimetic stimulant in athletic testing"),
        ("bitter orange extract", "banned_wada", "Source of synephrine/octopamine stimulant alkaloids"),
        ("octopamine", "banned_wada", "WADA S6 Prohibited Stimulant"),
        ("higenamine", "banned_wada", "WADA S3 Prohibited Beta-2 Agonist (also found in pre-workouts)"),
        ("norcoclaurine", "banned_wada", "WADA S3 Prohibited Beta-2 Agonist (Higenamine alias)"),
        ("bmpea", "banned_wada", "WADA S6 Prohibited Amphetamine-isomer Stimulant"),
        ("beta-methylphenethylamine", "banned_wada", "WADA S6 Prohibited Stimulant (BMPEA)"),
        ("acacia rigidula extract", "banned_wada", "Often adulterated with WADA-prohibited BMPEA/phenethylamines"),
        ("phenylethylamine", "banned_wada", "WADA S6 Structurally related phenethylamine stimulant risk"),
        ("n-methyl-tyramine", "banned_wada", "Sympathomimetic alkaloid flagged in athletic doping screens"),
        ("hordenine", "banned_wada", "Prohibited-category sympathomimetic alkaloid in sports nutrition"),
        ("modafinil", "banned_wada", "WADA S6 Prohibited Wakefulness Stimulant"),
        ("adrafinil", "banned_wada", "WADA S6 Prohibited Modafinil prodrug"),
        ("phenylpiracetam", "banned_wada", "WADA S6 Prohibited Stimulant"),
        ("ostarine", "banned_wada", "WADA S1 Prohibited Anabolic Agent (SARM MK-2866)"),
        ("mk-2866", "banned_wada", "WADA S1 Prohibited SARM (Ostarine)"),
        ("enobosarm", "banned_wada", "WADA S1 Prohibited SARM (Ostarine)"),
        ("ligandrol", "banned_wada", "WADA S1 Prohibited Anabolic Agent (SARM LGD-4033)"),
        ("lgd-4033", "banned_wada", "WADA S1 Prohibited SARM (Ligandrol)"),
        ("rad140", "banned_wada", "WADA S1 Prohibited Anabolic Agent (Testolone SARM)"),
        ("testolone", "banned_wada", "WADA S1 Prohibited SARM (RAD-140)"),
        ("andarine", "banned_wada", "WADA S1 Prohibited SARM (S-4)"),
        ("yk11", "banned_wada", "WADA S1 Prohibited Myostatin-inhibiting Anabolic SARM"),
        ("cardarine", "banned_wada", "WADA S4 Prohibited Metabolic Modulator (GW501516)"),
        ("gw501516", "banned_wada", "WADA S4 Prohibited PPAR-delta Agonist (Cardarine)"),
        ("stenabolic", "banned_wada", "WADA S4 Prohibited Metabolic Modulator (SR9009)"),
        ("sr9009", "banned_wada", "WADA S4 Prohibited Rev-ErbA Agonist"),
        ("ibutamoren", "banned_wada", "WADA S2 Prohibited Growth Hormone Secretagogue (MK-677)"),
        ("mk-677", "banned_wada", "WADA S2 Prohibited GH Secretagogue"),
        ("dhea", "banned_wada", "WADA S1 Prohibited Anabolic Prohormone (Dehydroepiandrosterone)"),
        ("dehydroepiandrosterone", "banned_wada", "WADA S1 Prohibited Anabolic Agent"),
        ("androstenedione", "banned_wada", "WADA S1 Prohibited Anabolic Steroid Precursor"),
        ("1-androsterone", "banned_wada", "WADA S1 Prohibited Anabolic Prohormone"),
        ("clenbuterol", "banned_wada", "WADA S1 Prohibited Anabolic Agent"),
        ("arimistane", "banned_wada", "WADA S4 Prohibited Aromatase Inhibitor"),
        ("androst-3,5-diene-7,17-dione", "banned_wada", "WADA S4 Prohibited Anti-Estrogenic Agent"),
        ("furosemide", "banned_wada", "WADA S5 Prohibited Loop Diuretic / Masking Agent"),
        ("hydrochlorothiazide", "banned_wada", "WADA S5 Prohibited Thiazide Diuretic"),
        ("sibutramine", "banned_wada", "WADA S6 Prohibited Stimulant / Adulterant in fat burners"),
        ("phenolphthalein", "banned_wada", "Prohibited hidden laxative adulterant in weight-loss blends"),
        ("deanol", "banned_wada", "Stimulant compound restricted in competitive testing"),
        ("methyltestosterone", "banned_wada", "WADA S1 Prohibited Oral Anabolic Steroid"),
        ("1-androstenediol", "banned_wada", "WADA S1 Prohibited Anabolic Prohormone"),
        ("4-androstenedione", "banned_wada", "WADA S1 Prohibited Anabolic Steroid Precursor"),
        ("methasterone", "banned_wada", "WADA S1 Prohibited Designer Anabolic Steroid (Superdrol)"),
        ("trenbolone", "banned_wada", "WADA S1 Prohibited Anabolic Steroid"),
        ("tadalafil", "banned_wada", "Undeclared prescription PDE5 inhibitor adulterant"),
        ("sildenafil", "banned_wada", "Undeclared prescription PDE5 inhibitor adulterant"),
        ("tribulus terrestris", "harmful", "Athlete contamination risk herb (flagged by anti-doping bodies)"),
    ]

    csv_path = DATA_DIR / "ingredients.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["ingredient", "class", "notes"])
        writer.writerows(rows)

    print(f"[ingredients.csv] Wrote {len(rows)} labeled rows to {csv_path}")
    return csv_path


def build_spiking_dataset(n_rows: int = 600, seed: int = 42) -> Path:
    """
    Generate synthetic amino-spiking dataset (/ml-service/data/spiking.csv).

    Synthetic Generation Rules:
    - Class 0 (Not spiked / low risk): free_amino_count == 0 (or 1 trace amino at end
      with no protein gap), no proprietary blend, min_spiking_position >= 0.75,
      protein_gap_g <= 1.5g.
    - Class 1 (Spiked / medium-to-high risk): 1-4 cheap non-protein amino acids
      (glycine, taurine, alanine, glutamine peptides, creatine) placed early in the
      ingredient list (min_spiking_position 0.05-0.55) OR hidden inside a
      proprietary blend alongside an inflated claimed vs expected protein gap
      (protein_gap_g 3.5g - 15.0g).
    - Also includes non-protein pre-workouts/creatine tubs where free amino acids
      like creatine/taurine appear legitimately without claiming 24g whey protein
      (protein_gap_g ~ 0), teaching the model not to falsely flag creatine tubs!
    """
    rng = np.random.default_rng(seed)
    records = []

    for i in range(n_rows):
        archetype = rng.choice(
            ["clean_whey", "clean_non_protein", "mild_spike", "heavy_spike", "prop_blend_spike"],
            p=[0.32, 0.16, 0.16, 0.22, 0.14],
        )

        if archetype == "clean_whey":
            free_amino_count = int(rng.choice([0, 0, 0, 1]))
            min_pos = 1.0 if free_amino_count == 0 else float(rng.uniform(0.75, 0.98))
            mean_pos = min_pos
            has_prop = 0
            claimed_protein = float(rng.uniform(20.0, 28.0))
            expected_protein = claimed_protein - float(rng.uniform(-0.8, 1.2))
            is_spiked = 0

        elif archetype == "clean_non_protein":
            # Creatine or pre-workout where claimed protein is 0g (no nitrogen protein fraud)
            free_amino_count = int(rng.integers(1, 3))
            min_pos = float(rng.uniform(0.05, 0.5))
            mean_pos = float(min(1.0, min_pos + rng.uniform(0.05, 0.3)))
            has_prop = int(rng.choice([0, 1], p=[0.7, 0.3]))
            claimed_protein = 0.0
            expected_protein = 0.0
            is_spiked = 0

        elif archetype == "mild_spike":
            free_amino_count = int(rng.integers(1, 3))
            min_pos = float(rng.uniform(0.30, 0.65))
            mean_pos = float(min(1.0, min_pos + rng.uniform(0.05, 0.25)))
            has_prop = int(rng.choice([0, 1], p=[0.6, 0.4]))
            claimed_protein = float(rng.uniform(22.0, 26.0))
            protein_gap = float(rng.uniform(3.0, 6.5))
            expected_protein = max(5.0, claimed_protein - protein_gap)
            is_spiked = 1

        elif archetype == "heavy_spike":
            free_amino_count = int(rng.integers(2, 6))
            min_pos = float(rng.uniform(0.05, 0.35))
            mean_pos = float(min(1.0, min_pos + rng.uniform(0.05, 0.25)))
            has_prop = int(rng.choice([0, 1], p=[0.4, 0.6]))
            claimed_protein = float(rng.uniform(24.0, 30.0))
            protein_gap = float(rng.uniform(7.5, 16.0))
            expected_protein = max(4.0, claimed_protein - protein_gap)
            is_spiked = 1

        else:  # prop_blend_spike
            free_amino_count = int(rng.integers(2, 5))
            min_pos = float(rng.uniform(0.10, 0.45))
            mean_pos = float(min(1.0, min_pos + rng.uniform(0.05, 0.20)))
            has_prop = 1
            claimed_protein = float(rng.uniform(22.0, 28.0))
            protein_gap = float(rng.uniform(5.5, 13.5))
            expected_protein = max(5.0, claimed_protein - protein_gap)
            is_spiked = 1

        protein_gap_g = round(claimed_protein - expected_protein, 2)
        records.append({
            "min_spiking_position": round(min_pos, 3),
            "mean_spiking_position": round(mean_pos, 3),
            "free_amino_count": free_amino_count,
            "has_proprietary_blend": has_prop,
            "claimed_protein_g": round(claimed_protein, 2),
            "expected_protein_g": round(expected_protein, 2),
            "protein_gap_g": protein_gap_g,
            "is_spiked": is_spiked,
        })

    df = pd.DataFrame(records)
    csv_path = DATA_DIR / "spiking.csv"
    df.to_csv(csv_path, index=False)
    print(f"[spiking.csv] Wrote {len(df)} synthetic rows to {csv_path}")
    return csv_path


def build_scores_dataset(n_rows: int = 1000, seed: int = 42) -> Path:
    """
    Generate synthetic Purity / Health Score dataset (/ml-service/data/scores.csv)
    with >= 800 rows well spread across 0-100:
      - Clean isolates (80-95)
      - Average blends (50-75)
      - Sugary or artificially sweetened products (35-60)
      - Amino-spiked products (20-45)
      - Proprietary-blend products with hidden doses (30-55)
      - Banned or stimulant-laced products (0-20)

    IMPORTANT NOTE:
    These target scores (0-100) are generated from domain-expert rules plus realistic
    noise to ensure a balanced 0-100 distribution. Replace with real lab assays later.
    """
    rng = np.random.default_rng(seed)
    rows = []

    archetypes = [
        "clean_isolate",
        "average_blend",
        "sugary_artificial",
        "amino_spiked",
        "proprietary_hidden",
        "banned_laced",
    ]
    probs = [0.20, 0.20, 0.16, 0.16, 0.14, 0.14]

    for _ in range(n_rows):
        archetype = rng.choice(archetypes, p=probs)

        if archetype == "clean_isolate":
            protein_per_serving_g = float(rng.uniform(23.5, 29.0))
            serving_size_g = float(rng.uniform(28.0, 34.0))
            protein_percent = round(min(96.0, (protein_per_serving_g / serving_size_g) * 100.0), 2)
            sugar_g = float(rng.uniform(0.0, 1.5))
            harmful_count = int(rng.choice([0, 0, 0, 1]))
            banned_count = 0
            artificial_sweetener_count = int(rng.choice([0, 0, 1]))
            artificial_color_count = 0
            spiking_prob = float(rng.uniform(0.01, 0.10))
            blend_transparency = 1.0
            unrecognized_ratio = float(rng.uniform(0.0, 0.08))
            ocr_match_confidence = float(rng.uniform(0.84, 1.0))
            target = float(rng.uniform(81.0, 95.0))
            target -= harmful_count * 4.0 + artificial_sweetener_count * 3.0 + sugar_g * 1.2 + unrecognized_ratio * 15.0

        elif archetype == "average_blend":
            protein_per_serving_g = float(rng.uniform(19.0, 24.5))
            serving_size_g = float(rng.uniform(31.0, 40.0))
            protein_percent = round((protein_per_serving_g / serving_size_g) * 100.0, 2)
            sugar_g = float(rng.uniform(1.5, 4.5))
            harmful_count = int(rng.integers(1, 3))
            banned_count = 0
            artificial_sweetener_count = int(rng.integers(1, 3))
            artificial_color_count = int(rng.choice([0, 0, 1]))
            spiking_prob = float(rng.uniform(0.08, 0.28))
            blend_transparency = float(rng.choice([1.0, 0.75]))
            unrecognized_ratio = float(rng.uniform(0.02, 0.20))
            ocr_match_confidence = float(rng.uniform(0.68, 0.96))
            target = float(rng.uniform(54.0, 74.0))
            target -= (harmful_count - 1) * 3.0 + artificial_color_count * 3.0 + (sugar_g - 2.0) * 1.5

        elif archetype == "sugary_artificial":
            protein_per_serving_g = float(rng.uniform(8.0, 20.0))
            serving_size_g = float(rng.uniform(45.0, 85.0))
            protein_percent = round((protein_per_serving_g / serving_size_g) * 100.0, 2)
            sugar_g = float(rng.uniform(7.0, 28.0))
            harmful_count = int(rng.integers(2, 6))
            banned_count = 0
            artificial_sweetener_count = int(rng.integers(1, 4))
            artificial_color_count = int(rng.integers(1, 4))
            spiking_prob = float(rng.uniform(0.10, 0.38))
            blend_transparency = float(rng.choice([1.0, 0.65]))
            unrecognized_ratio = float(rng.uniform(0.05, 0.28))
            ocr_match_confidence = float(rng.uniform(0.62, 0.94))
            target = float(rng.uniform(36.0, 58.0))
            target -= max(0.0, (sugar_g - 10.0) * 0.45) + artificial_color_count * 1.8

        elif archetype == "amino_spiked":
            protein_per_serving_g = float(rng.uniform(16.0, 25.0))
            serving_size_g = float(rng.uniform(32.0, 42.0))
            protein_percent = round((protein_per_serving_g / serving_size_g) * 100.0, 2)
            sugar_g = float(rng.uniform(1.5, 6.0))
            harmful_count = int(rng.integers(2, 6))
            banned_count = 0
            artificial_sweetener_count = int(rng.integers(1, 3))
            artificial_color_count = int(rng.integers(0, 3))
            spiking_prob = float(rng.uniform(0.66, 0.99))
            blend_transparency = float(rng.choice([0.0, 0.35, 0.6]))
            unrecognized_ratio = float(rng.uniform(0.04, 0.25))
            ocr_match_confidence = float(rng.uniform(0.62, 0.95))
            target = float(rng.uniform(22.0, 44.0))
            target -= (spiking_prob - 0.65) * 20.0 + harmful_count * 1.2

        elif archetype == "proprietary_hidden":
            protein_per_serving_g = float(rng.uniform(0.0, 16.0))
            serving_size_g = float(rng.uniform(8.0, 30.0))
            protein_percent = round((protein_per_serving_g / max(1.0, serving_size_g)) * 100.0, 2)
            sugar_g = float(rng.uniform(0.5, 6.5))
            harmful_count = int(rng.integers(1, 5))
            banned_count = 0
            artificial_sweetener_count = int(rng.integers(1, 3))
            artificial_color_count = int(rng.integers(0, 3))
            spiking_prob = float(rng.uniform(0.25, 0.60))
            blend_transparency = float(rng.uniform(0.0, 0.30))
            unrecognized_ratio = float(rng.uniform(0.10, 0.35))
            ocr_match_confidence = float(rng.uniform(0.55, 0.90))
            target = float(rng.uniform(32.0, 54.0))
            target -= (1.0 - blend_transparency) * 5.0 + artificial_color_count * 2.0

        else:  # banned_laced (0-20)
            protein_per_serving_g = float(rng.choice([0.0, rng.uniform(0.0, 20.0)]))
            serving_size_g = float(rng.uniform(6.0, 28.0))
            protein_percent = round((protein_per_serving_g / max(1.0, serving_size_g)) * 100.0, 2)
            sugar_g = float(rng.uniform(0.0, 4.0))
            harmful_count = int(rng.integers(1, 5))
            banned_count = int(rng.integers(1, 4))
            artificial_sweetener_count = int(rng.integers(0, 3))
            artificial_color_count = int(rng.integers(0, 3))
            spiking_prob = float(rng.uniform(0.05, 0.55))
            blend_transparency = float(rng.choice([0.0, 0.25, 0.6]))
            unrecognized_ratio = float(rng.uniform(0.0, 0.25))
            ocr_match_confidence = float(rng.uniform(0.65, 0.98))
            target = float(rng.uniform(4.0, 19.0))
            target -= (banned_count - 1) * 3.5

        noise = float(rng.normal(0.0, 1.8))
        final_score = float(np.clip(target + noise, 1.0, 96.0))
        if banned_count > 0:
            final_score = min(final_score, 20.0)
        elif spiking_prob >= 0.65:
            final_score = min(final_score, 45.0)

        rows.append({
            "harmful_count": harmful_count,
            "banned_count": banned_count,
            "artificial_sweetener_count": artificial_sweetener_count,
            "artificial_color_count": artificial_color_count,
            "sugar_g": round(sugar_g, 2),
            "protein_per_serving_g": round(protein_per_serving_g, 2),
            "protein_percent": protein_percent,
            "spiking_risk_probability": round(spiking_prob, 3),
            "blend_transparency": round(blend_transparency, 2),
            "unrecognized_ratio": round(unrecognized_ratio, 3),
            "ocr_match_confidence": round(ocr_match_confidence, 3),
            "score": round(final_score, 2),
        })

    df = pd.DataFrame(rows)
    csv_path = DATA_DIR / "scores.csv"
    df.to_csv(csv_path, index=False)
    print(f"[scores.csv] Wrote {len(df)} rows to {csv_path}")
    return csv_path


if __name__ == "__main__":
    build_ingredients_dataset()
    build_spiking_dataset(n_rows=600)
    build_scores_dataset(n_rows=1000)
