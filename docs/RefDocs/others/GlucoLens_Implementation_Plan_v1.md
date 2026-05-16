# GlucoLens — "Better Than a Dietitian" Implementation & Improvement Plan
**Version:** 1.0 · **Date:** 15 May 2026 · **Basis:** PRD v1.0 + Capability Gap Analysis

---

## 0. The Benchmark: What "Better Than a Dietitian" Actually Means

A personal dietitian delivers value through 4 mechanisms: personalized advice, behavioral coaching, clinical judgment, and trusted accountability. GlucoLens wins by matching all four — and then doing 3 things no human dietitian can ever do:

1. **Present 24/7 at every single meal** — not 4 times a year at a clinic
2. **Perfect longitudinal memory** — never forgets a meal, a pattern, or a relapse
3. **Individual-level data science** — builds a glucose-response fingerprint unique to each patient that no dietitian could produce manually

This plan is organized into 4 phases. Each phase adds a capability layer that moves GlucoLens closer to — and eventually past — what a personal dietitian can offer.

| Phase | Timeframe | Capability Layer | What It Unlocks |
|---|---|---|---|
| Phase 0 | 72 hours (NOW) | Reactive — real-time meal feedback | "Useful app" |
| Phase 1 | Week 1–4 post-demo | Proactive — intervention before harm happens | "Better than nothing between visits" |
| Phase 2 | Month 1–3 | Longitudinal — pattern memory + glucose fingerprinting | "Genuinely better than a dietitian for daily management" |
| Phase 3 | Month 3–6 | Predictive + Clinical Grade | "Clinically irreplaceable" |
| Phase 4 | Month 6–12 | B2B system + population intelligence | "Structural moat — no one can compete" |

---

## 1. Capability Gap Analysis

### 1.1 What the Current PRD Already Does Well (Keep and Build On)
- ✅ Post-meal photo analysis — Agent 1 (Vision) + Agent 2 (Nutrition)
- ✅ Patient-personalized feedback with traffic light — Agent 3 (Clinical)
- ✅ Drug-food interaction check — Agent 3 `check_drug_food_interactions`
- ✅ Threshold breach alerts — Agent 5 (Alert Manager)
- ✅ Misinformation debunking on demand — Agent 8
- ✅ Weekly clinical PDF for dietitian — Agent 6
- ✅ Dietitian caseload view with risk ranking — Dietitian Dashboard
- ✅ Malaysian food context via MyDietCam IP + local nutrition_db

### 1.2 Critical Gaps (What's Missing to Beat a Dietitian)

| Gap | Impact | Phase to Fix |
|---|---|---|
| No pre-meal guidance — advice comes after eating, not before | High | Phase 1 |
| No behavioral pattern detection — can't identify when and why bad eating happens | High | Phase 2 |
| Agent 4 (glucose fingerprinting) is a mock slide, not built | Critical | Phase 2 |
| No streak / relapse tracking — no accountability mechanism | Medium | Phase 1 |
| No adaptive targets — patient thresholds are static, never tighten or loosen | High | Phase 3 |
| No wearable/CGM integration — glucose data is manually entered | Medium | Phase 3 |
| No HbA1c trajectory prediction from meal log patterns | High | Phase 3 |
| Misinformation debunking is reactive only — no proactive flagging on known-risk foods | Medium | Phase 2 |
| Swap suggestions are generic GPT output — not locally grounded enough | Medium | Phase 1 |
| No emotional/social eating context capture | Medium | Phase 2 |
| No BM language toggle — excludes lower-literacy patients | High | Phase 2 |
| Alerts are dashboard-only — no push to patient's phone in real time | Medium | Phase 1 |

---

## 2. Phase 0 — 72-Hour Demo Build (Current Sprint)

**Goal:** Ship the core reactive loop that proves the concept live on demo day.

### Priority Agent Deliverables (in build order)

#### Agent 1 — Vision & Portion (MUST SHIP)
- GPT-4V integration with base64 upload
- `decompose_mixed_dish` for nasi lemak, mixed rice, mee goreng
- 30-dish hardcoded fallback in `nutrition_db.json`
- Confidence score display on unrecognized items
- **Demo critical:** Pre-cache Rahman's nasi lemak result to avoid live latency

