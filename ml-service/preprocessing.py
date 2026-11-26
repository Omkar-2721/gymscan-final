"""
Shared ingredient preprocessing, OCR error normalization, and synonym mapping.
Used consistently during model training (train.py) and FastAPI inference (main.py).
"""

import re

# Common food/supplement additive E-numbers and synonym expansions
SYNONYM_MAP = {
    "e951": "aspartame",
    "e 951": "aspartame",
    "nutrasweet": "aspartame",
    "equal": "aspartame",
    "e955": "sucralose",
    "e 955": "sucralose",
    "ins 955": "sucralose",
    "splenda": "sucralose",
    "e950": "acesulfame potassium",
    "e 950": "acesulfame potassium",
    "ins 950": "acesulfame potassium",
    "ace k": "acesulfame potassium",
    "ace-k": "acesulfame potassium",
    "acesulfame k": "acesulfame potassium",
    "e954": "saccharin",
    "e 954": "saccharin",
    "e965": "maltitol",
    "e 965": "maltitol",
    "e420": "sorbitol",
    "e 420": "sorbitol",
    "e953": "isomalt",
    "e1200": "polydextrose",
    "e129": "red 40",
    "allura red": "red 40",
    "allura red ac": "red 40",
    "fd&c red 40": "red 40",
    "e102": "yellow 5",
    "tartrazine": "yellow 5",
    "fd&c yellow 5": "yellow 5",
    "e110": "yellow 6",
    "sunset yellow": "yellow 6",
    "sunset yellow fcf": "yellow 6",
    "e133": "blue 1",
    "brilliant blue": "blue 1",
    "brilliant blue fcf": "blue 1",
    "e171": "titanium dioxide",
    "e211": "sodium benzoate",
    "e202": "potassium sorbate",
    "e320": "bha",
    "butylated hydroxyanisole": "bha",
    "e321": "bht",
    "butylated hydroxytoluene": "bht",
    "e407": "carrageenan",
    "e960": "stevia leaf extract",
    "steviol glycosides": "stevia leaf extract",
    "reb a": "stevia leaf extract",
    "wpi": "whey protein isolate",
    "wpc": "whey protein concentrate",
    "wph": "hydrolyzed whey protein isolate",
    "1 3 dimethylamylamine": "dmaa",
    "1,3-dimethylamylamine": "dmaa",
    "methylhexanamine": "dmaa",
    "geranamine": "dmaa",
    "geranium stem extract": "dmaa",
    "2 amino 6 methylheptane": "dmha",
    "2-amino-6-methylheptane": "dmha",
    "2 aminoisoheptane": "dmha",
    "octodrine": "dmha",
    "kigelia africana extract": "dmha",
    "citrus aurantium": "synephrine",
    "bitter orange extract": "synephrine",
    "oxilofrine": "methylsynephrine",
    "mk 2866": "ostarine",
    "mk-2866": "ostarine",
    "enobosarm": "ostarine",
    "lgd 4033": "ligandrol",
    "lgd-4033": "ligandrol",
    "gw 501516": "cardarine",
    "gw-501516": "cardarine",
    "endurobol": "cardarine",
    "yk 11": "yk11",
    "yk-11": "yk11",
    "rad 140": "rad140",
    "rad-140": "rad140",
    "testolone": "rad140",
    "s-4": "andarine",
    "s4 sarm": "andarine",
    "4-ad": "androstenedione",
    "4-androstenedione": "androstenedione",
    "1-ad": "1-androstenediol",
    "1-andro": "1-androstenediol",
    "1-androsterone": "1-androstenediol",
    "superdrol": "methasterone",
    "trenavar": "trenbolone",
    "lasix": "furosemide",
    "hctz": "hydrochlorothiazide",
    "cialis": "tadalafil",
    "viagra": "sildenafil",
    "dehydroepiandrosterone": "dhea",
    "7-keto dhea": "dhea",
    "norcoclaurine": "higenamine",
    "ma huang": "ephedrine",
    "ma huang extract": "ephedrine",
    "ephedra": "ephedrine",
    "ephedra sinica": "ephedrine",
    "geranium extract": "dmaa",
    "geranium oil": "dmaa",
}

