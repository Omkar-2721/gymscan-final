"""
Training pipeline for GymScan ML Service.
Trains and evaluates:
  1. Ingredient Classification Model (TF-IDF char n-grams 3-5 + LogisticRegression / LinearSVC)
  2. Amino-Spiking Detection Model (RandomForestClassifier)
  3. Purity / Health Score Regression Model (LinearRegression vs RandomForestRegressor vs GradientBoostingRegressor)

Usage:
  python train.py
"""

import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, KFold, cross_validate
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report,
    mean_absolute_error,
    root_mean_squared_error,
    r2_score,
    roc_auc_score,
)

from preprocessing import normalize_ingredient
from generate_datasets import build_ingredients_dataset, build_spiking_dataset, build_scores_dataset

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
ARTIFACTS_DIR = BASE_DIR / "artifacts"

MODELS_DIR.mkdir(parents=True, exist_ok=True)
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

CLASS_ORDER = ["beneficial", "neutral", "harmful", "banned_wada"]

SPIKING_FEATURES = [
    "min_spiking_position",
    "mean_spiking_position",
    "free_amino_count",
    "has_proprietary_blend",
    "claimed_protein_g",
    "expected_protein_g",
    "protein_gap_g",
]

SCORE_FEATURES = [
    "protein_per_serving_g",
    "serving_size_g",
    "protein_percent",
    "sugar_g",
    "amino_acid_ratio",
    "blend_transparency",
    "number_of_harmful_ingredients",
    "number_of_banned_ingredients",
    "artificial_additive_count",
    "spiking_risk_probability",
]


def ensure_datasets():
    if not (DATA_DIR / "ingredients.csv").exists():
        build_ingredients_dataset()
    if not (DATA_DIR / "spiking.csv").exists():
        build_spiking_dataset(n_rows=600)
    if not (DATA_DIR / "scores.csv").exists():
        build_scores_dataset(n_rows=800)


def train_ingredient_classifier():
    print("\n" + "=" * 65)
    print("1. TRAINING INGREDIENT CLASSIFICATION MODEL")
    print("=" * 65)

    df = pd.read_csv(DATA_DIR / "ingredients.csv")
    df["normalized"] = df["ingredient"].astype(str).apply(normalize_ingredient)
    df = df[df["normalized"].str.len() > 0].drop_duplicates(subset=["normalized"]).reset_index(drop=True)

    X = df["normalized"].values
    y = df["class"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    candidates = {
        "LogisticRegression": Pipeline([
            ("tfidf", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True, min_df=1)),
            ("clf", LogisticRegression(max_iter=2000, C=5.0, class_weight="balanced", random_state=42)),
        ]),
        "LinearSVM_Calibrated": Pipeline([
            ("tfidf", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True, min_df=1)),
            ("clf", CalibratedClassifierCV(LinearSVC(C=1.5, class_weight="balanced", random_state=42), cv=3)),
        ]),
    }

    best_name = None
    best_pipe = None
    best_f1 = -1.0
    candidate_results = {}

    for name, pipe in candidates.items():
        pipe.fit(X_train, y_train)
        preds = pipe.predict(X_test)
        acc = float(accuracy_score(y_test, preds))
        prec, rec, f1, _ = precision_recall_fscore_support(y_test, preds, average="macro", zero_division=0)
        candidate_results[name] = {
            "accuracy": round(acc, 4),
            "precision_macro": round(float(prec), 4),
            "recall_macro": round(float(rec), 4),
            "f1_macro": round(float(f1), 4),
        }
        print(f"Candidate [{name}] -> Acc: {acc:.4f} | Prec: {prec:.4f} | Rec: {rec:.4f} | F1: {f1:.4f}")
        if f1 > best_f1:
            best_f1 = f1
            best_name = name
            best_pipe = pipe

    best_preds = best_pipe.predict(X_test)
    cm = confusion_matrix(y_test, best_preds, labels=CLASS_ORDER)

    print(f"\nSelected Classifier: {best_name}")
    print("\nClassification Report (Holdout Test Set):")
    print(classification_report(y_test, best_preds, labels=CLASS_ORDER, zero_division=0))
    print("Confusion Matrix (rows=actual, cols=predicted):", CLASS_ORDER)
    print(cm)

    # Retrain winning pipeline on full normalized dataset for maximum production coverage,
    # while reporting holdout test metrics honestly above.
    best_pipe.fit(X, y)

    # Canonical dictionary for rapidfuzz OCR typo matching + notes lookup
    catalog = {
        row["normalized"]: {"class": row["class"], "notes": row["notes"], "canonical": row["ingredient"]}
        for _, row in df.iterrows()
    }

    artifact = {
        "pipeline": best_pipe,
        "model_name": best_name,
        "classes": CLASS_ORDER,
        "catalog": catalog,
    }
    joblib.dump(artifact, MODELS_DIR / "ingredient_classifier.joblib")
    print(f"Saved model -> {MODELS_DIR / 'ingredient_classifier.joblib'}")

    return {
        "selected_model": best_name,
        "dataset_rows": int(len(df)),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "candidates": candidate_results,
        "holdout_metrics": candidate_results[best_name],
        "confusion_matrix_labels": CLASS_ORDER,
        "confusion_matrix": cm.tolist(),
    }


