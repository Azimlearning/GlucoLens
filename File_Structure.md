# GlucoLens — File Structure Specification
**Version:** 1.0 · **Date:** 15 May 2026

This is the **canonical file structure** for the GlucoLens build. Every file listed must exist with the described purpose. New files outside this tree should not be added without updating this document.

---

## Root Layout

```
glucolens/
├── backend/                    # FastAPI + LangGraph backend
├── frontend/                   # Next.js + Tailwind frontend
├── docs/                       # PRD, Checklist, this file, CLAUDE.md
├── scripts/                    # Seeding, dev helpers
├── tests/                      # E2E and integration tests
├── .gitignore
├── README.md
└── docker-compose.yml          # Optional — for local Firebase emulator
```

---

## Backend Tree

```
backend/
├── main.py                          # FastAPI app entry. Mounts routers, CORS, middleware.
├── config.py                        # Pydantic Settings class. Loads .env into typed object.
├── requirements.txt                 # Pinned deps. See "Backend Dependencies" below.
│
├── agents/                          # One file per LangGraph agent. Each exports `node(state) -> dict`.
│   ├── __init__.py                  # Re-exports all node functions for orchestrator.
│   ├── orchestrator.py              # Agent 9. Builds and runs LangGraph subgraphs.
│   ├── vision_agent.py              # Agent 1. Tools: recognize_food_items, search_malaysian_food,
│   │                                # estimate_portion_size, decompose_mixed_dish, lookup_mydietcam_model,
│   │                                # flag_unrecognized_item, lookup_fallback_dish.
│   ├── nutrition_agent.py           # Agent 2. Tools: lookup_myfcd, lookup_gi_index,
│   │                                # calculate_glycemic_load, estimate_missing_nutrients,
│   │                                # check_allergens, aggregate_meal_totals.
│   ├── clinical_agent.py            # Agent 3. Tools: fetch_patient_profile, compare_against_targets,
│   │                                # lookup_moh_diabetic_guidelines, check_drug_food_interactions,
│   │                                # generate_traffic_light, generate_swap_suggestions,
│   │                                # calculate_meal_risk_score.
│   ├── glucose_agent.py             # Agent 4. Tools: fetch_glucose_log, correlate_meal_glucose,
│   │                                # detect_trigger_foods, compare_to_population_average,
│   │                                # generate_insight_card.
│   ├── alert_agent.py               # Agent 5. Tools: check_threshold_breach, calculate_breach_severity,
│   │                                # create_alert_payload, push_to_dashboard_feed,
│   │                                # send_telegram_alert (stub), send_email_alert (stub),
│   │                                # log_alert_history.
│   ├── report_agent.py              # Agent 6. Tools: fetch_week_meals, fetch_week_glucose,
│   │                                # fetch_alert_history, fetch_misinformation_queries,
│   │                                # calculate_week_summary, generate_trend_chart,
│   │                                # compile_pdf_report, upload_pdf_to_storage, notify_dietitian.
│   ├── dashboard_agent.py           # Agent 7. Tools: fetch_agent_outputs, determine_user_role,
│   │                                # build_patient_view, build_dietitian_view,
│   │                                # push_realtime_to_firebase, format_for_chart,
│   │                                # generate_ui_summary, cache_view_state, localize_strings.
│   └── misinfo_agent.py             # Agent 8. Tools: extract_claim, fetch_url_content,
│                                    # search_pubmed, search_cochrane, search_moh_guidelines,
│                                    # search_who_guidelines, search_diabetes_associations,
│                                    # check_against_patient_profile, classify_verdict,
│                                    # generate_explanation, append_disclaimer,
│                                    # log_query_for_dietitian.
│
├── tools/                           # Cross-agent utilities. Pure functions + thin clients.
│   ├── __init__.py
│   ├── firebase_tools.py            # Wrappers: firestore.read, firestore.write, rtdb.set,
│   │                                # storage.upload, auth.verify_token. Single Firestore + RTDB client.
│   ├── openai_tools.py              # Wrappers: chat_completion, vision_completion, embed.
│   │                                # Includes retry + exponential backoff.
│   ├── tavily_tools.py              # Wrapper: tavily_search(query, depth, domains).
│   ├── pdf_tools.py                 # ReportLab helpers: doc_template, header_block,
│   │                                # table_from_dict, image_block.
│   ├── prompts.py                   # ALL LLM prompt templates as named constants.
│   │                                # VISION_SYSTEM_PROMPT, SWAP_PROMPT, CLAIM_EXTRACTION_PROMPT, etc.
│   ├── nutrition_db.json            # 30 Malaysian dishes. Ground truth for Agent 2.
│   ├── drug_food_interactions.py    # DRUG_FOOD_INTERACTIONS dict.
│   ├── moh_guidelines.py            # MOH_GUIDELINES dict.
│   ├── population_averages.py       # POPULATION_AVERAGES dict for Agent 4.
│   └── normalize.py                 # _normalize(text), _parse_iso, _pct_over, _pct_under helpers.
│
├── models/                          # Pydantic + TypedDict models.
│   ├── __init__.py
│   ├── state.py                     # GlucoLensState TypedDict + EMPTY_STATE constant.
│   ├── requests.py                  # API request models: MealUploadRequest, GlucoseEntryRequest,
│   │                                # MisinfoRequest.
│   ├── responses.py                 # API response models matching the same shapes.
│   └── domain.py                    # Patient, Meal, Alert, MisinfoQuery dataclasses.
│
├── routers/                         # FastAPI routers. Each calls orchestrator.run().
│   ├── __init__.py
│   ├── meal.py                      # POST /meal/upload
│   ├── glucose.py                   # POST /glucose/entry
│   ├── misinfo.py                   # POST /misinformation/check
│   ├── report.py                    # GET /report/weekly/{patient_id}
│   ├── dashboard.py                 # GET /dashboard
│   ├── patients.py                  # GET /patients  (dietitian only)
│   ├── alerts.py                    # GET /alerts/{patient_id}
│   └── health.py                    # GET /health  (no auth)
│
├── middleware/                      # FastAPI middleware.
│   ├── __init__.py
│   ├── auth.py                      # verify_firebase_jwt dependency.
│   ├── logging.py                   # Request/response structured logging.
│   └── error_handler.py             # Global exception handler → JSON response.
│
├── utils/                           # Generic utilities.
│   ├── __init__.py
│   ├── logging.py                   # agent_logger(name) → structlog logger.
│   ├── cache.py                     # In-memory LRU caches.
│   ├── timeout.py                   # asyncio timeout wrapper.
│   └── uuid.py                      # session_id generator.
│
└── tests/                           # Pytest suite.
    ├── __init__.py
    ├── conftest.py                  # Firebase emulator fixtures, sample state objects.
    ├── unit/
    │   ├── test_nutrition_agent.py
    │   ├── test_clinical_agent.py
    │   ├── test_alert_agent.py
    │   └── test_glucose_agent.py
    └── integration/
        ├── test_meal_pipeline.py    # End-to-end meal upload through all 5 agents.
        └── test_misinfo_pipeline.py # End-to-end misinfo check.
```

