oky# GlucoLens — Product Requirements Document
### National Deep Tech Challenge · Hackathon Build · 72-Hour Sprint
**Version:** 1.0 · **Date:** 14 May 2026 · **Due:** 16 May 2026, 12:30 PM

---

## 1. Product Overview

**GlucoLens** is a clinical nutrition companion for Malaysian Type 2 Diabetes patients. It transforms every meal photo into a clinical data point — giving patients real-time dietary feedback and giving dietitians a structured weekly brief for every patient, between quarterly consultations.

**Pitch line:**
> "Malaysia has 3.9 million diabetics. Their dietitian sees them once a quarter. Between visits, they eat 360 meals alone. GlucoLens turns every meal into a clinical data point."

**IP basis:** Licensed from MyDietCam (Prof Moy, UTP) — AI food recognition trained on Malaysian/local food datasets. The demo uses GPT-4V as a vision substitute; production integrates the licensed MyDietCam model.

---

## 2. Locked Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React + Tailwind CSS + Recharts | Team comfort; reuse Buildora shell |
| Backend | FastAPI (Python) | Reuse Buildora backend code |
| LLM Provider | OpenAI GPT-4o + GPT-4V | Paid API, no rate limits |
| Agent Orchestration | LangGraph | Reuse Buildora setup |
| Database | Firebase Firestore + Realtime DB | Reuse Buildora; auth, storage, live sync |
| File Storage | Firebase Storage | Meal photo uploads |
| Auth | Firebase Auth | Two hardcoded demo users |
| Web Search (Agents 1, 8) | Tavily API | Pluggable — can swap later |
| Alerts | Dashboard only (no Telegram for demo) | Extensible to Telegram/WS/email post-demo |
| PDF Reports | ReportLab | Reuse Buildora PDF agent |
| Charts | Recharts | Lightweight, React-native |
| Deployment | Localhost (demo day) + Vercel-ready | Full-stack Vercel config included |
| Notifications (demo) | In-dashboard alert feed | Architecture supports Telegram/email/WS hooks |

---

## 3. Demo Users (Hardcoded — No Signup Flow)

| Role | Email | Password | Display Name |
|---|---|---|---|
| Patient | `rahman@demo.com` | `demo123` | Encik Rahman |
| Dietitian | `aisyah@demo.com` | `demo123` | Puan Aisyah |

**Patient profile (Rahman — seeded in Firestore):**
- Age: 54, Male
- Condition: Type 2 Diabetes (diagnosed 2019)
- HbA1c: 8.1% (last reading: March 2026)
- Medications: Metformin 1000mg BD, Gliclazide 80mg OD
- Dietary targets: Carbohydrate ≤ 45g/meal, Glycemic Load ≤ 15/meal, Sodium ≤ 600mg/meal
- Comorbidities: Hypertension (stage 1)
- Assigned dietitian: Puan Aisyah

---

## 4. System Architecture

```
Browser (React + Tailwind)
        │
        ▼
FastAPI Backend (/api/v1/*)
        │
        ├── LangGraph Orchestrator (Agent 9)
        │         │
        │         ├── Agent 1: Vision & Portion
        │         ├── Agent 2: Nutritional Engine
        │         ├── Agent 3: Clinical Personalization
        │         ├── Agent 4: Glucose Correlation (mock for demo)
        │         ├── Agent 5: Alert Manager (dashboard only)
        │         ├── Agent 6: Dietitian Report (PDF)
        │         ├── Agent 7: Reflection & Dashboard
        │         ├── Agent 8: Misinformation Debunker
        │         └── Agent 9: Orchestrator / Router
        │
        ├── Firebase (Firestore + Realtime DB + Storage + Auth)
        ├── OpenAI API (GPT-4o, GPT-4V)
        └── Tavily API (web search)
```

**Event → Pipeline routing:**
| Event | Agents Invoked |
|---|---|
| Meal photo upload | 1 → 2 → 3 → 5 → 7 |
| Glucose entry | 4 → 5 → 7 |
| Misinformation query | 8 → 7 |
| Weekly report trigger | 6 → 7 |
| Dashboard load | 7 only |

---

## 5. Nine-Agent Specifications

### Agent 1 — Vision & Portion Agent
**Job:** Receives meal photo → identifies all food items + estimates portion sizes.