#### Agent 2 — Nutritional Engine (MUST SHIP)
- MyFCD lookup + GL calculator
- `estimate_missing_nutrients` GPT-4o fallback
- `aggregate_meal_totals` — carbs, protein, fat, sodium, GL

#### Agent 3 — Clinical Personalization (MUST SHIP)
- Patient profile fetch from Firestore
- Traffic light (🟢🟡🔴) per nutrient vs Rahman's targets
- Risk score 0–100
- Swap suggestions — ensure these reference local foods (brown rice, ulam, teh o kosong) not Western alternatives
- Drug interaction check: Metformin + high-carb meal timing, Gliclazide + bitter gourd

#### Agent 5 — Alert Manager (MUST SHIP — dashboard only)
- Threshold breach detection
- Firebase Realtime DB push to in-dashboard feed
- Severity classification: minor / moderate / critical
- Telegram/email stubs documented but disabled

#### Agent 8 — Misinformation Debunker (MUST SHIP — this is the emotional demo moment)
- Full 6-tool chain visible in real time on screen
- Verdict card with 🚨 / ⚠️ / ✅ framing
- "Consult your dietitian before acting on this" disclaimer on every verdict
- Auto-log to Puan Aisyah's misinfo feed in Firestore

#### Agent 6 — Dietitian PDF (MUST SHIP)
- Weekly brief with meal log summary, alert history, misinfo queries
- Reuse Buildora ReportLab template with GlucoLens branding
- Pre-generate Rahman's PDF as a backup in case live generation fails

#### Agent 7 — Dashboard Reflection (MUST SHIP)
- Firebase Realtime DB listener in React
- Agent status ticker: Vision ✓ → Nutrition ✓ → Clinical ✓ → Dashboard ✓
- Patient dashboard: meal history, traffic lights, alert feed, misinfo checker
- Dietitian dashboard: caseload table sorted by weekly risk score, patient drilldown

#### Agent 4 — Glucose Correlation (SLIDE ONLY — do not build)
- Pre-rendered Recharts chart: Rahman's nasi lemak response vs population average (+23%)
- Narrate the logic during demo — do not attempt live build in 72 hours

### Phase 0 Success Criteria
- [ ] Rahman uploads nasi lemak photo → traffic light fires in under 15 seconds
- [ ] Bitter gourd misinfo query returns verdict with 6 tool calls visible
- [ ] Puan Aisyah's dashboard shows Rahman's meal log + misinfo log
- [ ] PDF downloads without error
- [ ] Agent 4 slide renders cleanly with pre-seeded chart

---

## 3. Phase 1 — Post-Demo Quick Wins (Week 1–4)

**Goal:** Make the app genuinely useful between quarterly consultations. Add the proactive layer that a dietitian cannot provide.

### 3.1 Pre-Meal Advisory Mode (New Feature — High Impact)

**What it does:** Patient uploads a photo of food they are about to eat (or types a dish name) and gets guidance before the first bite — not after.

**Why it beats a dietitian:** A dietitian advises once every 3 months. This advises at the moment of decision, every single meal.

**Implementation:**
- Add a "Before I Eat" mode toggle in the patient UI alongside the existing "I just ate" flow
- Route to the same Agent 1 → 2 → 3 pipeline but change Agent 3's prompt to produce forward-looking guidance
- Agent 3 new tool: `generate_premeal_guidance(meal_items, patient_profile)` — returns portion reduction suggestions, safer swap alternatives, and a projected GL estimate
- UI: Show projected traffic light (dashed/outlined, not filled) with label "Projected if eaten as-is" before patient confirms the log

**Agent 3 prompt modification:**
```
Current framing: "You just ate X. Here is how it compares to your targets."
New pre-meal framing: "You are about to eat X. Here is what will happen to your GL
if you eat the full portion. Here is how to modify it right now."
```

**New swap suggestion quality standard:**
- Swap suggestions must reference locally available alternatives only
- Banned from output: quinoa, kale, Greek yogurt, avocado toast
- Required alternatives: brown rice (nasi perang), cauliflower rice, ulam, teh o kosong, kuih kukus, roti wholemeal

---

### 3.2 Streak and Relapse Tracking

**What it does:** Tracks consecutive "green days" (all meals below targets) and flags relapses with non-judgmental framing.

**Why it beats a dietitian:** Behavioral accountability is the core of what a dietitian does in a session. GlucoLens does this every single day.

