# Feature Implementation Specification

> **Project context:** A diabetic meal-tracking mobile app inspired by GlucoLens.  
> **Target user:** Type 2 diabetic patients managing diet alongside medications (e.g. metformin, glipizide).  
> **Purpose of this document:** Provide a complete, copy-pasteable implementation spec for an AI coding assistant to build these 3 features end-to-end.

---

## Feature 1 — Food Image Input & Portion Validation

### 1.1 Overview

When the user uploads a photo of their meal, the system identifies the dish, estimates the portion size, and asks the user to confirm or adjust before proceeding with any nutritional analysis.

### 1.2 User Flow

```
User taps "Log Meal" → Camera / Gallery picker opens
  → User captures or selects a food image
  → Image is sent to the vision AI endpoint
  → System returns:
      - Identified dish name (e.g. "Nasi Lemak")
      - Confidence score (0.0 – 1.0)
      - Estimated portion size in grams
      - Portion category (Small / Medium / Large)
  → Confirmation screen is shown to the user
  → User either confirms or adjusts
  → Confirmed data is locked and passed to Feature 2 and Feature 3
```

### 1.3 Confirmation Screen UI

The confirmation screen must include the following elements:

- **Dish name** displayed prominently, with an "Edit" button to rename manually
- **Confidence indicator** — show a subtle badge:
  - `≥ 0.85` → green badge, "High confidence"
  - `0.60 – 0.84` → amber badge, "Please verify"
  - `< 0.60` → red badge, "We're not sure — please name your dish"
- **Portion size selector** — a segmented control or slider:
  - Quick-pick buttons: `Small`, `Medium`, `Large`
  - Fine-tune slider: range from 50g to 1000g, step 10g
  - The AI-estimated value is pre-selected
- **Image thumbnail** displayed so the user can visually cross-check
- **"Confirm" button** — locks the dish name + portion and triggers nutrient lookup
- **"Retake Photo" link** — returns to the camera

### 1.4 AI Vision Endpoint

**Request payload:**

```json
{
  "image": "<base64_encoded_image>",
  "user_context": {
    "region": "Southeast Asia",
    "recent_meals": ["Roti Canai", "Teh Tarik", "Nasi Lemak"],
    "dietary_conditions": ["type_2_diabetes"]
  }
}
```

**System prompt for the vision model:**

```
You are a food identification assistant for a diabetic meal-tracking app used 
primarily in Southeast Asia.

Given a photo of a meal:
1. Identify the dish name. Use the local name (e.g. "Char Kuey Teow", not 
   "stir-fried flat noodles"). If multiple dishes are visible, list each separately.
2. Estimate the portion size in grams based on visual cues (plate size, depth 
   of food, utensil scale).
3. Categorise the portion as Small, Medium, or Large relative to a standard 
   adult serving for that dish.
4. Provide a confidence score from 0.0 to 1.0 for the identification.

Respond in JSON only. No preamble, no markdown backticks.

JSON schema:
{
  "dishes": [
    {
      "name": "string",
      "confidence": 0.0,
      "portion_grams": 0,
      "portion_category": "Small | Medium | Large"
    }
  ]
}
```

**Expected response:**

```json
{
  "dishes": [
    {
      "name": "Nasi Lemak",
      "confidence": 0.92,
      "portion_grams": 350,
      "portion_category": "Medium"
    }
  ]
}
```

### 1.5 Low-Confidence Fallback Logic

```
IF confidence < 0.60:
  → Hide the estimated dish name
  → Show a search/autocomplete input: "What did you eat?"
  → Provide suggested matches from the food database based on partial AI guess
  → User must manually select or type the dish name before proceeding

IF confidence >= 0.60 AND < 0.85:
  → Show the estimated dish name BUT with amber "Please verify" badge
  → Pre-fill the name but make the edit button prominent

IF confidence >= 0.85:
  → Show the estimated dish name with green "High confidence" badge
  → Edit button available but not emphasised
```

### 1.6 Multi-Dish Handling

If the vision model detects multiple dishes in one image (e.g. Nasi Lemak + Teh Tarik):

