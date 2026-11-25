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
    "protein_per_serving_g": "Protein per serving (g)",
    "serving_size_g": "Serving size (g)",
    "protein_percent": "Protein density (%)",
    "sugar_g": "Sugar content (g)",
    "amino_acid_ratio": "Intact EAA ratio",
    "blend_transparency": "Label blend transparency",
    "number_of_harmful_ingredients": "Harmful / filler ingredients",
    "number_of_banned_ingredients": "WADA-prohibited substances",
    "artificial_additive_count": "Artificial additives / dyes",
    "spiking_risk_probability": "Amino-spiking probability",
}


def load_models():
    cls_path = MODELS_DIR / "ingredient_classifier.joblib"
    spk_path = MODELS_DIR / "spiking_detector.joblib"
    scr_path = MODELS_DIR / "purity_scorer.joblib"

    if not (cls_path.exists() and spk_path.exists() and scr_path.exists()):
        raise RuntimeError(
            "Trained ML models not found in /ml-service/models. Run 'python train.py' first."
        )

    MODELS["classifier"] = joblib.load(cls_path)
    MODELS["spiking"] = joblib.load(spk_path)
    MODELS["scorer"] = joblib.load(scr_path)


@app.on_event("startup")
def startup_event():
    try:
        load_models()
    except Exception as exc:
        print(f"[GymScan ML Warning] Startup model load deferred: {exc}")


def ensure_models_ready():
    if any(v is None for v in MODELS.values()):
        load_models()


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
    protein_per_serving_g: float = 24.0
    serving_size_g: float = 32.0
    protein_percent: Optional[float] = None
    sugar_g: float = 1.0
    amino_acid_ratio: float = 0.9
    blend_transparency: float = 1.0
    number_of_harmful_ingredients: int = 0
    number_of_banned_ingredients: int = 0
    artificial_additive_count: int = 0
    spiking_risk_probability: float = 0.05


# ---------------------------- Endpoints ----------------------------

@app.get("/health")
def health():
    loaded = all(v is not None for v in MODELS.values())
    try:
        import easyocr  # noqa: F401
        easyocr_installed = True
    except Exception:
        easyocr_installed = False

    return {
        "status": "ok" if loaded else "models_missing",
        "models_loaded": loaded,
        "easyocr_available": easyocr_installed,
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
        else:
            probs = pipe.predict_proba([norm])[0]
            best_idx = int(np.argmax(probs))
            pred_class = str(pipe.classes_[best_idx])
            confidence = round(float(probs[best_idx]), 3)
            reason = DEFAULT_CLASS_REASONS.get(pred_class, "Classified by ML text model.")
            matched_via = "tfidf_ml"

        counts[pred_class] = counts.get(pred_class, 0) + 1
        results.append({
            "ingredient": raw.strip(),
            "normalized": norm,
            "class": pred_class,
            "confidence": confidence,
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
    Predict 0-100 Purity / Health Score using the cross-validated best regressor
    and compute per-feature occlusion contributions ("Why this score").
    """
    ensure_models_ready()
    bundle = MODELS["scorer"]
    model = bundle["model"]
    feature_cols = bundle["features"]
    feature_means = bundle["feature_means"]

    serving_g = max(1.0, float(req.serving_size_g))
    protein_g = max(0.0, float(req.protein_per_serving_g))
    protein_pct = (
        float(req.protein_percent)
        if req.protein_percent is not None
        else round((protein_g / serving_g) * 100.0, 2)
    )

    input_row = {
        "protein_per_serving_g": protein_g,
        "serving_size_g": serving_g,
        "protein_percent": protein_pct,
        "sugar_g": max(0.0, float(req.sugar_g)),
        "amino_acid_ratio": float(np.clip(req.amino_acid_ratio, 0.0, 1.0)),
        "blend_transparency": float(np.clip(req.blend_transparency, 0.0, 1.0)),
        "number_of_harmful_ingredients": max(0, int(req.number_of_harmful_ingredients)),
        "number_of_banned_ingredients": max(0, int(req.number_of_banned_ingredients)),
        "artificial_additive_count": max(0, int(req.artificial_additive_count)),
        "spiking_risk_probability": float(np.clip(req.spiking_risk_probability, 0.0, 1.0)),
    }

    full_df = pd.DataFrame([input_row])[feature_cols]
    raw_pred = float(model.predict(full_df)[0])
    final_score = int(round(float(np.clip(raw_pred, 5.0, 99.0))))

    # SHAP-style baseline ablation contribution per feature:
    # impact_i = pred(x) - pred(x with feature_i set to dataset mean)
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
        "model_used": bundle["model_name"],
        "features": input_row,
        "top_contributors": contributors[:5],
        "disclaimer": "Informational only, not medical advice. Check the official WADA list for competition.",
    }
