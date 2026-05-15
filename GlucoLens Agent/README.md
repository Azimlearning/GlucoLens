# GlucoLens — Agent Framework

This package contains the **complete multi-agent backend** for GlucoLens. The agents are the brain — they handle vision, nutrition, clinical reasoning, glucose correlation, alerts, weekly reports, the dashboard view-model, and misinformation debunking. The orchestrator glues them into LangGraph pipelines with timeouts, fallbacks, and audit logging.

## What's in here

```
backend/
├── main.py                  FastAPI app entry
├── config.py                Pydantic Settings (env-driven)
├── .env.example             Template — copy to .env and fill in
├── requirements.txt         Pinned deps
│
├── agents/                  ★ THE FRAMEWORK ★
│   ├── orchestrator.py        LangGraph coordinator + pipeline registry
│   ├── vision_agent.py        Agent 1 — GPT-4V / MyDietCam hook
│   ├── nutrition_agent.py     Agent 2 — MyFCD lookup + LLM fallback
│   ├── clinical_agent.py      Agent 3 — Personalised verdict, swaps, drug interactions
│   ├── glucose_agent.py       Agent 4 — Meal↔glucose correlation, trigger detection
│   ├── alert_agent.py         Agent 5 — Threshold breach → dashboard alerts
│   ├── report_agent.py        Agent 6 — Weekly PDF for dietitian
│   ├── dashboard_agent.py     Agent 7 — Role-aware view-model builder
│   └── misinfo_agent.py       Agent 8 — Multi-source evidence verifier
│
├── tools/                   Cross-agent utilities
│   ├── prompts.py             All LLM prompt templates (single source of truth)
│   ├── nutrition_db.json      30 Malaysian dishes (MyFCD-style)
│   ├── drug_food_interactions.py
│   ├── moh_guidelines.py
│   ├── population_averages.py
│   ├── normalize.py
│   ├── openai_tools.py        Chat + Vision + JSON parsing
│   ├── tavily_tools.py        Web search wrapper
│   ├── firebase_tools.py      Firestore + RTDB + Storage + Auth
│   └── pdf_tools.py           ReportLab + matplotlib for weekly briefs
│
├── models/
│   ├── state.py               GlucoLensState TypedDict (the LangGraph state)
│   ├── requests.py            Pydantic request models
│   └── responses.py           Pydantic response models
│
├── routers/                 Thin handlers — construct state, call orchestrator.run
│   ├── meal.py                POST /api/meal/upload
│   ├── glucose.py             POST /api/glucose/entry
│   ├── misinfo.py             POST /api/misinfo/query
│   ├── report.py              POST /api/report/weekly[/{patient_id}]
│   ├── dashboard.py           GET  /api/dashboard/me
│   ├── alerts.py              POST /api/alerts/seen
│   └── patients.py            GET  /api/patients[/{patient_id}]
│
├── middleware/
│   └── auth.py                Firebase JWT verification (require_user, require_role)
│
└── utils/
    ├── cache.py               TTLCache + module-level shared caches
    ├── timeout.py             with_timeout + AgentTimeoutError
    └── logging.py             structlog setup
```

## How the orchestrator works

Every event flows through the same shape:

```python
from backend.agents.orchestrator import run

final_state = await run({
    "event_type": "meal_upload",
    "patient_id": "uid_rahman",
    "user_id":    "uid_rahman",
    "image_base64": "...",
})
```

Pipelines are defined in `backend/agents/orchestrator.py::PIPELINES`:

| Event                  | Agents (in order)                                       |
| ---------------------- | ------------------------------------------------------- |
| `meal_upload`          | vision → nutrition → clinical → alert → dashboard       |
| `glucose_entry`        | glucose → alert → dashboard                             |
| `misinformation_query` | misinfo → dashboard                                     |
| `weekly_report`        | report → dashboard                                      |
| `dashboard_load`       | glucose → dashboard (cached when possible)              |

Each node is wrapped in an async timeout (`AGENT_NODE_TIMEOUT_S=20s`). Whole pipeline has a soft cap of `PIPELINE_TIMEOUT_S=45s`. Failures don't crash — they produce a fallback state and append to `state["errors"]`.

## Setup

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Fill in: OPENAI_API_KEY, TAVILY_API_KEY, FIREBASE_* keys

uvicorn backend.main:app --reload --port 8000
```

## What still needs to be built

The agent framework is done. What's left for app-completion:

1. **Frontend (Next.js)** — listen to `/dashboard/{uid}/live` in Firebase RTDB; render cards from `dashboard_payload.cards`.
2. **Seed script** — create demo users `uid_rahman` and `uid_aisyah`, seed 7 days of meals + 14 days of glucose + Rahman's clinical profile (HbA1c 8.2%, metformin 1000mg BD, gliclazide 80mg OM).
3. **Telegram bot** integration (flag `TELEGRAM_ENABLED=true` activates the stub in `alert_agent.send_telegram_alert`).
4. **Real MyDietCam endpoint** — replace the `lookup_mydietcam_model` stub in `vision_agent.py` once Prof Moy ships the model.

## Conventions to keep

- **All prompt strings live in `tools/prompts.py`**. Don't inline LLM prompts anywhere else.
- **Agents never import each other.** They communicate via `GlucoLensState` only. If you need cross-agent helpers, put them in `tools/`.
- **Module dependencies are one-directional**: `routers → agents → tools → models`. Middleware and utils sit on the side.
- **JWT UID always overrides any client-supplied `patient_id` / `user_id`**. Routers must pass `user["uid"]` into state.
- **The clinical safety disclaimer is mandatory** on every misinfo response. It's already enforced in `misinfo_agent.append_disclaimer`.
- **Patient-specific drug-food risk forces `harmful_for_you`** verdict regardless of evidence — see `misinfo_agent.classify_verdict`.

## Smoke test (without Firebase)

You can sanity-check the agent wiring without infrastructure:

```python
# in a Python shell, after `pip install -r requirements.txt`:
from backend.models.state import EMPTY_STATE
from backend.agents.orchestrator import classify_event, build_agent_pipeline

state = {**EMPTY_STATE, "event_type": "meal_upload", "patient_id": "test", "image_base64": "x"}
print(classify_event(state))           # {'valid': True, ...}
print(build_agent_pipeline("meal_upload"))  # [('vision', <fn>), ('nutrition', <fn>), ...]
```

For a real end-to-end test you'll need: a Firebase project, an OpenAI key, a Tavily key, and the seed script.
