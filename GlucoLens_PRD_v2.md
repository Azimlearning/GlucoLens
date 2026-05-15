# GlucoLens — Product Requirements Document
### Clinical Nutrition Companion for Malaysian T2DM Patients
**Version:** 2.0 · **Date:** 15 May 2026 · **Build Window:** 72 hours

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Locked Tech Stack](#2-locked-tech-stack)
3. [Demo Users & Seeded Data](#3-demo-users--seeded-data)
4. [System Architecture](#4-system-architecture)
5. [Detailed Agent Specifications](#5-detailed-agent-specifications)
6. [LangGraph State Schema](#6-langgraph-state-schema)
7. [LangGraph Orchestration Detail](#7-langgraph-orchestration-detail)
8. [API Endpoints](#8-api-endpoints)
9. [Firebase Data Schema](#9-firebase-data-schema)
10. [Frontend Views & Components](#10-frontend-views--components)
11. [Environment Variables](#11-environment-variables)
12. [Build Risks & Mitigations](#12-build-risks--mitigations)
13. [Post-Project Extensibility](#13-post-project-extensibility)

---

## 1. Product Overview

**GlucoLens** is a clinical nutrition companion for Malaysian Type 2 Diabetes (T2DM) patients. It transforms every meal photo into a structured clinical data point — providing patients with real-time dietary feedback and supplying their assigned dietitian with a weekly clinical brief.

### Problem Context
- Malaysia has approximately 3.9 million diabetics.
- A typical dietitian sees each patient once per quarter.
- Between consultations, patients consume an estimated 360 meals unsupervised.
- GlucoLens converts each of those meals into a clinical data point usable by both patient and clinician.

### Intellectual Property Basis
The production system is designed to integrate **MyDietCam** (Prof Moy, UTP) — an AI food-recognition model trained on Malaysian/local food datasets. The 72-hour build uses **GPT-4V** as a vision substitute behind a stable interface (`recognize_food_items`) so the MyDietCam model can be swapped in without disturbing downstream agents.

### Scope
- **In scope:** Meal photo analysis, nutritional decomposition, clinical personalization, alert generation, weekly PDF reporting, misinformation checking, dietitian caseload view.
- **Out of scope (this build):** Live glucose-meter integration, Telegram/WhatsApp/email push, multi-language NLU, B2B clinic admin portal, MOH KOSPEN integration.

---

## 2. Locked Tech Stack

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

---

## 3. Demo Users & Seeded Data

### Authentication (Hardcoded — No Signup Flow)

| Role | Email | Password | Display Name | UID (Firestore) |
|---|---|---|---|---|
| Patient | `rahman@demo.com` | `demo123` | Encik Rahman | `uid_rahman` |
| Dietitian | `aisyah@demo.com` | `demo123` | Puan Aisyah | `uid_aisyah` |

### Patient Profile (`patients/uid_rahman/profile`)

```json
{
  "age": 54,
  "sex": "M",
  "ethnicity": "Malay",
  "conditions": ["T2DM", "Hypertension Stage 1"],
  "diagnosed": "2019-03-10",
  "hba1c": 8.1,
  "hba1c_date": "2026-03-15",
  "medications": [
    { "name": "Metformin", "dose": "1000mg", "frequency": "BD" },
    { "name": "Gliclazide", "dose": "80mg", "frequency": "OD" }
  ],
  "targets": {
    "carbs_g_per_meal": 45,
    "glycemic_load_per_meal": 15,
    "sodium_mg_per_meal": 600,
    "protein_g_per_meal_min": 15
  },
  "assigned_dietitian": "uid_aisyah",
  "allergens": [],
  "language_preference": "en"
}
```

### Seed Data
- 7 days of historical meal logs (≈21 meals) — for weekly PDF to look real
- 14 days of mock glucose readings — for Agent 4 demo chart
- 30 Malaysian dishes in `nutrition_db.json` (see Agent 2 spec)

---

## 4. System Architecture

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

### Event-to-Pipeline Routing

| Event | Agents Invoked | Trigger |
|---|---|---|
| `meal_upload` | 1 → 2 → 3 → 5 → 7 | `POST /api/v1/meal/upload` |
| `glucose_entry` | 4 → 5 → 7 | `POST /api/v1/glucose/entry` |
| `misinformation_query` | 8 → 7 | `POST /api/v1/misinformation/check` |
| `weekly_report` | 6 → 7 | `GET /api/v1/report/weekly/{patient_id}` |
| `dashboard_load` | 7 only | `GET /api/v1/dashboard` |

---

## 5. Detailed Agent Specifications

Each agent is implemented as a **LangGraph node**. A node is a Python function `(state: GlucoLensState) -> dict` that returns a partial state update. Each agent owns its own tools (regular Python functions decorated with `@tool` where they are LLM-callable) and a single LLM-driven decision step where applicable.

### Agent Implementation Template

Every agent file (`backend/agents/<agent_name>_agent.py`) follows this template:

```python
"""
Agent N — <Name>
Purpose: <one-liner>
Inputs from state: <list>
Outputs to state: <list>
"""
from typing import Any
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from backend.models.state import GlucoLensState
from backend.tools import <tool_modules>
from backend.config import settings
from backend.utils.logging import agent_logger

LLM = ChatOpenAI(model="gpt-4o-2024-08-06", temperature=0.1)
log = agent_logger("agent_N")

# === Tool definitions ===
@tool
def tool_one(...): ...

# === Node entry ===
def node(state: GlucoLensState) -> dict:
    log.info("entering", session_id=state["session_id"])
    try:
        # 1. Pull required state slice
        # 2. Run tools (deterministic OR LLM-driven)
        # 3. Validate output schema
        # 4. Return partial state update
        return {"...": ...}
    except Exception as e:
        log.exception("agent_failure")
        return {"errors": state["errors"] + [{"agent": "N", "error": str(e)}]}
```

---

### Agent 1 — Vision & Portion Agent

**File:** `backend/agents/vision_agent.py`
**Job:** Convert a raw meal photo into a structured list of `{name, portion_g, confidence, components}` items.

**State slice consumed:**
- `event_type == "meal_upload"`
- `image_base64: str` (or `image_url: str` resolved to bytes upstream)
- `patient_id: str`

**State slice produced:**
- `meal_items: list[dict]`
- `unrecognized_items: list[dict]`
- `recognition_method: str` (`"gpt4v"`, `"mydietcam"`, `"gpt4v+tavily"`, `"fallback"`)

#### Tools

##### `recognize_food_items(image_base64: str) -> list[dict]`
Primary recognition. **Stable interface** — backed by GPT-4V in this build, swappable to MyDietCam in production.

**Implementation:**
```python
def recognize_food_items(image_base64: str) -> list[dict]:
    """Returns [{name, portion_estimate_g, confidence, components}]."""
    response = LLM.invoke([
        {"role": "system", "content": VISION_SYSTEM_PROMPT},
        {"role": "user", "content": [
            {"type": "text", "text": VISION_USER_PROMPT},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
        ]}
    ])
    return json.loads(response.content)
```

**VISION_SYSTEM_PROMPT:**
```
You are a Malaysian food-recognition specialist. Given a meal photo, return a strict JSON
array. Each element MUST have:
  - name: dish name (English; Malay/Chinese transliteration if commonly used, e.g. "Nasi Lemak", "Char Kuey Teow")
  - portion_estimate_g: integer grams (use plate-size reference if visible)
  - confidence: float 0–1
  - components: list of constituent foods if dish is composite (e.g. "Mixed Rice" -> ["rice","ayam masak merah","sayur kangkung"])
  - region: "MY" | "ID" | "TH" | "CN" | "IN" | "OTHER"

Rules:
- If confidence < 0.6, ALSO add to "unrecognized_items" array in a top-level object.
- Standard plate diameter assumption: 23 cm.
- Standard rice scoop: 100g.
- NEVER hallucinate items not visible.
- Output STRICT JSON only. No prose.

Output format:
{ "meal_items": [...], "unrecognized_items": [...] }
```

**Failure modes & handling:**
| Failure | Detection | Recovery |
|---|---|---|
| JSON parse error | `json.JSONDecodeError` | Retry once with prompt suffix `"You MUST return valid JSON."`; if still fails, log + return empty list |
| GPT-4V timeout (>15s) | `openai.APITimeoutError` | Fall back to `lookup_fallback_dish("unknown")` |
| Empty result | `len(items) == 0` | Set `unrecognized_items = [{"reason": "no_items_detected"}]` |
| Confidence all < 0.5 | post-check | Surface to user as confirmation request via `flag_unrecognized_item` |

##### `search_malaysian_food(query: str) -> dict`
Tavily-backed enrichment. Used when GPT-4V returns a dish name but we want to confirm it's a real Malaysian dish (vs. hallucination) and pull variant info.

```python
def search_malaysian_food(query: str) -> dict:
    results = tavily_client.search(
        query=f"Malaysian food {query} recipe ingredients",
        search_depth="basic",
        max_results=3,
        include_domains=["myresipi.com", "asianinspirations.com.au", "rasamalaysia.com"]
    )
    return {"confirmed": len(results["results"]) > 0, "variants": results["results"][:3]}
```

**Called when:** `meal_items[i].confidence < 0.8` AND `meal_items[i].region == "MY"`.

##### `estimate_portion_size(item_name: str, reference_objects: list[str]) -> int`
Rule-based portion estimator. Used only as a sanity check; primary portion comes from GPT-4V.

```python
PORTION_DEFAULTS_G = {
    "rice": 150, "noodle": 180, "roti": 80, "sambal": 30,
    "egg": 50, "chicken_piece": 90, "fish_piece": 120, ...
}

def estimate_portion_size(item_name: str, reference_objects: list[str]) -> int:
    base = PORTION_DEFAULTS_G.get(_normalize(item_name), 100)
    if "small_plate" in reference_objects: return int(base * 0.7)
    if "large_plate" in reference_objects: return int(base * 1.3)
    return base
```

##### `decompose_mixed_dish(dish_name: str) -> list[dict]`
Splits composite dishes (e.g. "Mixed Rice", "Nasi Campur") into components. **LLM-driven.**

```python
DECOMPOSITION_PROMPT = """
The dish "{dish_name}" is a composite Malaysian dish. List its constituent components
as a JSON array of {{name, typical_portion_g}}. Use realistic mamak/kopitiam portions.
Output STRICT JSON only.
"""
```

Triggered when `meal_items[i].name` matches a known composite pattern: `["mixed rice", "nasi campur", "economy rice", "chap fan"]`.

##### `lookup_mydietcam_model(dish_name: str) -> dict | None`
**Production hook.** Currently returns `None`. The interface is preserved so MyDietCam can be wired in post-license.

```python
def lookup_mydietcam_model(dish_name: str) -> dict | None:
    if not settings.MYDIETCAM_ENABLED:
        return None
    # Production: HTTP POST to MyDietCam endpoint
    return None
```

##### `flag_unrecognized_item(image_region: dict) -> dict`
Marks low-confidence items for user confirmation in the UI.

```python
def flag_unrecognized_item(image_region: dict) -> dict:
    return {
        "needs_user_confirmation": True,
        "image_region": image_region,
        "prompt_to_user": "We couldn't confidently identify this item — please confirm or correct."
    }
```

##### `lookup_fallback_dish(name: str) -> dict`
Last-resort lookup against the hardcoded 30-dish list (see Agent 2). Returns a safe default.

#### Node Logic (`vision_agent.node`)

```python
def node(state: GlucoLensState) -> dict:
    if state["event_type"] != "meal_upload":
        return {}  # No-op for other events

    img = state["image_base64"]

    # 1. Try MyDietCam first (production only); else GPT-4V
    items = []
    raw = recognize_food_items(img)
    items = raw["meal_items"]
    unrecognized = raw.get("unrecognized_items", [])

    # 2. Enrich low-confidence items via Tavily
    for item in items:
        if item["confidence"] < 0.8 and item.get("region") == "MY":
            enrichment = search_malaysian_food(item["name"])
            if not enrichment["confirmed"]:
                unrecognized.append({**item, "reason": "tavily_unconfirmed"})

    # 3. Decompose composites
    expanded = []
    for item in items:
        if _is_composite(item["name"]):
            components = decompose_mixed_dish(item["name"])
            expanded.extend(components)
        else:
            expanded.append(item)

    # 4. Flag unrecognized
    for u in unrecognized:
        u.update(flag_unrecognized_item(u))

    return {
        "meal_items": expanded,
        "unrecognized_items": unrecognized,
        "recognition_method": "gpt4v+tavily"
    }
```

---

### Agent 2 — Nutritional Engine

**File:** `backend/agents/nutrition_agent.py`
**Job:** Map identified food items to nutritional values (macros, GI, GL, sodium) and aggregate to meal totals.

**State slice consumed:** `meal_items: list[dict]`
**State slice produced:** `nutrition_totals: dict`, `nutrition_per_item: list[dict]`, `data_source: str`

#### Data Source — `backend/tools/nutrition_db.json`

A handcrafted lookup of 30 common Malaysian dishes used as the **ground truth** for the build. Schema:

```json
{
  "nasi_lemak": {
    "name_display": "Nasi Lemak",
    "per_100g": {
      "calories_kcal": 295, "carbs_g": 38, "protein_g": 6,
      "fat_g": 13, "fiber_g": 1.5, "sodium_mg": 380
    },
    "glycemic_index": 78,
    "category": "rice_dish",
    "components": ["coconut_rice", "sambal", "anchovies", "peanuts", "egg", "cucumber"],
    "myfcd_id": "MFCD-0142"
  },
  ...
}
```

**Minimum 30 dishes required:** nasi lemak, char kuey teow, roti canai (plain), roti canai telur, nasi goreng kampung, mee goreng mamak, laksa penang, laksa sarawak, satay (chicken), curry mee, hokkien mee, wantan mee, chicken rice, mixed rice (avg), economy rice (avg), kuih lapis, kuih seri muka, teh tarik, milo ais, rendang, ayam masak merah, ikan bakar, pisang goreng, popiah, cendol, ais kacang, bak kut teh, dim sum (avg), tom yam (chicken), nasi briyani.

#### Tools

##### `lookup_myfcd(food_name: str) -> dict | None`
Primary lookup. Reads from `nutrition_db.json`. Normalizes the food name first.

```python
def lookup_myfcd(food_name: str) -> dict | None:
    key = _normalize(food_name)  # lowercase, snake_case, strip diacritics
    return NUTRITION_DB.get(key)
```

##### `lookup_gi_index(food_name: str) -> int | None`
Reads the `glycemic_index` field from `nutrition_db.json`. Falls back to category default if dish is missing GI:

```python
GI_CATEGORY_DEFAULTS = {"rice_dish": 73, "noodle_dish": 60, "bread": 70, "fried_snack": 65, "drink_sweet": 55, ...}
```

##### `calculate_glycemic_load(carbs_g: float, gi: int) -> float`
Pure function. Standard formula:

```python
def calculate_glycemic_load(carbs_g: float, gi: int) -> float:
    return round((gi * carbs_g) / 100, 1)
```

##### `estimate_missing_nutrients(food_name: str) -> dict`
LLM fallback when `lookup_myfcd` returns None. Returns approximate macros + sodium per 100g.

```python
ESTIMATE_PROMPT = """
Estimate the nutritional content per 100g of "{food_name}", a Malaysian/Southeast Asian dish.
Return STRICT JSON with: calories_kcal, carbs_g, protein_g, fat_g, fiber_g, sodium_mg, glycemic_index.
Base estimates on similar dishes you know. Round to whole numbers except GI.
"""
```

Cached in-memory per session to avoid duplicate calls.

##### `check_allergens(food_item: dict, patient_profile: dict) -> list[str]`
Cross-references item components against `patient_profile["allergens"]`. Returns list of triggered allergens.

##### `aggregate_meal_totals(items: list[dict]) -> dict`
Pure function. Sums macros, computes meal-level GL.

```python
def aggregate_meal_totals(items: list[dict]) -> dict:
    totals = {"calories_kcal": 0, "carbs_g": 0, "protein_g": 0, "fat_g": 0,
              "fiber_g": 0, "sodium_mg": 0, "glycemic_load": 0}
    for it in items:
        ratio = it["portion_g"] / 100.0
        nut = it["nutrition_per_100g"]
        totals["calories_kcal"] += nut["calories_kcal"] * ratio
        totals["carbs_g"]       += nut["carbs_g"]       * ratio
        totals["protein_g"]     += nut["protein_g"]     * ratio
        totals["fat_g"]         += nut["fat_g"]         * ratio
        totals["fiber_g"]       += nut.get("fiber_g", 0) * ratio
        totals["sodium_mg"]     += nut["sodium_mg"]     * ratio
        gl = calculate_glycemic_load(nut["carbs_g"] * ratio, it["gi"])
        totals["glycemic_load"] += gl
    return {k: round(v, 1) for k, v in totals.items()}
```

#### Node Logic

```python
def node(state: GlucoLensState) -> dict:
    items = state["meal_items"]
    enriched = []
    data_sources = set()

    for item in items:
        nut = lookup_myfcd(item["name"])
        if nut:
            data_sources.add("myfcd")
        else:
            nut = {"per_100g": estimate_missing_nutrients(item["name"]),
                   "glycemic_index": GI_CATEGORY_DEFAULTS.get(item.get("category", ""), 65)}
            data_sources.add("estimate")

        enriched.append({
            **item,
            "nutrition_per_100g": nut["per_100g"],
            "gi": nut["glycemic_index"],
            "gl": calculate_glycemic_load(nut["per_100g"]["carbs_g"] * item["portion_g"] / 100, nut["glycemic_index"])
        })

    totals = aggregate_meal_totals(enriched)
    return {
        "nutrition_totals": totals,
        "nutrition_per_item": enriched,
        "data_source": "+".join(sorted(data_sources))
    }
```

---

### Agent 3 — Clinical Personalization Agent

**File:** `backend/agents/clinical_agent.py`
**Job:** Compare meal nutrition against the patient's clinical targets, produce traffic-light verdict, generate swap suggestions, check drug-food interactions.

**State slice consumed:** `nutrition_totals`, `nutrition_per_item`, `patient_id`
**State slice produced:** `traffic_light`, `risk_score`, `recommendations`, `drug_interactions`

#### Tools

##### `fetch_patient_profile(patient_id: str) -> dict`
Firestore read. Returns the full profile object (cached for the session).

```python
def fetch_patient_profile(patient_id: str) -> dict:
    doc = firestore.collection("patients").document(patient_id).collection("profile").document("main").get()
    return doc.to_dict()
```

##### `compare_against_targets(meal_totals: dict, patient_targets: dict) -> dict`
Pure function. Returns per-nutrient breach info.

```python
def compare_against_targets(meal_totals: dict, targets: dict) -> dict:
    return {
        "carbs":   {"value": meal_totals["carbs_g"],       "target": targets["carbs_g_per_meal"],
                    "delta_pct": _pct_over(meal_totals["carbs_g"], targets["carbs_g_per_meal"])},
        "gl":      {"value": meal_totals["glycemic_load"], "target": targets["glycemic_load_per_meal"],
                    "delta_pct": _pct_over(meal_totals["glycemic_load"], targets["glycemic_load_per_meal"])},
        "sodium":  {"value": meal_totals["sodium_mg"],     "target": targets["sodium_mg_per_meal"],
                    "delta_pct": _pct_over(meal_totals["sodium_mg"], targets["sodium_mg_per_meal"])},
        "protein": {"value": meal_totals["protein_g"],     "target": targets["protein_g_per_meal_min"],
                    "delta_pct": _pct_under(meal_totals["protein_g"], targets["protein_g_per_meal_min"])}
    }
```

##### `lookup_moh_diabetic_guidelines(nutrient: str) -> dict`
Static dict of MOH Malaysia guidelines, used in recommendation text.

```python
MOH_GUIDELINES = {
    "carbs":  {"source": "MOH Malaysia CPG Diabetes 2020",  "recommendation": "≤45g per main meal for stable T2DM control"},
    "gl":     {"source": "MOH Malaysia CPG Diabetes 2020",  "recommendation": "Meal GL ≤15 for optimal post-prandial control"},
    "sodium": {"source": "MOH Malaysia Salt Reduction 2015", "recommendation": "≤2000mg/day total, ≤600mg per meal"},
    "protein":{"source": "MyDRI 2017",                       "recommendation": "1.0–1.2 g/kg/day for older T2DM adults"}
}
```

##### `check_drug_food_interactions(food_items: list[dict], medications: list[dict]) -> list[dict]`
Static interaction matrix; returns triggered interactions.

```python
DRUG_FOOD_INTERACTIONS = {
    "metformin":   [{"food": "alcohol", "severity": "moderate", "note": "Increased lactic acidosis risk"}],
    "gliclazide":  [{"food": "bitter_gourd", "severity": "moderate", "note": "Additive hypoglycemic effect"},
                    {"food": "alcohol", "severity": "moderate", "note": "Risk of hypoglycemia"}],
    "warfarin":    [{"food": "leafy_greens_high_vit_k", "severity": "moderate", "note": "Antagonizes warfarin"}],
    "statin":      [{"food": "grapefruit", "severity": "high", "note": "Increases statin levels"}]
}
```

##### `generate_traffic_light(comparison: dict) -> dict`
Pure function. Thresholds:

```python
def generate_traffic_light(cmp: dict) -> dict:
    out = {}
    for nutrient, data in cmp.items():
        if nutrient == "protein":
            # protein is UNDER-target, not over
            out[nutrient] = "green" if data["value"] >= data["target"] else "yellow"
        else:
            d = data["delta_pct"]
            if d <= 0:        out[nutrient] = "green"
            elif d <= 20:     out[nutrient] = "yellow"
            else:             out[nutrient] = "red"
    return out
```

##### `generate_swap_suggestions(flagged_items: list[dict], patient_profile: dict) -> list[str]`
**LLM-driven.** GPT-4o produces 2–4 concrete, culturally relevant swaps.

```python
SWAP_PROMPT = """
You are a Malaysian dietitian. The patient just ate:
{meal_items}

Their diabetic targets were breached:
{breaches}

Patient context:
- Age {age}, {ethnicity}, T2DM since {diagnosed}, HbA1c {hba1c}%
- Medications: {medications}
- Language preference: {lang}

Generate 2–4 SHORT, CULTURALLY RELEVANT swap suggestions. Each must:
- Reference a specific item in this meal
- Suggest a realistic local alternative (not Western foods)
- Be one sentence, imperative voice
- Be respectful (use "you may consider" not "you must")

Output a JSON array of strings.
"""
```

##### `calculate_meal_risk_score(comparison: dict) -> int`
Pure function. Weighted composite 0–100. Higher = worse.

```python
WEIGHTS = {"carbs": 0.3, "gl": 0.4, "sodium": 0.2, "protein": 0.1}

def calculate_meal_risk_score(cmp: dict) -> int:
    score = 0
    for nutrient, data in cmp.items():
        if nutrient == "protein":
            # under-target contributes
            score += WEIGHTS[nutrient] * max(0, -data["delta_pct"])
        else:
            score += WEIGHTS[nutrient] * max(0, data["delta_pct"])
    return min(100, int(score))
```

#### Node Logic

```python
def node(state: GlucoLensState) -> dict:
    profile = fetch_patient_profile(state["patient_id"])
    cmp = compare_against_targets(state["nutrition_totals"], profile["targets"])
    tl = generate_traffic_light(cmp)
    risk = calculate_meal_risk_score(cmp)
    interactions = check_drug_food_interactions(state["meal_items"], profile["medications"])

    flagged = {k: v for k, v in cmp.items() if tl[k] in ("yellow", "red")}
    recs = generate_swap_suggestions(flagged, profile) if flagged else []

    return {
        "traffic_light": tl,
        "risk_score": risk,
        "recommendations": recs,
        "drug_interactions": interactions
    }
```

---

### Agent 4 — Glucose Correlation Agent

**File:** `backend/agents/glucose_agent.py`
**Job:** Correlate post-meal glucose readings with meal logs to identify patient-specific trigger foods.

**Status in this build:** Functional with mocked glucose data (14 days of pre-seeded readings). The Recharts visualization is real; the underlying correlation runs on seeded data.

**State slice consumed:** `event_type == "glucose_entry"` OR `event_type == "dashboard_load"`, `patient_id`
**State slice produced:** `glucose_insights: list[dict]`

#### Tools

##### `fetch_glucose_log(patient_id: str, days: int = 14) -> list[dict]`
Firestore read of `patients/{uid}/glucose/{reading_id}`.

```python
def fetch_glucose_log(patient_id: str, days: int = 14) -> list[dict]:
    cutoff = datetime.utcnow() - timedelta(days=days)
    return firestore.collection("patients").document(patient_id) \
        .collection("glucose").where("timestamp", ">=", cutoff) \
        .order_by("timestamp").stream().to_list()
```

##### `correlate_meal_glucose(meal_log: list[dict], glucose_log: list[dict]) -> list[dict]`
For each meal, find glucose readings 90–150 minutes post-meal (2hr peak window). Compute delta from pre-meal baseline.

```python
def correlate_meal_glucose(meals: list[dict], glucose: list[dict]) -> list[dict]:
    results = []
    for meal in meals:
        m_time = parse_iso(meal["timestamp"])
        pre = _closest_before(glucose, m_time, max_minutes=30)
        post = _closest_in_window(glucose, m_time + timedelta(minutes=90), m_time + timedelta(minutes=150))
        if pre and post:
            results.append({
                "meal_id": meal["id"],
                "meal_summary": ", ".join(i["name"] for i in meal["meal_items"]),
                "pre_glucose_mmol": pre["value"],
                "post_glucose_mmol": post["value"],
                "delta_mmol": round(post["value"] - pre["value"], 2),
                "primary_dish": meal["meal_items"][0]["name"] if meal["meal_items"] else "unknown"
            })
    return results
```

##### `detect_trigger_foods(correlations: list[dict]) -> list[dict]`
Group by primary dish, compute mean delta, flag dishes whose mean delta is in the top quartile.

```python
def detect_trigger_foods(corrs: list[dict]) -> list[dict]:
    by_dish = defaultdict(list)
    for c in corrs:
        by_dish[c["primary_dish"]].append(c["delta_mmol"])
    means = [(dish, statistics.mean(deltas), len(deltas)) for dish, deltas in by_dish.items() if len(deltas) >= 2]
    if not means: return []
    threshold = statistics.quantiles([m[1] for m in means], n=4)[-1]  # Q3
    return [{"dish": d, "avg_delta_mmol": round(m, 2), "occurrences": n}
            for d, m, n in means if m >= threshold]
```

##### `compare_to_population_average(patient_id: str, food: str) -> dict`
For the demo build, returns from a static `POPULATION_AVERAGES` dict:

```python
POPULATION_AVERAGES = {
    "nasi_lemak": {"avg_delta_mmol": 2.8, "stddev": 0.9, "n": 1240},
    "char_kuey_teow": {"avg_delta_mmol": 3.1, ...},
    ...
}

def compare_to_population_average(patient_id: str, food: str) -> dict:
    pop = POPULATION_AVERAGES.get(_normalize(food))
    if not pop: return {"comparable": False}
    # patient's own avg comes from detect_trigger_foods
    patient_avg = _patient_dish_avg(patient_id, food)
    if not patient_avg: return {"comparable": False}
    pct_diff = ((patient_avg - pop["avg_delta_mmol"]) / pop["avg_delta_mmol"]) * 100
    return {"comparable": True, "patient_avg": patient_avg, "population_avg": pop["avg_delta_mmol"],
            "pct_difference": round(pct_diff, 1)}
```

##### `generate_insight_card(finding: dict) -> dict`
Formats a structured insight for the dashboard:

```python
def generate_insight_card(finding: dict) -> dict:
    return {
        "headline": f"You spike {finding['pct_difference']}% more than average from {finding['dish']}",
        "subheadline": f"Based on {finding['occurrences']} meals over the last 14 days",
        "severity": "high" if finding["pct_difference"] > 20 else "medium",
        "action": f"Consider reducing portion of {finding['dish']} or pairing with high-fiber sides."
    }
```

#### Node Logic

```python
def node(state: GlucoLensState) -> dict:
    if state["event_type"] not in ("glucose_entry", "dashboard_load"):
        return {}
    meals = fetch_week_meals(state["patient_id"], days=14)
    glucose = fetch_glucose_log(state["patient_id"], days=14)
    corrs = correlate_meal_glucose(meals, glucose)
    triggers = detect_trigger_foods(corrs)
    insights = []
    for t in triggers:
        comparison = compare_to_population_average(state["patient_id"], t["dish"])
        if comparison["comparable"]:
            insights.append(generate_insight_card({**t, **comparison}))
    return {"glucose_insights": insights}
```

---

### Agent 5 — Alert Manager

**File:** `backend/agents/alert_agent.py`
**Job:** Monitor meal/glucose events and push alerts to the dashboard feed when clinical thresholds are breached.

**Output channels in this build:** Firebase Realtime DB push to `/dashboard/{uid}/alerts`. Stubs prepared for Telegram, email, WebSocket.

**State slice consumed:** `nutrition_totals`, `traffic_light`, `risk_score`, `patient_id`
**State slice produced:** `alerts: list[dict]`

#### Tools

##### `check_threshold_breach(meal_totals: dict, patient_targets: dict) -> list[dict]`

```python
SEVERITY_RULES = [
    {"key": "carbs_g",       "target_key": "carbs_g_per_meal",       "tolerance_pct": 0,  "severity": "moderate"},
    {"key": "glycemic_load", "target_key": "glycemic_load_per_meal", "tolerance_pct": 33, "severity": "critical"},
    {"key": "sodium_mg",     "target_key": "sodium_mg_per_meal",     "tolerance_pct": 17, "severity": "moderate"},
]

def check_threshold_breach(totals: dict, targets: dict) -> list[dict]:
    breaches = []
    for rule in SEVERITY_RULES:
        actual = totals.get(rule["key"])
        target = targets.get(rule["target_key"])
        threshold = target * (1 + rule["tolerance_pct"] / 100)
        if actual and actual > threshold:
            breaches.append({
                "nutrient": rule["key"], "actual": actual, "target": target,
                "delta_pct": round(((actual - target) / target) * 100, 1),
                "severity": rule["severity"]
            })
    return breaches
```

##### `calculate_breach_severity(breach: dict) -> str`
Upgrades a breach's severity if the delta is extreme (>100% over target).

```python
def calculate_breach_severity(breach: dict) -> str:
    if breach["delta_pct"] > 100: return "critical"
    if breach["delta_pct"] > 50:  return "moderate"
    return "minor"
```

##### `create_alert_payload(breach: dict, patient: dict, dietitian_id: str) -> dict`

```python
def create_alert_payload(breach: dict, patient: dict, dietitian_id: str) -> dict:
    return {
        "alert_id": str(uuid4()),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "patient_id": patient["uid"],
        "patient_name": patient["displayName"],
        "dietitian_id": dietitian_id,
        "breach_type": breach["nutrient"],
        "severity": calculate_breach_severity(breach),
        "message": f"{breach['nutrient']} exceeded target by {breach['delta_pct']}%",
        "actual": breach["actual"],
        "target": breach["target"],
        "seen": False
    }
```

##### `push_to_dashboard_feed(alert_payload: dict) -> None`
Active for demo. Writes to Firebase Realtime DB.

```python
def push_to_dashboard_feed(alert: dict) -> None:
    rtdb.reference(f"/dashboard/{alert['patient_id']}/alerts/{alert['alert_id']}").set(alert)
    rtdb.reference(f"/dashboard/{alert['dietitian_id']}/alerts/{alert['alert_id']}").set(alert)
```

##### `send_telegram_alert(alert: dict) -> None` *(stub)*
```python
def send_telegram_alert(alert: dict) -> None:
    if not settings.TELEGRAM_ENABLED:
        log.debug("telegram_stub_skipped", alert_id=alert["alert_id"])
        return
    # Production: telegram_client.send_message(...)
```

##### `send_email_alert(alert: dict) -> None` *(stub)*
Same pattern as Telegram.

##### `log_alert_history(patient_id: str, alert: dict) -> None`
Writes to Firestore `patients/{uid}/alerts/{alert_id}`.

#### Node Logic

```python
def node(state: GlucoLensState) -> dict:
    profile = fetch_patient_profile(state["patient_id"])
    user = fetch_user(state["patient_id"])
    breaches = check_threshold_breach(state["nutrition_totals"], profile["targets"])
    alerts = []
    for b in breaches:
        payload = create_alert_payload(b, user, profile["assigned_dietitian"])
        push_to_dashboard_feed(payload)
        log_alert_history(state["patient_id"], payload)
        send_telegram_alert(payload)  # stub
        send_email_alert(payload)     # stub
        alerts.append(payload)
    return {"alerts": alerts}
```

---

### Agent 6 — Dietitian Report Agent

**File:** `backend/agents/report_agent.py`
**Job:** Generate a weekly PDF clinical brief for a dietitian — one per patient. Format is MOH-compatible.

**State slice consumed:** `event_type == "weekly_report"`, `patient_id`
**State slice produced:** `pdf_url: str`

#### Tools

##### `fetch_week_meals(patient_id: str, week_offset: int = 0) -> list[dict]`
Firestore range query over `patients/{uid}/meals`. `week_offset=0` = current week.

##### `fetch_week_glucose(patient_id: str, week_offset: int = 0) -> list[dict]`
Same pattern for glucose readings.

##### `fetch_alert_history(patient_id: str, week_offset: int = 0) -> list[dict]`
Firestore range query over `patients/{uid}/alerts`.

##### `fetch_misinformation_queries(patient_id: str, week_offset: int = 0) -> list[dict]`
Firestore range query over `patients/{uid}/misinfo_log`.

##### `calculate_week_summary(meals: list[dict], targets: dict) -> dict`

```python
def calculate_week_summary(meals: list[dict], targets: dict) -> dict:
    n = len(meals)
    if n == 0: return {"empty": True}
    breaches_carbs   = sum(1 for m in meals if m["nutrition_totals"]["carbs_g"]       > targets["carbs_g_per_meal"])
    breaches_gl      = sum(1 for m in meals if m["nutrition_totals"]["glycemic_load"] > targets["glycemic_load_per_meal"])
    breaches_sodium  = sum(1 for m in meals if m["nutrition_totals"]["sodium_mg"]     > targets["sodium_mg_per_meal"])
    worst = sorted(meals, key=lambda m: m["risk_score"], reverse=True)[:3]
    best  = sorted(meals, key=lambda m: m["risk_score"])[:3]
    return {
        "total_meals": n,
        "adherence_carbs_pct":  round((1 - breaches_carbs/n)  * 100, 1),
        "adherence_gl_pct":     round((1 - breaches_gl/n)     * 100, 1),
        "adherence_sodium_pct": round((1 - breaches_sodium/n) * 100, 1),
        "avg_risk_score": round(statistics.mean(m["risk_score"] for m in meals), 1),
        "worst_meals": worst, "best_meals": best
    }
```

##### `generate_trend_chart(week_data: dict) -> bytes`
Renders a matplotlib chart of daily avg carbs/GL/sodium across the week, returns PNG bytes.

```python
def generate_trend_chart(week_data: dict) -> bytes:
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(7, 3.5))
    days = week_data["days"]
    ax.plot(days, week_data["avg_carbs"],   label="Carbs (g)",  marker="o")
    ax.plot(days, week_data["avg_gl"],      label="GL",         marker="s")
    ax.axhline(45, color="red", linestyle="--", alpha=0.4, label="Carbs target")
    ax.legend(); ax.set_title("Weekly Nutrition Trend")
    buf = io.BytesIO(); plt.savefig(buf, format="png", dpi=140, bbox_inches="tight")
    plt.close(fig); return buf.getvalue()
```

##### `compile_pdf_report(data: dict) -> bytes`
ReportLab generation. Sections:

1. **Header** — clinic logo, patient name, week range, dietitian name
2. **Summary stats** — adherence %, avg risk score, total meals logged
3. **Trend chart** — embedded PNG from `generate_trend_chart`
4. **Worst 3 meals** — table with thumbnail, breaches, recommendations
5. **Best 3 meals** — positive reinforcement section
6. **Alert log** — all critical/moderate breaches for the week
7. **Misinformation queries** — what the patient asked about; verdicts
8. **Dietitian notes section** — blank space for handwritten notes
9. **Footer** — generated timestamp, disclaimer

ReportLab implementation skeleton:
```python
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Image, Table, Spacer
from reportlab.lib.styles import getSampleStyleSheet

def compile_pdf_report(data: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, title=f"GlucoLens Weekly Brief – {data['patient_name']}")
    styles = getSampleStyleSheet()
    story = []
    story.append(Paragraph(f"<b>Weekly Clinical Brief</b>", styles["Title"]))
    story.append(Paragraph(f"Patient: {data['patient_name']} · Week: {data['week_range']}", styles["Normal"]))
    story.append(Spacer(1, 12))
    # ... sections
    doc.build(story)
    return buf.getvalue()
```

##### `upload_pdf_to_storage(patient_id: str, pdf_bytes: bytes) -> str`
Firebase Storage upload, returns the signed URL.

```python
def upload_pdf_to_storage(patient_id: str, pdf_bytes: bytes) -> str:
    bucket = storage.bucket()
    blob = bucket.blob(f"reports/{patient_id}/weekly_{datetime.utcnow():%Y_%W}.pdf")
    blob.upload_from_string(pdf_bytes, content_type="application/pdf")
    return blob.generate_signed_url(timedelta(days=7))
```

##### `notify_dietitian(dietitian_id: str, pdf_url: str, patient_name: str) -> None`
RTDB push to `/dashboard/{dietitian_id}/notifications`.

#### Node Logic

```python
def node(state: GlucoLensState) -> dict:
    if state["event_type"] != "weekly_report":
        return {}
    pid = state["patient_id"]
    profile = fetch_patient_profile(pid)
    user = fetch_user(pid)

    meals       = fetch_week_meals(pid)
    glucose     = fetch_week_glucose(pid)
    alerts      = fetch_alert_history(pid)
    misinfo     = fetch_misinformation_queries(pid)
    summary     = calculate_week_summary(meals, profile["targets"])
    chart_png   = generate_trend_chart(_extract_daily_avgs(meals))

    pdf_bytes = compile_pdf_report({
        "patient_name": user["displayName"], "profile": profile, "summary": summary,
        "chart_png": chart_png, "alerts": alerts, "misinfo": misinfo,
        "week_range": _format_week_range()
    })

    pdf_url = upload_pdf_to_storage(pid, pdf_bytes)
    notify_dietitian(profile["assigned_dietitian"], pdf_url, user["displayName"])
    return {"pdf_url": pdf_url}
```

---

### Agent 7 — Reflection & Dashboard Agent

**File:** `backend/agents/dashboard_agent.py`
**Job:** Synthesize outputs from Agents 1–6 into the correct view payload for the logged-in user (patient vs dietitian) and push to the live dashboard channel.

This agent is the **UI brain**. The same agent outputs upstream become different presentations depending on `view_role`.

**State slice consumed:** All other agents' outputs + `user_id`
**State slice produced:** `dashboard_payload: dict`, `view_role: str`

#### Tools

##### `fetch_agent_outputs(session_id: str) -> dict`
Pulls cached agent outputs from the LangGraph state (in-memory) or session cache (Redis-equivalent — in this build, an in-process LRU cache).

##### `determine_user_role(user_id: str) -> str`
Firestore lookup of `users/{uid}.role`.

##### `build_patient_view(outputs: dict, patient_id: str) -> dict`

```python
def build_patient_view(outputs: dict, patient_id: str) -> dict:
    return {
        "view": "patient",
        "cards": [
            {"type": "traffic_light", "data": outputs.get("traffic_light", {})},
            {"type": "meal_breakdown", "data": outputs.get("nutrition_per_item", [])},
            {"type": "recommendations", "data": outputs.get("recommendations", [])},
            {"type": "drug_interactions", "data": outputs.get("drug_interactions", [])},
            {"type": "alert_feed", "data": outputs.get("alerts", [])},
            {"type": "glucose_insights", "data": outputs.get("glucose_insights", [])}
        ],
        "summary": generate_ui_summary(outputs, role="patient"),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
```

##### `build_dietitian_view(outputs: dict, dietitian_id: str) -> dict`

```python
def build_dietitian_view(outputs: dict, dietitian_id: str) -> dict:
    patients = fetch_dietitian_caseload(dietitian_id)
    return {
        "view": "dietitian",
        "caseload": sorted(patients, key=lambda p: p["weekly_risk_score"], reverse=True),
        "recent_alerts": fetch_recent_alerts_for_dietitian(dietitian_id),
        "misinfo_log": fetch_recent_misinfo_for_dietitian(dietitian_id),
        "summary": generate_ui_summary(outputs, role="dietitian"),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
```

##### `push_realtime_to_firebase(channel: str, payload: dict) -> None`

```python
def push_realtime_to_firebase(channel: str, payload: dict) -> None:
    rtdb.reference(channel).set(payload)
```

##### `format_for_chart(data: list, chart_type: str) -> list`
Transforms raw agent outputs into Recharts-friendly arrays (one record per X-axis tick).

##### `generate_ui_summary(agent_outputs: dict, role: str) -> str`
**LLM-driven.** Produces a single-sentence plain-language insight string.

```python
SUMMARY_PROMPT_PATIENT = """
Given these meal analysis results, write ONE short, friendly sentence (max 25 words)
summarizing the meal for the patient. Use everyday language. Be supportive but honest.

Results: {results}
"""

SUMMARY_PROMPT_DIETITIAN = """
Given these caseload statistics, write ONE clinical sentence (max 25 words) flagging
the most pressing observation for the dietitian. Use clinical language.

Stats: {stats}
"""
```

##### `cache_view_state(user_id: str, state: dict) -> None`
LRU cache; expires after 5 minutes. Used so dashboard reloads are fast.

##### `localize_strings(text: str, language: str) -> str`
Stub. Returns input unchanged in this build. Production hooks into a translation service or LangChain LLM-based translator.

#### Node Logic

```python
def node(state: GlucoLensState) -> dict:
    role = determine_user_role(state["user_id"])
    outputs = {k: state.get(k) for k in [
        "traffic_light", "risk_score", "recommendations", "drug_interactions",
        "alerts", "glucose_insights", "verdict", "verdict_explanation",
        "disclaimer", "nutrition_per_item", "nutrition_totals", "pdf_url"
    ]}

    if role == "patient":
        payload = build_patient_view(outputs, state["user_id"])
        push_realtime_to_firebase(f"/dashboard/{state['user_id']}/live", payload)
    else:
        payload = build_dietitian_view(outputs, state["user_id"])
        push_realtime_to_firebase(f"/dashboard/{state['user_id']}/live", payload)

    cache_view_state(state["user_id"], payload)
    return {"dashboard_payload": payload, "view_role": role}
```

---

### Agent 8 — Misinformation Debunker Agent

**File:** `backend/agents/misinfo_agent.py`
**Job:** Take a patient-submitted claim or URL, evaluate it against evidence-based sources, assess safety for the specific patient, append a disclaimer, log for dietitian review.

**State slice consumed:** `event_type == "misinformation_query"`, `raw_query`, `patient_id`
**State slice produced:** `verdict`, `verdict_explanation`, `disclaimer`, `logged_for_dietitian`, `evidence_sources`

#### Tools

##### `extract_claim(input_text_or_url: str) -> dict`
**LLM-driven.** Parses the input into a structured claim object.

```python
CLAIM_EXTRACTION_PROMPT = """
The user submitted: "{input}"

Extract:
- claim: the central factual assertion (one sentence)
- claim_type: "dietary" | "supplement" | "medication_replacement" | "exercise" | "other"
- entities: list of substances/foods/medications mentioned
- urls_present: bool

Output STRICT JSON.
"""
```

##### `fetch_url_content(url: str) -> str`
Web fetch + readability cleanup. Returns first 4000 chars of clean text.

```python
def fetch_url_content(url: str) -> str:
    resp = httpx.get(url, timeout=10, follow_redirects=True,
                     headers={"User-Agent": "GlucoLens/1.0 (clinical-research)"})
    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer"]): tag.decompose()
    return soup.get_text(separator=" ", strip=True)[:4000]
```

##### `search_pubmed(claim: str) -> list[dict]`
Tavily search scoped to PubMed.

```python
def search_pubmed(claim: str) -> list[dict]:
    return tavily_client.search(
        query=claim, search_depth="advanced", max_results=4,
        include_domains=["pubmed.ncbi.nlm.nih.gov", "ncbi.nlm.nih.gov"]
    )["results"]
```

##### `search_cochrane(claim: str) -> list[dict]`
Same pattern, scoped to `cochranelibrary.com`.

##### `search_moh_guidelines(claim: str) -> list[dict]`
Scoped to `moh.gov.my` and `myhealth.gov.my`.

##### `search_who_guidelines(claim: str) -> list[dict]`
Scoped to `who.int`.

##### `search_diabetes_associations(claim: str) -> list[dict]`
Scoped to `diabetes.org` (ADA), `idf.org` (IDF), `diabetes.org.my` (PDM).

All search tools return a uniform list of `{title, url, content, score}`.

##### `check_against_patient_profile(claim: dict, patient_id: str) -> dict`
Cross-references extracted entities against the patient's medications + conditions.

```python
def check_against_patient_profile(claim: dict, patient_id: str) -> dict:
    profile = fetch_patient_profile(patient_id)
    risks = []
    for entity in claim["entities"]:
        for med in profile["medications"]:
            interactions = DRUG_FOOD_INTERACTIONS.get(_normalize(med["name"]), [])
            for inter in interactions:
                if inter["food"] in _normalize(entity):
                    risks.append({"entity": entity, "medication": med["name"], **inter})
    return {"patient_specific_risks": risks, "patient_has_t2dm": "T2DM" in profile["conditions"]}
```

##### `classify_verdict(evidence: dict, patient_risk: dict) -> str`
Rule-based classification on top of LLM summarization of evidence:

```python
VERDICT_PROMPT = """
Given the following claim and evidence, classify the verdict.

Claim: {claim}

Evidence:
- PubMed results: {pubmed}
- Cochrane: {cochrane}
- MOH guidelines: {moh}
- WHO: {who}
- Diabetes associations: {assoc}

Patient-specific risks: {patient_risks}

Classify as ONE of:
- "supported": Strong evidence supports the claim AND no patient-specific risk.
- "mixed": Evidence is mixed or limited.
- "contradicted": Evidence contradicts the claim.
- "harmful_for_you": Evidence-supported OR not, but presents a direct risk to THIS patient (drug interaction, contraindicated for T2DM, etc.).

Output JSON: {{"verdict": "...", "confidence": 0.0-1.0, "reasoning": "..."}}
"""
```

The `harmful_for_you` verdict takes precedence — if `patient_risk["patient_specific_risks"]` is non-empty, verdict is forced to `harmful_for_you`.

##### `generate_explanation(verdict: str, evidence: dict, patient_context: dict) -> str`
**LLM-driven.** Produces plain-language reasoning (3–5 sentences).

```python
EXPLANATION_PROMPT = """
Verdict: {verdict}
Claim: {claim}
Key evidence: {top_evidence_snippets}
Patient context: {patient_context}

Write a 3–5 sentence plain-language explanation suitable for a 54-year-old patient.
- Acknowledge any kernel of truth in the claim.
- State what the evidence actually shows.
- If patient-specific risk exists, name the specific risk.
- Avoid jargon. Use "you" address.
- Do NOT include the disclaimer (that is appended separately).
"""
```

##### `append_disclaimer(explanation: str) -> str`
Constant disclaimer text, appended verbatim:

```python
DISCLAIMER = (
    "This is my suggestion based on available evidence — please refer to your dietitian "
    "or doctor before changing your diet, supplements, or medications."
)

def append_disclaimer(explanation: str) -> str:
    return f"{explanation}\n\n{DISCLAIMER}"
```

##### `log_query_for_dietitian(patient_id: str, claim: dict, verdict: str, explanation: str) -> None`
Writes to `patients/{uid}/misinfo_log/{query_id}` AND RTDB push to dietitian's `/dashboard/{did}/misinfo_alerts`.

#### Node Logic

```python
def node(state: GlucoLensState) -> dict:
    raw = state["raw_query"]
    claim = extract_claim(raw)

    # If URL present, augment claim with page content
    if claim["urls_present"]:
        urls = _extract_urls(raw)
        page = fetch_url_content(urls[0])
        claim["page_content"] = page

    # Parallel evidence search
    with ThreadPoolExecutor(max_workers=5) as pool:
        evidence = {
            "pubmed":    pool.submit(search_pubmed, claim["claim"]).result(),
            "cochrane":  pool.submit(search_cochrane, claim["claim"]).result(),
            "moh":       pool.submit(search_moh_guidelines, claim["claim"]).result(),
            "who":       pool.submit(search_who_guidelines, claim["claim"]).result(),
            "associations": pool.submit(search_diabetes_associations, claim["claim"]).result()
        }

    patient_risk = check_against_patient_profile(claim, state["patient_id"])
    verdict_obj = classify_verdict(evidence, patient_risk)
    verdict = "harmful_for_you" if patient_risk["patient_specific_risks"] else verdict_obj["verdict"]

    explanation = generate_explanation(verdict, evidence, patient_risk)
    explanation_with_disclaimer = append_disclaimer(explanation)

    log_query_for_dietitian(state["patient_id"], claim, verdict, explanation)

    return {
        "verdict": verdict,
        "verdict_explanation": explanation_with_disclaimer,
        "disclaimer": DISCLAIMER,
        "logged_for_dietitian": True,
        "evidence_sources": _flatten_evidence_sources(evidence)
    }
```

**Verdict UI mapping:**
| Internal verdict | Display label | Icon |
|---|---|---|
| `supported` | Supported by evidence | ✅ |
| `mixed` | Mixed evidence | ⚠️ |
| `contradicted` | Contradicted by evidence | ❌ |
| `harmful_for_you` | Potentially harmful for you | 🚨 |

---

### Agent 9 — Orchestrator / Router

**File:** `backend/agents/orchestrator.py`
**Job:** Receive all events, classify them, build and execute the correct LangGraph subgraph, handle failures with graceful degradation, audit-log everything.

**This is the entrypoint** every router calls.

#### Tools

##### `classify_event(event_type: str, payload: dict) -> str`
Validates `event_type` against allowed values and confirms required payload keys are present.

```python
EVENT_REQUIREMENTS = {
    "meal_upload":          ["patient_id", "image_base64"],
    "glucose_entry":        ["patient_id", "glucose_value", "timestamp"],
    "misinformation_query": ["patient_id", "raw_query"],
    "weekly_report":        ["patient_id"],
    "dashboard_load":       ["user_id"]
}

def classify_event(event_type: str, payload: dict) -> str:
    if event_type not in EVENT_REQUIREMENTS:
        raise ValueError(f"Unknown event: {event_type}")
    missing = [k for k in EVENT_REQUIREMENTS[event_type] if k not in payload]
    if missing:
        raise ValueError(f"Missing keys for {event_type}: {missing}")
    return event_type
```

##### `build_agent_pipeline(event_class: str) -> CompiledGraph`
Returns a compiled LangGraph for the event.

```python
PIPELINES = {
    "meal_upload":          ["vision", "nutrition", "clinical", "alert", "dashboard"],
    "glucose_entry":        ["glucose", "alert", "dashboard"],
    "misinformation_query": ["misinfo", "dashboard"],
    "weekly_report":        ["report", "dashboard"],
    "dashboard_load":       ["dashboard"]
}

def build_agent_pipeline(event_class: str) -> CompiledGraph:
    graph = StateGraph(GlucoLensState)
    nodes = PIPELINES[event_class]
    for n in nodes:
        graph.add_node(n, AGENT_NODES[n])
    graph.set_entry_point(nodes[0])
    for a, b in zip(nodes, nodes[1:]):
        graph.add_edge(a, b)
    graph.add_edge(nodes[-1], END)
    return graph.compile()
```

##### `handle_agent_failure(agent_id: str, error: Exception, state: GlucoLensState) -> dict`
Returns a fallback state update so downstream agents can still run.

```python
FALLBACK_OUTPUTS = {
    "vision":     {"meal_items": [], "unrecognized_items": [{"reason": "vision_failed"}]},
    "nutrition":  {"nutrition_totals": {}, "nutrition_per_item": []},
    "clinical":   {"traffic_light": {}, "risk_score": 0, "recommendations": [], "drug_interactions": []},
    "alert":      {"alerts": []},
    "report":     {"pdf_url": ""},
    "dashboard":  {"dashboard_payload": {"error": "dashboard_unavailable"}, "view_role": "unknown"},
    "misinfo":    {"verdict": "error", "verdict_explanation": "We could not verify this claim. Please consult your dietitian.", "disclaimer": DISCLAIMER},
    "glucose":    {"glucose_insights": []}
}
```

##### `audit_log(event: str, agents_invoked: list, outcome: str, session_id: str) -> None`
Writes to `audit_logs/{session_id}` in Firestore. Clinical traceability requirement.

##### `human_in_the_loop_check(decision: dict) -> bool`
Returns `True` if the decision should be escalated. In this build: returns `True` only when an alert is `severity == "critical"` AND `risk_score >= 80` — surfaces a banner on the dietitian dashboard.

##### `cost_optimizer(pipeline: list, state: GlucoLensState) -> list`
Short-circuit logic. If the same `image_hash` was processed in the last 60 seconds, return the cached result instead of re-running.

```python
@lru_cache(maxsize=128)
def _cached_meal_result(image_hash: str) -> dict: ...
```

#### Node Logic (Orchestrator entry)

```python
async def run(event_type: str, payload: dict) -> dict:
    session_id = str(uuid4())
    log = agent_logger("orchestrator").bind(session_id=session_id, event=event_type)
    try:
        event_class = classify_event(event_type, payload)
        pipeline = build_agent_pipeline(event_class)
        initial_state: GlucoLensState = {
            **EMPTY_STATE,
            "event_type": event_class,
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            **payload
        }
        result = await pipeline.ainvoke(initial_state, config={"recursion_limit": 12})
        audit_log(event_type, PIPELINES[event_class], "success", session_id)
        return result
    except Exception as e:
        log.exception("pipeline_failure")
        audit_log(event_type, [], f"error:{e}", session_id)
        raise
```

---

## 6. LangGraph State Schema

**File:** `backend/models/state.py`

```python
from typing import TypedDict, Optional

class GlucoLensState(TypedDict, total=False):
    # === Event context ===
    event_type: str          # "meal_upload" | "glucose_entry" | "misinformation_query" | "weekly_report" | "dashboard_load"
    patient_id: str
    user_id: str             # for dashboard_load; may differ from patient_id (dietitian)
    dietitian_id: Optional[str]
    session_id: str
    timestamp: str           # ISO8601 UTC

    # === Event-specific inputs ===
    image_base64: Optional[str]
    image_url: Optional[str]
    glucose_value: Optional[float]
    raw_query: Optional[str]

    # === Agent 1 outputs ===
    meal_items: list[dict]
    unrecognized_items: list[dict]
    recognition_method: str

    # === Agent 2 outputs ===
    nutrition_totals: dict
    nutrition_per_item: list[dict]
    data_source: str

    # === Agent 3 outputs ===
    traffic_light: dict
    risk_score: int
    recommendations: list[str]
    drug_interactions: list[dict]

    # === Agent 4 outputs ===
    glucose_insights: list[dict]

    # === Agent 5 outputs ===
    alerts: list[dict]

    # === Agent 6 outputs ===
    pdf_url: str

    # === Agent 7 outputs ===
    dashboard_payload: dict
    view_role: str

    # === Agent 8 outputs ===
    verdict: str
    verdict_explanation: str
    disclaimer: str
    logged_for_dietitian: bool
    evidence_sources: list[dict]

    # === Metadata ===
    errors: list[dict]
    cached: bool
```

`EMPTY_STATE` is a constant dict with every key initialized to a safe default (empty list/dict/string).

---

## 7. LangGraph Orchestration Detail

### Graph Construction (per event)

```python
from langgraph.graph import StateGraph, END

AGENT_NODES = {
    "vision":    vision_agent.node,
    "nutrition": nutrition_agent.node,
    "clinical":  clinical_agent.node,
    "glucose":   glucose_agent.node,
    "alert":     alert_agent.node,
    "report":    report_agent.node,
    "dashboard": dashboard_agent.node,
    "misinfo":   misinfo_agent.node,
}
```

### Per-event Graphs

**`meal_upload`:**
```
START → vision → nutrition → clinical → alert → dashboard → END
```

**`glucose_entry`:**
```
START → glucose → alert → dashboard → END
```

**`misinformation_query`:**
```
START → misinfo → dashboard → END
```

**`weekly_report`:**
```
START → report → dashboard → END
```

**`dashboard_load`:**
```
START → dashboard → END
```

### Conditional Edges (Failure Recovery)

A `should_continue` edge function is attached to each node:

```python
def should_continue(state: GlucoLensState) -> str:
    if state.get("errors") and len(state["errors"]) >= 3:
        return "abort"
    return "next"
```

Nodes route to either the next agent or to a `terminal_error` node that returns a minimal valid payload to the dashboard.

### Recursion & Timeouts
- `recursion_limit=12`: safe ceiling for any single pipeline.
- Per-node timeout: 20 seconds (enforced via `asyncio.wait_for` wrapper).
- Whole pipeline soft-timeout: 45 seconds (enforced in router).

---

## 8. API Endpoints

| Method | Path | Agent(s) | Auth | Body |
|---|---|---|---|---|
| `POST` | `/api/v1/meal/upload` | 1 → 2 → 3 → 5 → 7 | Firebase JWT | `{ image_base64 }` |
| `POST` | `/api/v1/glucose/entry` | 4 → 5 → 7 | Firebase JWT | `{ glucose_value, timestamp }` |
| `POST` | `/api/v1/misinformation/check` | 8 → 7 | Firebase JWT | `{ raw_query }` |
| `GET` | `/api/v1/report/weekly/{patient_id}` | 6 → 7 | Firebase JWT (dietitian) | — |
| `GET` | `/api/v1/dashboard` | 7 | Firebase JWT | — |
| `GET` | `/api/v1/patients` | — | Firebase JWT (dietitian) | — |
| `GET` | `/api/v1/alerts/{patient_id}` | — | Firebase JWT | — |
| `GET` | `/health` | — | None | — |

### Request/Response Schemas

**`POST /api/v1/meal/upload`**

Request:
```json
{ "image_base64": "iVBORw0KGgo..." }
```

Response (200):
```json
{
  "session_id": "uuid",
  "meal_items": [...],
  "nutrition_totals": {...},
  "traffic_light": {...},
  "risk_score": 78,
  "recommendations": [...],
  "alerts": [...],
  "dashboard_payload": {...}
}
```

**`POST /api/v1/misinformation/check`**

Request:
```json
{ "raw_query": "TikTok says drinking bitter gourd juice every morning replaces metformin." }
```

Response (200):
```json
{
  "session_id": "uuid",
  "verdict": "harmful_for_you",
  "verdict_explanation": "...",
  "disclaimer": "...",
  "evidence_sources": [{"title": "...", "url": "...", "source": "pubmed"}]
}
```

### Auth Middleware

All `/api/v1/*` routes (except `/health`) require a `Authorization: Bearer <firebase_jwt>` header. Decoded via `firebase_admin.auth.verify_id_token`. The decoded UID is injected into the request context and overrides any client-supplied `patient_id` or `user_id` for security.

---

## 9. Firebase Data Schema

### Firestore Collections

**`users/{uid}`**
```json
{ "role": "patient" | "dietitian", "displayName": "Encik Rahman", "assignedDietitian": "uid_aisyah", "email": "rahman@demo.com", "createdAt": "ISO8601" }
```

**`patients/{uid}/profile/main`**
```json
{ "age": 54, "sex": "M", "conditions": [...], "hba1c": 8.1, "medications": [...], "targets": {...}, "allergens": [], "language_preference": "en" }
```

**`patients/{uid}/meals/{meal_id}`**
```json
{ "timestamp": "ISO8601", "image_url": "gs://...", "meal_items": [...], "nutrition_totals": {...},
  "traffic_light": {...}, "risk_score": 78, "recommendations": [...], "session_id": "..." }
```

**`patients/{uid}/glucose/{reading_id}`**
```json
{ "timestamp": "ISO8601", "value_mmol": 8.4, "context": "post_meal", "source": "manual" | "meter" }
```

**`patients/{uid}/alerts/{alert_id}`**
```json
{ "timestamp": "ISO8601", "breach_type": "glycemic_load", "severity": "critical", "meal_id": "...", "seen": false, "delta_pct": 87 }
```

**`patients/{uid}/misinfo_log/{query_id}`**
```json
{ "timestamp": "ISO8601", "raw_query": "...", "claim": "...", "verdict": "harmful_for_you",
  "explanation": "...", "evidence_sources": [...], "seen_by_dietitian": false }
```

**`audit_logs/{session_id}`**
```json
{ "event_type": "meal_upload", "agents_invoked": ["vision", "nutrition", "clinical", "alert", "dashboard"],
  "outcome": "success", "user_id": "uid_rahman", "timestamp": "ISO8601", "duration_ms": 4231 }
```

### Firebase Realtime DB

**`/dashboard/{uid}/live`** — Current dashboard payload (overwritten on each agent run).
**`/dashboard/{uid}/alerts/{alert_id}`** — Live alert feed entries.
**`/dashboard/{uid}/notifications/{notif_id}`** — In-app notifications (e.g. new PDF report).
**`/dashboard/{uid}/misinfo_alerts/{query_id}`** — Misinfo queries (dietitian channel only).

### Firebase Storage

**`gs://<bucket>/meals/{patient_uid}/{meal_id}.jpg`** — Meal photos.
**`gs://<bucket>/reports/{patient_uid}/weekly_{year}_{week}.pdf`** — Weekly PDFs.

### Firestore Security Rules (high level)

```javascript
// Patients can only read/write their own data
match /patients/{uid}/{document=**} {
  allow read, write: if request.auth.uid == uid
                     || isDietitianOf(request.auth.uid, uid);
}
function isDietitianOf(dietitianUid, patientUid) {
  return get(/databases/$(database)/documents/patients/$(patientUid)/profile/main).data.assigned_dietitian == dietitianUid;
}
```

---

## 10. Frontend Views & Components

### Routing (Next.js App Router)

```
/                       — Login (redirects by role after auth)
/login                  — Login form
/patient                — Patient dashboard
/patient/history        — Meal history with thumbnails
/patient/misinfo        — Misinformation checker
/dietitian              — Caseload table
/dietitian/[patient_id] — Patient drilldown
```

### Patient Components

| Component | Purpose | Key Props/State |
|---|---|---|
| `DashboardSummaryCard.tsx` | **Always-visible** greeting card with avg glucose, meal count, avg risk, and AI summary from Agent 7. Calls `/dashboard/` on mount to trigger RTDB refresh. | `uid`, `name`; uses `useRecentGlucose`, `useRecentMeals`, `useRealtimeDashboard` |
| `MealUpload.tsx` | Drag-and-drop or camera capture. Shows uploaded image preview. After analysis shows 6-macro totals + ingredient breakdown + traffic lights + recommendations + drug interactions. | internal state; calls `POST /api/v1/meals/upload` |
| `IngredientBreakdown.tsx` | Per-item card showing: food name + portion, components as ingredient chips, macro bar chart (carbs/protein/fat/fibre), per-portion sodium, confidence badge, allergen alert. | `items: MealItemDetail[]` |
| `AgentStatusTicker.tsx` | Live progress of agent pipeline | renders ✓/⏳ per agent stage |
| `TrafficLight.tsx` | 🟢/🟡/🔴 per nutrient | `data: {carbs, gl, sodium, protein}` |
| `MealBreakdown.tsx` | Per-item nutrition table (used in MealHistory) | `items: NutritionItem[]` |
| `RecommendationsList.tsx` | Swap suggestions | `recs: string[]` |
| `DrugInteractionsCard.tsx` | Flag drug-food risks | `interactions: Interaction[]` |
| `AlertFeed.tsx` | Live alert stream | RTDB subscription on `/dashboard/{uid}/alerts` |
| `MisinfoChecker.tsx` | Textarea + verdict card | `verdict, explanation, sources` |
| `MealHistory.tsx` | Scrollable past meals | Firestore listener on `patients/{uid}/meals` |
| `GlucoseInsightCard.tsx` | Trigger food insight | `insight: {headline, severity, action}` |
| `WeeklyReportCard.tsx` | Patient-triggered weekly PDF report generation. Shows checklist of report contents, triggers `POST /api/v1/reports/weekly`, shows PDF download link on success. | internal state; calls `api.generateReport()` |

### Dietitian Components

| Component | Purpose | Key Props/State |
|---|---|---|
| `CaseloadTable.tsx` | All assigned patients, sorted by risk | RTDB subscription on `/dashboard/{did}/live` |
| `PatientDrilldown.tsx` | Full patient view | Combines meals + alerts + misinfo |
| `MisinfoLog.tsx` | List of patient queries | "Mark as discussed" button |
| `WeeklyPdfCard.tsx` | Download button | Calls `/api/v1/report/weekly/{pid}` |
| `AlertHistoryTable.tsx` | All breaches, filterable | Firestore listener |

### Realtime Sync Hook

```typescript
// src/hooks/useRealtimeDashboard.ts
export function useRealtimeDashboard(uid: string) {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  useEffect(() => {
    const ref = rtdb.ref(`/dashboard/${uid}/live`);
    const unsub = ref.on("value", snap => setPayload(snap.val()));
    return () => ref.off("value", unsub);
  }, [uid]);
  return payload;
}
```

### Styling Conventions
- Tailwind utility classes only.
- Color tokens: `red-500` (🔴), `amber-500` (🟡), `emerald-500` (🟢).
- All cards: `rounded-2xl bg-white shadow-sm border border-slate-200 p-6`.
- All buttons: `rounded-xl px-4 py-2 font-medium`.

---

## 11. Environment Variables

```env
# === Backend (.env) ===
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-2024-08-06
OPENAI_VISION_MODEL=gpt-4o

# Tavily
TAVILY_API_KEY=tvly-...

# Firebase Admin
FIREBASE_PROJECT_ID=glucolens-demo
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@glucolens-demo.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://glucolens-demo-default-rtdb.firebaseio.com
FIREBASE_STORAGE_BUCKET=glucolens-demo.appspot.com

# Feature flags
MYDIETCAM_ENABLED=false
TELEGRAM_ENABLED=false
EMAIL_ENABLED=false

# App config
APP_ENV=development
LOG_LEVEL=INFO
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# === Frontend (.env.local) ===
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=glucolens-demo.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=glucolens-demo
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=glucolens-demo.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://glucolens-demo-default-rtdb.firebaseio.com
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## 12. Build Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| GPT-4V slow (>10s) | Medium | High | Pre-cache Rahman's nasi lemak result; agent status ticker masks wait |
| Tavily returns no results for misinfo | Low | Medium | Fall back to GPT-4o knowledge with "based on available evidence" framing |
| Firebase cold start on first request | Low | Low | Seed all demo data; warm-up call on app boot |
| LangGraph chain fails mid-pipeline | Medium | High | Every node has `fallback_output`; downstream agents check for empty inputs |
| PDF generation fails | Low | Medium | Buildora code is battle-tested; pre-generate Rahman's PDF as backup file |
| Drug-interaction false positive | Medium | Medium | Bias toward over-alerting; dietitian view shows it for review |
| Patient uploads non-food photo | Low | Low | Vision agent returns empty list; UI shows "no food detected" state |
| Concurrency: multiple meal uploads | Low | Medium | Each request has a unique `session_id`; state is per-session |
| Rate limit on OpenAI | Low | High | Paid tier; exponential backoff in `LLM` client |

---

## 13. Post-Project Extensibility

| Feature | Effort | Hook Already in Place |
|---|---|---|
| Telegram / WhatsApp alerts | 1 day | Agent 5: `send_telegram_alert` stub |
| Email digest | 1 day | Agent 5: `send_email_alert` stub |
| Production MyDietCam swap | License + 0.5 day integration | Agent 1: `lookup_mydietcam_model` hook |
| Live CGM/glucose meter feed | 1 week | Agent 4: glucose schema already final |
| NCD expansion (HTN, CKD) | 2 weeks | Agent 3: targets are profile-driven |
| BM/EN language toggle | 3 days | Agent 7: `localize_strings` hook |
| MOH KOSPEN data integration | Partnership | Agent 3: guidelines are externalized |
| B2B clinic portal | 2 weeks | Firestore role schema supports it |
| Wearable integration (HR, steps) | 1 week | New agent slot; state schema extensible |

---

*GlucoLens v2.0 — Powered by LangGraph + GPT-4o + Firebase · Designed for MyDietCam IP integration*
