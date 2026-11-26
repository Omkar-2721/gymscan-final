# GymScan Gap Analysis & Feature Plan

> **Baseline:** Existing GymScan codebase (`src/`, `server/`, `ml-service/`) compared against [`docs/REFERENCE_ANALYSIS.md`](./REFERENCE_ANALYSIS.md) (`https://scansafe.co.in/`).  
> Every feature from the reference workflow is adapted specifically for sports nutrition & gym supplements (whey isolates, blends, mass gainers, creatine, pre-workouts, protein bars) using GymScan's own maroon/emerald glassmorphism design.

---

## Feature Gap Comparison Table

| Feature | Already in GymScan? | Needs Adapting for Gym Products? | Priority | Effort |
| --- | --- | --- | --- | --- |
| Multi-input label scanner (Upload + Crop, Live Camera, Barcode/Open Food Facts, Manual text paste) | Yes (`ScannerTool.jsx`, `ImageCropper.jsx`, `barcodeScanner.js`) | Yes — tune for supplement facts, proprietary blends, amino-spiking & WADA lists | **Must** | Done / Polish |
| Purity score gauge (0–100) + blocked score gate (`<50%` conf or `>40%` unknown) | Yes (`mlService.js`, `analyzer.js`, `main.py`) | Yes — spread across clean isolate (75–95), average (50–75), spiked (<=45), banned (<=20) | **Must** | Low (Verify) |
| Per-ingredient risk breakdown with color-coded badges (`Beneficial`, `Neutral`, `Contamination Risk`, `Harmful`, `Banned`) | Partial (`ScannerTool.jsx`) | Yes — domain rules for L-glycine/taurine spiking, SARMs, stimulants, polyols, dyes | **Must** | Done / Polish |
| Score explanation (`Why This Score`) & ingredient flagging reasons | Yes (`ScannerTool.jsx`, `mlService.js`) | Yes — explicit point impacts, spiking prob, proprietary blend penalty, athlete disclaimer | **Must** | Low (Polish) |
| Banned WADA & contamination-risk alert banners (red banned banner, yellow warnings, fuzzy >= 0.85) | Partial (`ScannerTool.jsx`, `bannedSubstances.js`) | Yes — critical athlete safety warnings (`DMAA`, `Ostarine`, `Tribulus`, label notices) | **Must** | Done / Polish |
| Safer-alternative product recommendations inside scan results | No (`cleanAlternative` only existed on 2 hardcoded presets) | Yes — dynamic cleaner supplement swaps (clean whey isolate, pure creatine, stim-free pre-workout) | **Must** | Medium |
| Downloadable PDF Clinical Audit Report (`GymScan_Report_*.pdf`) | No (only Copy Text Report existed) | Yes — formatted PDF with score gauge summary, macros, flagged ingredients, WADA disclaimer & swaps | **Must** | Medium |
| Shareable result report link (`?report=...`) | No | Yes — URL-encoded shareable audit view that opens directly in the app for teammates/coaches | **Should** | Low |
| Searchable Product Database / Supplement Catalog with verified scores | Partial (only 4 items in `sampleProducts.js`) | Yes — 16+ common Indian & global supplements (Isolates, Blends, Gainers, Creatine, Pre-Workouts, Bars) with search & category filters | **Must** | Medium |
| Side-by-Side Product Compare (Pick from Catalog/Saved, Photo Upload, Camera, Manual Entry + Health Profile filters) | Partial (`CompareModal.jsx` had hardcoded `GNC_TIED_PRODUCT` fallback & no DB/manual picker) | Yes — gym athlete profile toggles + pick from History/Favorites/Catalog or paste ingredients directly | **Should** | Medium |
| User-tied Scan History + Saved/Favorites bookmarks + tier filters + Clear bug fix | Partial (`HistoryModal.jsx` had broken `onClear` prop & global localStorage) | Yes — scope history & saved favorites per signed-in user email; filter by Clean / Moderate / Unsafe / Favorites | **Must** | Medium |
| Educational Hub (`Learn`: Amino Spiking, WADA Banned Substances, How to Read Supplement Labels, Additives/Heavy Metals) | No (only marketing copy) | Yes — interactive athlete education modal/drawer with visual examples & red-flag checklist | **Should** | Medium |
| User Accounts, Daily Free Scan Quota (5/day) & Razorpay Test Mode Plans | Yes (`AuthContext.jsx`, `PricingModal.jsx`, `server/index.js`) | Yes — keep Razorpay Test Mode checkout & per-user billing intact | **Must** | Done |
| Live ML Service Status Indicator (`ML Online / ML Offline`) | Yes (`Navbar.jsx`, `ScannerTool.jsx`) | Kept synchronized with `/api/ml/health` | **Must** | Done |
| Responsive layout (Desktop `1280px` zero-overflow & Mobile `390px` drawer) + Light/Dark theme + 5-language switcher | Partial (`Navbar.jsx`, `translations.js`) | Ensure desktop navbar stays within viewport with new Database & Learn triggers | **Must** | Low |
| Multi-ingredient Meal Composer / Coach Batch Builder | No (reference-specific) | Lower fit for supplement labels (`Supplement Stack Checker` would be future work) | **Nice** | High |
| Family Multi-Profile Account Switching | No | Single-athlete health profile selector in Compare covers core need | **Nice** | High |

---

## Phase 3 Implementation Priority Order

1. **P0 — Fix History prop bug (`onClear` vs `onClearHistory`), tie History & Favorites to signed-in `user.email`, add Favorites star toggle & PDF export from History (`HistoryModal.jsx`, `App.jsx`).**
2. **P0 — Add Searchable Supplement Catalog (`src/data/supplementCatalog.js`, `src/components/DatabaseModal.jsx`) + Dynamic Safer Alternatives (`suggestSaferAlternatives` in `analyzer.js` & rendered in `ScannerTool.jsx`).**
3. **P0 — Implement Real Downloadable PDF Audit Report + Shareable Result URL (`src/utils/pdfReport.js`) wired into `ScannerTool.jsx`, `HistoryModal.jsx`, and `DatabaseModal.jsx`.**
4. **P1 — Upgrade `CompareModal.jsx`** to remove old `GNC_TIED_PRODUCT` stub, support **Pick from Catalog / Saved History** AND **Paste Ingredients** alongside Photo Upload/Camera, and respect blocked unreadable scores.
5. **P1 — Build Supplement Safety Education Center (`src/components/EducationModal.jsx`)** covering Amino Spiking, Banned WADA Substances & SARMs, How to Read Supplement Labels, and Artificial Additives/Contamination Risks.
6. **P1 — Wire Navigation (`Navbar.jsx`, `Footer.jsx`, `App.jsx`)** cleanly with zero horizontal overflow at 1280px, working shared-report deep-link modal, updated `README.md`, full verification (`test:scoring`, `test:ocr`, `build`, live server check), and final zip packaging.