- Display each dish as a separate card on the confirmation screen
- Each card has its own portion selector and confidence badge
- User can remove a card if it was misidentified (e.g. a napkin detected as food)
- All confirmed dishes are logged as a single "meal" with a shared timestamp

### 1.7 Food Database Requirements

Maintain a local food database with the following schema per item:

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Unique identifier |
| `name` | string | Local dish name |
| `aliases` | string[] | Alternative names and spellings |
| `region` | string | Regional cuisine tag |
| `nutrients_per_100g` | object | See Feature 2 for full nutrient fields |
| `default_portion_g` | number | Standard serving size in grams |
| `glycemic_index` | number | GI value (0–100) |
| `glycemic_load_per_serving` | number | GL for default portion |
| `common_allergens` | string[] | e.g. ["peanut", "shrimp"] |
| `known_drug_interactions` | string[] | e.g. ["glipizide", "warfarin"] |

**Priority foods to include in the initial database:** Nasi Lemak, Char Kuey Teow, Roti Canai, Teh Tarik, Mee Goreng, Nasi Goreng, Laksa, Satay, Rendang, Rojak, Cendol, Kuih, Tosai/Thosai, Murtabak, Nasi Kandar, and other common Southeast Asian dishes.

### 1.8 Data Output (passed to Feature 2 and 3)

After confirmation, emit a `MealEntry` object:

```typescript
interface MealEntry {
  id: string;
  timestamp: string;           // ISO 8601
  image_url: string;           // stored image reference
  dishes: ConfirmedDish[];
  total_portion_grams: number; // sum of all dishes
  source: "ai_estimated" | "user_corrected";
}

interface ConfirmedDish {
  food_id: string;             // FK to food database
  name: string;
  portion_grams: number;
  portion_category: "Small" | "Medium" | "Large";
  ai_confidence: number;
  was_manually_edited: boolean;
}
```

---

## Feature 2 — Detailed Nutrient Breakdown & Nutritionist Insight

### 2.1 Overview

After the meal is confirmed (Feature 1 output), compute and display a full nutrient breakdown scaled to the actual portion size. Below the breakdown, generate a short AI nutritionist insight contextualised to the patient's medical condition and medications.

### 2.2 Nutrient Calculation Logic

For each confirmed dish in the meal:

```
scaled_nutrient = (nutrient_per_100g / 100) × confirmed_portion_grams
```

Then sum across all dishes in the meal for the total meal nutrients.

### 2.3 Nutrient Fields to Display

Display these nutrients per meal in the following order:

| Nutrient | Unit | Display Priority | Target Comparison |
|---|---|---|---|
| Calories | kcal | Primary | Daily target |
| Carbohydrates | g | Primary | Per-meal target |
| Glycemic Load (GL) | — | Primary | Per-meal target |
| Sugar | g | Secondary | Daily target |
| Fibre | g | Secondary | Daily target (minimum) |
| Protein | g | Secondary | Daily target |
| Total Fat | g | Secondary | Daily target |
| Saturated Fat | g | Secondary | Daily target |
| Sodium | mg | Primary | Per-meal target |
| Potassium | mg | Tertiary | Daily target |
| Cholesterol | mg | Tertiary | Daily target |

### 2.4 Target Comparison & Visual Indicators

Each patient has personal daily targets stored in their profile:

```typescript
interface NutrientTargets {
  calories_daily: number;         // e.g. 1800 kcal
  carbs_per_meal_max: number;     // e.g. 45g
  gl_per_meal_max: number;        // e.g. 15
  sodium_per_meal_max: number;    // e.g. 600mg
  fibre_daily_min: number;        // e.g. 25g
  protein_daily: number;          // e.g. 60g
  fat_daily_max: number;          // e.g. 65g
  saturated_fat_daily_max: number;// e.g. 20g
  sugar_daily_max: number;        // e.g. 50g
}
```

**Colour coding for each nutrient bar:**

