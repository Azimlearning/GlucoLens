# GlucoLens — 72-Hour Build Checklist
**Version:** 1.0 · **Date:** 15 May 2026

This is the **execution checklist** for the GlucoLens build. Tick each box as completed. The order is dependency-ordered: do not skip ahead.

---

## Pre-Build Setup (T-minus 0)

### Accounts & API Keys
- [x] OpenAI API key obtained, billing active, GPT-4o + GPT-4V access confirmed
- [x] Tavily API key obtained, test query returns results
- [x] Firebase project `glucolens-demo` created
- [x] Firebase services enabled: Authentication, Firestore, Realtime Database, Storage
- [x] Firebase service account JSON downloaded → saved as `backend/.secrets/firebase-admin.json` (gitignored)
- [x] Firebase web app registered → web config copied into `frontend/.env.local`

### Local Environment
- [x] Python 3.11+ installed
- [x] Node.js 20+ installed
- [x] `pip install -r backend/requirements.txt` succeeds
- [x] `cd frontend && npm install` succeeds
- [x] `.env` file populated in `backend/` (all keys present)
- [x] `.env.local` file populated in `frontend/`
- [x] Both `.env` files added to `.gitignore`

### Repo
- [x] Repo cloned and branch `abdul/dev` created and pushed to origin
- [x] Old Buildora-specific code removed
- [x] `README.md` updated with project description
- [x] Initial commit pushed

---

## Phase 1 — Foundation (Hours 0–4)

### Backend Skeleton
- [x] `backend/main.py` — FastAPI app boots, returns `/health` 200
- [x] `backend/config.py` — Pydantic Settings loads `.env` without errors
- [x] `backend/utils/logging.py` — `agent_logger("test").info("hello")` produces structured log
- [x] CORS configured for `http://localhost:3000`
- [x] Global exception handler returns JSON errors with `session_id`

### Firebase Connectivity
- [x] `backend/tools/firebase_tools.py` — `firestore_client()` returns a working client
- [ ] Read test: `firestore.collection("users").document("uid_rahman").get()` returns expected stub
- [ ] Write test: Can write to RTDB path `/test/ping` and read it back
- [ ] Storage test: Can upload + download a small file
- [x] Auth middleware: `verify_firebase_jwt` decodes a real test token

### LLM + Search Connectivity
- [x] `backend/tools/openai_tools.py` — chat completion smoke test passes
- [x] GPT-4V smoke test — base64 image input returns structured response
- [x] `backend/tools/tavily_tools.py` — search returns ≥1 result for a known query
- [ ] Retry + exponential backoff verified by injecting a fake failure

### State + Models
- [x] `backend/models/state.py` — `GlucoLensState` TypedDict + `EMPTY_STATE` constant defined
- [x] `backend/models/requests.py` — Pydantic request models for all 3 POST endpoints
- [x] `backend/models/responses.py` — Response models match expected shape

### Seed Data
- [x] `scripts/seed_firestore.py` runs without errors
- [x] After seeding: `users/uid_rahman` exists with correct fields
- [x] After seeding: `users/uid_aisyah` exists with role `dietitian`
- [x] After seeding: `patients/uid_rahman/profile/main` exists with full profile
- [x] After seeding: 7 days of meals exist under `patients/uid_rahman/meals`
- [x] After seeding: 14 days of glucose readings exist
- [x] `backend/tools/nutrition_db.json` contains all 30 Malaysian dishes
- [x] `scripts/reset_demo.py` clears dynamic data without breaking profile

### Frontend Skeleton
- [x] `frontend/src/lib/firebase.ts` — Firebase JS SDK initializes without console errors
- [x] `frontend/src/contexts/AuthContext.tsx` — wraps app in `_app.tsx`
- [x] Login form (`pages/index.tsx`) renders + accepts email/password
- [x] Login as `rahman@demo.com` → redirected to `/patient`
- [x] Login as `aisyah@demo.com` → redirected to `/dietitian`
- [x] `ProtectedRoute` HOC blocks unauthenticated users
- [x] Empty patient + dietitian pages render with "Hello {name}"

---

## Phase 2 — Tier 1 Agents (Hours 4–16)

### Tools Setup (must be done first)
- [x] `backend/tools/prompts.py` — All prompt templates defined as named constants
- [x] `backend/tools/drug_food_interactions.py` — `DRUG_FOOD_INTERACTIONS` dict complete
- [x] `backend/tools/moh_guidelines.py` — `MOH_GUIDELINES` dict complete
- [x] `backend/tools/normalize.py` — `_normalize`, `_pct_over`, `_pct_under` all unit-tested