**Implementation:**
- New Firestore field: `patient_streak: { current_green_days, longest_streak, last_relapse_date, relapse_count_this_month }`
- Agent 7 adds `calculate_streak_status(patient_id)` tool call
- Patient dashboard: streak counter displayed prominently ("🔥 6 green days in a row")
- On relapse day: non-judgmental message — "Today was a tough day nutritionally. Here's one small change for tomorrow."
- On milestone (7, 14, 30 days): celebratory card in dashboard feed

---

### 3.3 Push Notifications via Firebase Cloud Messaging

**What it does:** Sends alerts to the patient's phone when they exceed thresholds, not just in the dashboard.

**Why it matters:** A dashboard-only alert is useless if the patient isn't actively on the app. Real-time push ensures intervention happens at the right moment.

**Implementation:**
- Enable Firebase Cloud Messaging (FCM) — already within Firebase ecosystem, zero new infrastructure needed
- Agent 5 adds `send_fcm_push(patient_id, alert_payload)` replacing the Telegram stub
- Push types:
  - Threshold breach: "⚠️ Your GL exceeded target by 87% at lunch."
  - Streak milestone: "🔥 7 green days in a row — keep it up, Rahman!"
  - Dietitian message: "Puan Aisyah has reviewed your weekly report."
- Patient consent toggle in settings (push opt-in)

---

### 3.4 Upgrade Agent 8 — Proactive Misinformation Flagging

**Current behavior:** Reactive only — patient must actively type a query.

**Improved behavior:** When Agent 1 identifies a food item that commonly has dangerous misinformation attached to it, Agent 8 fires automatically to surface a pre-emptive fact card.

**Implementation:**
- Create `misinfo_trigger_foods.json` — a curated list of foods with known T2D misinformation attached (bitter gourd, cinnamon, apple cider vinegar, buah sukun, tapai, etc.)
- Agent 1 output checks identified foods against this list
- If match found, Agent 8 fires automatically with `proactive=True` flag
- UI: Amber info card below traffic light: "We noticed you ate bitter gourd. There is common misinformation about this food and T2D medication — tap to see the facts."
- Logged to Aisyah's misinfo feed identically to a manual query

---

### 3.5 BM Language Toggle (Bahasa Malaysia)

**Why it matters:** Malaysia's T2D burden is highest among lower-income, lower-literacy demographics. An English-only app excludes the patients who need it most.

**Implementation:**
- Agent 7 already has `localize_strings` hook in PRD — build it out fully
- All Agent 3 recommendation text, Agent 8 verdict cards, and Agent 5 alert text generated in BM when toggle is active
- Add language instruction to all agent system prompts: `If patient_language == "bm": respond in Bahasa Malaysia using simple, clear language appropriate for a general audience`
- Create `bm_medical_glossary.json` — GPT-4o uses this as reference to ensure accurate BM medical terminology rather than free translation
- UI: Language toggle button in patient dashboard header (EN / BM)

---

## 4. Phase 2 — Core Differentiator Build (Month 1–3)

**Goal:** Build the longitudinal memory and behavioral intelligence layer that makes GlucoLens fundamentally impossible to replicate with quarterly clinic visits.

### 4.1 Build Agent 4 — Glucose Correlation Engine (FULL BUILD)

This is the most clinically significant feature in the entire product. It produces something no human dietitian can generate without weeks of manual analysis.

**What it produces:** A patient-specific glucose response fingerprint — which foods cause this specific patient to spike more than the average T2D patient.

**Why it wins:** GI tables are population averages. Rahman's personal response to nasi lemak may be 23% worse than average. A dietitian using a standard GI table will never know this. Agent 4 will.

**Full tool chain:**

```python
fetch_glucose_log(patient_id, days=90)
# Pulls all glucose readings with timestamps from Firestore

correlate_meal_glucose(meal_log, glucose_log, window_hours=2)
# For each meal, finds the peak glucose reading within 2 hours post-meal
# Returns: { meal_id, food_items, pre_meal_glucose, peak_post_meal_glucose, delta }

calculate_personal_gi_response(patient_id, food_item)
# Computes patient's average glucose delta for a specific food
# Returns: { food, avg_delta, sample_count, confidence }

compare_to_population_average(patient_id, food_item)
# Compares patient's personal response to anonymized population data
# Returns: { food, patient_delta, population_avg_delta, variance_pct }

detect_trigger_foods(patient_id, threshold_variance_pct=15)
# Returns ranked list of foods where patient responds significantly worse than population average

generate_personal_foodprint_card(patient_id)
# Plain-language output: "Your top 3 glucose triggers this month:
# nasi lemak (+23%), roti canai (+18%), teh tarik (+31%)"
```