```
IF value <= 80% of target  → GREEN  (on track)
IF value > 80% AND <= 100% → AMBER  (approaching limit)
IF value > 100% of target  → RED    (breach)

Exception for fibre (minimum target):
IF value >= 100% of target → GREEN
IF value >= 50% AND < 100% → AMBER
IF value < 50%             → RED
```

### 2.5 Nutrient Breakdown UI Layout

```
┌─────────────────────────────────────────────────┐
│  Nasi Lemak · 350g · Medium                     │
│  Logged at 12:34 PM                             │
├─────────────────────────────────────────────────┤
│                                                 │
│  Calories         480 kcal    ████████░░  [80%] │
│  Carbohydrates     62g        █████████░  [RED] │
│  Glycemic Load     28         █████████░  [RED] │
│  Sodium           920mg       █████████░  [RED] │
│  Fibre              3g        ██░░░░░░░░  [RED] │
│  Protein           14g        █████░░░░░  [50%] │
│  Total Fat         22g        ███████░░░  [70%] │
│  Saturated Fat     12g        ████████░░  [80%] │
│  Sugar              8g        ████░░░░░░  [40%] │
│                                                 │
│  ── Breach Summary ──                           │
│  ⚠ Carbs: 62g exceeds 45g target (+38%)        │
│  ⚠ GL: 28 exceeds 15 target (+87%)             │
│  ⚠ Sodium: 920mg exceeds 600mg target (+53%)   │
│                                                 │
├─────────────────────────────────────────────────┤
│  💡 Nutritionist Insight                        │
│                                                 │
│  "Your Nasi Lemak is high in carbs and GL due   │
│  to the white rice base and coconut milk. Try    │
│  asking for less rice or swapping to brown rice.  │
│  The sambal adds 920mg sodium — consider half    │
│  the usual amount. Pair this meal with a fibre-  │
│  rich side like ulam or cucumber to slow glucose  │
│  absorption."                                    │
└─────────────────────────────────────────────────┘
```

### 2.6 AI Nutritionist Insight Generation

**When to generate:** After every meal log, automatically.

**Request payload to the LLM:**

```json
{
  "meal": {
    "dishes": [
      {
        "name": "Nasi Lemak",
        "portion_grams": 350,
        "nutrients": {
          "calories": 480,
          "carbs_g": 62,
          "gl": 28,
          "sodium_mg": 920,
          "fibre_g": 3,
          "protein_g": 14,
          "fat_g": 22,
          "saturated_fat_g": 12,
          "sugar_g": 8
        }
      }
    ],
    "breaches": ["carbs", "gl", "sodium"],
    "timestamp": "2026-05-15T12:34:00Z"
  },
  "patient_profile": {
    "age": 52,
    "conditions": ["type_2_diabetes"],
    "medications": ["metformin", "glipizide"],
    "targets": { ... },
    "recent_meals_today": [ ... ]
  }
}
```

**System prompt for the nutritionist insight model:**

```
You are a concise, friendly AI nutritionist for a diabetic patient.

Given the meal nutrient data, breach list, and patient profile:

1. Identify the top 1–2 issues with this meal relevant to their condition.
2. Explain WHY the specific ingredients cause the issue (not generic advice).
3. Suggest a practical swap or modification using locally available foods.
4. If the patient is on glipizide or metformin, mention any relevant 
   meal timing or interaction considerations.
5. If the meal had no breaches, reinforce the positive choice briefly.

Rules:
- Maximum 3 sentences.
- Use the dish's local name, not a translated name.
- Never say "consult your doctor" — this is a clinical support tool, 
  the doctor will see this data.
- Be specific: "reduce the rice portion by half" not "eat less carbs".
- If sodium is a breach, name the specific high-sodium component 
  (e.g. sambal, soy sauce, fish sauce).

Respond with plain text only. No JSON, no markdown.
```

### 2.7 Nutrient Data Model