### Backend Dependencies (`requirements.txt`)

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
pydantic==2.7.1
pydantic-settings==2.2.1
python-dotenv==1.0.1

# LangGraph / OpenAI
langgraph==0.2.16
langchain==0.2.6
langchain-openai==0.1.8
langchain-core==0.2.11
openai==1.30.5

# Firebase
firebase-admin==6.5.0

# Tavily
tavily-python==0.3.3

# HTTP + parsing
httpx==0.27.0
beautifulsoup4==4.12.3

# PDF
reportlab==4.2.0
matplotlib==3.9.0

# Logging
structlog==24.1.0

# Testing
pytest==8.2.0
pytest-asyncio==0.23.6
```

---

## Frontend Tree

```
frontend/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── postcss.config.js
├── .env.local                       # NEXT_PUBLIC_* vars.
│
├── public/
│   ├── logo.svg
│   ├── favicon.ico
│   └── seeds/                       # Static seed images for demo (Rahman's nasi lemak photo, etc.)
│       └── nasi_lemak_rahman.jpg
│
└── src/
    ├── pages/                       # Next.js Pages Router (simpler than App Router for 72h build).
    │   ├── _app.tsx                 # Firebase init, AuthProvider wrapper, global styles.
    │   ├── _document.tsx            # HTML shell.
    │   ├── index.tsx                # Login form / role-based redirect.
    │   ├── login.tsx                # Login form (alias of index).
    │   │
    │   ├── patient/
    │   │   ├── index.tsx            # Patient dashboard (main view).
    │   │   ├── history.tsx          # Meal history (scrollable timeline).
    │   │   └── misinfo.tsx          # Misinformation checker page.
    │   │
    │   ├── dietitian/
    │   │   ├── index.tsx            # Caseload table.
    │   │   └── [patient_id].tsx     # Patient drilldown (dynamic route).
    │   │
    │   └── api/                     # Empty — backend is FastAPI, not Next API routes.
    │
    ├── components/                  # Presentational React components.
    │   ├── auth/
    │   │   ├── LoginForm.tsx
    │   │   ├── ProtectedRoute.tsx   # Higher-order wrapper checking role + auth state.
    │   │   └── LogoutButton.tsx
    │   │
    │   ├── patient/
    │   │   ├── MealUpload.tsx           # Drag-and-drop + camera. Calls /api/v1/meals/upload.
    │   │   │                            # Shows image preview, ingredient breakdown, 6-macro totals.
    │   │   ├── IngredientBreakdown.tsx  # Per-item card: components chips + macro bars + sodium.
    │   │   ├── AgentStatusTicker.tsx    # Live progress bar with ✓/⏳ per agent.
    │   │   ├── TrafficLight.tsx         # 🟢/🟡/🔴 grid for 4 nutrients.
    │   │   ├── MealBreakdown.tsx        # Per-item nutrition table (used in MealHistory).
    │   │   ├── RecommendationsList.tsx
    │   │   ├── DrugInteractionsCard.tsx
    │   │   ├── AlertFeed.tsx            # RTDB-subscribed live alert list.
    │   │   ├── MisinfoChecker.tsx       # Textarea + verdict card.
    │   │   ├── VerdictCard.tsx          # Verdict + explanation + sources.
    │   │   ├── MealHistory.tsx          # Scrollable list with thumbnails.
    │   │   ├── MealCard.tsx             # Single meal row (used in history).
    │   │   ├── GlucoseInsightCard.tsx
    │   │   ├── DashboardSummaryCard.tsx # Greeting + avg glucose + meal count + AI summary.
    │   │   │                            # Shown at top of patient dashboard on every visit.
    │   │   └── WeeklyReportCard.tsx     # Trigger weekly PDF report generation; show download link.
    │   │
    │   ├── dietitian/
    │   │   ├── CaseloadTable.tsx    # Sorted by risk score.
    │   │   ├── PatientDrilldown.tsx
    │   │   ├── MisinfoLog.tsx
    │   │   ├── WeeklyPdfCard.tsx
    │   │   └── AlertHistoryTable.tsx
    │   │
    │   └── shared/
    │       ├── Card.tsx             # Standard rounded-2xl card wrapper.
    │       ├── Button.tsx
    │       ├── Spinner.tsx
    │       ├── Badge.tsx            # Severity / verdict badge.
    │       ├── EmptyState.tsx
    │       └── ErrorBoundary.tsx
    │
    ├── hooks/                       # Custom React hooks.
    │   ├── useAuth.ts               # Firebase auth state + role.
    │   ├── useRealtimeDashboard.ts  # Subscribes to /dashboard/{uid}/live.
    │   ├── useAlertFeed.ts          # Subscribes to /dashboard/{uid}/alerts.
    │   ├── useMealHistory.ts        # Firestore listener.
    │   └── useMisinfoLog.ts         # Firestore listener (dietitian).
    │
    ├── lib/                         # Non-React utilities.
    │   ├── firebase.ts              # Firebase JS SDK init. Exports auth, db, rtdb, storage.
    │   ├── api.ts                   # Axios/fetch client for backend. Auto-attaches JWT.
    │   ├── types.ts                 # TypeScript interfaces mirroring backend schemas.
    │   ├── constants.ts             # Color tokens, severity labels.
    │   └── format.ts                # Date/number formatters, pct, mmol/L, etc.
    │
    ├── styles/
    │   └── globals.css              # Tailwind directives + base resets.
    │
    └── contexts/
        └── AuthContext.tsx          # Provides user + role across the tree.
