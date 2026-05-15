# GlucoLens — 72-Hour Build Checklist
**Version:** 1.0 · **Date:** 15 May 2026

This is the **execution checklist** for the GlucoLens build. Tick each box as completed. The order is dependency-ordered: do not skip ahead.

---

## Pre-Build Setup (T-minus 0)

### Accounts & API Keys
- [ ] OpenAI API key obtained, billing active, GPT-4o + GPT-4V access confirmed
- [ ] Tavily API key obtained, test query returns results
- [ ] Firebase project `glucolens-demo` created
- [ ] Firebase services enabled: Authentication, Firestore, Realtime Database, Storage
- [ ] Firebase service account JSON downloaded → saved as `backend/.secrets/firebase-admin.json` (gitignored)
- [ ] Firebase web app registered → web config copied into `frontend/.env.local`

### Local Environment
- [ ] Python 3.11+ installed
- [ ] Node.js 20+ installed
- [ ] `pip install -r backend/requirements.txt` succeeds
- [ ] `cd frontend && npm install` succeeds
- [ ] `.env` file populated in `backend/` (all keys present)
- [ ] `.env.local` file populated in `frontend/`
- [ ] Both `.env` files added to `.gitignore`

### Repo
- [ ] Repo cloned from Buildora and renamed to `glucolens`
- [ ] Old Buildora-specific code removed
- [ ] `README.md` updated with project description
- [ ] Initial commit pushed

---

## Phase 1 — Foundation (Hours 0–4)

### Backend Skeleton
- [ ] `backend/main.py` — FastAPI app boots, returns `/health` 200
- [ ] `backend/config.py` — Pydantic Settings loads `.env` without errors
- [ ] `backend/utils/logging.py` — `agent_logger("test").info("hello")` produces structured log
- [ ] CORS configured for `http://localhost:3000`
- [ ] Global exception handler returns JSON errors with `session_id`

### Firebase Connectivity
- [ ] `backend/tools/firebase_tools.py` — `firestore_client()` returns a working client
- [ ] Read test: `firestore.collection("users").document("uid_rahman").get()` returns expected stub
- [ ] Write test: Can write to RTDB path `/test/ping` and read it back
- [ ] Storage test: Can upload + download a small file
- [ ] Auth middleware: `verify_firebase_jwt` decodes a real test token

### LLM + Search Connectivity
- [ ] `backend/tools/openai_tools.py` — chat completion smoke test passes
- [ ] GPT-4V smoke test — base64 image input returns structured response
- [ ] `backend/tools/tavily_tools.py` — search returns ≥1 result for a known query
- [ ] Retry + exponential backoff verified by injecting a fake failure

### State + Models
- [ ] `backend/models/state.py` — `GlucoLensState` TypedDict + `EMPTY_STATE` constant defined
- [ ] `backend/models/requests.py` — Pydantic request models for all 3 POST endpoints
- [ ] `backend/models/responses.py` — Response models match expected shape

### Seed Data
- [ ] `scripts/seed_firestore.py` runs without errors
- [ ] After seeding: `users/uid_rahman` exists with correct fields
- [ ] After seeding: `users/uid_aisyah` exists with role `dietitian`
- [ ] After seeding: `patients/uid_rahman/profile/main` exists with full profile
- [ ] After seeding: 7 days of meals exist under `patients/uid_rahman/meals`
- [ ] After seeding: 14 days of glucose readings exist
- [ ] `backend/tools/nutrition_db.json` contains all 30 Malaysian dishes
- [ ] `scripts/reset_demo.py` clears dynamic data without breaking profile

### Frontend Skeleton
- [ ] `frontend/src/lib/firebase.ts` — Firebase JS SDK initializes without console errors
- [ ] `frontend/src/contexts/AuthContext.tsx` — wraps app in `_app.tsx`
- [ ] Login form (`pages/index.tsx`) renders + accepts email/password
- [ ] Login as `rahman@demo.com` → redirected to `/patient`
- [ ] Login as `aisyah@demo.com` → redirected to `/dietitian`
- [ ] `ProtectedRoute` HOC blocks unauthenticated users
- [ ] Empty patient + dietitian pages render with "Hello {name}"

---

## Phase 2 — Tier 1 Agents (Hours 4–16)

### Tools Setup (must be done first)
- [ ] `backend/tools/prompts.py` — All prompt templates defined as named constants
- [ ] `backend/tools/drug_food_interactions.py` — `DRUG_FOOD_INTERACTIONS` dict complete
- [ ] `backend/tools/moh_guidelines.py` — `MOH_GUIDELINES` dict complete
- [ ] `backend/tools/normalize.py` — `_normalize`, `_pct_over`, `_pct_under` all unit-tested