**Data requirements:**
- Minimum 14 days of paired meal + glucose logs before Agent 4 produces reliable output
- Under 14 days: show "Building your glucose profile — keep logging meals and readings"
- Glucose entry UI: quick-entry widget in patient dashboard (pre-meal / 2hr-post-meal labels)

**Dashboard additions:**
- Patient view: "Your Glucose Fingerprint" section — ranked food list with personal vs population response bars (Recharts horizontal bar chart)
- Dietitian view: fingerprint card added to patient drilldown so Aisyah knows which specific foods are Rahman's worst triggers before every appointment

---

### 4.2 New Agent 10 — Behavioral Pattern Engine

**What it does:** Identifies when, where, and under what circumstances a patient consistently eats badly — not just what they eat.

**Why it wins:** A dietitian asks "how has your diet been?" once a quarter. This engine watches every meal for 90 days and surfaces the actual behavioral patterns with data.

**Full tool chain:**

```python
tag_meal_context(meal_id, timestamp, location_label=None, mood_label=None)
# Stores contextual metadata with each meal log
# Location labels: home, mamak, office, kenduri/event, restaurant
# Mood labels (optional, patient-reported): normal, stressed, celebrating, tired

analyze_temporal_patterns(patient_id, days=30)
# Finds: "Patient consistently exceeds GL on Friday evenings and Sunday mornings"
# Returns: { high_risk_timewindows: [{ day_of_week, time_of_day, avg_risk_score }] }

analyze_location_patterns(patient_id, days=30)
# Returns: { high_risk_locations: [{ location, avg_gl, avg_risk_score, meal_count }] }

detect_relapse_triggers(patient_id)
# Correlates relapse days with contextual tags
# "3 of your last 4 relapses happened on Fridays — likely social eating context"

generate_behavioral_insight(patient_id)
# Example output: "You're 3x more likely to exceed your GL target on Friday evenings.
# Tip: Check the menu before you go and pre-decide your order."
```

**UI additions:**
- Patient dashboard: "Your Patterns" section — behavioral insight cards updated weekly
- Meal log form: optional 2-tap context tags (location + mood — no typing required)
- Dietitian view: behavioral summary in patient drilldown ("High-risk windows: Fri 7–9pm, Sun 10am–12pm")

---

### 4.3 Longitudinal Weekly and Monthly Narrative Summaries

**What it does:** Auto-generates weekly and monthly narrative summaries of the patient's dietary trajectory — not raw data, but clinical-grade plain-language interpretation.

**Why it wins:** A dietitian writes a brief at each visit. GlucoLens does this every week automatically.

**Implementation:**
- Agent 7 adds `generate_weekly_narrative(patient_id)` and `generate_monthly_narrative(patient_id)`
- GPT-4o produces a 3–4 sentence plain-language summary covering: best meal of the week, worst meal, trend direction, one specific actionable recommendation
- Example output: "This week you had 5 green days — your best week in 6 weeks. Your Friday dinner at the mamak was your highest GL meal (score: 82). Your overall GL trend is improving by 11% week-on-week. For next week: try ordering roti wholemeal instead of roti canai at breakfast."
- Delivered as: in-app weekly card (Monday morning), included in Agent 6 PDF brief, optional push notification summary

---

### 4.4 Upgrade Agent 6 — Clinical-Grade Dietitian Brief

**Current state:** Basic PDF with meal log and alerts.

**Target state:** A brief that Puan Aisyah can walk into an appointment with and immediately begin coaching — zero time wasted on re-establishing context.

**New PDF sections:**