# Common OCR digit/character substitutions found on curved gym supplement tubs
OCR_CHAR_FIXES = [
    (r"\b0(?=[a-z]{2,})", "o"),
    (r"(?<=[a-z])0(?=[a-z])", "o"),
    (r"(?<=[0-9])o(?=[0-9])", "0"),
    (r"(?<=[a-z])1(?=[a-z])", "l"),
    (r"(?<=[a-z])5(?=[a-z])", "s"),
    (r"\|", "l"),
]

# Cheap non-protein or nitrogen-inflating free amino acids used in amino spiking
SPIKING_AMINO_TERMS = [
    "glycine",
    "l-glycine",
    "taurine",
    "l-taurine",
    "alanine",
    "l-alanine",
    "creatine",
    "creatine monohydrate",
    "glutamine",
    "l-glutamine",
    "glutamine peptides",
    "beta alanine",
    "beta-alanine",
    "arginine",
    "l-arginine",
    "proline",
    "l-proline",
    "serine",
    "free form amino",
    "amino acid blend",
    "nitrogen matrix",
]

INTACT_PROTEIN_TERMS = [
    "whey protein isolate",
    "whey protein concentrate",
    "hydrolyzed whey",
    "whey protein hydrolysate",
    "micellar casein",
    "milk protein isolate",
    "milk protein concentrate",
    "calcium caseinate",
    "pea protein isolate",
    "brown rice protein",
    "soy protein isolate",
    "egg white protein",
    "whey protein blend",
    "whey protein crisps",
]

PROPRIETARY_BLEND_TERMS = [
    "proprietary blend",
    "proprietary matrix",
    "amino matrix",
    "anabolic matrix",
    "performance blend",
    "nitrogen blend",
    "recovery complex",
    "energy matrix",
    "pump blend",
]


def normalize_ingredient(text: str) -> str:
    """
    Normalize a raw OCR ingredient token:
    1. Lowercase and trim
    2. Normalize common OCR character mistakes (e.g. 0->o, 1->l, |->l)
    3. Remove punctuation while preserving words
    4. Expand E-numbers and chemical synonyms (e.g. e951 -> aspartame)
    """
    if not text or not isinstance(text, str):
        return ""

    cleaned = text.lower().strip()

    # Apply OCR digit-to-letter fixes on likely alphabetic words
    for pattern, repl in OCR_CHAR_FIXES:
        cleaned = re.sub(pattern, repl, cleaned)

    # Replace separators/brackets/punctuation with spaces
    cleaned = re.sub(r"[/\\(),.;:\[\]{}*%#@!?\+\"'`~^]+", " ", cleaned)
    cleaned = cleaned.replace("-", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    if not cleaned:
        return ""

    # Exact synonym check first
    if cleaned in SYNONYM_MAP:
        return SYNONYM_MAP[cleaned]

    # Substring replacement for E-numbers and key aliases
    for alias, canonical in SYNONYM_MAP.items():
        alias_norm = alias.replace("-", " ")
        pattern = r"\b" + re.escape(alias_norm) + r"\b"
        if re.search(pattern, cleaned):
            cleaned = re.sub(pattern, canonical, cleaned)

    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def is_spiking_amino_acid(normalized_token: str) -> bool:
    return any(term.replace("-", " ") in normalized_token for term in SPIKING_AMINO_TERMS)


def is_intact_protein_source(normalized_token: str) -> bool:
    return any(term in normalized_token for term in INTACT_PROTEIN_TERMS)


def has_proprietary_blend_phrase(text: str) -> bool:
    lower = (text or "").lower()
    return any(term in lower for term in PROPRIETARY_BLEND_TERMS)