### Agent 1 — Vision & Portion Agent
- [ ] `recognize_food_items()` — returns valid JSON for test image of nasi lemak
- [ ] `search_malaysian_food()` — Tavily search returns ≥1 result for "nasi lemak"
- [ ] `estimate_portion_size()` — unit tested with 5 known portion cases
- [ ] `decompose_mixed_dish()` — "Mixed Rice" returns list of ≥3 components
- [ ] `lookup_mydietcam_model()` — returns `None` when `MYDIETCAM_ENABLED=false`
- [ ] `flag_unrecognized_item()` — produces correct UI prompt
- [ ] `lookup_fallback_dish()` — returns safe default for unknown dish
- [ ] `node()` — given a real meal photo, returns valid `meal_items` list
- [ ] JSON parse error handling tested
- [ ] Vision timeout fallback tested
- [ ] All low-confidence items end up in `unrecognized_items`

### Agent 2 — Nutritional Engine
- [ ] `lookup_myfcd()` — returns correct nutrition for all 30 seed dishes
- [ ] `lookup_gi_index()` — falls back to category default for unknown dish
- [ ] `calculate_glycemic_load()` — formula verified against 5 known examples
- [ ] `estimate_missing_nutrients()` — returns plausible values for "kuih bahulu"
- [ ] `check_allergens()` — returns expected list for test profile with peanut allergy
- [ ] `aggregate_meal_totals()` — sums correctly across multi-item meal
- [ ] `node()` — given Agent 1 output, produces complete `nutrition_totals`
- [ ] In-memory cache for `estimate_missing_nutrients` works (no duplicate calls)
- [ ] `data_source` field correctly reports `"myfcd"`, `"estimate"`, or `"myfcd+estimate"`

### Agent 3 — Clinical Personalization
- [ ] `fetch_patient_profile()` — returns Rahman's full profile
- [ ] `compare_against_targets()` — produces correct deltas for over- and under-target cases
- [ ] `generate_traffic_light()` — correct color thresholds (green ≤0%, yellow ≤20%, red >20%)
- [ ] `generate_traffic_light()` — protein logic correctly handles under-target case
- [ ] `check_drug_food_interactions()` — flags bitter gourd + gliclazide correctly
- [ ] `generate_swap_suggestions()` — produces 2–4 culturally relevant swaps for breached meal
- [ ] Swap suggestions are in BM/EN per `patient.language_preference`
- [ ] `calculate_meal_risk_score()` — returns 0–100, weighted correctly
- [ ] `node()` — full pipeline produces complete output from Agent 2 input
- [ ] Edge case: meal with zero breaches returns empty `recommendations` list
- [ ] Edge case: severely over-target meal returns `risk_score >= 70`

### Agent 7 — Dashboard / Reflection (Patient view first)
- [ ] `determine_user_role()` — returns correct role for both demo users
- [ ] `build_patient_view()` — assembles all 6 card types from agent outputs
- [ ] `push_realtime_to_firebase()` — writes to `/dashboard/{uid}/live`, verified in Firebase console
- [ ] `generate_ui_summary()` — produces friendly single-sentence summary for patient
- [ ] `cache_view_state()` — repeated calls within 5min return cached payload
- [ ] `format_for_chart()` — Recharts-ready data for nutrient breakdown
- [ ] `node()` — produces complete `dashboard_payload`
- [ ] Frontend `useRealtimeDashboard` hook receives updates within 1 second

### Patient View Wiring
- [ ] `MealUpload.tsx` — drag-and-drop accepts JPG/PNG, encodes to base64
- [ ] `MealUpload.tsx` — Submit triggers `POST /api/v1/meal/upload` with JWT
- [ ] `AgentStatusTicker.tsx` — shows 5 agent checkpoints with live ✓/⏳
- [ ] `TrafficLight.tsx` — renders 4 nutrients with correct colors
- [ ] `RecommendationsList.tsx` — renders swap suggestions as cards
- [ ] `DrugInteractionsCard.tsx` — renders only when interactions array is non-empty
- [ ] Smoke test: Upload nasi lemak photo → traffic light appears within 15 seconds
- [ ] Smoke test: All cards render with no JS console errors

---

## Phase 3 — Tier 2 Agents (Hours 16–32)