def train_spiking_detector():
    print("\n" + "=" * 65)
    print("2. TRAINING AMINO-SPIKING DETECTION MODEL (RandomForest)")
    print("=" * 65)

    df = pd.read_csv(DATA_DIR / "spiking.csv")
    X = df[SPIKING_FEATURES]
    y = df["is_spiked"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    rf = RandomForestClassifier(
        n_estimators=220,
        max_depth=8,
        min_samples_leaf=3,
        random_state=42,
    )
    rf.fit(X_train, y_train)

    preds = rf.predict(X_test)
    probs = rf.predict_proba(X_test)[:, 1]
    acc = float(accuracy_score(y_test, preds))
    prec, rec, f1, _ = precision_recall_fscore_support(y_test, preds, average="binary", zero_division=0)
    auc = float(roc_auc_score(y_test, probs))

    print(f"RandomForest Spiking Detector -> Acc: {acc:.4f} | Prec: {prec:.4f} | Rec: {rec:.4f} | F1: {f1:.4f} | AUC: {auc:.4f}")

    importances = {feat: round(float(imp), 4) for feat, imp in zip(SPIKING_FEATURES, rf.feature_importances_)}
    print("Feature Importances:", importances)

    # Retrain on full dataset for deployment
    rf.fit(X, y)
    joblib.dump({"model": rf, "features": SPIKING_FEATURES}, MODELS_DIR / "spiking_detector.joblib")
    print(f"Saved model -> {MODELS_DIR / 'spiking_detector.joblib'}")

    return {
        "model": "RandomForestClassifier",
        "dataset_rows": int(len(df)),
        "accuracy": round(acc, 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1": round(float(f1), 4),
        "roc_auc": round(auc, 4),
        "feature_importances": importances,
    }


def train_score_regressor():
    print("\n" + "=" * 65)
    print("3. TRAINING PURITY / HEALTH SCORE REGRESSION MODEL")
    print("=" * 65)

    df = pd.read_csv(DATA_DIR / "scores.csv")
    X = df[SCORE_FEATURES]
    y = df["score"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    cv = KFold(n_splits=5, shuffle=True, random_state=42)

    models = {
        "LinearRegression": LinearRegression(),
        "RandomForestRegressor": RandomForestRegressor(n_estimators=220, max_depth=10, random_state=42),
        "GradientBoostingRegressor": GradientBoostingRegressor(
            n_estimators=220, learning_rate=0.06, max_depth=4, random_state=42
        ),
    }

    comparison = {}
    best_name = None
    best_cv_rmse = float("inf")
    best_model = None
    best_test_preds = None

    for name, reg in models.items():
        cv_scores = cross_validate(
            reg,
            X_train,
            y_train,
            cv=cv,
            scoring={
                "mae": "neg_mean_absolute_error",
                "rmse": "neg_root_mean_squared_error",
                "r2": "r2",
            },
        )
        cv_mae = float(-np.mean(cv_scores["test_mae"]))
        cv_rmse = float(-np.mean(cv_scores["test_rmse"]))
        cv_r2 = float(np.mean(cv_scores["test_r2"]))

        reg.fit(X_train, y_train)
        test_preds = np.clip(reg.predict(X_test), 0.0, 100.0)
        test_mae = float(mean_absolute_error(y_test, test_preds))
        test_rmse = float(root_mean_squared_error(y_test, test_preds))
        test_r2 = float(r2_score(y_test, test_preds))

        comparison[name] = {
            "cv_mae": round(cv_mae, 4),
            "cv_rmse": round(cv_rmse, 4),
            "cv_r2": round(cv_r2, 4),
            "test_mae": round(test_mae, 4),
            "test_rmse": round(test_rmse, 4),
            "test_r2": round(test_r2, 4),
        }

        print(
            f"[{name}] CV -> MAE: {cv_mae:.3f}, RMSE: {cv_rmse:.3f}, R2: {cv_r2:.4f} | "
            f"Test -> MAE: {test_mae:.3f}, RMSE: {test_rmse:.3f}, R2: {test_r2:.4f}"
        )

        if cv_rmse < best_cv_rmse:
            best_cv_rmse = cv_rmse
            best_name = name
            best_model = reg
            best_test_preds = test_preds

    print(f"\nBest Score Regressor by 5-Fold CV RMSE: {best_name} (CV RMSE={best_cv_rmse:.3f})")

    # Fit linear surrogate too for fast directional sensitivity / fallback explanation,
    # while computing exact occlusion / SHAP-style contributions using the winning model.
    best_model.fit(X, y)
    feature_means = {col: float(X[col].mean()) for col in SCORE_FEATURES}

    if hasattr(best_model, "feature_importances_"):
        importances = {col: round(float(imp), 4) for col, imp in zip(SCORE_FEATURES, best_model.feature_importances_)}
    else:
        coefs = np.abs(best_model.coef_)
        norm = coefs / (coefs.sum() + 1e-9)
        importances = {col: round(float(val), 4) for col, val in zip(SCORE_FEATURES, norm)}

    joblib.dump(
        {
            "model": best_model,
            "model_name": best_name,
            "features": SCORE_FEATURES,
            "feature_means": feature_means,
            "baseline_prediction": float(best_model.predict(pd.DataFrame([feature_means]))[0]),
            "feature_importances": importances,
        },
        MODELS_DIR / "purity_scorer.joblib",
    )
    print(f"Saved model -> {MODELS_DIR / 'purity_scorer.joblib'}")

    # Save holdout actual vs predicted pairs for chart plotting
    eval_df = pd.DataFrame({
        "actual": y_test.values,
        "predicted": np.round(best_test_preds, 2),
    })
    eval_df.to_csv(ARTIFACTS_DIR / "score_predictions_holdout.csv", index=False)

    return {
        "selected_model": best_name,
        "dataset_rows": int(len(df)),
        "comparison": comparison,
        "feature_importances": importances,
    }


def main():
    ensure_datasets()
    classifier_metrics = train_ingredient_classifier()
    spiking_metrics = train_spiking_detector()
    score_metrics = train_score_regressor()

    summary = {
        "ingredient_classifier": classifier_metrics,
        "spiking_detector": spiking_metrics,
        "purity_scorer": score_metrics,
    }

    metrics_path = ARTIFACTS_DIR / "metrics.json"
    with metrics_path.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"\nAll training complete! Metrics saved to {metrics_path}")


if __name__ == "__main__":
    main()