```
Section 1: Patient Risk Summary (1 page)
- HbA1c trajectory estimate based on recent GL averages
- Weekly risk score trend (4-week sparkline)
- Current streak status
- Top 3 alerts this month

Section 2: Meal Analysis
- Worst meal of the month (full breakdown)
- Best meal of the month (positive reinforcement example)
- Nutrient compliance rate: "Rahman met his carb target in 61% of meals this month"

Section 3: Glucose Fingerprint (from Agent 4)
- Personal trigger food ranking
- Week-on-week glucose response trend

Section 4: Behavioral Patterns (from Agent 10)
- High-risk time windows
- Location pattern summary

Section 5: Misinformation Log
- All queries this month with verdicts
- Flag: queries marked "discussed" by dietitian vs outstanding

Section 6: Recommended Focus Areas for Appointment
- GPT-4o generated top 3 topics Aisyah should raise based on this month's data
- Example: "1. Friday evening eating pattern. 2. Bitter gourd supplement claim (unresolved). 3. GL improvement — positive reinforcement opportunity."
```

---

## 5. Phase 3 — Predictive and Clinical Grade (Month 3–6)

**Goal:** Move from reactive and longitudinal to predictive. GlucoLens starts warning patients about what is about to go wrong before it happens.

### 5.1 New Agent 12 — Predictive Risk Engine

**What it does:** Based on behavioral patterns from Agent 10, fires a proactive message before a historically high-risk window begins.

**Implementation:**
- `predict_next_high_risk_window(patient_id)` — checks if current or upcoming time window matches high-risk pattern
- Fires FCM push at start of the high-risk window: "Good evening, Rahman — Friday evenings are historically your toughest nutrition window. Tonight's tip: order half portion of rice and add extra ulam."
- Only fires if historical data shows 60%+ of that time window had threshold breaches (avoids false alarms)

---

### 5.2 New Agent 11 — Adaptive Target Engine

**Current state:** Rahman's dietary targets are static — set once at profile creation (carbs ≤ 45g, GL ≤ 15, sodium ≤ 600mg).

**Target state:** Targets tighten automatically as the patient's compliance improves, and loosen temporarily when the patient is consistently struggling to prevent burnout.

**Full tool chain:**

```python
evaluate_compliance_trend(patient_id, weeks=4)
# Returns: { carbs_compliance_pct, gl_compliance_pct, trend: "improving"|"declining"|"stable" }

propose_target_adjustment(patient_id, nutrient, direction)
# direction: "tighten" | "loosen"
# Returns: { current_target, proposed_target, rationale, requires_dietitian_approval: bool }

apply_target_adjustment(patient_id, nutrient, new_target, approved_by)
# Updates Firestore patient profile + logs change history

notify_patient_of_adjustment(patient_id, adjustment)
# Push + in-app: "Great progress! Your carb target has been updated from 45g to 40g —
# you've been consistently hitting the lower range."
```

**Governance rules:**
- Any target tightening over 15% requires explicit Dietitian approval via a pending-action queue in Aisyah's dashboard before going live
- Loosening can happen automatically when compliance drops below 40% for 2 consecutive weeks — to prevent the patient giving up entirely

---

### 5.3 New Agent 13 — HbA1c Trajectory Estimator

**What it does:** Estimates what the patient's next HbA1c reading is likely to be, based on their meal GL logs and glucose readings over the past 90 days.

**Why it matters:** HbA1c reflects average blood glucose over 3 months. A patient with 90 days of logged meals and post-meal glucose readings has enough data to produce a credible estimate — something a dietitian cannot produce mid-quarter.

**Implementation:**
- Research basis: HbA1c ≈ (average plasma glucose + 46.7) / 28.7 (Nathan formula)
- GlucoLens approximates average plasma glucose from post-meal glucose readings and fasting estimates from pre-meal readings
- `estimate_hba1c_trajectory(patient_id, days=90)`
- Display: "Based on your last 90 days, your estimated HbA1c range is 7.4–7.9%. Your previous reading was 8.1% — this is an improvement."
- Hard-coded disclaimer always shown: "This is an estimate only. Get a lab test for your actual HbA1c."

---

### 5.4 CGM and Wearable Integration (Architecture — Implement as Partnerships Allow)

**Target integrations:**
- Dexcom CGM API — continuous glucose readings (eliminates manual entry)
- Apple Health / Google Fit — activity data, sleep, heart rate
- FreeStyle Libre NFC scan — most common CGM in Malaysia

**Why it matters:** Manual glucose entry has ~30% dropout rates after week 2. CGM integration makes Agent 4's glucose correlation work without any patient effort.

