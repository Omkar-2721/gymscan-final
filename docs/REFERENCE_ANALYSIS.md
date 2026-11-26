# Reference Site Analysis: ScanSafe (`https://scansafe.co.in/`)

> **Purpose:** Inspiration & UX/Feature research for GymScan (adapted to the gym supplement & sports nutrition domain).  
> **Scope Note:** All findings below reflect directly observed pages, routes, DOM elements, and responses on `https://scansafe.co.in/` across desktop (`1280x800`) and mobile (`390x844`). Items blocked by login walls, paywalls, or backend 503 errors are explicitly marked as inaccessible rather than assumed.

---

## 1. All Pages & Routes Discovered

### Accessible Routes (HTTP 200)
| Route | Title / Role | What It Does |
| --- | --- | --- |
| `/` | Landing Page | Marketing hero, value proposition (`Evidence-First Food Safety`), 4-step scanning showcase (`01`–`04`), 4-stage `Guardian AI` overview, optical OCR / zero-hallucination claims, language switcher (18 languages), navbar & footer links. |
| `/scan` | ScanSafe ULTRA Workspace | Workspace shell showing `Plan: GUEST` and 5 sub-tabs (`Scanner`, `Compare Mode`, `Meal Composer`, `Family Mode`, `Trends`). Main workspace tools are gated behind sign-in. |
| `/compare` | Side-by-Side Product Compare | Product A vs. Product B selector (`Pick from Saved`, `Select Image`, `Camera`), 11 selectable local health-profile filters (`Diabetic-Friendly`, `High Protein`, `Gluten-Free`, etc.), and a `Compare These Products (2 Credits)` action. |
| `/guardian` | Guardian Evidence Auditor | Evaluation form with shopping goal input, 7 allergen toggles, INR budget ceiling, Vision OCR photo upload/camera, and verbatim manual evidence cards (`Product Name`, `Ingredients verbatim`, `Allergens`). |
| `/guardian/agent` | Guardian AI Phase 2 Agent | 3-step autonomous agent flow: (1) research objective, 4 preset goals, 15 allergen toggles, currency (`INR/AED/USD`) + budget; (2) authorized data sources (`Reviewed Catalog`, `Open Food Facts API`, `Partner Feed`) + manual/OCR package evidence; (3) persistence consent checkbox & submit, plus `Task History`. |
| `/saved` | Saved Shopping List | Displays saved scanned items filtered by tier (`All`, `Nutritionally Favorable`, `Moderate`, `High Concern`) with an empty state linking to scanning. |
| `/pricing` | Pricing & Scan Credits | Displays `Prototype Demonstration Mode` notice, Free starter tier (`5` initial lifetime scans), and one-time credit packs (`10` for ₹10, `100` for ₹99, `320` for ₹299, `1200` for ₹999) plus `Try Zero-Credit Sample Demo`. |
| `/pitch` | 12-Slide Investor Pitch Deck | Interactive 12-slide presentation (`01/12`–`12/12`) describing hybrid barcode + Open Food Facts + OCR + LLM workflow, target market, and subscription model variants. |
| `/auth` | Authentication Page | Email + Password `Sign In`, `Continue with Google`, and `Create Account` mode (adds `Full Name`). |
| `/terms`, `/privacy`, `/refund`, `/contact` | Legal & Contact | Discloses credit billing (`1` scan / `2` compare / `1` meal), data processors (Supabase, Open Food Facts, Gemini/Claude, Razorpay), refund terms, and contact info. |

### Missing / Broken Routes (HTTP 404 or Error)
- `/history`: Redirects to `/auth/login?redirect=%2Fsaved`, which returns **HTTP 404**.
- `/about`, `/faq`, `/learn`, `/guide`, `/products`, `/database`, `/settings`, `/dashboard`, `/profile`: All return **HTTP 404** (no public searchable catalog, settings page, or standalone education articles exist).

---

## 2. Features Grouped by Category

### Scanning Input Methods
- **Image Upload & Camera Snapshot**: Available on `/guardian`, `/guardian/agent`, and `/compare` (`Take Photo`, `Upload Image` / `Select Image`) to prefill fields via Vision OCR.
- **Verbatim Manual Entry**: Exposed on `/guardian` and `/guardian/agent` (`Product Name`, `Price`, `Exact Ingredients`, `Allergen / Precautionary Statement`, `Source Reference`, and legibility checkbox).
- **Barcode Scanning**: Mentioned in `/privacy` and `/pitch` (Phase 2 barcode -> Open Food Facts -> AI), not directly accessible on unauthenticated pages.

