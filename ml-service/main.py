"""
GymScan ML FastAPI Service
Provides:
  - GET  /health    : Service & loaded models health check
  - POST /ocr       : Optional EasyOCR text extraction (multipart file or base64 JSON)
  - POST /classify  : Ingredient classification (beneficial / neutral / harmful / banned_wada)
  - POST /spiking   : RandomForest amino-spiking risk detector
  - POST /score     : Cross-validated Purity / Health Score regressor + SHAP-style explanation

Run locally (Dockerfile-free):
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import base64
import io
import re
import time
from pathlib import Path
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel, Field
from rapidfuzz import fuzz, process

from preprocessing import (
    has_proprietary_blend_phrase,
    is_intact_protein_source,
    is_spiking_amino_acid,
    normalize_ingredient,
)

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"

app = FastAPI(
    title="GymScan ML Service",
    version="1.0.0",
    description="ML-powered supplement ingredient classification, amino-spiking detection, and purity scoring.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Loaded model artifacts (initialized on startup)
MODELS = {
    "classifier": None,
    "spiking": None,
    "scorer": None,
}
EASYOCR_READER = None

DEFAULT_CLASS_REASONS = {
    "beneficial": "Clean bioavailable nutrient or natural functional ingredient.",
    "neutral": "Standard food carrier, stabilizer, or flavoring agent.",
    "harmful": "Synthetic additive, cheap glycemic filler, or amino-spiking agent.",
    "banned_wada": "Matches public WADA Prohibited List category; re-check official WADA list.",
}

FEATURE_LABELS = {
    "harmful_count": "Harmful / filler ingredients",
    "banned_count": "WADA-prohibited substances",
    "artificial_sweetener_count": "Artificial sweeteners",
    "artificial_color_count": "Artificial food dyes",
    "sugar_g": "Sugar content (g)",
    "protein_per_serving_g": "Protein per serving (g)",
    "protein_percent": "Protein density (%)",
    "spiking_risk_probability": "Amino-spiking probability",
    "blend_transparency": "Label blend transparency",
    "unrecognized_ratio": "Unrecognized ingredient ratio",
    "ocr_match_confidence": "OCR match confidence",
}

EXPECTED_SCORE_FEATURES = [
    "harmful_count",
    "banned_count",
    "artificial_sweetener_count",
    "artificial_color_count",
    "sugar_g",
    "protein_per_serving_g",
    "protein_percent",
    "spiking_risk_probability",
    "blend_transparency",
    "unrecognized_ratio",
    "ocr_match_confidence",
]

TRAINING_IN_PROGRESS = False


def load_models(auto_train: bool = True):
    global TRAINING_IN_PROGRESS
    cls_path = MODELS_DIR / "ingredient_classifier.joblib"
    spk_path = MODELS_DIR / "spiking_detector.joblib"
    scr_path = MODELS_DIR / "purity_scorer.joblib"

    needs_train = not (cls_path.exists() and spk_path.exists() and scr_path.exists())
    if not needs_train:
        scr_check = joblib.load(scr_path)
        if list(scr_check.get("features", [])) != EXPECTED_SCORE_FEATURES:
            needs_train = True

    if needs_train and auto_train and not TRAINING_IN_PROGRESS:
        print("[GymScan ML] Model artifacts missing or outdated — auto-training on startup...")
        TRAINING_IN_PROGRESS = True
        try:
            from train import main as run_training
            run_training()
        finally:
            TRAINING_IN_PROGRESS = False

    if not (cls_path.exists() and spk_path.exists() and scr_path.exists()):
        raise RuntimeError(
            "Trained ML models not found in /ml-service/models. Run 'npm run ml:setup' or 'python train.py'."
        )

    MODELS["classifier"] = joblib.load(cls_path)
    MODELS["spiking"] = joblib.load(spk_path)
    MODELS["scorer"] = joblib.load(scr_path)


@app.on_event("startup")
def startup_event():
    try:
        load_models(auto_train=True)
        print("[GymScan ML] All 3 ML models loaded and ready.")
    except Exception as exc:
        print(f"[GymScan ML Warning] Startup model load failed: {exc}")


def ensure_models_ready():
    if any(v is None for v in MODELS.values()):
        load_models(auto_train=True)


def get_easyocr_reader():
    global EASYOCR_READER
    if EASYOCR_READER is None:
        import easyocr
        EASYOCR_READER = easyocr.Reader(["en"], gpu=False, verbose=False)
    return EASYOCR_READER


# ---------------------------- Pydantic Schemas ----------------------------

class ClassifyRequest(BaseModel):
    ingredients: List[str] = Field(default_factory=list)
    raw_text: Optional[str] = None


class SpikingRequest(BaseModel):
    ingredients: List[str] = Field(default_factory=list)
    raw_text: Optional[str] = ""
    claimed_protein_g: float = 24.0
    serving_size_g: float = 32.0
    category: Optional[str] = ""


class ScoreRequest(BaseModel):
    harmful_count: int = 0
    banned_count: int = 0
    artificial_sweetener_count: int = 0
    artificial_color_count: int = 0
    sugar_g: Optional[float] = None
    protein_per_serving_g: Optional[float] = None
    serving_size_g: Optional[float] = None
    protein_percent: Optional[float] = None
    spiking_risk_probability: float = 0.05
    blend_transparency: Optional[float] = None
    unrecognized_ratio: float = 0.0
    ocr_match_confidence: float = 1.0
    recognized_count: Optional[int] = None
    is_non_label: bool = False


# ---------------------------- Endpoints ----------------------------

@app.get("/health")
def health():
    model_status = {k: (v is not None) for k, v in MODELS.items()}
    loaded = all(model_status.values())
    try:
        import easyocr  # noqa: F401
        easyocr_installed = True
    except Exception:
        easyocr_installed = False

    return {
        "status": "ok" if loaded else "models_missing",
        "models_loaded": loaded,
        "models": model_status,
        "training_in_progress": TRAINING_IN_PROGRESS,
        "easyocr_available": easyocr_installed,
        "disclaimer": "Informational only, not medical or legal advice.",
    }


@app.post("/ocr")
async def extract_ocr_text(request: Request, file: Optional[UploadFile] = File(default=None)):
    """
    Optional EasyOCR endpoint supporting either multipart file upload or
    JSON body `{ "image_base64": "data:image/...;base64,..." }`.
    """
    started = time.perf_counter()
    image_bytes = None

    if file is not None:
        image_bytes = await file.read()
    else:
        try:
            body = await request.json()
        except Exception:
            body = {}
        image_b64 = body.get("image_base64") or body.get("image")
        if not image_b64 or not isinstance(image_b64, str):
            raise HTTPException(status_code=400, detail="Provide an image file or image_base64 string.")
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]
        try:
            image_bytes = base64.b64decode(image_b64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 image payload.")

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        # Cap image size to 1000px max dimension for fast CPU EasyOCR latency
        max_dim = 1000
        if max(img.size) > max_dim:
            img.thumbnail((max_dim, max_dim))
        img_np = np.array(img)
        reader = get_easyocr_reader()
        lines = reader.readtext(img_np, detail=0, paragraph=False)
        text = "\n".join(str(line).strip() for line in lines if str(line).strip())
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        return {
            "text": text,
            "lines": lines,
            "engine": "easyocr",
            "elapsed_ms": elapsed_ms,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"EasyOCR failed: {exc}")


@app.post("/classify")
def classify_ingredients(req: ClassifyRequest):
    """
    Classify each ingredient into beneficial / neutral / harmful / banned_wada
    using preprocessing + RapidFuzz OCR typo recovery + TF-IDF char n-gram classifier.
    """
    ensure_models_ready()
    artifact = MODELS["classifier"]
    pipe = artifact["pipeline"]
    catalog = artifact["catalog"]
    catalog_keys = list(catalog.keys())

    raw_items = list(req.ingredients)
    if not raw_items and req.raw_text:
        raw_items = [
            tok.strip()
            for tok in re.split(r"[,;\n•|\t/:]+", req.raw_text)
            if len(tok.strip()) > 2
        ]

    if not raw_items:
        raise HTTPException(status_code=400, detail="Provide at least one ingredient or raw_text.")

    counts = {"beneficial": 0, "neutral": 0, "harmful": 0, "banned_wada": 0}
    results = []

    for raw in raw_items:
        norm = normalize_ingredient(raw)
        if not norm:
            continue

        # 1. Exact or RapidFuzz match against canonical dataset (handles OCR typos cleanly)
        fuzzy_hit = None
        if norm in catalog:
            fuzzy_hit = (norm, 100.0)
        else:
            match = process.extractOne(norm, catalog_keys, scorer=fuzz.WRatio)
            if match and match[1] >= 86.0:
                fuzzy_hit = (match[0], float(match[1]))

        if fuzzy_hit:
            matched_key, sim_score = fuzzy_hit
            meta = catalog[matched_key]
            pred_class = meta["class"]
            # Combine fuzzy match score with classifier probability if available
            probs = pipe.predict_proba([matched_key])[0]
            clf_classes = list(pipe.classes_)
            clf_prob = float(probs[clf_classes.index(pred_class)]) if pred_class in clf_classes else 0.85
            confidence = round(min(0.99, max(clf_prob, sim_score / 100.0 * 0.96)), 3)
            reason = meta["notes"]
            matched_via = "exact" if sim_score == 100.0 else f"fuzzy ({int(sim_score)}%)"
            recognized = True
        else:
            probs = pipe.predict_proba([norm])[0]
            best_idx = int(np.argmax(probs))
            pred_class = str(pipe.classes_[best_idx])
            confidence = round(float(probs[best_idx]), 3)
            reason = DEFAULT_CLASS_REASONS.get(pred_class, "Classified by ML text model.")
            matched_via = "tfidf_ml"
            recognized = confidence >= 0.68

        counts[pred_class] = counts.get(pred_class, 0) + 1
        results.append({
            "ingredient": raw.strip(),
            "normalized": norm,
            "class": pred_class,
            "confidence": confidence,
            "recognized": recognized,
            "reason": reason,
            "method": matched_via,
        })

    return {
        "results": results,
        "counts": counts,
        "model_used": artifact["model_name"],
        "disclaimer": "Informational only, not medical advice. Check the official WADA list for competition.",
    }


@app.post("/spiking")
def detect_amino_spiking(req: SpikingRequest):
    """
    Detect amino-spiking risk using RandomForest trained on ingredient positions,
    free-amino counts, proprietary blend masking, and claimed vs expected protein gap.
    """
    ensure_models_ready()
    bundle = MODELS["spiking"]
    rf_model = bundle["model"]
    feature_cols = bundle["features"]

    tokens = list(req.ingredients)
    if not tokens and req.raw_text:
        tokens = [
            tok.strip()
            for tok in re.split(r"[,;\n•|\t/:]+", req.raw_text)
            if len(tok.strip()) > 2
        ]

    total = max(len(tokens), 1)
    spiking_positions = []
    detected_spiking_agents = []
    intact_protein_count = 0

    for idx, tok in enumerate(tokens):
        norm = normalize_ingredient(tok)
        if not norm:
            continue
        if is_intact_protein_source(norm):
            intact_protein_count += 1
        if is_spiking_amino_acid(norm):
            # Ignore pure creatine category products where creatine IS the sole product
            if "creatine" in norm and "creatine" in (req.category or "").lower() and req.claimed_protein_g <= 5:
                continue
            rel_pos = idx / max(total - 1, 1) if total > 1 else 0.0
            spiking_positions.append(rel_pos)
            detected_spiking_agents.append(tok.strip())

    free_amino_count = len(detected_spiking_agents)
    min_pos = min(spiking_positions) if spiking_positions else 1.0
    mean_pos = float(np.mean(spiking_positions)) if spiking_positions else 1.0

    combined_text = f"{req.raw_text or ''} {' '.join(tokens)}"
    has_prop = 1 if has_proprietary_blend_phrase(combined_text) else 0

    claimed_protein = max(0.0, float(req.claimed_protein_g))
    # Expected protein heuristic for estimating nitrogen inflation gap
    if claimed_protein <= 5.0 and "pre-workout" in (req.category or "").lower():
        expected_protein = claimed_protein
    elif free_amino_count == 0 and not has_prop:
        expected_protein = claimed_protein
    else:
        early_penalty = 0.22 if min_pos <= 0.4 else 0.10
        blend_penalty = 0.14 if has_prop else 0.0
        amino_penalty = min(0.45, free_amino_count * 0.14)
        intact_factor = max(0.35, 1.0 - (early_penalty + blend_penalty + amino_penalty))
        if intact_protein_count == 0 and claimed_protein > 10:
            intact_factor = min(intact_factor, 0.45)
        expected_protein = claimed_protein * intact_factor

    protein_gap = max(0.0, claimed_protein - expected_protein)

    feature_row = {
        "min_spiking_position": round(min_pos, 3),
        "mean_spiking_position": round(mean_pos, 3),
        "free_amino_count": free_amino_count,
        "has_proprietary_blend": has_prop,
        "claimed_protein_g": round(claimed_protein, 2),
        "expected_protein_g": round(expected_protein, 2),
        "protein_gap_g": round(protein_gap, 2),
    }

    prob = float(rf_model.predict_proba(pd.DataFrame([feature_row])[feature_cols])[0][1])

    # Guard against flagging products with zero spiking agents and no proprietary blend
    if free_amino_count == 0 and has_prop == 0:
        prob = min(prob, 0.12)

    if prob >= 0.65:
        risk = "high"
    elif prob >= 0.30:
        risk = "medium"
    else:
        risk = "low"

    if free_amino_count > 0:
        pos_desc = "early in the ingredient list" if min_pos <= 0.4 else "mid-to-late in the ingredient list"
        blend_note = " inside an undisclosed proprietary blend" if has_prop else ""
        gap_note = (
            f" Estimated protein gap of {protein_gap:.1f}g vs {claimed_protein:.1f}g claimed."
            if protein_gap >= 2.0
            else ""
        )
        explanation = (
            f"Detected {free_amino_count} cheap non-protein/free amino compound(s) "
            f"({', '.join(detected_spiking_agents[:3])}) appearing {pos_desc}{blend_note}.{gap_note}"
        )
    elif has_prop:
        explanation = (
            "An undisclosed proprietary blend hides exact ingredient quantities, creating moderate transparency risk."
        )
    else:
        explanation = (
            "No free non-protein nitrogen spiking agents detected; protein claims align with intact protein sources."
        )

    return {
        "spiking_risk": risk,
        "probability": round(prob, 3),
        "detected_spiking_agents": detected_spiking_agents,
        "features": feature_row,
        "explanation": explanation,
    }


@app.post("/score")
def predict_purity_score(req: ScoreRequest):
    """
    Predict 0-100 Purity / Health Score using the cross-validated best regressor,
    treat missing data conservatively as risk, and enforce strict post-prediction hard rules:
      - unrecognized_ratio > 0.40 or ocr_match_confidence < 0.50 -> blocked ("Not enough readable data - retake photo")
      - any banned/WADA ingredient -> capped at 20 and verdict "BANNED / UNSAFE"
      - high spiking risk (>= 0.65) -> capped at 45
      - proprietary blend with hidden amounts (blend_transparency <= 0.35) -> -10 pts
    """
    ensure_models_ready()
    bundle = MODELS["scorer"]
    model = bundle["model"]
    feature_cols = bundle["features"]
    feature_means = bundle["feature_means"]

    unrecognized_ratio = float(np.clip(req.unrecognized_ratio, 0.0, 1.0))
    ocr_match_conf = float(np.clip(req.ocr_match_confidence, 0.0, 1.0))

    # Conservative risk defaults when nutrition values are unreadable / missing
    missing_macros = req.protein_per_serving_g is None or req.sugar_g is None
    protein_g = max(0.0, float(req.protein_per_serving_g)) if req.protein_per_serving_g is not None else 10.0
    serving_g = max(1.0, float(req.serving_size_g)) if req.serving_size_g is not None else 35.0
    sugar_g = max(0.0, float(req.sugar_g)) if req.sugar_g is not None else 6.0
    if req.protein_percent is not None:
        protein_pct = float(np.clip(req.protein_percent, 0.0, 100.0))
    elif req.protein_per_serving_g is None:
        protein_pct = 28.5
    else:
        protein_pct = round(min(100.0, (protein_g / serving_g) * 100.0), 2)

    blend_transparency = float(np.clip(req.blend_transparency, 0.0, 1.0)) if req.blend_transparency is not None else 0.45
    harmful_count = max(0, int(req.harmful_count))
    banned_count = max(0, int(req.banned_count))
    sweetener_count = max(0, int(req.artificial_sweetener_count))
    color_count = max(0, int(req.artificial_color_count))
    spiking_prob = float(np.clip(req.spiking_risk_probability, 0.0, 1.0))

    input_row = {
        "harmful_count": harmful_count,
        "banned_count": banned_count,
        "artificial_sweetener_count": sweetener_count,
        "artificial_color_count": color_count,
        "sugar_g": sugar_g,
        "protein_per_serving_g": protein_g,
        "protein_percent": protein_pct,
        "spiking_risk_probability": spiking_prob,
        "blend_transparency": blend_transparency,
        "unrecognized_ratio": unrecognized_ratio,
        "ocr_match_confidence": ocr_match_conf,
    }

    # Block score ONLY when non-label or zero/insufficient readable ingredients (and no banned agent found)
    insufficient_reads = (
        req.is_non_label
        or (banned_count == 0 and req.recognized_count is not None and req.recognized_count == 0)
        or (banned_count == 0 and req.recognized_count is not None and req.recognized_count < 2 and ocr_match_conf < 0.45)
        or (banned_count == 0 and req.recognized_count is None and unrecognized_ratio > 0.70)
        or (banned_count == 0 and ocr_match_conf < 0.30)
    )
    if insufficient_reads:
        reasons = []
        if req.is_non_label:
            reasons.append({
                "label": "Non-label image detected",
                "impact": 0,
                "detail": "This doesn't look like a product label.",
            })
        elif req.recognized_count == 0:
            reasons.append({
                "label": "No supplement ingredients matched",
                "impact": 0,
                "detail": "Not enough readable data; retake a clearer photo of the Ingredients box.",
            })
        else:
            reasons.append({
                "label": f"Very low readability ({round(ocr_match_conf * 100)}%)",
                "impact": 0,
                "detail": "Not enough readable data; retake a clearer photo of the Ingredients box.",
            })
        return {
            "score": None,
            "score_blocked": True,
            "verdict": "This doesn't look like a product label" if req.is_non_label else "Not enough readable data - retake photo",
            "model_used": bundle["model_name"],
            "features": input_row,
            "top_contributors": [],
            "why_this_score": reasons,
            "disclaimer": "Informational only, not medical or legal advice. Check the official WADA list and your sport's anti-doping body.",
        }

    full_df = pd.DataFrame([input_row])[feature_cols]
    raw_pred = float(model.predict(full_df)[0])
    adj_score = float(np.clip(raw_pred, 0.0, 96.0))

    why_this_score = []
    if harmful_count > 0:
        why_this_score.append({"label": f"{harmful_count} harmful/filler ingredient(s)", "impact": -round(harmful_count * 6.0, 1)})
    if sweetener_count > 0:
        why_this_score.append({"label": f"{sweetener_count} artificial sweetener(s)", "impact": -round(sweetener_count * 4.5, 1)})
    if color_count > 0:
        why_this_score.append({"label": f"{color_count} artificial color dye(s)", "impact": -round(color_count * 4.0, 1)})
    if sugar_g > 3.0:
        why_this_score.append({"label": f"High sugar ({sugar_g:.1f}g/serving)", "impact": -round(min(18.0, (sugar_g - 2.0) * 1.1), 1)})
    if unrecognized_ratio > 0.05:
        why_this_score.append({"label": f"Unrecognized tokens ({round(unrecognized_ratio * 100)}%)", "impact": -round(unrecognized_ratio * 30.0, 1)})
    if missing_macros:
        why_this_score.append({"label": "Missing/unreadable nutrition facts (risk penalty)", "impact": -6.0})
    if protein_pct >= 75.0 and harmful_count == 0 and banned_count == 0 and spiking_prob < 0.3:
        why_this_score.append({"label": f"High intact protein density ({protein_pct:.0f}%)", "impact": 8.0})

    # Post-prediction hard rules
    verdict = None
    if blend_transparency <= 0.35:
        adj_score = max(0.0, adj_score - 10.0)
        why_this_score.append({"label": "Proprietary blend without exact amounts", "impact": -10.0})

    if spiking_prob >= 0.65:
        if adj_score > 45.0:
            why_this_score.append({"label": "High amino-spiking risk cap (max 45)", "impact": round(45.0 - adj_score, 1)})
        else:
            why_this_score.append({"label": f"High amino-spiking probability ({round(spiking_prob * 100)}%)", "impact": -18.0})
        adj_score = min(adj_score, 45.0)

    if banned_count > 0:
        pre_cap = adj_score
        adj_score = min(adj_score, 20.0)
        verdict = "BANNED / UNSAFE"
        why_this_score.insert(0, {
            "label": f"{banned_count} banned / WADA-prohibited substance(s) (capped at 20)",
            "impact": round(adj_score - pre_cap, 1) if pre_cap > 20.0 else -round(banned_count * 35.0, 1),
        })

    final_score = int(round(float(np.clip(adj_score, 0.0, 96.0))))
    if not verdict:
        verdict = "Clean Formulation" if final_score >= 75 else "Average / Mixed Quality" if final_score >= 50 else "Low Purity / High Risk"

    # SHAP-style baseline ablation contribution per feature
    contributors = []
    for col in feature_cols:
        baseline_row = dict(input_row)
        baseline_row[col] = feature_means[col]
        without_pred = float(model.predict(pd.DataFrame([baseline_row])[feature_cols])[0])
        impact = round(raw_pred - without_pred, 2)
        contributors.append({
            "feature": col,
            "label": FEATURE_LABELS.get(col, col),
            "value": round(float(input_row[col]), 2),
            "impact": impact,
            "direction": "positive" if impact >= 0 else "negative",
        })

    contributors.sort(key=lambda c: abs(c["impact"]), reverse=True)

    return {
        "score": final_score,
        "score_blocked": False,
        "verdict": verdict,
        "model_used": bundle["model_name"],
        "features": input_row,
        "top_contributors": contributors[:6],
        "why_this_score": why_this_score,
        "disclaimer": "Informational only, not medical or legal advice. Check the official WADA list and your sport's anti-doping body.",
    }