### Agent 1 — Vision & Portion Agent
- [x] `recognize_food_items()` — returns valid JSON for test image of nasi lemak
- [x] `search_malaysian_food()` — Tavily search returns ≥1 result for "nasi lemak"
- [x] `estimate_portion_size()` — unit tested with 5 known portion cases
- [x] `decompose_mixed_dish()` — "Mixed Rice" returns list of ≥3 components
- [x] `lookup_mydietcam_model()` — returns `None` when `MYDIETCAM_ENABLED=false`
- [x] `flag_unrecognized_item()` — produces correct UI prompt
- [x] `lookup_fallback_dish()` — returns safe default for unknown dish
- [x] `node()` — given a real meal photo, returns valid `meal_items` list
- [x] JSON parse error handling tested
- [x] Vision timeout fallback tested
- [x] All low-confidence items end up in `unrecognized_items`

### Agent 2 — Nutritional Engine
- [x] `lookup_myfcd()` — returns correct nutrition for all 30 seed dishes
- [x] `lookup_gi_index()` — falls back to category default for unknown dish
- [x] `calculate_glycemic_load()` — formula verified against 5 known examples
- [x] `estimate_missing_nutrients()` — returns plausible values for "kuih bahulu"
- [x] `check_allergens()` — returns expected list for test profile with peanut allergy
- [x] `aggregate_meal_totals()` — sums correctly across multi-item meal
- [x] `node()` — given Agent 1 output, produces complete `nutrition_totals`
- [x] In-memory cache for `estimate_missing_nutrients` works (no duplicate calls)
- [x] `data_source` field correctly reports `"myfcd"`, `"estimate"`, or `"myfcd+estimate"`

### Agent 3 — Clinical Personalization
- [x] `fetch_patient_profile()` — returns Rahman's full profile
- [x] `compare_against_targets()` — produces correct deltas for over- and under-target cases
- [x] `generate_traffic_light()` — correct color thresholds (green ≤0%, yellow ≤20%, red >20%)
- [x] `generate_traffic_light()` — protein logic correctly handles under-target case
- [x] `check_drug_food_interactions()` — flags bitter gourd + gliclazide correctly
- [x] `generate_swap_suggestions()` — produces 2–4 culturally relevant swaps for breached meal
- [x] Swap suggestions are in BM/EN per `patient.language_preference`
- [x] `calculate_meal_risk_score()` — returns 0–100, weighted correctly
- [x] `node()` — full pipeline produces complete output from Agent 2 input
- [x] Edge case: meal with zero breaches returns empty `recommendations` list
- [x] Edge case: severely over-target meal returns `risk_score >= 70`

### Agent 7 — Dashboard / Reflection (Patient view first)
- [x] `determine_user_role()` — returns correct role for both demo users
- [x] `build_patient_view()` — assembles all 6 card types from agent outputs
- [x] `push_realtime_to_firebase()` — writes to `/dashboard/{uid}/live`, verified in Firebase console
- [x] `generate_ui_summary()` — produces friendly single-sentence summary for patient
- [x] `cache_view_state()` — repeated calls within 5min return cached payload
- [x] `format_for_chart()` — Recharts-ready data for nutrient breakdown
- [x] `node()` — produces complete `dashboard_payload`
- [x] Frontend `useRealtimeDashboard` hook receives updates within 1 second

### Patient View Wiring
- [x] `MealUpload.tsx` — drag-and-drop accepts JPG/PNG, encodes to base64
- [x] `MealUpload.tsx` — Submit triggers `POST /api/v1/meals/upload` with JWT
- [x] `MealUpload.tsx` — Shows uploaded image preview before and after analysis
- [x] `MealUpload.tsx` — Shows 6-macro totals (calories, carbs, protein, fat, sodium, GL)
- [x] `IngredientBreakdown.tsx` — Per-item card: food name, portion, components as chips, macro bars, allergen alerts
- [x] `DashboardSummaryCard.tsx` — Greeting, avg glucose, meal count, avg risk, AI summary from dashboard agent
- [x] `WeeklyReportCard.tsx` — Trigger weekly PDF generation; show download link on success
- [x] `AgentStatusTicker.tsx` — shows 5 agent checkpoints with live ✓/⏳
- [x] `TrafficLight.tsx` — renders 4 nutrients with correct colors
- [x] `RecommendationsList.tsx` — renders swap suggestions as cards
- [x] `DrugInteractionsCard.tsx` — renders only when interactions array is non-empty
- [x] Patient dashboard page shows content on load (DashboardSummaryCard + stats) without needing upload
- [x] Smoke test: Upload nasi lemak photo → traffic light + ingredient breakdown appears
- [ ] Smoke test: All cards render with no JS console errors