### Result Display, Scoring & Explanation *(observed from landing showcase, `/saved`, `/privacy`, `/pitch`)*
- Risk badge tiers (`AVOID` / `CAUTION` / `SAFE` on `/`; `Nutritionally Favorable` / `Moderate` / `High Concern` on `/saved`).
- Numeric nutrition score with `"Unknown"` policy when label values are missing (zero hallucinated values).
- Per-ingredient listing with E-number additives, allergen highlights, NOVA ultra-processed food (UPF) group, and healthier swap suggestions.

### User Accounts & Personal Profiles
- Supabase Auth (`/auth`) supporting Email/Password and Google sign-in + sign-up.
- **11 local health-profile filters** on `/compare` (e.g., `High Protein`, `Lactose Intolerant`, `Gluten-Free`, `Weight Loss`, `Vegan`, `Diabetic-Friendly`, etc.).
- **Family Mode** tab on `/scan` (described in `/privacy` as supporting secondary profiles and custom ingredient blacklists; gated by login).

### History, Saved Items & Compare
- **Saved List** (`/saved`) with 3 score-tier filters + empty state CTA.
- **Side-by-Side Compare** (`/compare`) supporting `Pick from Saved` (`0` credits) or two uploaded photos (`2` credits).
- **Task History** button on `/guardian/agent` (`GET /api/guardian/history -> 401` for guests); `/history` route broken (404).

### Product Search & Database
- No public searchable product directory page (`/products` & `/database` -> 404).
- Agent workflow references internal `Reviewed Catalog`, `Open Food Facts API`, and `Partner Manufacturer Feed`.

### Educational Content
- No standalone educational articles or label-reading guides (`/learn`, `/guide`, `/faq` -> 404); only brief 4-step workflow cards on `/` and pitch deck slides.

### Sharing / Export
- `/pitch` mentions shareable breakdown cards, though no interactive share-link or downloadable PDF report button is exposed on public pages.

### Settings, Theme & Localization
- Dark theme only (no light/dark toggle observed).
- 18-language dropdown selector (note: selecting Hindi on `/` caused hero/showcase elements to vanish from the DOM and left agent sections untranslated).
- Desktop (`1280x800`) navbar overflows horizontally slightly on `/`, while mobile (`390x844`) collapses into a clean drawer and single-column cards.

---

## 3. Step-by-Step Main Scan Flow (User Journey)

1. **Entry**: User clicks `Scan Food Label` on `/` (routes to `/auth`) or `Scanner` in navbar (routes to `/scan`).
2. **Auth Check at `/scan`**: Guest users see `Plan: GUEST` + `Sign In to Scan` blocking the `Scanner`, `Meal Composer`, `Family Mode`, and `Trends` tabs.
3. **Alternate Unauthenticated Path (`/guardian` or `/guardian/agent`)**:
   - Step 1: Enter goal, select allergens to avoid (7 or 15 toggles), set budget & currency.
   - Step 2: Upload photo / snap camera (Vision OCR auto-extracts package text) or paste verbatim product name, ingredients, and allergen warning text.
   - Step 3: Accept consent and submit (`Run Guardian Evaluation` / `Run Autonomous Guardian Agent`).
4. **Live Result**: Submission currently returns **HTTP 503** (`"Service temporarily unavailable: Shared rate limit coordination offline."`), preventing observation of a live generated result screen.

---

## 4. Product Data Model (Inputs & Documented Outputs)

- **Captured Inputs**: `Product Name`, `Price` + `Currency`, `Ingredients (verbatim)`, `Allergen / Precautionary Statement`, `Source URL / Evidence Reference`, uploaded label image(s), dietary/allergen profile flags.
- **Documented Outputs**: Nutrition/Safety Score, Risk Tier (`AVOID / CAUTION / SAFE` or `Favorable / Moderate / High Concern`), per-100g / per-serving macros (`Unknown` when absent), additive/allergen/regulatory flags (E-numbers, trans fat, dyes), NOVA UPF classification, traceable source/GTIN links, and safer alternative products.

---

## 5. What Was Not Accessible (Gated / Broken / Offline)

1. **Authentication Walls**: `/scan` (`Scanner`, `Meal Composer`, `Family Mode`, `Trends`), `GET /api/saved`, and `GET /api/guardian/history` require signed-in accounts.
2. **Backend Outage (HTTP 503)**: `POST /api/guardian` and `POST /api/guardian/agent` returned 503 during testing.
3. **Paywall / Prototype Checkout**: `/pricing` checkout buttons are disabled in `Prototype Demonstration Mode`.
4. **404 Routes**: `/history`, `/about`, `/learn`, `/guide`, `/faq`, `/products`, `/database`, `/settings`.
5. **Live Hardware Camera**: Could not exercise real-time camera frames in a headless browser session without an active session and camera feed.