```typescript
interface MealNutrients {
  meal_id: string;
  timestamp: string;
  dishes: DishNutrients[];
  total: NutrientValues;
  breaches: Breach[];
  ai_insight: string;
}

interface DishNutrients {
  food_id: string;
  name: string;
  portion_grams: number;
  nutrients: NutrientValues;
}

interface NutrientValues {
  calories: number;
  carbs_g: number;
  glycemic_load: number;
  sugar_g: number;
  fibre_g: number;
  protein_g: number;
  fat_g: number;
  saturated_fat_g: number;
  sodium_mg: number;
  potassium_mg: number;
  cholesterol_mg: number;
}

interface Breach {
  nutrient: string;
  value: number;
  target: number;
  percent_over: number;
  severity: "warning" | "breach";  // warning = 80-100%, breach = >100%
}
```

### 2.8 Edge Cases

- **Unknown food not in database:** Use the AI model to estimate nutrients from the dish name and portion. Flag the nutrient values as "AI-estimated" with a disclaimer badge. Log these for manual review and database expansion.
- **Multiple dishes in one meal:** Show individual breakdowns per dish AND a combined total row at the top.
- **Zero breaches:** Show a congratulatory message in the insight area: "Great choice! This meal fits well within your targets."
- **All nutrients breached:** Prioritise the top 2 most relevant to diabetes (carbs/GL first, then sodium) in the insight. Don't list every single breach.

---

## Feature 3 — Calorie Breakdown & Weekly Insights

### 3.1 Overview

Aggregate calorie data from all logged meals into daily totals and weekly summaries. Display three key stats (average, highest, lowest), a daily trend chart, and an AI-generated weekly insight explaining the patterns.

### 3.2 Daily Calorie Aggregation

For each day, sum the total calories from all meals logged that day:

```typescript
interface DailyCalorieSummary {
  date: string;                    // YYYY-MM-DD
  total_calories: number;
  meal_count: number;
  meals: {
    meal_id: string;
    timestamp: string;
    dish_names: string[];          // e.g. ["Nasi Lemak", "Teh Tarik"]
    calories: number;
  }[];
  target: number;                  // patient's daily calorie target
  adherence_percent: number;       // (target - abs(total - target)) / target * 100, clamped 0-100
  is_within_target: boolean;       // total <= target
}
```

### 3.3 Weekly Summary Stats

Compute the following from the 7 `DailyCalorieSummary` entries:

```typescript
interface WeeklyCalorieSummary {
  week_start: string;              // YYYY-MM-DD (Monday)
  week_end: string;                // YYYY-MM-DD (Sunday)

  // Key stats
  average_daily_calories: number;  // mean of 7 days (or fewer if not all logged)
  highest_day: {
    date: string;
    day_name: string;              // e.g. "Friday"
    total_calories: number;
    top_meal: string;              // dish name that contributed most calories
    top_meal_calories: number;
  };
  lowest_day: {
    date: string;
    day_name: string;
    total_calories: number;
  };

  // Adherence
  calorie_target_adherence: number;  // % of days within target
  days_over_target: number;
  days_under_target: number;
  days_on_target: number;

  // Trend data for chart
  daily_data: {
    day: string;                   // "Mon", "Tue", etc.
    calories: number;
    target: number;
  }[];

  // AI insight
  weekly_insight: string;
}
```

### 3.4 Weekly Calorie Dashboard UI Layout

```
┌─────────────────────────────────────────────────┐
│  Weekly Calorie Summary                         │
│  08 May – 15 May 2026                           │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ AVERAGE  │ │ HIGHEST  │ │ LOWEST   │        │
│  │ 1,847    │ │ 2,610    │ │ 1,240    │        │
│  │ kcal/day │ │ Friday   │ │ Thursday │        │
│  │          │ │ Char     │ │          │        │
│  │          │ │ Kuey Teow│ │          │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│                                                 │
│  Calorie target adherence: 57%                  │
│  ████████████████░░░░░░░░░░░░                   │
│  4 of 7 days within 1,800 kcal target           │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Daily Calorie Trend                            │
│                                                 │
│  2600 │              ●                          │
│  2400 │                                         │
│  2200 │                                         │
│  2000 │    ●                                    │
│  1800 │----●-----------●----●--------  target   │
│  1600 │         ●                               │
│  1400 │                          ●              │
│  1200 │                   ●                     │
│  1000 │                                         │
│       └──Mon─Tue─Wed─Thu─Fri─Sat─Sun──          │
│                                                 │
│  ● Over target  ● On/under target               │
│                                                 │
├─────────────────────────────────────────────────┤
│  📊 Weekly Insight                              │
│                                                 │
│  "Your average intake was close to target at    │
│  1,847 kcal, but Friday spiked to 2,610 kcal   │
│  — driven by two servings of Char Kuey Teow     │
│  (980 kcal each). Thursday was your best day    │
│  at 1,240 kcal. Try limiting hawker meals to    │
│  once on weekends and your weekly average       │
│  should drop below 1,800."                      │
└─────────────────────────────────────────────────┘
```

