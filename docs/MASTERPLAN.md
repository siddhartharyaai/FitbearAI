# The Fitbear AI — Masterplan

**TITLE:** The Fitbear AI — M0 (Web-first PWA • Free-first stack) — Coach "Coach C"

**ACTIVATION (do this first, no questions):**

* Save this entire prompt as `/docs/MASTERPLAN.md` in the repo.
* Create `/docs/PROJECT_PROGRESS.md` (append-only ledger) and keep it updated after every increment.
* Create `/docs/IMPLEMENTATION_SUMMARY.md` with: implemented features, current status, remaining items, known issues/tech-debt, next steps. Refresh it whenever context is tight.
* Run a short **Strategic Planning Session** as per Emergent's guide, then proceed. If anything is ambiguous, **assume sensible defaults**, note them in **NOTES**, and continue. ([Emergent Help][1])

**BUSINESS GOAL**
Ship "The Fitbear AI": an Indian-first health/fitness/nutrition assistant with:

1. Coach C (chat + voice),
2. Menu Scanner (snap menu → OCR → normalize → calories/macros → top picks),
3. Meal Photo Analyzer (stub: detect guess → ask 1 confirm → log).
   Personalize with a bio-psycho-social (BPS) profile + daily targets. English/Hinglish now; Hindi next.

**TARGET USERS**
Indian consumers (urban + Tier-2/3), mixed home/restaurant diets, intermittent connectivity.

**SUCCESS CRITERIA (M0)**

* E2E happy path: onboard → targets → scan menu → 3 picks + 2 swaps + 3 avoid → log → coach reply → history.
* P95: chat ≤ 2s; scans ≤ 5s (free-tier aware).
* Data safety: RLS enforced; secrets server-side; no PII in logs.
* Accessibility baseline passes: labels, focus order, contrast.

**CORE FEATURES (M0)**

* Onboarding (BPS): demographics; height/weight/waist; activity; sleep; stress; medical flags; veg/Jain/halal/eggetarian; allergies; budget; schedule; cuisines; pantry.
* Targets: compute TDEE, calorie budget, macro split; hydration/steps.
* Coach C (chat + push-to-talk): "What should I eat now?" Indianized portions (katori ml, roti count/diameter) and swaps (tawa vs butter).
* Menu Scanner: upload menu photo → OCR → canonical dish mapping → nutrition lookup → top picks/alternates/avoid with calories/protein/fiber/sodium flags.
* Meal Photo (stub): image → top guess → one confirm (e.g., "2 rotis or 3?") → compute → log.
* Logs/History + Evening check-in; Settings: language, dietary flags, privacy (export/delete), global Mode Banner (Demo | Production).

**STACK (FREE-FIRST, USE AS SPECIFIED)**

* App: **Next.js (PWA)**. Camera via `<input type="file" accept="image/*" capture="environment">`. Install prompt + offline shell.
* Auth + DB + Storage: **Supabase** (Postgres + RLS + Storage). Owner-only RLS policies.
* LLM (chat + semantics): **Gemini Flash** via **Google AI Studio** (free tier; lower limits).
* OCR: **Primary = Tesseract.js (WASM)** with `eng` + `hin` (Devanagari). **Optional = Google Cloud Vision** behind a feature flag for tough cases (paid).
* Speech: **Deepgram STT (streaming)** + **Deepgram Aura-2 TTS** (same API key). Toggle fallback to Web Speech API if credits exhausted.
* Analytics: **PostHog** (events, funnels, feature flags). Send only non-PII props.
* Optional later: Vosk offline STT; Piper/Coqui self-hosted TTS.

**SECRETS & ENV (server-only; never in frontend). Provide `.env.example` (names only).**

* `SUPABASE_SERVICE_ROLE_KEY`
* `SUPABASE_URL`, `SUPABASE_ANON_KEY` (anon is client-safe)
* `GEMINI_API_KEY`
* `DEEPGRAM_API_KEY`  // used for both STT and Aura-2 TTS
* (optional) `GOOGLE_APPLICATION_CREDENTIALS` or `VISION_API_KEY`  // only if Vision flag is ON
* `POSTHOG_API_KEY` (client-safe), `POSTHOG_HOST`

**NON-NEGOTIABLES**

* Secrets: server-side only. No keys in client code or logs.
* Access: RLS deny-by-default, owner-only on user-scoped tables. Add **denial tests**.
* Modes: Global **Mode Banner** (Demo | Production). In Production, any mock/stub path hard-fails with a visible error.
* Privacy: Minimize PII. Document collected fields, purpose, retention, user controls (export/delete). Zero PII/secrets in logs.
* Resilience: Exponential backoff + jitter; honor provider headers; graceful fallbacks (Tesseract when Vision throttles; mute/switch TTS if Deepgram credits exhausted).
* A11Y: Labels/landmarks, keyboard nav, focus order, alt text, contrast checks.
* Fixtures: Seed small Indian set (roti, dal, idli, dosa, paneer tikka, poha; plus one thali).
* Idempotence: `POST /logs` accepts `Idempotency-Key`.

**DEVELOPMENT FLOW (follow Emergent's guide)**

* Start with **Strategic Planning Session**; then **build incrementally** with **1–2 features per cycle**, fully complete & test before next.
* Do not mix bugfixes with new features. When reporting bugs, provide clear repro and exact errors; fix in a separate message. ([Emergent Help][1])