# CLAUDE.md — GlucoLens Project Instructions

This file gives Claude Code the context it needs to work effectively in this repository. Read this **before** making any non-trivial change.

---

## Project Snapshot

**GlucoLens** is a clinical nutrition companion for Malaysian Type 2 Diabetes patients. It converts meal photos into clinical data points for both the patient and their dietitian.

- **Build window:** 72 hours
- **Stack:** FastAPI + LangGraph + OpenAI GPT-4o/4V + Firebase + Tavily + Next.js + Tailwind
- **Architecture:** 9 LangGraph agents orchestrated by a router, fronted by a FastAPI backend, consumed by a Next.js dual-role frontend.
- **Demo users:** Two hardcoded accounts (Rahman the patient, Aisyah the dietitian).

For full product detail see `docs/GlucoLens_PRD_v2.md`.

---

## Repository Layout (Where Things Live)

| Path | What's inside |
|---|---|
| `backend/main.py` | FastAPI entrypoint. Mounts routers, CORS, middleware. |
| `backend/agents/<name>_agent.py` | One file per agent. Each exports `node(state) -> dict`. |
| `backend/agents/orchestrator.py` | Agent 9 — builds and runs LangGraph subgraphs. |
| `backend/tools/` | Cross-agent utilities (Firebase, OpenAI, Tavily clients; prompts; lookup data). |
| `backend/tools/prompts.py` | **All** LLM prompt templates live here as named constants. |
| `backend/tools/nutrition_db.json` | 30 Malaysian dishes — Agent 2's ground truth. |
| `backend/models/state.py` | `GlucoLensState` TypedDict — the canonical state schema for LangGraph. |
| `backend/routers/<resource>.py` | FastAPI routers. Each calls `orchestrator.run()`. |
| `backend/middleware/auth.py` | Firebase JWT verification. |
| `frontend/src/pages/` | Next.js Pages Router. `patient/`, `dietitian/`, `index.tsx` (login). |
| `frontend/src/components/{patient,dietitian,shared}/` | React components, grouped by audience. |
| `frontend/src/hooks/` | Custom hooks, especially Firebase RTDB subscriptions. |
| `frontend/src/lib/firebase.ts` | Firebase JS SDK initialization. |
| `frontend/src/lib/api.ts` | Backend API client (auto-attaches JWT). |
| `scripts/` | Seeding, warmup, demo reset, backup PDF generation. |
| `docs/` | This file, the PRD, the file-structure spec, the checklist. |

The full canonical tree is in `docs/File_Structure.md` — **deviating from it requires updating that file**.

---

## Common Commands

### Backend
```bash
# Install
cd backend && pip install -r requirements.txt

# Run dev server (auto-reload)
uvicorn backend.main:app --reload --port 8000

# Run tests
pytest backend/tests/

# Single test
pytest backend/tests/unit/test_clinical_agent.py -v

# Seed Firestore
python scripts/seed_firestore.py

# Reset demo data (keep profile, clear meals/alerts/misinfo)
python scripts/reset_demo.py

# Warm up (ping OpenAI, Tavily, Firebase)
python scripts/warmup.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # localhost:3000
npm run build        # production build
npm run lint
```

### Both at once (from repo root)
```bash
# Terminal 1
uvicorn backend.main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

---

## Architecture Quick Reference

### Agent Flow per Event

| Event | Pipeline |
|---|---|
| `meal_upload` | Vision (1) → Nutrition (2) → Clinical (3) → Alert (5) → Dashboard (7) |
| `glucose_entry` | Glucose (4) → Alert (5) → Dashboard (7) |
| `misinformation_query` | Misinfo (8) → Dashboard (7) |
| `weekly_report` | Report (6) → Dashboard (7) |
| `dashboard_load` | Dashboard (7) only |

### How an agent is structured

Every agent file follows this template:

```python
"""
Agent N — <Name>
Inputs from state: <list>
Outputs to state: <list>
"""
from backend.models.state import GlucoLensState
from backend.tools import firebase_tools, openai_tools, prompts
from backend.utils.logging import agent_logger

log = agent_logger("agent_N")