### 3.5 Trend Chart Specifications

- **Chart type:** Line chart with data points
- **X-axis:** Days of the week (Mon–Sun)
- **Y-axis:** Calories (kcal), auto-scaled with 200 kcal increments
- **Target line:** Horizontal dashed line at the patient's daily calorie target
- **Data points:** Filled circles, colour-coded:
  - Red/coral for days over target
  - Green/teal for days on or under target
- **Tap interaction:** Tapping a data point shows a tooltip with:
  - Date
  - Total calories
  - Number of meals
  - Name of the highest-calorie meal that day

### 3.6 Calorie Adherence Score Calculation

```
adherence_percent = (days_within_target / total_days_logged) × 100
```

A day is "within target" if `total_calories <= daily_calorie_target`.

Display this as a percentage with a progress bar, mirroring the format used in the GlucoLens report for carb and GL adherence (e.g. "Calorie target adherence: 57%").

### 3.7 AI Weekly Insight Generation

**When to generate:** Automatically at the end of each week (Sunday night) and on-demand when the user opens the weekly summary.

**Request payload to the LLM:**

```json
{
  "weekly_summary": {
    "average_daily_calories": 1847,
    "highest_day": {
      "day": "Friday",
      "calories": 2610,
      "top_meal": "Char Kuey Teow",
      "top_meal_calories": 980
    },
    "lowest_day": {
      "day": "Thursday",
      "calories": 1240
    },
    "daily_data": [
      { "day": "Mon", "calories": 1920 },
      { "day": "Tue", "calories": 2050 },
      { "day": "Wed", "calories": 1680 },
      { "day": "Thu", "calories": 1240 },
      { "day": "Fri", "calories": 2610 },
      { "day": "Sat", "calories": 1850 },
      { "day": "Sun", "calories": 1580 }
    ],
    "target": 1800,
    "adherence_percent": 57,
    "days_over": 3,
    "total_meals_logged": 52
  },
  "patient_profile": {
    "age": 52,
    "conditions": ["type_2_diabetes"],
    "medications": ["metformin", "glipizide"]
  },
  "previous_week_average": 1920
}
```

**System prompt for the weekly insight model:**

```
You are a concise, encouraging AI nutritionist reviewing a diabetic patient's 
weekly calorie data.

Given the weekly summary and patient profile:

1. State the average daily intake and whether it's above or below target.
2. Name the highest day, the specific meal that caused the spike, and its 
   calorie count.
3. Name the best (lowest) day as positive reinforcement.
4. Give ONE specific, actionable suggestion to improve next week.
5. If the previous week's average is provided, mention the trend (improving 
   or not).

Rules:
- Maximum 4 sentences.
- Use local dish names.
- Be encouraging, not punitive. Frame advice as achievable.
- Mention specific numbers (e.g. "980 kcal" not "a lot of calories").
- Never say "consult your doctor".

Respond with plain text only.
```

### 3.8 Per-Meal Calorie Drill-Down

When the user taps on a specific day in the chart or summary, show a breakdown of that day's meals:

```
┌─────────────────────────────────────────────────┐
│  Friday, 15 May 2026                            │
│  Total: 2,610 kcal  (target: 1,800)    +45%    │
├─────────────────────────────────────────────────┤
│  12:30 PM  Char Kuey Teow     980 kcal  ██████ │
│   1:00 PM  Teh Tarik          120 kcal  █      │
│   6:45 PM  Char Kuey Teow     980 kcal  ██████ │
│   7:00 PM  Nasi Lemak         480 kcal  ███    │
│   9:30 PM  Cendol              50 kcal  ░      │
└─────────────────────────────────────────────────┘
```