### Agent 8 — Misinformation Debunker
- [ ] `extract_claim()` — correctly parses "TikTok says bitter gourd replaces metformin" into structured claim
- [ ] `extract_claim()` — handles URL input by setting `urls_present: true`
- [ ] `fetch_url_content()` — pulls clean text from a real article URL (≤4000 chars)
- [ ] `search_pubmed()` — returns results scoped to `pubmed.ncbi.nlm.nih.gov`
- [ ] `search_cochrane()` — returns results
- [ ] `search_moh_guidelines()` — returns results from `moh.gov.my`
- [ ] `search_who_guidelines()` — returns results from `who.int`
- [ ] `search_diabetes_associations()` — returns results from at least one of ADA/IDF/PDM
- [ ] All 5 search tools run in parallel via `ThreadPoolExecutor` — total time <8s
- [ ] `check_against_patient_profile()` — flags bitter gourd + gliclazide for Rahman
- [ ] `classify_verdict()` — forces `harmful_for_you` when patient-specific risk exists
- [ ] `generate_explanation()` — produces 3–5 sentence plain-language explanation
- [ ] `append_disclaimer()` — appends exact disclaimer text, no variants
- [ ] `log_query_for_dietitian()` — writes to both Firestore and RTDB
- [ ] `node()` — full pipeline returns complete output for "bitter gourd replaces metformin"
- [ ] Verdict UI mapping correct: harmful → 🚨, contradicted → ❌, mixed → ⚠️, supported → ✅
- [ ] Fallback when Tavily returns zero results: uses GPT-4o knowledge with caveat

### Agent 5 — Alert Manager
- [ ] `check_threshold_breach()` — returns expected breaches for over-target meal
- [ ] `calculate_breach_severity()` — correctly upgrades severity for extreme breaches
- [ ] `create_alert_payload()` — produces correctly formed alert object
- [ ] `push_to_dashboard_feed()` — writes to BOTH patient + dietitian RTDB paths
- [ ] `send_telegram_alert()` — no-ops cleanly when `TELEGRAM_ENABLED=false`
- [ ] `send_email_alert()` — no-ops cleanly when `EMAIL_ENABLED=false`
- [ ] `log_alert_history()` — persists to Firestore
- [ ] `node()` — produces 0 alerts for compliant meal, ≥1 for breaching meal
- [ ] Frontend `AlertFeed.tsx` — renders new alerts in real-time without page refresh

### Agent 6 — Dietitian Report (PDF)
- [ ] `fetch_week_meals()` — returns last 7 days of meals
- [ ] `fetch_week_glucose()` — returns last 7 days of glucose readings
- [ ] `fetch_alert_history()` — returns last 7 days of alerts
- [ ] `fetch_misinformation_queries()` — returns last 7 days of misinfo queries
- [ ] `calculate_week_summary()` — adherence %, worst/best meals correctly computed
- [ ] `generate_trend_chart()` — produces non-empty PNG bytes
- [ ] `compile_pdf_report()` — produces valid PDF (opens in Acrobat / Preview)
- [ ] PDF contains: header, summary stats, trend chart, worst 3 meals, best 3 meals, alert log, misinfo log, notes section, footer
- [ ] `upload_pdf_to_storage()` — returns valid signed URL (downloadable)
- [ ] `notify_dietitian()` — RTDB notification appears for dietitian
- [ ] `node()` — given a fresh request, produces a downloadable PDF in <12 seconds
- [ ] Backup: pre-generate Rahman's PDF and save as `scripts/_backup_rahman_weekly.pdf`

### Agent 9 — Orchestrator / Router
- [ ] `classify_event()` — accepts all 5 valid event types
- [ ] `classify_event()` — rejects invalid event types with clear error
- [ ] `classify_event()` — rejects missing required payload keys
- [ ] `build_agent_pipeline()` — produces correct graph for each event type
- [ ] `handle_agent_failure()` — every agent has a defined fallback output
- [ ] `audit_log()` — writes to `audit_logs/{session_id}` for every run
- [ ] `human_in_the_loop_check()` — escalates only when critical + risk_score ≥80
- [ ] `cost_optimizer()` — returns cached result for repeat image within 60s
- [ ] `run()` — full pipeline executes for all 5 event types without exception
- [ ] Per-node timeout (20s) enforced
- [ ] Pipeline soft-timeout (45s) enforced