**Variable tool calls:**
- `analyze_image_gpt4v(image_base64)` — primary recognition via GPT-4V
- `search_malaysian_food(query)` — Tavily search for dish confirmation/variants
- `estimate_portion_size(item, reference_objects)` — rule-based portion from plate reference
- `decompose_mixed_dish(dish_name)` — splits mixed dishes (e.g. Mixed Rice → rice + lauk + veg)
- `lookup_mydietcam_model(dish_name)` — hooks into MyDietCam IP (production only)
- `flag_unrecognized_item(image_region)` — marks items with low confidence for user confirmation

**Output schema:**
```json
{
  "meal_items": [
    { "name": "Nasi Lemak", "portion_g": 250, "confidence": 0.91, "components": ["rice", "sambal", "egg", "anchovies", "peanuts"] }
  ],
  "unrecognized": [],
  "recognition_method": "gpt4v+tavily"
}
```

---

### Agent 2 — Nutritional Engine
**Job:** Maps identified food items to nutritional values.

**Variable tool calls:**
- `lookup_myfcd(food_name)` — Malaysian Food Composition Database lookup
- `lookup_gi_index(food_name)` — Glycemic Index database
- `calculate_glycemic_load(carbs_g, gi)` — GL = (GI × net carbs) / 100
- `estimate_missing_nutrients(food_name)` — GPT-4o fallback for foods not in MyFCD
- `check_allergens(food_item, patient_profile)` — flags relevant allergens
- `aggregate_meal_totals(items)` — sums macros, GL, sodium for whole meal

**Output schema:**
```json
{
  "totals": { "carbs_g": 68, "protein_g": 22, "fat_g": 18, "sodium_mg": 820, "glycemic_load": 28 },
  "per_item": [...],
  "data_source": "myfcd+estimate"
}
```

**Fallback for demo:** 30 Malaysian dishes hard-coded in `nutrition_db.json` as ground truth.

---

### Agent 3 — Clinical Personalization Agent
**Job:** Compares meal nutrition against patient's diabetic profile and generates actionable guidance.

**Variable tool calls:**
- `fetch_patient_profile(patient_id)` — Firestore patient record
- `compare_against_targets(meal_totals, patient_targets)` — returns over/under per nutrient
- `lookup_moh_diabetic_guidelines(nutrient)` — MOH Malaysia dietary guidelines
- `check_drug_food_interactions(food_items, medications)` — e.g. grapefruit + statins
- `generate_traffic_light(comparison)` — 🟢 / 🟡 / 🔴 per nutrient
- `generate_swap_suggestions(flagged_items)` — GPT-4o: healthier local alternatives
- `calculate_meal_risk_score(comparison)` — 0–100 composite risk score

**Output schema:**
```json
{
  "traffic_light": { "carbs": "red", "gl": "red", "sodium": "yellow", "protein": "green" },
  "risk_score": 78,
  "recommendations": ["Skip the second ladle of sambal", "Swap white rice for brown rice"],
  "drug_interactions": []
}
```

---

### Agent 4 — Glucose Correlation Agent *(Tier 3 — demo slide only)*
**Job:** Correlates post-meal glucose readings with meal logs to identify patient-specific trigger foods.

**Variable tool calls (shown on slide):**
- `fetch_glucose_log(patient_id, days)` — Firestore glucose readings
- `correlate_meal_glucose(meal_log, glucose_log)` — 2-hour post-meal delta analysis
- `detect_trigger_foods(correlations)` — statistical outlier detection
- `compare_to_population_average(patient_id, food)` — "Rahman spikes 23% more from nasi lemak than average"
- `generate_insight_card(finding)` — plain-language insight for dashboard

**Demo:** Pre-rendered chart showing "Rahman's glucose response to nasi lemak vs population avg." Narrate the logic.

---

### Agent 5 — Alert Manager
**Job:** Monitors meal logs and triggers alerts when patient exceeds clinical thresholds.

**For demo:** Alerts appear in the in-dashboard notification feed only.
**Post-demo hooks:** Telegram bot, WebSocket push, email (architecture documented, not built).

**Variable tool calls:**
- `check_threshold_breach(meal_totals, patient_targets)` — returns list of breaches
- `calculate_breach_severity(breach)` — minor / moderate / critical
- `create_alert_payload(breach, patient, dietitian)` — structured alert object
- `push_to_dashboard_feed(alert_payload)` — Firebase Realtime DB push (built for demo)
- `send_telegram_alert(alert_payload)` — *(stub only — disabled for demo)*
- `send_email_alert(alert_payload)` — *(stub only — disabled for demo)*
- `log_alert_history(patient_id, alert)` — Firestore persistence