---

## Phase 3 — Tier 2 Agents (Hours 16–32)

### Agent 8 — Misinformation Debunker
- [x] `extract_claim()` — correctly parses "TikTok says bitter gourd replaces metformin" into structured claim
- [x] `extract_claim()` — handles URL input by setting `urls_present: true`
- [x] `fetch_url_content()` — pulls clean text from a real article URL (≤4000 chars)
- [x] `search_pubmed()` — returns results scoped to `pubmed.ncbi.nlm.nih.gov`
- [x] `search_cochrane()` — returns results
- [x] `search_moh_guidelines()` — returns results from `moh.gov.my`
- [x] `search_who_guidelines()` — returns results from `who.int`
- [x] `search_diabetes_associations()` — returns results from at least one of ADA/IDF/PDM
- [x] All 5 search tools run in parallel via `ThreadPoolExecutor` — total time <8s
- [x] `check_against_patient_profile()` — flags bitter gourd + gliclazide for Rahman
- [x] `classify_verdict()` — forces `harmful_for_you` when patient-specific risk exists
- [x] `generate_explanation()` — produces 3–5 sentence plain-language explanation
- [x] `append_disclaimer()` — appends exact disclaimer text, no variants
- [x] `log_query_for_dietitian()` — writes to both Firestore and RTDB
- [x] `node()` — full pipeline returns complete output for "bitter gourd replaces metformin"
- [x] Verdict UI mapping correct: harmful → 🚨, contradicted → ❌, mixed → ⚠️, supported → ✅
- [x] Fallback when Tavily returns zero results: uses GPT-4o knowledge with caveat

### Agent 5 — Alert Manager
- [x] `check_threshold_breach()` — returns expected breaches for over-target meal
- [x] `calculate_breach_severity()` — correctly upgrades severity for extreme breaches
- [x] `create_alert_payload()` — produces correctly formed alert object
- [x] `push_to_dashboard_feed()` — writes to BOTH patient + dietitian RTDB paths
- [x] `send_telegram_alert()` — no-ops cleanly when `TELEGRAM_ENABLED=false`
- [x] `send_email_alert()` — no-ops cleanly when `EMAIL_ENABLED=false`
- [x] `log_alert_history()` — persists to Firestore
- [x] `node()` — produces 0 alerts for compliant meal, ≥1 for breaching meal
- [x] Frontend `AlertFeed.tsx` — renders new alerts in real-time without page refresh

### Agent 6 — Dietitian Report (PDF)
- [x] `fetch_week_meals()` — returns last 7 days of meals
- [x] `fetch_week_glucose()` — returns last 7 days of glucose readings
- [x] `fetch_alert_history()` — returns last 7 days of alerts
- [x] `fetch_misinformation_queries()` — returns last 7 days of misinfo queries
- [x] `calculate_week_summary()` — adherence %, worst/best meals correctly computed
- [x] `generate_trend_chart()` — produces non-empty PNG bytes
- [x] `compile_pdf_report()` — produces valid PDF (opens in Acrobat / Preview)
- [x] PDF contains: header, summary stats, trend chart, worst 3 meals, best 3 meals, alert log, misinfo log, notes section, footer
- [x] `upload_pdf_to_storage()` — returns valid signed URL (downloadable)
- [x] `notify_dietitian()` — RTDB notification appears for dietitian
- [x] `node()` — given a fresh request, produces a downloadable PDF in <12 seconds
- [x] Backup: pre-generate Rahman's PDF → `scripts/generate_demo_pdf.py` exists

### Agent 9 — Orchestrator / Router
- [x] `classify_event()` — accepts all 5 valid event types
- [x] `classify_event()` — rejects invalid event types with clear error
- [x] `classify_event()` — rejects missing required payload keys
- [x] `build_agent_pipeline()` — produces correct graph for each event type
- [x] `handle_agent_failure()` — every agent has a defined fallback output
- [x] `audit_log()` — writes to `audit_logs/{session_id}` for every run
- [x] `human_in_the_loop_check()` — escalates only when critical + risk_score ≥80
- [x] `cost_optimizer()` — returns cached result for repeat image within 60s
- [x] `run()` — full pipeline executes for all 5 event types without exception
- [x] Per-node timeout (20s) enforced
- [x] Pipeline soft-timeout (45s) enforced

