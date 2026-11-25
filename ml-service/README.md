# GymScan Python ML Service (`/ml-service`)

FastAPI microservice providing real Machine Learning inference for supplement label analysis:
1. **Ingredient Classification Model** (`/classify`) — `beneficial`, `neutral`, `harmful`, `banned_wada`
2. **Amino-Spiking Risk Detector** (`/spiking`) — `low`, `medium`, `high`
3. **Purity / Health Score Regressor** (`/score`) — `0–100` score + SHAP-style top contributing features
4. **Optional EasyOCR Text Extractor** (`/ocr`) — Server-side OCR selectable from the scanner UI

---

## 1. Datasets

### `/ml-service/data/ingredients.csv` (268 labeled rows)
- **Columns:** `ingredient, class, notes`
- **Classes:** `beneficial`, `neutral`, `harmful`, `banned_wada`
- **Coverage:** Whey/casein/plant proteins, ergogenics (creatine, citrulline), natural/artificial sweeteners (`E951` aspartame, `E955` sucralose, `E950` Ace-K, maltitol), synthetic food dyes (`Red 40`, `Yellow 5`), amino-spiking diluents (`glycine`, `taurine`, `alanine`), and prohibited doping substances modeled on **public WADA Prohibited List categories** (S1 Anabolic Agents, S4 Hormone Modulators, S5 Diuretics, S6 Stimulants such as DMAA, DMHA, ephedrine, SARMs).
- **Important Competition Disclaimer:** The `banned_wada` list is informational only and **must be re-checked against the official current WADA Prohibited List before athletic competition**.

### `/ml-service/data/spiking.csv` (600 synthetic rows)
- **Features:** `min_spiking_position`, `mean_spiking_position`, `free_amino_count`, `has_proprietary_blend`, `claimed_protein_g`, `expected_protein_g`, `protein_gap_g`
- **Target:** `is_spiked` (`0` / `1`)
- **Synthetic Generation Methodology:** Synthesized across 5 realistic product archetypes: clean intact whey isolates (`32%`), legitimate non-protein creatine/pre-workout formulas (`16%` so creatine tubs with `0g` claimed protein aren't falsely flagged), mildly spiked blends (`16%`), heavily nitrogen-spiked powders (`22%`), and proprietary-blend-masked formulas (`14%`).

### `/ml-service/data/scores.csv` (800 synthetic rows)
- **Features (10):** `protein_per_serving_g`, `serving_size_g`, `protein_percent`, `sugar_g`, `amino_acid_ratio`, `blend_transparency`, `number_of_harmful_ingredients`, `number_of_banned_ingredients`, `artificial_additive_count`, `spiking_risk_probability`
- **Target:** `score` (`0` to `100`)
- **Labeling Caveat:** Target scores are generated using **domain-expert nutritional rules plus Gaussian noise** (`sigma = 2.2`). In production, replace with laboratory HPLC/Kjeldahl assay scores.

---

## 2. Preprocessing & Model Architecture

- **Preprocessing (`/ml-service/preprocessing.py`):** Lowercasing, OCR character confusion cleanup (`0->o`, `1->l`, `5->s`), punctuation stripping, and E-number / chemical synonym expansion (`e951 -> aspartame`, `e955 -> sucralose`, `wpi -> whey protein isolate`, `1,3-dimethylamylamine -> dmaa`, etc.).
- **Ingredient Classifier:** `TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5))` + `LogisticRegression` (compared against calibrated `LinearSVC`), paired with **RapidFuzz** fuzzy matching (`WRatio >= 86%`) at inference time to tolerate OCR typos.
- **Amino-Spiking Detector:** `RandomForestClassifier(n_estimators=220, max_depth=8)`.
- **Purity Score Regressor:** Compares `LinearRegression`, `RandomForestRegressor`, and `GradientBoostingRegressor` via **5-fold Cross-Validation**, selecting the model with the lowest CV RMSE and reporting `MAE`, `RMSE`, and `R²`.

---

## 3. Setup, Retraining & Running

### Setup (Virtual Environment)
```bash
cd ml-service
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

### Generate Datasets, Train Models & Build Evaluation Charts
```bash
python generate_datasets.py
python train.py
python evaluate_charts.py
```

### Run FastAPI Service (Dockerfile-free)
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Or from the project root, start **Frontend + Express Payment Backend + FastAPI ML Service** all together:
```bash
npm run dev:all
```

---

## 4. Recorded Training & Evaluation Metrics

### Ingredient Classification Model (`LogisticRegression` + TF-IDF Char 3–5 N-grams)
- **Dataset:** 268 raw rows (`245` unique normalized compounds after synonym/OCR normalization; `196` train / `49` holdout test)
- **Holdout Test Accuracy:** `67.35%` (Macro Precision: `0.6979`, Macro Recall: `0.6862`, Macro F1: `0.6847`)
- **Confusion Matrix (`[beneficial, neutral, harmful, banned_wada]`):**
  - `beneficial`: `[10, 4, 1, 1]` (`F1 = 0.65`)
  - `neutral`: `[4, 7, 0, 1]` (`F1 = 0.54`)
  - `harmful`: `[1, 2, 7, 1]` (`F1 = 0.74`)
  - `banned_wada`: `[0, 1, 0, 9]` (`F1 = 0.82`)
- **Inference Boost:** Combined with `RapidFuzz` (`WRatio >= 86%`) canonical recovery for OCR typos on known supplement compounds.

### Amino-Spiking Risk Detector (`RandomForestClassifier`)
- **Dataset:** 600 synthetic rows (`spiking.csv`)
- **Holdout Test Metrics:** Accuracy = `1.0000`, Precision = `1.0000`, Recall = `1.0000`, F1 = `1.0000`, ROC-AUC = `1.0000`
- **Top Feature Importances:** `protein_gap_g` (`0.4207`), `min_spiking_position` (`0.1298`), `claimed_protein_g` (`0.1251`), `free_amino_count` (`0.1248`)

### Purity / Health Score Regression (`scores.csv`, 800 rows)
| Model | 5-Fold CV MAE | 5-Fold CV RMSE | 5-Fold CV R² | Test MAE | Test RMSE | Test R² |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `LinearRegression` | 2.344 | 2.944 | 0.9892 | 1.747 | 2.245 | 0.9931 |
| `RandomForestRegressor` | 2.452 | 3.348 | 0.9860 | 2.174 | 3.142 | 0.9865 |
| **`GradientBoostingRegressor` (Selected)** | **2.185** | **2.931** | **0.9892** | **1.911** | **2.711** | **0.9899** |

---

## 5. Evaluation Artifacts (`/ml-service/artifacts/`)
Running `python evaluate_charts.py` saves:
- `confusion_matrix.png`
- `spiking_feature_importance.png`
- `score_feature_importance.png`
- `score_predicted_vs_actual.png`
- `metrics.json`