**Alert thresholds (default):**
- Carbs > 45g/meal → 🟡 moderate
- GL > 20/meal → 🔴 critical
- Sodium > 700mg/meal → 🟡 moderate

---

### Agent 6 — Dietitian Report Agent
**Job:** Generates a weekly PDF clinical brief for the dietitian, one per patient.

**Variable tool calls:**
- `fetch_week_meals(patient_id, week)` — all meal logs for the period
- `fetch_week_glucose(patient_id, week)` — glucose readings (if entered)
- `fetch_alert_history(patient_id, week)` — breach log
- `fetch_misinformation_queries(patient_id, week)` — questions logged by Agent 8
- `calculate_week_summary(meals, targets)` — adherence %, worst meals, best meals
- `generate_trend_chart(week_data)` — weekly nutrient trend (Recharts → base64 for PDF)
- `compile_pdf_report(data)` — ReportLab PDF generation (Buildora code, new template)
- `upload_pdf_to_storage(patient_id, pdf)` — Firebase Storage
- `notify_dietitian(dietitian_id, pdf_url)` — in-app notification

**Output:** Downloadable PDF. MOH-compatible format.

---

### Agent 7 — Reflection & Dashboard Agent *(UI Brain)*
**Job:** Synthesizes all other agents' outputs into the correct view for the logged-in user role (patient vs dietitian).

**Variable tool calls:**
- `fetch_agent_outputs(session_id)` — collects outputs from Agents 1–6
- `determine_user_role(user_id)` — patient vs dietitian
- `build_patient_view(outputs, patient_id)` — traffic light card, meal breakdown, swap suggestions, alert feed
- `build_dietitian_view(outputs, dietitian_id)` — caseload risk table, patient drilldown, PDF access, misinformation log
- `push_realtime_to_firebase(channel, payload)` — live UI sync (no page refresh)
- `format_for_chart(data, chart_type)` — Recharts-ready data
- `generate_ui_summary(agent_outputs)` — plain-language insight string
- `cache_view_state(user_id, state)` — fast revisit loads
- `localize_strings(text, language)` — BM/EN toggle

**Why this matters:** Decouples UI from clinical logic. Dietitian sees "foods to watch" in clinical language; patient sees "skip the sambal" in friendly language. Same agent outputs, role-aware presentation.

---

### Agent 8 — Misinformation Debunker Agent *(Demo showstopper)*
**Job:** Patient pastes a claim or URL from social media → agent verifies it against evidence-based sources and assesses safety for *this specific patient*.

**Variable tool calls:**
- `extract_claim(input_text_or_url)` — parse into a structured claim
- `fetch_url_content(url)` — pull article/post if URL provided
- `search_pubmed(claim)` — Tavily search scoped to PubMed
- `search_cochrane(claim)` — systematic review search
- `search_moh_guidelines(claim)` — MOH Malaysia / KKM official guidance
- `search_who_guidelines(claim)` — WHO statements
- `search_diabetes_associations(claim)` — Persatuan Diabetes Malaysia, ADA, IDF
- `check_against_patient_profile(claim, patient_id)` — patient-specific safety check
- `classify_verdict(evidence)` — ✅ Supported / ⚠️ Mixed / ❌ Contradicted / 🚨 Harmful for you
- `generate_explanation(verdict, evidence, patient_context)` — plain-language reasoning
- `append_disclaimer()` — **always appended:** "This is my suggestion based on available evidence — please refer to your dietitian or doctor before changing your diet, supplements, or medications."
- `log_query_for_dietitian(patient_id, claim, verdict)` — dietitian sees what their patients are asking about

**Demo script:**
> Patient pastes: *"TikTok says drinking bitter gourd juice every morning replaces metformin."*
> → Fires 6 tool calls → returns 🚨 Potentially harmful for you (Gliclazide interaction risk) → logs to Puan Aisyah's dashboard

---

### Agent 9 — Orchestrator / Router
**Job:** Receives all events, classifies them, builds the correct LangGraph subgraph, handles failures.