### Routers
- [ ] `POST /api/v1/meal/upload` — accepts image, runs pipeline, returns full response
- [ ] `POST /api/v1/glucose/entry` — accepts reading, runs pipeline
- [ ] `POST /api/v1/misinformation/check` — accepts query, runs pipeline
- [ ] `GET /api/v1/report/weekly/{patient_id}` — dietitian-only, returns PDF URL
- [ ] `GET /api/v1/dashboard` — returns current dashboard payload
- [ ] `GET /api/v1/patients` — dietitian-only, returns caseload
- [ ] `GET /api/v1/alerts/{patient_id}` — returns last 30 days of alerts
- [ ] All routes reject requests without valid Firebase JWT
- [ ] All routes reject cross-user access (Rahman cannot read Aisyah's data)

---

## Phase 4 — Dietitian View + Polish (Hours 32–48)

### Glucose Agent (mock data)
- [ ] `fetch_glucose_log()` — returns seeded 14-day glucose data
- [ ] `correlate_meal_glucose()` — produces correlation array for seed data
- [ ] `detect_trigger_foods()` — identifies nasi lemak as trigger for Rahman
- [ ] `compare_to_population_average()` — shows Rahman vs population delta
- [ ] `generate_insight_card()` — produces "spikes X% more than average" card
- [ ] `node()` — returns at least 1 glucose insight for Rahman

### Dietitian Components
- [ ] `CaseloadTable.tsx` — renders Rahman's row with current weekly risk score
- [ ] Caseload sorted by `weekly_risk_score` descending
- [ ] `PatientDrilldown.tsx` — `/dietitian/uid_rahman` shows meals, alerts, misinfo
- [ ] `MisinfoLog.tsx` — shows logged queries with verdicts
- [ ] `MisinfoLog.tsx` — "Mark as discussed" button updates Firestore
- [ ] `WeeklyPdfCard.tsx` — Download button triggers PDF generation + download
- [ ] `AlertHistoryTable.tsx` — shows all breaches with severity filter
- [ ] All dietitian components render with no JS console errors

### Patient Components (remaining)
- [ ] `MealHistory.tsx` — scrollable list of past meals
- [ ] `MealHistory.tsx` — thumbnails load from Firebase Storage signed URLs
- [ ] `MisinfoChecker.tsx` — textarea + submit
- [ ] `VerdictCard.tsx` — renders verdict + explanation + evidence sources
- [ ] `GlucoseInsightCard.tsx` — renders trigger food insights
- [ ] Bilingual stub: language toggle visible but defaults to EN

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
- [ ] Image upload with non-image file → friendly error message
- [ ] Agent failure mid-pipeline → graceful degradation, partial UI render
- [ ] Network failure → user sees retry option, no crash
- [ ] Empty state for: zero meals, zero alerts, zero misinfo queries
- [ ] Loading states for: meal upload, misinfo check, PDF generation
- [ ] 401 from backend → frontend redirects to login

---

## Phase 5 — Final Integration & Polish (Hours 48–60)

### Agent 4 Visualization
- [ ] `GlucoseInsightCard.tsx` renders insight from `glucose_insights` array
- [ ] Recharts chart: "Rahman's glucose response to nasi lemak vs population avg"
- [ ] Chart shows clear visual delta (Rahman +23% above population)
- [ ] Chart appears on patient dashboard when glucose data exists

### Performance
- [ ] Pre-cache Rahman's nasi lemak result so live demo is fast
- [ ] All Firestore reads use indexes (check Firebase console for warnings)
- [ ] Frontend bundle size <500KB compressed
- [ ] Image upload compresses to <500KB before sending to backend
- [ ] Backend response time for `/meal/upload`: median <8s, p95 <15s

### Visual Polish
- [ ] All cards use consistent `rounded-2xl` + `shadow-sm` styling
- [ ] Color tokens consistent: red-500/amber-500/emerald-500
- [ ] Loading spinners use consistent design
- [ ] All buttons have hover + disabled states
- [ ] Mobile responsive: works at 375px viewport
- [ ] Dark mode (optional, only if time permits)

### Data Quality
- [ ] Re-run `scripts/seed_firestore.py` and verify all data appears correctly
- [ ] Verify Rahman's seed meal history shows realistic variety (not all nasi lemak)
- [ ] Verify glucose seed data has plausible post-meal spikes
- [ ] Verify 3+ misinfo queries seeded for Aisyah's drilldown view

---

## Phase 6 — Deployment & Backup (Hours 60–72)

### Localhost Demo Setup
- [ ] Backend runs cleanly via `uvicorn backend.main:app --reload --port 8000`
- [ ] Frontend runs cleanly via `npm run dev` on port 3000
- [ ] Both can be started in <10 seconds from cold
- [ ] Demo day machine: full setup tested on the actual presenter laptop

### Vercel-Ready (Optional)
- [ ] `vercel.json` configured for full-stack deploy
- [ ] Backend deployable as serverless function (or via Render/Railway as fallback)
- [ ] Production env vars documented in `docs/deployment.md`
- [ ] Test deploy succeeds at least once (URL for judges if needed)

### Backup & Safety
- [ ] Rahman's weekly PDF pre-generated and saved offline
- [ ] Screenshots of all key screens saved (in case live demo fails)
- [ ] Backup video walkthrough recorded (3 min)
- [ ] Demo data exportable via `scripts/export_demo.py`

### Documentation
- [ ] `README.md` includes setup instructions
- [ ] `docs/CLAUDE.md` complete
- [ ] `docs/api.md` exported from FastAPI OpenAPI
- [ ] `.env.example` files in both `backend/` and `frontend/`
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