# === Tool definitions ===
def tool_one(...): ...
def tool_two(...): ...

# === Node entry ===
def node(state: GlucoLensState) -> dict:
    log.info("entering", session_id=state["session_id"])
    try:
        # 1. Pull required state slice
        # 2. Run tools
        # 3. Validate output schema
        # 4. Return partial state update
        return {...}
    except Exception as e:
        log.exception("agent_failure")
        return {"errors": state.get("errors", []) + [{"agent": "N", "error": str(e)}]}
```

### State Schema

All agent inputs/outputs flow through `GlucoLensState` (a `TypedDict` in `backend/models/state.py`).

- Agents return **partial** state updates (a dict of only the keys they own).
- LangGraph merges these updates into the running state.
- **Agents never call each other directly.** They communicate by writing to state and letting the orchestrator route.

---

## Conventions

### Python (Backend)

- Files: `snake_case.py`. Classes: `PascalCase`. Functions/vars: `snake_case`. Constants: `UPPER_SNAKE_CASE`. Private helpers: `_leading_underscore`.
- Agent files always end with `_agent.py`. Each exposes a single public `node()` function.
- Tool files end with `_tools.py`.
- Prompts go in `backend/tools/prompts.py`, never inline in agent code.
- Use `structlog` via `agent_logger(name)` — never `print()` or stdlib `logging` directly.
- Pydantic for request/response models; `TypedDict` for LangGraph state.
- Async only where needed (LangGraph nodes are async by default; pure helpers can be sync).
- Type hints everywhere. No `Any` unless absolutely necessary.

### TypeScript (Frontend)

- Components: `PascalCase.tsx`, one component per file.
- Hooks: `useCamelCase.ts`, prefixed with `use`.
- Types in `lib/types.ts` — import from there, never duplicate.
- Constants in `lib/constants.ts`.
- Tailwind only — no inline styles, no CSS modules.
- Color tokens: `red-500` (red light), `amber-500` (yellow), `emerald-500` (green).
- Cards: `rounded-2xl bg-white shadow-sm border border-slate-200 p-6`.
- Buttons: `rounded-xl px-4 py-2 font-medium`.

### Firebase

- Collections: lowercase, plural.
- Document IDs: `uid_<role>` for users, UUIDv4 for everything else.
- RTDB paths: lowercase, slash-separated.
- Never query without an index (Firebase will warn — fix immediately).
- Always use the Admin SDK in backend, the JS SDK in frontend. Never mix.

---

## Module Dependency Rules (DO NOT VIOLATE)

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
- **No reverse imports.**
- **No cross-agent imports.** Agents talk via state. If you find yourself wanting to import `clinical_agent` from inside `alert_agent`, stop — refactor the shared logic into `tools/`.

---

## How to Add a New Tool to an Existing Agent

1. Open the agent file, e.g. `backend/agents/clinical_agent.py`.
2. Add the tool function in the `# === Tool definitions ===` block.
3. If it uses an LLM, add the prompt template to `backend/tools/prompts.py` first, then import it.
4. If it touches Firebase, use `backend/tools/firebase_tools.py` — never instantiate clients directly.
5. Call the tool from inside `node()`.
6. Add a unit test in `backend/tests/unit/test_<agent>_agent.py`.
7. If the tool changes the state schema, update `GlucoLensState` in `backend/models/state.py`.
8. Update the agent's "Tools" section in `docs/GlucoLens_PRD_v2.md`.

## How to Add a New Agent

1. Choose a number and short name (e.g. Agent 10 — `dosage_agent`).
2. Add the file: `backend/agents/dosage_agent.py` following the template above.
3. Add the node to `backend/agents/orchestrator.py`:
   - Register in `AGENT_NODES`.
   - Add to the appropriate pipeline in `PIPELINES`.
   - Add a `FALLBACK_OUTPUTS` entry.
4. Add the agent's state keys to `GlucoLensState` in `backend/models/state.py`.
5. Add a new event type to `EVENT_REQUIREMENTS` if the agent introduces a new event.
6. Write a router endpoint if needed.
7. Document in `docs/GlucoLens_PRD_v2.md` Section 5.
8. Update `docs/File_Structure.md` to reflect the new file.