**Variable tool calls:**
- `classify_event(event_type, payload)` — meal_upload | glucose_entry | weekly_report | misinformation_query | dashboard_load
- `build_agent_pipeline(event_class)` — assembles LangGraph subgraph
- `handle_agent_failure(agent_id, error)` — retry / fallback / degrade gracefully
- `audit_log(event, agents_invoked, outcome)` — clinical traceability
- `human_in_the_loop_check(decision)` — escalate ambiguous cases
- `cost_optimizer(pipeline)` — short-circuit when result is cached

---

## 6. LangGraph State Schema

```python
class GlucoLensState(TypedDict):
    # Event context
    event_type: str          # "meal_upload" | "glucose_entry" | "misinformation_query" | "weekly_report" | "dashboard_load"
    patient_id: str
    dietitian_id: str
    session_id: str

    # Agent 1 outputs
    meal_items: list[dict]
    unrecognized_items: list[dict]

    # Agent 2 outputs
    nutrition_totals: dict
    nutrition_per_item: list[dict]

    # Agent 3 outputs
    traffic_light: dict
    risk_score: int
    recommendations: list[str]
    drug_interactions: list[dict]

    # Agent 4 outputs (mock for demo)
    glucose_insights: list[dict]

    # Agent 5 outputs
    alerts: list[dict]

    # Agent 6 outputs
    pdf_url: str

    # Agent 7 outputs
    dashboard_payload: dict
    view_role: str           # "patient" | "dietitian"

    # Agent 8 outputs
    verdict: str
    verdict_explanation: str
    disclaimer: str
    logged_for_dietitian: bool

    # Metadata
    errors: list[dict]
    cached: bool
    timestamp: str
```

---

## 7. API Endpoints (FastAPI)

| Method | Path | Agent(s) | Auth |
|---|---|---|---|
| `POST` | `/api/v1/meal/upload` | 1 → 2 → 3 → 5 → 7 | Firebase JWT |
| `POST` | `/api/v1/glucose/entry` | 4 → 5 → 7 | Firebase JWT |
| `POST` | `/api/v1/misinformation/check` | 8 → 7 | Firebase JWT |
| `GET` | `/api/v1/report/weekly/{patient_id}` | 6 → 7 | Firebase JWT |
| `GET` | `/api/v1/dashboard` | 7 | Firebase JWT |
| `GET` | `/api/v1/patients` | — | Firebase JWT (dietitian only) |
| `GET` | `/api/v1/alerts/{patient_id}` | — | Firebase JWT |
| `GET` | `/health` | — | None |

---

## 8. Firebase Data Schema

### Firestore Collections

**`users/{uid}`**
```json
{
  "role": "patient" | "dietitian",
  "displayName": "Encik Rahman",
  "assignedDietitian": "uid_aisyah"
}
```

**`patients/{uid}/profile`**
```json
{
  "age": 54, "sex": "M", "conditions": ["T2DM", "Hypertension"],
  "hba1c": 8.1, "medications": ["Metformin 1000mg BD", "Gliclazide 80mg OD"],
  "targets": { "carbs_g": 45, "gl": 15, "sodium_mg": 600 }
}
```

**`patients/{uid}/meals/{meal_id}`**
```json
{
  "timestamp": "ISO8601",
  "image_url": "gs://...",
  "meal_items": [...],
  "nutrition_totals": {...},
  "traffic_light": {...},
  "risk_score": 78,
  "recommendations": [...]
}
```

**`patients/{uid}/alerts/{alert_id}`**
```json
{
  "timestamp": "ISO8601",
  "breach_type": "glycemic_load",
  "severity": "critical",
  "meal_id": "...",
  "seen": false
}
```

**`patients/{uid}/misinfo_log/{query_id}`**
```json
{
  "timestamp": "ISO8601",
  "raw_query": "TikTok says...",
  "claim": "bitter gourd replaces metformin",
  "verdict": "harmful",
  "seen_by_dietitian": false
}
```

### Firebase Realtime DB

**`/dashboard/{uid}/live`** — Agent 7 pushes real-time updates here. React frontend listens on this channel.

---

## 9. Frontend Views

### Patient View (`/patient`)
1. **Meal Upload Card** — drag-and-drop or camera; shows processing status per agent
2. **Traffic Light Panel** — 🟢/🟡/🔴 per nutrient (carbs, GL, sodium, protein)
3. **Recommendation Cards** — swap suggestions in plain BM/EN
4. **Alert Feed** — in-app notifications for threshold breaches
5. **Misinformation Checker** — paste claim or URL → get verdict card
6. **Meal History** — scrollable log with thumbnail + risk score per meal