```

### Frontend Dependencies (`package.json` — key entries)

```json
{
  "dependencies": {
    "next": "14.2.3",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "firebase": "10.12.2",
    "recharts": "2.12.7",
    "axios": "1.7.2",
    "lucide-react": "0.383.0",
    "react-dropzone": "14.2.3",
    "tailwindcss": "3.4.4"
  },
  "devDependencies": {
    "typescript": "5.4.5",
    "@types/react": "18.3.3",
    "@types/node": "20.14.2",
    "autoprefixer": "10.4.19",
    "postcss": "8.4.38"
  }
}
```

---

## Scripts

```
scripts/
├── seed_firestore.py           # Creates demo users + Rahman's profile + 7 days of meals + glucose.
├── seed_storage.py             # Uploads sample meal images to Firebase Storage.
├── warmup.py                   # Pings OpenAI, Tavily, Firebase to warm cold starts.
├── generate_demo_pdf.py        # Pre-generates Rahman's weekly PDF as backup.
└── reset_demo.py               # Clears all dynamic data, keeps profile + seed meals.
```

---

## Docs

```
docs/
├── GlucoLens_PRD_v2.md        # Product Requirements Document (this build).
├── File_Structure.md           # THIS FILE.
├── Checklist.md                # 72-hour build checklist.
├── CLAUDE.md                   # Claude Code project instructions.
├── architecture.md             # (Optional) Deeper architecture diagrams.
└── api.md                      # (Optional) Auto-generated FastAPI OpenAPI export.
```

---

## Tests

```
tests/
├── e2e/
│   ├── meal_upload.e2e.ts      # Playwright: full meal upload flow.
│   ├── misinfo_check.e2e.ts    # Full misinformation flow.
│   └── dietitian_view.e2e.ts   # Caseload + drilldown + PDF download.
└── fixtures/
    ├── nasi_lemak.jpg
    ├── char_kuey_teow.jpg
    └── sample_misinfo_queries.json