## How to Add a New API Endpoint

1. Add the route in the appropriate router file under `backend/routers/`.
2. Add Pydantic request/response models in `backend/models/requests.py` and `models/responses.py`.
3. The route body should be thin — usually just `await orchestrator.run(event_type, payload)`.
4. Add the JWT auth dependency: `user = Depends(verify_firebase_jwt)`.
5. **Override any client-supplied `patient_id` or `user_id` with the decoded UID** to prevent unauthorized cross-user access.
6. Add the endpoint to the API table in `docs/GlucoLens_PRD_v2.md` Section 8.

---

## How to Add a New Patient/Dietitian Component

1. Create the file in `frontend/src/components/{patient,dietitian,shared}/`.
2. If it needs live data, write a hook in `frontend/src/hooks/` (don't put Firebase subscriptions directly in components).
3. Use types from `frontend/src/lib/types.ts`. If you need new types, add them there.
4. Style with Tailwind only. Reuse `Card`, `Button`, `Spinner`, `Badge` from `components/shared/`.
5. Test by logging in as the appropriate role and walking through the affected view.

---

## Critical Safety & Clinical Rules

1. **Every misinformation response MUST end with the disclaimer:**
   > "This is my suggestion based on available evidence — please refer to your dietitian or doctor before changing your diet, supplements, or medications."

   This is enforced by `append_disclaimer()` in `backend/agents/misinfo_agent.py`. **Do not bypass it.**

2. **Drug-food interactions take precedence.** If `check_against_patient_profile` flags any risk, the verdict is forced to `harmful_for_you` regardless of evidence strength.

3. **Never log full patient PII to console in non-DEBUG mode.** Use `agent_logger` which respects log level.

4. **Never expose Firebase Admin credentials to the frontend.** The frontend uses the public Firebase Web SDK only.

5. **All API routes require Firebase JWT** except `/health`. The decoded UID **overrides** any client-supplied user identifier in the request body — never trust the client to identify itself.

---

## Demo Users (Hardcoded)

| Role | Email | Password | UID |
|---|---|---|---|
| Patient | `rahman@demo.com` | `demo123` | `uid_rahman` |
| Dietitian | `aisyah@demo.com` | `demo123` | `uid_aisyah` |

Rahman's profile, 7 days of meals, and 14 days of glucose readings are seeded by `scripts/seed_firestore.py`.

---

## Things That Are Stubs (Don't Be Confused)

These exist as **interfaces** so production can swap in real implementations without disturbing the rest of the code:

- `lookup_mydietcam_model()` in vision agent — returns `None` until license is in place.
- `send_telegram_alert()` in alert agent — no-ops when `TELEGRAM_ENABLED=false`.
- `send_email_alert()` in alert agent — no-ops when `EMAIL_ENABLED=false`.
- `localize_strings()` in dashboard agent — currently returns input unchanged.

**Don't delete the stubs.** They're the production hooks.

---

## Common Pitfalls (Things That Have Bitten Us)

1. **Forgetting to update `EMPTY_STATE`** when adding a new state key. Always update both `GlucoLensState` and `EMPTY_STATE` in `backend/models/state.py`.

2. **Inline prompts in agent code.** All prompts must live in `backend/tools/prompts.py`. If you write a new LLM call, write the prompt there first.

3. **Bypassing the orchestrator.** Routers call `orchestrator.run()`, never an agent directly. If you find yourself importing an agent in a router, you're doing it wrong.

4. **JSON parse failures from GPT-4V.** The vision agent already retries once with a stricter prompt; if you write a new LLM call expecting JSON, do the same.

5. **Firebase listener leaks.** Frontend hooks must clean up their subscriptions in `useEffect` return. Forgetting this causes ghost listeners after navigation.

6. **CORS issues during development.** `backend/main.py` allows `http://localhost:3000`. If you change the frontend port, update CORS.

7. **Pydantic v2 syntax.** This project uses Pydantic 2.7 — use `model_validate` not `parse_obj`, `model_dump` not `dict()`.

8. **Trusting client-supplied IDs.** Always extract the UID from the decoded JWT, never from the request body.

---

## Environment Variables

See `docs/GlucoLens_PRD_v2.md` Section 11 for the full list. The `.env.example` files in `backend/` and `frontend/` are the source of truth — copy and fill in.

**Never commit `.env` files.** Both are gitignored.

---

## Testing Strategy

- **Unit tests** for pure functions in `tools/` and any pure logic inside agents (traffic-light thresholds, risk-score calc, glycemic-load formula, drug interaction matrix).
- **Integration tests** for full agent pipelines, using Firebase emulator + mocked OpenAI responses (`pytest-asyncio`).
- **E2E tests** with Playwright for the three core flows: meal upload, misinfo check, dietitian PDF download.
- Aim for >70% coverage on `tools/`. Agent pipelines are tested end-to-end rather than unit-tested.

Run all tests:
```bash
pytest backend/tests/
cd frontend && npx playwright test
```

---

## When Things Break

### "Vision agent returns garbage"
1. Check `prompts.VISION_SYSTEM_PROMPT` hasn't been edited.
2. Verify the image is actually base64-encoded JPG/PNG (not a data URL).
3. Check OpenAI account has GPT-4V (`gpt-4o`) access.
4. Inspect raw response in `backend/tools/openai_tools.py` logs.

### "Misinfo agent times out"
1. The 5 search tools run in parallel — if any blocks, the whole agent stalls.
2. Each search has a Tavily-side timeout; the wrapper has a hard 10s timeout.
3. If one source consistently fails, comment it out and fall back to the others.

### "Frontend shows stale data"
1. Check the RTDB listener in the relevant hook is actually subscribed.
2. Verify the `push_realtime_to_firebase` call in the dashboard agent.
3. Open Firebase console → Realtime DB → confirm the path is being written.

### "PDF generation crashes"
1. Run with `LOG_LEVEL=DEBUG` to see the matplotlib + ReportLab steps.
2. Most failures are missing fonts or matplotlib backend issues — set `matplotlib.use("Agg")`.
3. The backup PDF at `scripts/_backup_rahman_weekly.pdf` is the fallback.

### "401 from backend after login"
1. The frontend JWT auto-refresh may have failed. Log out, log back in.
2. Check `middleware/auth.py` is actually decoding the token (not silently passing).
3. Inspect the network tab — the `Authorization: Bearer ...` header should be present.

---

## What to Read Before Big Changes

| If you're changing... | Read first... |
|---|---|
| An agent's logic | The agent section in `docs/GlucoLens_PRD_v2.md` Section 5 |
| The state schema | `docs/GlucoLens_PRD_v2.md` Section 6 |
| Pipeline routing | `docs/GlucoLens_PRD_v2.md` Section 7 |
| API contracts | `docs/GlucoLens_PRD_v2.md` Section 8 |
| Firestore schema | `docs/GlucoLens_PRD_v2.md` Section 9 |
| File locations | `docs/File_Structure.md` |
| Build progress | `docs/Checklist.md` |

---

## What's Intentionally Out of Scope (Don't Build These)

- Telegram / WhatsApp / Email integrations (stubs only — production task)
- Live glucose meter / CGM integration (mock data this build)
- Multi-language NLU (EN/BM toggle is a stub)
- B2B clinic admin portal
- MOH KOSPEN data integration
- Signup flow (two hardcoded users only)
- Payment / subscription
- Mobile app (web only)

If a request asks for any of these, point to `docs/GlucoLens_PRD_v2.md` Section 13 (Post-Project Extensibility) and confirm scope before building.

---

## Style of Help Expected

When working in this repo, Claude should:

- Prefer **editing existing files** over creating new ones.
- Follow the existing template style for new agents/tools.
- Update `docs/` when adding or significantly changing anything documented there.
- Run `pytest` after any backend change of substance.
- Use the Buildora-derived patterns where they exist (FastAPI structure, PDF tools, LangGraph setup) — they're battle-tested.
- Be conservative with new dependencies. If a new package is needed, justify it.

---

*GlucoLens · LangGraph + GPT-4o + Firebase · Designed for MyDietCam IP integration*