**Architecture approach:**
- Abstract glucose data source behind a `GlucoseProvider` interface in `firebase_tools.py`
- Current: `ManualEntryProvider` — patient types in numbers
- Future: `DexcomProvider`, `LibreProvider`, `AppleHealthProvider`
- Agent 4 already consumes from `fetch_glucose_log` — no agent changes required, only the data provider changes

---

## 6. Phase 4 — B2B Scale and Population Intelligence (Month 6–12)

**Goal:** Build the structural moat that no competitor can replicate — a network effect where every new patient makes the system smarter for all patients.

### 6.1 Clinic Licensing Portal

**What it is:** A B2B admin layer allowing a clinic or hospital to onboard their full dietitian-patient roster into GlucoLens.

**Features:**
- Clinic admin dashboard: manage all dietitians, all patients, billing
- Dietitian onboarding: self-service patient roster import from existing clinic systems
- Bulk PDF report generation: weekly briefs for entire caseload in one click
- Clinic-level analytics: population GL trends, most common misinfo queries, highest-risk food items

**Revenue model:** SaaS licensing per clinic per month, tiered by caseload size

---

### 6.2 Population Intelligence Layer

**What it is:** Anonymized, aggregated analysis across the full GlucoLens patient population to improve recommendations for every individual.

**Features:**
- `compare_to_population_average` (already in Agent 4 architecture) becomes powered by real data instead of mock data
- Regional food risk patterns: "Nasi lemak GL risk is 18% higher among KL patients vs East Malaysia patients due to portion size differences"
- Feed aggregate findings back to MyDietCam IP team (Prof Moy, UTP) for model improvement
- Publish anonymized findings to MOH as clinical evidence — pathway to KOSPEN integration

---

### 6.3 NCD Expansion Beyond T2D

**Current state:** Agent 3 is profile-driven — patient targets are the only thing that makes it T2D-specific.

**Expansion path (2 weeks per condition once Phase 2 is complete):**
- Hypertension: sodium + DASH diet targets
- Chronic Kidney Disease (CKD): phosphorus, potassium, protein restriction targets
- Obesity management: caloric deficit tracking + satiety scoring
- Each condition adds a new `clinical_profile_type` flag in Firestore — Agent 3 loads the correct target set and guideline lookup automatically

---

## 7. New Agent Register (Additions to Current 9-Agent Architecture)

| Agent ID | Name | Phase | Primary Job |
|---|---|---|---|
| Agent 10 | Behavioral Pattern Engine | Phase 2 | Identifies temporal, location, and contextual eating patterns |
| Agent 11 | Adaptive Target Engine | Phase 3 | Adjusts patient dietary targets based on compliance trend |
| Agent 12 | Predictive Risk Engine | Phase 3 | Fires proactive alerts before high-risk windows based on history |
| Agent 13 | HbA1c Trajectory Estimator | Phase 3 | Estimates next HbA1c from 90-day glucose + meal log data |
| Agent 14 | Population Benchmarking Engine | Phase 4 | Powers anonymized population comparisons across full patient base |

---

## 8. Technical Debt and Architecture Upgrades Required

### 8.1 Firestore Schema Extensions

```
patients/{patient_id}/
  ├── profile (existing)
  ├── targets/ (NEW — versioned with history)
  │     └── {version_id}/: { nutrient, value, effective_date, set_by, approved_by }
  ├── streak/ (NEW)
  │     └── { current_green_days, longest_streak, last_relapse_date, relapse_count_month }
  ├── behavioral_context/ (NEW — Agent 10)
  │     └── {meal_id}/: { location_label, mood_label, day_of_week, hour_of_day }
  ├── glucose_fingerprint/ (NEW — Agent 4 output cache)
  │     └── {food_slug}/: { avg_delta, sample_count, population_avg_delta, variance_pct, last_updated }
  └── hba1c_estimates/ (NEW — Phase 3)
        └── {estimate_id}/: { estimated_range_low, estimated_range_high, basis_days, generated_at }
```

### 8.2 LangGraph State Extensions

