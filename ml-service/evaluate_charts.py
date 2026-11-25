"""
Generate evaluation visualizations saved in /ml-service/artifacts/:
  1. confusion_matrix.png          (Ingredient Classifier holdout confusion matrix)
  2. spiking_feature_importance.png (Amino-Spiking RandomForest importances)
  3. score_feature_importance.png   (Purity Score Regressor feature importances)
  4. score_predicted_vs_actual.png  (Holdout Predicted vs Actual Purity Score)

Usage:
  python evaluate_charts.py
"""

import json
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

BASE_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"


def plot_confusion_matrix(metrics: dict):
    cm = np.array(metrics["ingredient_classifier"]["confusion_matrix"])
    labels = metrics["ingredient_classifier"]["confusion_matrix_labels"]
    acc = metrics["ingredient_classifier"]["holdout_metrics"]["accuracy"]
    f1 = metrics["ingredient_classifier"]["holdout_metrics"]["f1_macro"]

    fig, ax = plt.subplots(figsize=(6.5, 5.5))
    im = ax.imshow(cm, interpolation="nearest", cmap=plt.cm.Reds)
    ax.figure.colorbar(im, ax=ax)
    ax.set(
        xticks=np.arange(len(labels)),
        yticks=np.arange(len(labels)),
        xticklabels=labels,
        yticklabels=labels,
        ylabel="True Class",
        xlabel="Predicted Class",
        title=f"Ingredient Classifier Confusion Matrix\n(Acc={acc:.2%}, Macro F1={f1:.2%})",
    )
    plt.setp(ax.get_xticklabels(), rotation=25, ha="right", rotation_mode="anchor")

    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(
                j, i, format(cm[i, j], "d"),
                ha="center", va="center",
                color="white" if cm[i, j] > thresh else "black",
                fontweight="bold",
            )
    fig.tight_layout()
    fig.savefig(ARTIFACTS_DIR / "confusion_matrix.png", dpi=150)
    plt.close(fig)


def plot_feature_importance(importances: dict, title: str, filename: str, color: str):
    items = sorted(importances.items(), key=lambda x: x[1])
    names = [k for k, _ in items]
    vals = [v for _, v in items]

    fig, ax = plt.subplots(figsize=(7.5, 4.8))
    ax.barh(names, vals, color=color, edgecolor="#1f2937", linewidth=0.5)
    ax.set_xlabel("Relative Feature Importance")
    ax.set_title(title)
    ax.grid(axis="x", linestyle="--", alpha=0.4)
    fig.tight_layout()
    fig.savefig(ARTIFACTS_DIR / filename, dpi=150)
    plt.close(fig)


def plot_predicted_vs_actual(metrics: dict):
    df = pd.read_csv(ARTIFACTS_DIR / "score_predictions_holdout.csv")
    best_name = metrics["purity_scorer"]["selected_model"]
    comp = metrics["purity_scorer"]["comparison"][best_name]

    fig, ax = plt.subplots(figsize=(6.5, 5.5))
    ax.scatter(df["actual"], df["predicted"], alpha=0.65, color="#e11d48", edgecolors="white", linewidth=0.4)
    lims = [0, 100]
    ax.plot(lims, lims, "k--", alpha=0.7, label="Ideal y = x")
    ax.set_xlim(lims)
    ax.set_ylim(lims)
    ax.set_xlabel("Actual Purity Score")
    ax.set_ylabel("Predicted Purity Score")
    ax.set_title(
        f"{best_name}: Predicted vs Actual\n"
        f"(Test MAE={comp['test_mae']:.2f}, RMSE={comp['test_rmse']:.2f}, R2={comp['test_r2']:.4f})"
    )
    ax.legend()
    ax.grid(True, linestyle="--", alpha=0.35)
    fig.tight_layout()
    fig.savefig(ARTIFACTS_DIR / "score_predicted_vs_actual.png", dpi=150)
    plt.close(fig)


def main():
    metrics_path = ARTIFACTS_DIR / "metrics.json"
    if not metrics_path.exists():
        raise FileNotFoundError("Run train.py first to generate metrics.json.")

    with metrics_path.open("r", encoding="utf-8") as f:
        metrics = json.load(f)

    plot_confusion_matrix(metrics)
    plot_feature_importance(
        metrics["spiking_detector"]["feature_importances"],
        "Amino-Spiking RandomForest Feature Importance",
        "spiking_feature_importance.png",
        color="#f59e0b",
    )
    plot_feature_importance(
        metrics["purity_scorer"]["feature_importances"],
        f"Purity Score ({metrics['purity_scorer']['selected_model']}) Feature Importance",
        "score_feature_importance.png",
        color="#10b981",
    )
    plot_predicted_vs_actual(metrics)
    print(f"Generated 4 evaluation charts in {ARTIFACTS_DIR}")


if __name__ == "__main__":
    main()