```

---

## Naming Conventions

### Python (Backend)
- Files: `snake_case.py`
- Classes: `PascalCase`
- Functions: `snake_case`
- Constants: `UPPER_SNAKE_CASE`
- Private helpers: `_leading_underscore`
- Agent files always end with `_agent.py` (except `orchestrator.py`).
- Tool files always end with `_tools.py`.
- Each agent file exposes a single public `node(state) -> dict` function.

### TypeScript (Frontend)
- Files: `PascalCase.tsx` for components, `camelCase.ts` for hooks/utilities.
- Component files: one component per file, file named after the component.
- Hook files: prefix with `use`, e.g. `useAuth.ts`.
- Types: defined in `lib/types.ts`; import from there, never duplicate.
- Constants: `UPPER_SNAKE_CASE` in `lib/constants.ts`.

### Firebase
- Collection names: lowercase, plural (`users`, `patients`, `meals`).
- Document IDs: `uid_<role>` for users, UUIDv4 elsewhere.
- RTDB paths: lowercase, slash-separated.

---

## Module Dependency Rules

To keep the build clean across 72 hours, dependencies are **one-directional**:

```
routers/  →  agents/  →  tools/  →  models/
              ↓
         middleware/
              ↓
            utils/
```

- `tools/` may import from `models/` and `utils/` only.
- `agents/` may import from `tools/`, `models/`, `utils/`.
- `routers/` may import from `agents/`, `models/`, `middleware/`, `utils/`.
- `middleware/` may import from `utils/` and `models/` only.
- **No reverse imports.** No `agents/` importing from `routers/`.
- **No cross-agent imports.** Agents communicate via state. If an agent needs data another agent produced, it reads from state — not by calling the other agent directly. Orchestrator handles all sequencing.

---

## File Creation Order (for the 72h build)

This order minimizes blocking dependencies:

1. `backend/config.py` + `backend/models/state.py` + `backend/utils/logging.py`
2. `backend/tools/firebase_tools.py` + `backend/tools/openai_tools.py` + `backend/tools/tavily_tools.py`
3. `backend/tools/nutrition_db.json` + `backend/tools/prompts.py` + lookup dicts
4. `backend/agents/vision_agent.py` → `nutrition_agent.py` → `clinical_agent.py`
5. `backend/agents/alert_agent.py` + `dashboard_agent.py`
6. `backend/agents/misinfo_agent.py` + `glucose_agent.py` + `report_agent.py`
7. `backend/agents/orchestrator.py`
8. `backend/routers/*.py` + `backend/main.py`
9. `scripts/seed_firestore.py` + `scripts/seed_storage.py`
10. Frontend: `lib/firebase.ts` → `lib/api.ts` → `lib/types.ts` → `contexts/AuthContext.tsx`
11. Frontend: `pages/index.tsx` (login) → `pages/patient/index.tsx` → `pages/dietitian/index.tsx`
12. Frontend components (in the order patient flow → dietitian flow)
13. End-to-end smoke tests
14. Polish + buffer

---

*This file structure is canonical. Deviations require an update to this document.*