### 3.9 Data Persistence Schema

```sql
CREATE TABLE daily_calorie_summary (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id),
    date            DATE NOT NULL,
    total_calories  DECIMAL(7,1) NOT NULL,
    meal_count      INTEGER NOT NULL,
    target_calories DECIMAL(7,1) NOT NULL,
    is_within_target BOOLEAN NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

CREATE TABLE weekly_calorie_summary (
    id                      UUID PRIMARY KEY,
    user_id                 UUID NOT NULL REFERENCES users(id),
    week_start              DATE NOT NULL,
    week_end                DATE NOT NULL,
    avg_daily_calories      DECIMAL(7,1),
    highest_day_date        DATE,
    highest_day_calories    DECIMAL(7,1),
    highest_day_top_meal    VARCHAR(255),
    lowest_day_date         DATE,
    lowest_day_calories     DECIMAL(7,1),
    adherence_percent       DECIMAL(5,2),
    ai_weekly_insight       TEXT,
    created_at              TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, week_start)
);
```

---

## Cross-Feature Integration Notes

### Data Flow Between Features

```
Feature 1 (Image → Confirm)
    │
    ▼ emits MealEntry with confirmed dishes and portions
    │
    ├──→ Feature 2 (Nutrient Breakdown)
    │       │ computes per-meal nutrients
    │       │ generates AI insight
    │       │ stores MealNutrients
    │       │
    │       ▼ emits calorie value per meal
    │
    └──→ Feature 3 (Calorie Aggregation)
            │ sums daily totals
            │ computes weekly stats
            │ generates AI weekly insight
            │ stores DailyCalorieSummary + WeeklyCalorieSummary
```

### Shared Patient Profile Model

All three features reference the same patient profile:

```typescript
interface PatientProfile {
  id: string;
  age: number;
  conditions: string[];
  medications: string[];
  region: string;
  nutrient_targets: NutrientTargets;
  calorie_target_daily: number;
  carbs_per_meal_target: number;
  gl_per_meal_target: number;
  sodium_per_meal_target: number;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}
```

### Error Handling Requirements

| Scenario | Handling |
|---|---|
| Image upload fails | Retry up to 3 times, then offer manual text entry fallback |
| Vision model returns empty dishes array | Prompt user to name the dish manually |
| Food not found in database | Use AI to estimate nutrients, flag as "estimated" |
| AI insight generation fails | Show nutrient breakdown without insight, retry in background |
| Partial day data (missed meals) | Show data as-is with a note: "Only X of Y expected meals logged" |
| Network offline | Queue the meal log locally, sync when reconnected |

### API Rate Limiting Considerations

- Vision model calls: 1 per meal log (batch if multi-image)
- Nutritionist insight calls: 1 per meal log
- Weekly insight calls: 1 per week (or on-demand refresh, max 3 per day)
- Cache nutrient lookups for known food database items — only call AI for unknown foods

### Testing Checklist

- [ ] Upload a clear image of Nasi Lemak → correct identification and portion
- [ ] Upload a blurry image → low confidence, manual entry fallback triggers
- [ ] Upload an image with 2 dishes → both detected and shown as separate cards
- [ ] Confirm a 350g Nasi Lemak → nutrient bars show correct values, carbs/GL/sodium breach
- [ ] AI insight mentions specific ingredients (coconut milk, sambal) not generic advice
- [ ] Log 7 days of meals → weekly summary shows correct avg/high/low
- [ ] Highest day correctly names the meal that contributed most calories
- [ ] Calorie adherence % matches manual count of days within target
- [ ] Weekly AI insight mentions specific dish names and calorie numbers
- [ ] Tap a day on the trend chart → drill-down shows per-meal breakdown
- [ ] Unknown dish → AI-estimated nutrients with "estimated" badge
- [ ] All nutrients within target → congratulatory insight generated