```python
class GlucoLensState(TypedDict):
    # Existing fields
    patient_id: str
    meal_items: list
    nutrition_totals: dict
    clinical_result: dict
    alerts: list

    # Phase 1 additions
    pre_meal_mode: bool                  # True = pre-meal guidance, False = post-meal log
    streak_status: dict

    # Phase 2 additions
    behavioral_context: dict             # Location, mood, temporal tags
    glucose_fingerprint: dict            # Agent 4 personal response data
    behavioral_insights: list            # Agent 10 output

    # Phase 3 additions
    target_adjustment_proposals: list    # Agent 11 proposals pending dietitian approval
    predictive_alerts: list              # Agent 12 proactive risk warnings
    hba1c_estimate: dict                 # Agent 13 output
```

### 8.3 New API Endpoints

```
POST /api/v1/meal/pre-scan                   # Pre-meal mode trigger (Phase 1)
GET  /api/v1/patient/{id}/streak             # Streak status (Phase 1)
GET  /api/v1/patient/{id}/fingerprint        # Glucose fingerprint (Phase 2)
GET  /api/v1/patient/{id}/patterns           # Behavioral patterns (Phase 2)
POST /api/v1/glucose/entry                   # Manual glucose log entry (Phase 2)
GET  /api/v1/patient/{id}/hba1c-estimate     # HbA1c trajectory (Phase 3)
PUT  /api/v1/patient/{id}/targets            # Target update — requires dietitian approval token (Phase 3)
```

---

## 9. The "Better Than a Dietitian" Milestone Checklist

### Milestone 1 — "As Good As" (Phase 0 + 1 complete)
- [ ] Personalized meal feedback aligned to patient's clinical profile
- [ ] Drug-food interaction surveillance on every meal
- [ ] 24/7 misinformation defense, reactive
- [ ] Proactive pre-meal guidance before eating
- [ ] Push alerts to patient's phone in real time
- [ ] Swap suggestions are locally grounded (Malaysian food only)
- [ ] BM language support

### Milestone 2 — "Better For Daily Management" (Phase 2 complete)
- [ ] Behavioral pattern detection — knows when and why bad eating happens
- [ ] Agent 4 fully built — patient-specific glucose response fingerprint per food
- [ ] Weekly and monthly trajectory narratives
- [ ] Clinical-grade dietitian brief with recommended appointment agenda
- [ ] Proactive misinfo flagging on known-risk foods
- [ ] Streak and relapse accountability tracking

### Milestone 3 — "Clinically Irreplaceable" (Phase 3 complete)
- [ ] Predictive risk alerts before high-risk windows
- [ ] Adaptive targets that evolve with patient progress
- [ ] HbA1c trajectory estimation from 90-day data
- [ ] CGM integration for automatic glucose capture

### Milestone 4 — "Structural Moat" (Phase 4 complete)
- [ ] Clinic licensing portal with multi-dietitian support
- [ ] Population benchmarking powered by real patient data
- [ ] NCD expansion: hypertension + CKD profiles

---

## 10. Risk Register for Implementation

| Risk | Likelihood | Phase | Mitigation |
|---|---|---|---|
| Agent 4 glucose correlation requires months of paired data — users see no value immediately | High | Phase 2 | Show "Building your fingerprint" progress state from Day 1; set expectation that fingerprint is ready after 14 days of logging |
| Adaptive targets adjusted incorrectly could harm patient | Medium | Phase 3 | All tightening over 15% requires dietitian approval; thresholds are conservative by default |
| HbA1c estimate is misinterpreted as a clinical test result | High | Phase 3 | Hard-coded disclaimer on every estimate display; shown as a range, never a single number |
| Behavioral context tags add friction — users skip them | Medium | Phase 2 | Tags are optional, 2-tap only (no typing), pre-populated with common options |
| BM translation quality inconsistent for medical terminology | Medium | Phase 1 | Create `bm_medical_glossary.json` — GPT-4o uses this as reference, not free translation |
| CGM API access requires regulatory approval in Malaysia | High | Phase 3 | Begin MDA medical device registration groundwork in parallel with Phase 2 build |
| Population benchmarking raises patient data privacy concerns | High | Phase 4 | All population data is anonymized and aggregated; PDPA Malaysia compliance review required before Phase 4 launch |

---

*GlucoLens — Implementation & Improvement Plan v1.0*
*Built on MyDietCam IP (Prof Moy, UTP) · Powered by LangGraph + GPT-4o + Firebase · National Deep Tech Challenge 2026*