### Dietitian View (`/dietitian`)
1. **Caseload Table** — all patients sorted by weekly risk score (highest first)
2. **Patient Drilldown** — click any patient → full meal log + alerts + misinfo queries
3. **Weekly PDF** — download button per patient
4. **Misinformation Log** — list of queries with verdicts; mark as "discussed"
5. **Alert History** — all threshold breaches, filterable

---

## 10. Environment Variables

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Tavily
TAVILY_API_KEY=tvly-...

# Firebase (Service Account — backend)
FIREBASE_PROJECT_ID=glucolens-demo
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@glucolens-demo.iam.gserviceaccount.com

# Firebase (Client config — frontend .env.local)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# App config
APP_ENV=development
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

---

## 11. 72-Hour Build Sequence

### Hour 0–4: Foundation (All hands)
- [ ] Clone Buildora → rename to GlucoLens
- [ ] Set up Firebase project, seed demo users + Rahman's patient profile in Firestore
- [ ] Confirm all env vars working (OpenAI ping, Tavily ping, Firebase read/write)
- [ ] Deploy empty FastAPI server — `/health` returns 200
- [ ] Scaffold React shell with patient/dietitian route split + Firebase auth

### Hour 4–16: Tier 1 Agents (Core demo moments)
- [ ] **Agent 1** — Vision & Portion: GPT-4V integration + Tavily food search + decompose_mixed_dish
- [ ] **Agent 2** — Nutrition: `nutrition_db.json` (30 dishes) + GL calculator
- [ ] **Agent 3** — Clinical Personalization: patient profile fetch + traffic light + swap suggestions
- [ ] **Agent 7** — Dashboard Reflection: Firebase Realtime DB push + React live listener
- [ ] Patient view: meal upload → live agent status → traffic light result

### Hour 16–32: Tier 1 continued + Tier 2
- [ ] **Agent 8** — Misinformation Debunker: full tool chain + verdict card + disclaimer + dietitian log
- [ ] **Agent 5** — Alerts: threshold check + dashboard feed push (no Telegram)
- [ ] **Agent 6** — PDF Report: Buildora template swap → Reportlab weekly brief
- [ ] **Agent 9** — Orchestrator: LangGraph router for all 5 event types

### Hour 32–48: Dietitian view + Polish
- [ ] Dietitian view: caseload table + patient drilldown + PDF download + misinfo log
- [ ] Alert feed (patient + dietitian)
- [ ] End-to-end demo run: Rahman uploads nasi lemak → traffic light → misinfo query → Aisyah's view
- [ ] Error handling: agent failure fallbacks, loading states, empty states

### Hour 48–60: Slides + Demo Script
- [ ] Agent 4 mock chart: "Rahman spikes 23% more from nasi lemak" — pre-render in Recharts
- [ ] Demo script rehearsal (3 live moments + 1 slide — see Section 13)
- [ ] Pitch deck: problem → IP narrative → 9-agent architecture → demo → business model → roadmap

### Hour 60–72: Buffer
- [ ] Bug fixes from rehearsal
- [ ] Vercel config (in case judges want a live URL)
- [ ] README with demo setup instructions

---

## 12. File Structure

```
glucolens/
├── backend/
│   ├── main.py                    # FastAPI app entry
│   ├── agents/
│   │   ├── orchestrator.py        # Agent 9 — LangGraph router
│   │   ├── vision_agent.py        # Agent 1
│   │   ├── nutrition_agent.py     # Agent 2
│   │   ├── clinical_agent.py      # Agent 3
│   │   ├── glucose_agent.py       # Agent 4 (stub)
│   │   ├── alert_agent.py         # Agent 5
│   │   ├── report_agent.py        # Agent 6
│   │   ├── dashboard_agent.py     # Agent 7
│   │   └── misinfo_agent.py       # Agent 8
│   ├── tools/
│   │   ├── firebase_tools.py
│   │   ├── openai_tools.py
│   │   ├── tavily_tools.py
│   │   ├── nutrition_db.json      # 30 Malaysian dishes — hardcoded fallback
│   │   └── pdf_tools.py
│   ├── models/
│   │   └── state.py               # LangGraph GlucoLensState TypedDict
│   ├── routers/
│   │   ├── meal.py
│   │   ├── glucose.py
│   │   ├── misinfo.py
│   │   ├── report.py
│   │   └── dashboard.py
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── index.tsx          # Login / redirect
    │   │   ├── patient/
    │   │   │   └── index.tsx      # Patient dashboard
    │   │   └── dietitian/
    │   │       └── index.tsx      # Dietitian dashboard
    │   ├── components/
    │   │   ├── MealUpload.tsx
    │   │   ├── TrafficLight.tsx
    │   │   ├── AlertFeed.tsx
    │   │   ├── MisinfoChecker.tsx
    │   │   ├── PatientTable.tsx
    │   │   └── WeeklyPdfCard.tsx
    │   ├── lib/
    │   │   ├── firebase.ts
    │   │   └── api.ts
    │   └── hooks/
    │       └── useRealtimeDashboard.ts
    ├── .env.local
    └── package.json
```

