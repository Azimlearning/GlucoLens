# GlucoLens

**Clinical Nutrition Companion for Malaysian T2DM Patients**

GlucoLens is an innovative clinical nutrition companion designed specifically for Malaysian Type 2 Diabetes (T2DM) patients. It revolutionizes dietary management by transforming every meal photo into a structured clinical data point, providing patients with real-time dietary feedback and supplying their assigned dietitian with a weekly clinical brief.

## Problem Context

Malaysia faces a significant challenge with approximately 3.9 million diabetics. A typical dietitian can only see each patient once per quarter, leaving an estimated 360 meals unsupervised between consultations. GlucoLens addresses this gap by converting each of these meals into actionable clinical data, benefiting both patients and clinicians.

## Intellectual Property Basis

The production system is engineered to integrate **MyDietCam** (Prof Moy, UTP), an AI food-recognition model trained on Malaysian/local food datasets. For the 72-hour build, **GPT-4V** serves as a vision substitute behind a stable interface (`recognize_food_items`), ensuring that the MyDietCam model can be seamlessly swapped in without disrupting downstream agents.

## Scope

**In scope:**
- Meal photo analysis
- Nutritional decomposition
- Clinical personalization
- Alert generation
- Weekly PDF reporting
- Misinformation checking
- Dietitian caseload view

**Out of scope (this build):**
- Live glucose-meter integration
- Telegram/WhatsApp/email push
- Multi-language NLU
- B2B clinic admin portal
- MOH KOSPEN integration

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React (Next.js 14) + Tailwind CSS + Recharts | Team comfort; reuse Buildora shell |
| Backend | FastAPI 0.111+ (Python 3.11) | Reuse Buildora backend |
| LLM Provider | OpenAI — GPT-4o (`gpt-4o-2024-08-06`) + GPT-4V (`gpt-4o`) | Paid API, no rate limits |
| Agent Orchestration | LangGraph 0.2+ | Reuse Buildora setup |
| Database | Firebase Firestore + Realtime DB | Reuse Buildora; auth, persistence, live sync |
| File Storage | Firebase Storage | Meal photo uploads |
| Auth | Firebase Auth | Two hardcoded demo users |
| Web Search | Tavily API | Pluggable behind `WebSearchClient` interface |
| Alerts | In-dashboard feed (Firebase Realtime DB) | Telegram/WS/email stubs prepared |
| PDF Generation | ReportLab 4.x | Reuse Buildora PDF generator |
| Charts | Recharts 2.x | Lightweight, React-native |
| Deployment | Localhost (build) + Vercel-ready | Full-stack Vercel config included |

## System Architecture

```
┌────────────────────────────────────────────────────────┐
│  Browser — Next.js (React + Tailwind + Recharts)       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ /patient     │  │ /dietitian   │  │ /login       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │          │
│         └─── Firebase JS SDK (auth, RTDB, Storage) ────┘
│                           │
└───────────────────────────┼────────────────────────────┘
                            │ HTTPS + Firebase JWT
                            ▼
┌────────────────────────────────────────────────────────┐
│  FastAPI Backend (/api/v1/*)                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Routers: meal · glucose · misinfo · report ·    │  │
│  │           dashboard                              │  │
│  └─────────────────────┬────────────────────────────┘  │
│                        ▼                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Agent 9 — Orchestrator (LangGraph)              │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  Agent 1: Vision & Portion                 │  │  │
│  │  │  Agent 2: Nutritional Engine               │  │  │
│  │  │  Agent 3: Clinical Personalization         │  │  │
│  │  │  Agent 4: Glucose Correlation              │  │  │
│  │  │  Agent 5: Alert Manager                    │  │  │
│  │  │  Agent 6: Dietitian Report                 │  │  │
│  │  │  Agent 7: Reflection & Dashboard           │  │  │
│  │  │  Agent 8: Misinformation Debunker          │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  External: OpenAI · Tavily · Firebase Admin SDK        │
└────────────────────────────────────────────────────────┘
```

## Event-to-Pipeline Routing

| Event | Agents Invoked | Trigger |
|---|---|---|
| `meal_upload` | 1 → 2 → 3 → 5 → 7 | `POST /api/v1/meal/upload` |
| `glucose_entry` | 4 → 5 → 7 | `POST /api/v1/glucose/entry` |
| `misinformation_query` | 8 → 7 | `POST /api/v1/misinformation/check` |
| `weekly_report` | 6 → 7 | `GET /api/v1/report/weekly/{patient_id}` |
| `dashboard_load` | 7 only | `GET /api/v1/dashboard` |

## Detailed Agent Specifications

Each agent within GlucoLens is implemented as a **LangGraph node**, functioning as a Python function `(state: GlucoLensState) -> dict` that returns a partial state update. Agents manage their own tools (Python functions decorated with `@tool` for LLM-callable functionality) and, where applicable, incorporate a single LLM-driven decision step. For a comprehensive breakdown of each agent's purpose, inputs, outputs, and tools, please refer to the full Product Requirements Document (`docs/GlucoLens_PRD_v2.md`).

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env   # fill in your keys
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
cp .env.local.example .env.local   # fill in Firebase web config
npm install
npm run dev
```

### Seed demo data
```bash
python scripts/seed_firestore.py
```

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Patient | rahman@demo.com | demo123 |
| Dietitian | aisyah@demo.com | demo123 |

## Documentation

- `docs/GlucoLens_PRD_v2.md` — Full Product Requirements Document
- `docs/File_Structure.md` — Canonical file tree
- `docs/Checklist.md` — Build checklist