### Routers
- [x] `POST /api/v1/meal/upload` — accepts image, runs pipeline, returns full response
- [x] `POST /api/v1/glucose/entry` — accepts reading, runs pipeline
- [x] `POST /api/v1/misinformation/check` — accepts query, runs pipeline
- [x] `GET /api/v1/report/weekly/{patient_id}` — dietitian-only, returns PDF URL
- [x] `GET /api/v1/dashboard` — returns current dashboard payload
- [x] `GET /api/v1/patients` — dietitian-only, returns caseload
- [x] `GET /api/v1/alerts/{patient_id}` — returns last 30 days of alerts
- [x] All routes reject requests without valid Firebase JWT
- [x] All routes reject cross-user access (Rahman cannot read Aisyah's data)

---

## Phase 4 — Dietitian View + Polish (Hours 32–48)

### Glucose Agent (mock data)
- [x] `fetch_glucose_log()` — returns seeded 14-day glucose data
- [x] `correlate_meal_glucose()` — produces correlation array for seed data
- [x] `detect_trigger_foods()` — identifies nasi lemak as trigger for Rahman
- [x] `compare_to_population_average()` — shows Rahman vs population delta
- [x] `generate_insight_card()` — produces "spikes X% more than average" card
- [x] `node()` — returns at least 1 glucose insight for Rahman

### Dietitian Components
- [x] `CaseloadTable.tsx` — renders Rahman's row with current weekly risk score
- [x] Caseload sorted by `weekly_risk_score` descending
- [x] `PatientDrilldown.tsx` — `/dietitian/uid_rahman` shows meals, alerts, misinfo
- [x] `MisinfoLog.tsx` — shows logged queries with verdicts
- [x] `MisinfoLog.tsx` — "Mark as discussed" button updates Firestore
- [x] `WeeklyPdfCard.tsx` — Download button triggers PDF generation + download
- [x] `AlertHistoryTable.tsx` — shows all breaches with severity filter
- [ ] All dietitian components render with no JS console errors

### Patient Components (remaining)
- [x] `MealHistory.tsx` — scrollable list of past meals
- [ ] `MealHistory.tsx` — thumbnails load from Firebase Storage signed URLs
- [x] `MisinfoChecker.tsx` — textarea + submit
- [x] `VerdictCard.tsx` — renders verdict + explanation + evidence sources
- [x] `GlucoseInsightCard.tsx` — renders trigger food insights
- [x] Bilingual stub: language toggle visible but defaults to EN

### End-to-End Smoke Tests
- [ ] Login as Rahman → upload nasi lemak photo → see traffic light + alerts within 20s
- [ ] As Rahman → paste bitter gourd misinfo → see verdict 🚨 + explanation
- [ ] As Rahman → check Meal History page → all past meals appear
- [ ] Logout → Login as Aisyah → see Rahman in caseload at high risk
- [ ] As Aisyah → click Rahman → see all meals, alerts, the bitter gourd query
- [ ] As Aisyah → click "Download Weekly Brief" → PDF downloads + opens
- [ ] As Aisyah → "Mark as discussed" on misinfo query → state persists on reload
- [ ] All flows complete without 500 errors in backend logs

### Error Handling
- [x] Image upload with non-image file → friendly error message (MealUpload validates)
- [x] Agent failure mid-pipeline → graceful degradation, partial UI render
- [x] Network failure → user sees retry option, no crash
- [x] Empty state for: zero meals, zero alerts, zero misinfo queries
- [x] Loading states for: meal upload, misinfo check, PDF generation
- [x] 401 from backend → frontend redirects to login

---

## Phase 5 — Final Integration & Polish (Hours 48–60)

### Agent 4 Visualization
- [x] `GlucoseInsightCard.tsx` renders insight from `glucose_insights` array
- [x] Recharts chart: "Rahman's glucose response to nasi lemak vs population avg"
- [x] Chart shows clear visual delta (Rahman +23% above population)
- [x] Chart appears on patient dashboard when glucose data exists

### Performance
- [ ] Pre-cache Rahman's nasi lemak result so live demo is fast
- [ ] All Firestore reads use indexes (check Firebase console for warnings)
- [ ] Frontend bundle size <500KB compressed
- [ ] Image upload compresses to <500KB before sending to backend
- [ ] Backend response time for `/meal/upload`: median <8s, p95 <15s

### Visual Polish
- [x] All cards use consistent `rounded-2xl` + `shadow-sm` styling
- [x] Color tokens consistent: red-500/amber-500/emerald-500
- [x] Loading spinners use consistent design
- [x] All buttons have hover + disabled states
- [x] Mobile responsive: works at 375px viewport
- [ ] Dark mode (optional, only if time permits)

### Data Quality
- [x] Re-run `scripts/seed_firestore.py` and verify all data appears correctly
- [x] Verify Rahman's seed meal history shows realistic variety (not all nasi lemak)
- [x] Verify glucose seed data has plausible post-meal spikes
- [x] Verify 3+ misinfo queries seeded for Aisyah's drilldown view

---

## Phase 6 — Deployment & Backup (Hours 60–72)

### Localhost Demo Setup
- [x] Backend runs cleanly via `uvicorn backend.main:app --reload --port 8000`
- [x] Frontend runs cleanly via `npm run dev` on port 3000
- [x] Both can be started in <10 seconds from cold
- [ ] Demo day machine: full setup tested on the actual presenter laptop

### Vercel-Ready (Optional)
- [ ] `vercel.json` configured for full-stack deploy
- [ ] Backend deployable as serverless function (or via Render/Railway as fallback)
- [ ] Production env vars documented in `docs/deployment.md`
- [ ] Test deploy succeeds at least once (URL for judges if needed)

### Backup & Safety
- [x] Rahman's weekly PDF pre-generated via `scripts/generate_demo_pdf.py`
- [ ] Screenshots of all key screens saved (in case live demo fails)
- [ ] Backup video walkthrough recorded (3 min)
- [ ] Demo data exportable via `scripts/export_demo.py`

### Documentation
- [x] `README.md` includes setup instructions
- [x] `docs/CLAUDE.md` complete
- [ ] `docs/api.md` exported from FastAPI OpenAPI
- [x] `.env.example` files in both `backend/` and `frontend/`
- [ ] Inline docstrings on all public agent + tool functions

### Final Smoke Test
- [ ] Fresh clone → seed → start backend → start frontend → full demo flow runs
- [ ] All 4 demo moments execute cleanly (no errors, no missing UI)
- [ ] Logs clean (no warnings or stack traces during normal flow)
- [ ] All team members can run the full setup independently

---

## Hour-by-Hour Sprint Plan

### Block A: Hours 0–4 (Foundation)
- Hour 0–1: Account setup, API keys, repo clone
- Hour 1–2: Backend boots, Firebase wired, env vars working
- Hour 2–3: Seed scripts working, demo users + Rahman profile in place
- Hour 3–4: Frontend boots, login works, role-based routing works

### Block B: Hours 4–16 (Tier 1 Agents)
- Hour 4–6: Vision agent (1) — GPT-4V wired, returns valid output for test image
- Hour 6–8: Nutrition agent (2) — `nutrition_db.json` + lookups + aggregation
- Hour 8–11: Clinical agent (3) — traffic light + swap suggestions + drug interactions
- Hour 11–13: Dashboard agent (7) for patient view — RTDB push working
- Hour 13–16: Patient view UI — MealUpload + TrafficLight + smoke test passes

### Block C: Hours 16–32 (Tier 2 Agents)
- Hour 16–20: Misinformation agent (8) — full tool chain + verdict + disclaimer
- Hour 20–24: Alert agent (5) — threshold check + dashboard push + Firestore log
- Hour 24–28: Report agent (6) — PDF generation + chart + upload
- Hour 28–32: Orchestrator (9) — all event types route correctly, failure handling

### Block D: Hours 32–48 (Dietitian + Glucose + Polish)
- Hour 32–36: Glucose agent (4) — mock data + correlation + insight card
- Hour 36–42: Dietitian components — caseload, drilldown, misinfo log, PDF download
- Hour 42–48: End-to-end smoke tests, error handling, empty states, loading states

### Block E: Hours 48–60 (Integration + Polish)
- Hour 48–52: Performance — caching, indexing, response time tuning
- Hour 52–56: Visual polish — consistent styling, mobile responsive, loading UX
- Hour 56–60: Data quality — re-seed, verify all flows render correctly

### Block F: Hours 60–72 (Deployment + Buffer)
- Hour 60–64: Backup PDF, screenshots, video walkthrough
- Hour 64–68: Documentation — README, CLAUDE.md, API docs
- Hour 68–72: Buffer for bug fixes, presenter laptop setup, dry runs

---

## Critical Path Items (Cannot Skip)

The following items are on the critical path. If anything goes wrong, these MUST be working before anything else is touched:

1. **Firebase wiring** — without this, nothing persists
2. **OpenAI connectivity** — without this, Agents 1, 2, 3, 7, 8 don't work
3. **Vision agent → Nutrition agent → Clinical agent → Dashboard agent** — the main patient flow
4. **Misinformation agent** — the differentiator
5. **Login + role-based routing** — without this, can't switch between Rahman and Aisyah
6. **Realtime DB push from Agent 7** — without this, no live UI updates

---

*Tick boxes religiously. If a box stays unticked for >2 hours, escalate to the team.*