---

## 13. Demo Script (3 Live Moments + 1 Slide)

### Moment 1 — Patient View (The WOW)
> Login as Rahman. Upload a photo of nasi lemak.
> Watch the agent status ticker: Vision ✓ → Nutrition ✓ → Clinical ✓ → Dashboard ✓
> Traffic light appears: Carbs 🔴 · GL 🔴 · Sodium 🟡 · Protein 🟢
> Recommendation: "Skip the second ladle of sambal. Swap white rice for brown rice or cauliflower rice."
> Alert fires in the feed: "Meal GL exceeded target by 87%."

### Moment 2 — Misinformation Demo (The EMOTIONAL)
> Still as Rahman. Paste: *"TikTok says drinking bitter gourd juice every morning replaces metformin."*
> Watch 6 tool calls fire in real time on screen.
> Verdict card: 🚨 Potentially harmful for you
> "Bitter gourd has mild blood-sugar-lowering effects in some studies, but does not replace metformin. Combined with your Gliclazide, it could cause dangerous hypoglycemia. This is my suggestion — please refer to your dietitian or doctor before making any changes."
> Behind the scenes: query logged to Puan Aisyah's misinfo log.

### Moment 3 — Dietitian View (The DIFFERENTIATOR)
> Switch login to Puan Aisyah.
> Show caseload table sorted by weekly risk score.
> Click Rahman — show his meal log, alerts, and the bitter gourd query.
> Click "Download Weekly Brief" — ReportLab PDF opens.
> Point to misinfo log: "Puan Aisyah now knows what misinformation her patients are encountering — before the next appointment."

### Moment 4 — Slide (The LEARNING LOOP)
> Pre-rendered Recharts chart: Rahman's glucose response to nasi lemak vs population average (+23%).
> "Over time, Agent 4 learns that this specific patient responds worse to high-GL Malay staples than the population average. His dietary targets tighten automatically."

---

## 14. Post-Demo Extensibility (For Pitch Deck Roadmap Slide)

| Feature | Effort | Impact |
|---|---|---|
| Telegram / WhatsApp alerts | 1 day | Agent 5 already stubs this |
| Email digest | 1 day | Agent 5 stub |
| Production MyDietCam model swap | License agreement | Agent 1 has `lookup_mydietcam_model` hook |
| Agent 4 — live glucose correlation | 1 week | All data is already being stored |
| NCD expansion (hypertension, CKD) | 2 weeks | Agent 3 is profile-driven |
| BM language toggle | 3 days | Agent 7 has `localize_strings` hook |
| MOH KOSPEN data integration | Partnership | Clinical validation pathway |
| Clinic licensing portal | 2 weeks | B2B admin dashboard |

---

## 15. Build Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| GPT-4V slow for demo (>10s) | Medium | Pre-cache Rahman's nasi lemak result; show spinner with agent status ticker |
| Tavily returns no results for misinfo query | Low | Fallback to GPT-4o knowledge + "based on available evidence" framing |
| Firebase cold start | Low | Seed all data on setup; warm-up call on login |
| LangGraph agent chain fails mid-pipeline | Medium | Each agent has a `fallback_output` for graceful degradation |
| PDF generation fails | Low | Buildora code is battle-tested; pre-generate Rahman's PDF as backup |
| Team runs out of time | High | Tier 3 (Agent 4, Telegram) is slides-only by design |

---

*GlucoLens — built on MyDietCam IP (Prof Moy, UTP) · Powered by LangGraph + GPT-4o + Firebase · National Deep Tech Challenge 2026*
