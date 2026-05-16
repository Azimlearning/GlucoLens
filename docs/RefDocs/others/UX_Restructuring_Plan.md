# UX Restructuring Plan — From 2 Pages to a Full App Flow

> **Context:** Your current GlucoLens app has only 2 pages — a login page and a single scrollable dashboard that packs everything (meal logging, glucose data, nutrition history, recent meals, health claims, appointment prep, weekly report, and profile) into one long scroll. This document restructures the app into a proper multi-screen architecture inspired by MyDietCam's flow, while keeping your clinical intelligence features.

---

## Problem Analysis — Current 2-Page App

### What's on your current single dashboard (Image 2–5):
Everything lives in one endless scroll, in this order:

1. Greeting + summary stats (avg glucose, meals, avg risk)
2. AI Insight banner
3. Analyse Meal (meal type selector + image upload)
4. Blood Glucose live chart + CGM stats
5. Glucose Response (vs Malaysian T2DM population)
6. Glucose Breakdown (avg, min, max, in-range, distribution)
7. 7-Day Nutrition History (calories + carbs bar charts)
8. Recent Meals carousel
9. Check Health Claim
10. Appointment Prep
11. Weekly Summary Report + PDF download
12. My Profile (HbA1c, body metrics, daily targets, medications)

### UX problems this causes:

- **Cognitive overload** — the user sees 12+ sections at once, most of which aren't relevant to their immediate intent
- **Buried primary action** — meal logging (the thing users do 3–5× daily) is section #3 in a long scroll, not the first thing they see
- **No clear information hierarchy** — glucose data, nutrition data, meal history, clinical tools, and profile are all at the same scroll depth
- **No progressive disclosure** — everything is shown regardless of whether the user just wants to log a quick meal or review their week
- **MyDietCam's key insight:** separate the food diary (daily view), nutrient summary, diet quality score, and history into distinct tabs so each screen has a single purpose

---

## Proposed Architecture — 5 Tabs

Restructure into a bottom-tab navigation with 5 screens:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              [ Screen Content Area ]                │
│                                                     │
├────────┬────────┬────────┬────────┬────────────────┤
│  Home  │  Log   │ Trends │ Tools  │   Profile      │
│   🏠   │   📷   │   📊   │   🔧   │     👤         │
└────────┴────────┴────────┴────────┴────────────────┘
```

---

## Tab 1 — Home (Daily Dashboard)

### Purpose
Quick glance at today's status. Answer the question: "How am I doing today?"

### Content (top to bottom)

**1. Greeting header**
```
Good morning, Rahman                              [avatar]
Wednesday, 14 May 2026
```

**2. Today's summary cards (horizontal scroll, 3 cards)**
```
┌──────────┐ ┌──────────┐ ┌──────────┐
│ GLUCOSE  │ │  MEALS   │ │  CALS    │
│   5.1    │ │   2/4    │ │  1,240   │
│  mmol/L  │ │  logged  │ │ / 1,800  │
│ ● LIVE   │ │          │ │   69%    │
└──────────┘ └──────────┘ └──────────┘
```

**3. AI Insight card (contextual, changes throughout the day)**
```
┌─────────────────────────────────────────────────┐
│ 💡 AI INSIGHT                                   │
│                                                 │
│ You've logged 2 meals so far. Your carbs are    │
│ within target but sodium is tracking high today  │
│ (780mg / 1500mg). Go easy on sauces at dinner.  │
└─────────────────────────────────────────────────┘
```

The insight should be dynamic and contextual:
- Morning (0 meals): "Good morning! Ready to log your breakfast?"
- After lunch (2 meals): Shows running nutrient summary
- Evening (3+ meals): Shows daily wrap-up with suggestion for tomorrow
- If glucose is spiking: Prioritise glucose warning over meal nudge

**4. Blood glucose mini-chart (last 4 hours only)**
```
┌─────────────────────────────────────────────────┐
│ Blood Glucose           ● LIVE    5.1 mmol/L    │
│ CGM · last 4 hours                              │
│                                                 │
│  [mini sparkline chart — no axes, just the line]│
│                                                 │
│  4-HR AVG: 5.5   PEAK: 7   MEALS: 1            │
│                                                 │
│                        Tap to see full chart →   │
└─────────────────────────────────────────────────┘
```

Tapping this card navigates to the **Trends** tab (Tab 3) with the glucose section expanded.

**5. Recent meals (last 3, compact list — not carousel)**
```
┌─────────────────────────────────────────────────┐
│ Today's Meals                     See all →      │
├─────────────────────────────────────────────────┤
│ 🟢 12:30  Nasi Kukus, Ayam Goreng    480 kcal  │
│ 🔴  8:15  Roti Canai + Teh Tarik     620 kcal  │
└─────────────────────────────────────────────────┘
```

Colour dot = risk level (green/amber/red). Tapping a meal opens its **Meal Detail** page (see below).

**6. Quick-log FAB (Floating Action Button)**

A prominent "+" button fixed at the bottom-right (above the tab bar) that jumps directly to the Log tab's camera. This is the single most important UX improvement — the primary action must be reachable in 1 tap from any screen.

### What was REMOVED from the old dashboard:
- Glucose Response chart → moved to Trends tab
- Glucose Breakdown → moved to Trends tab
- 7-Day Nutrition History → moved to Trends tab
- Check Health Claim → moved to Tools tab
- Appointment Prep → moved to Tools tab
- Weekly Summary Report → moved to Tools tab
- Profile → moved to Profile tab

---

## Tab 2 — Log Meal (Camera-First)

### Purpose
Log a meal as fast as possible. This is the screen users open 3–5× daily — speed is everything.

### Flow (inspired by MyDietCam's camera-first approach)

**Step 1: Meal type + camera (single screen)**
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  WHICH MEAL IS THIS?                            │
│  [Breakfast] [Lunch] [Dinner] [Snack]           │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │                                           │  │
│  │          📷                               │  │
│  │   Drop a photo or tap to upload           │  │
│  │   JPG, PNG, HEIC accepted                 │  │
│  │                                           │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ── or search manually ──                       │
│  🔍 [Search for a dish...]                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

Key UX improvements over current:
- Meal type defaults based on time of day (Breakfast before 10am, Lunch 10am–2pm, Dinner 2pm–8pm, Snack after 8pm) — user can override
- Manual search is available below the camera for when the user doesn't have a photo
- Camera area is large and tappable — takes up most of the screen

**Step 2: AI identification + portion confirmation (new screen, slides up)**
```
┌─────────────────────────────────────────────────┐
│  ← Back                              Edit dish  │
│                                                 │
│  [thumbnail of uploaded image]                  │
│                                                 │
│  Nasi Lemak                    ✅ High confidence│
│                                                 │
│  PORTION SIZE                                   │
│  [Small]  [●Medium]  [Large]                    │
│                                                 │
│  Fine-tune: ◄━━━━━━━●━━━━━━━━► 350g            │
│                                                 │
│  ── Quick Nutrient Preview ──                   │
│  Calories    480 kcal       ████████░░          │
│  Carbs        62g           █████████░  ⚠       │
│  GL           28            █████████░  ⚠       │
│  Sodium      920mg          █████████░  ⚠       │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │         Confirm & Log Meal              │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

Key improvements:
- Show a **quick nutrient preview** BEFORE confirming, so the user sees the impact immediately — this is a behaviour-change moment
- Breach warnings (⚠) are visible at the decision point, not after
- The user can back out and choose a different portion before committing

**Step 3: Meal logged — result screen (new screen, slides up)**
```
┌─────────────────────────────────────────────────┐
│                    ✓                            │
│             Meal Logged!                        │
│                                                 │
│  Nasi Lemak · 350g · Lunch                      │
│  Fri 15 May, 12:34 PM                          │
│                                                 │
│  RISK SCORE          65 / 100                   │
│  ████████████████████████░░░░░░  MEDIUM         │
│  Top breach: CARBS (+38% over target)           │
│                                                 │
│  ── AI Nutritionist ──                          │
│  "The white rice and coconut milk push your     │
│  carbs and GL above target. Try asking for less │
│  rice or swapping to brown rice next time. The  │
│  sambal adds 920mg sodium."                     │
│                                                 │
│  [See Full Breakdown]    [Back to Home]         │
│                                                 │
└─────────────────────────────────────────────────┘
```

"See Full Breakdown" opens the **Meal Detail** page (see section below).

---

## Tab 3 — Trends (Analytics)

### Purpose
Deep-dive into historical data. Answer: "How have I been doing this week / month?"

### Content — sectioned with collapsible headers

**Section 1: Glucose Trends (default expanded)**
```
┌─────────────────────────────────────────────────┐
│  Glucose Response                         📈    │
│  Your readings vs Malaysian T2DM population     │
│                                                 │
│  ▼ 8.0 mmol/L · -0% vs avg (8 mmol/L)          │
│                                                 │
│  [Full weekly glucose chart — same as current]  │
│                                                 │
│  Based on MOH CPG T2DM 2020 · Last 30 readings │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Glucose Breakdown                        📊    │
│  Summary · Last 30 readings                     │
│                                                 │
│  [Avg: 8.0] [Min: 5.2] [Max: 10.1] [InRange:40%]│
│                                                 │
│  DAILY AVERAGE (LAST 7 DAYS)                    │
│  [stacked bar chart — Normal / Pre-High / High] │
│                                                 │
│  READING DISTRIBUTION                           │
│  [donut chart]  Normal: 12 (40%)                │
│                 Pre-High: 12 (40%)              │
│                 High: 6 (20%)                   │
│                                                 │
│  Time in Range (7–10 mmol/L)        40%         │
│  ████████████████░░░░░░░░░░░░░░░░░░░░           │
│  Target: ≥70% — MOH CPG T2DM 2020              │
└─────────────────────────────────────────────────┘
```

**Section 2: Nutrition Trends (collapsible)**
```
┌─────────────────────────────────────────────────┐
│  7-Day Nutrition History                  📊    │
│  Daily calorie and carb intake vs your targets  │
│                                                 │
│  Calories  8907/1800kcal    Carbs  898/200g     │
│  ████████████████ 100%      ████████████ 100%   │
│                                                 │
│  CALORIES (KCAL)                                │
│  [daily bar chart Sun–Today]                    │
│                                                 │
│  CARBS (G)                                      │
│  [daily bar chart Sun–Today]                    │
│                                                 │
│  Targets: 1800 kcal · 200g carbs / day          │
└─────────────────────────────────────────────────┘
```

**Section 3: Weekly calorie summary cards (NEW — from Feature 3)**
```
┌──────────┐ ┌──────────┐ ┌──────────┐
│ AVERAGE  │ │ HIGHEST  │ │ LOWEST   │
│  1,847   │ │  2,610   │ │  1,240   │
│ kcal/day │ │  Friday  │ │ Thursday │
└──────────┘ └──────────┘ └──────────┘

Calorie target adherence: 57%
████████████████░░░░░░░░░░░░  4 of 7 days on target

📊 Weekly Insight
"Your average was close to target at 1,847 kcal, but Friday 
spiked to 2,610 — driven by two Char Kuey Teow servings. 
Thursday was your best day."
```

**Section 4: Meal history list (full, filterable)**
```
┌─────────────────────────────────────────────────┐
│  Meal History                    Filter ▼  1/20 │
├─────────────────────────────────────────────────┤
│ 🔴 Nasi Kukus, Ayam Goreng     High Risk       │
│    Sat 16 May · 826 kcal · 68g carbs           │
│                                                 │
│ 🟢 Grilled Fish, Ulam          Low Risk         │
│    Fri 15 May · 320 kcal · 22g carbs           │
│                                                 │
│ 🔴 Char Kuey Teow              High Risk       │
│    Fri 15 May · 980 kcal · 95g carbs           │
│    ...                                          │
│                                                 │
│           ← Newer    +13    Older →             │
└─────────────────────────────────────────────────┘
```

Filter options: All / High Risk / Medium / Low / By meal type (Breakfast, Lunch, Dinner, Snack)

---

## Tab 4 — Tools (Clinical Features)

### Purpose
Clinical tools the user accesses occasionally — not daily. Grouping these here declutters the Home tab.

### Content

**1. Check Health Claim**
```
┌─────────────────────────────────────────────────┐
│  Check Health Claim                             │
│                                                 │
│  🔍 [e.g. is bitter gourd juice good for        │
│      diabetes?                               ]  │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │            Check Claim                  │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  Recent checks:                                 │
│  · "Cinnamon lowers blood sugar" — ⚠ Caution   │
│  · "Metformin is harmful" — ❌ Harmful claim    │
└─────────────────────────────────────────────────┘
```

**2. Appointment Prep**
```
┌─────────────────────────────────────────────────┐
│  Appointment Prep                          📋   │
│  Know what your dietitian will discuss           │
│                                                 │
│  Generate a personalised agenda based on your   │
│  recent meals, glucose readings, and clinical   │
│  history.                                       │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │      Generate My Meeting Agenda         │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

**3. Weekly Summary Report**
```
┌─────────────────────────────────────────────────┐
│  Weekly Summary Report                     📄   │
│  Your 7-day clinical brief — share with your    │
│  dietitian                                      │
│                                                 │
│  Report includes:                               │
│  ✓ 7-day meal log          ✓ Calorie trends     │
│  ✓ Glycemic load analysis  ✓ Glucose readings   │
│  ✓ Risk score history      ✓ Drug interactions  │
│  ✓ Swap suggestions        ✓ Clinical notes     │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │       Download PDF Report               │    │
│  └─────────────────────────────────────────┘    │
│  Generated fresh each time · MOH T2DM guidelines│
└─────────────────────────────────────────────────┘
```

**4. Drug-Food Interaction Log (NEW)**
```
┌─────────────────────────────────────────────────┐
│  Drug-Food Interaction Alerts              💊   │
│                                                 │
│  Your medications: metformin, glipizide         │
│                                                 │
│  Recent alerts:                                 │
│  ⚠ Thu 14 May — Bitter gourd + glipizide       │
│    may cause hypoglycemia                       │
│  ⚠ Mon 11 May — Roti Canai + Teh Tarik         │
│    scored 82/100 risk — 95g carbs               │
└─────────────────────────────────────────────────┘
```

---

## Tab 5 — Profile

### Purpose
All account settings, body metrics, targets, and medications. Managed by the dietitian but viewable by the patient.

### Content

```
┌─────────────────────────────────────────────────┐
│  My Profile                           ▲ Hide    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ HbA1c 8.2% — High — review needed      │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  BODY METRICS                                   │
│  Age          52 years                          │
│  Gender       male                              │
│  Weight       82 kg                             │
│  Height       168 cm                            │
│  BMI          29.1                              │
│                                                 │
│  DAILY TARGETS                                  │
│  ┌───────────────┐ ┌───────────────┐            │
│  │ Calories      │ │ Carbohydrates │            │
│  │ 1800 kcal/day │ │ 200 g/day     │            │
│  └───────────────┘ └───────────────┘            │
│                                                 │
│  CURRENT MEDICATIONS                            │
│  [metformin]  [glipizide]                       │
│  Interactions checked automatically when you    │
│  log a meal.                                    │
│                                                 │
│  Profile managed by your dietitian · Contact    │
│  them to update                                 │
│                                                 │
│  ── App Settings ──                             │
│  Notifications           [ON]                   │
│  CGM Connection          [Connected]            │
│  Language                [English]              │
│  Sign Out                                       │
└─────────────────────────────────────────────────┘
```

---

## Meal Detail Page (Accessed by tapping any meal)

This is not a tab — it's a drill-down page accessible from Home (recent meals), Trends (meal history), or the Log flow (after confirming).

```
┌─────────────────────────────────────────────────┐
│  ← Back                                         │
│                                                 │
│  [meal photo thumbnail]                         │
│                                                 │
│  Nasi Lemak · 350g · Medium                     │
│  Lunch · Fri 15 May, 12:34 PM                  │
│                                                 │
│  RISK SCORE                                     │
│  ██████████████████████████░░░░  65/100  MEDIUM │
│                                                 │
│  ── Nutrient Breakdown ──                       │
│  Calories       480 kcal    ████████░░   [80%]  │
│  Carbohydrates   62g        █████████░   [⚠]   │
│  Glycemic Load   28         █████████░   [⚠]   │
│  Sodium         920mg       █████████░   [⚠]   │
│  Fibre            3g        ██░░░░░░░░   [⚠]   │
│  Protein         14g        █████░░░░░   [50%]  │
│  Total Fat       22g        ███████░░░   [70%]  │
│  Saturated Fat   12g        ████████░░   [80%]  │
│  Sugar            8g        ████░░░░░░   [40%]  │
│                                                 │
│  ── Breach Summary ──                           │
│  ⚠ Carbs: 62g exceeds 45g target (+38%)        │
│  ⚠ GL: 28 exceeds 15 target (+87%)             │
│  ⚠ Sodium: 920mg exceeds 600mg target (+53%)   │
│                                                 │
│  ── AI Nutritionist Insight ──                  │
│  "The white rice base and coconut milk drive    │
│  the carb and GL breach. Try asking for less    │
│  rice or brown rice. The sambal adds 920mg      │
│  sodium — ask for half portion next time. Add   │
│  a fibre-rich side like ulam or cucumber to     │
│  slow glucose absorption."                      │
│                                                 │
│  ── Post-Meal Glucose (if available) ──         │
│  Logged 1.5 hrs after meal: 11.2 mmol/L  ⚠HIGH │
│  [mini glucose chart around the meal timestamp] │
│                                                 │
│  [Delete Meal]                                  │
└─────────────────────────────────────────────────┘
```

---

## Navigation & UX Patterns

### Bottom Tab Bar
- 5 tabs: Home, Log, Trends, Tools, Profile
- Active tab highlighted with filled icon + label
- Log tab has a slightly larger, accent-coloured icon to draw attention (it's the primary action)
- Tab bar is always visible except during the Log flow steps 2 and 3 (full-screen modal)

### Floating Action Button (FAB)
- "+" button, accent colour (your amber/gold), 56dp, fixed bottom-right
- Visible on Home and Trends tabs only (not on Log, since you're already there)
- Tapping opens the Log tab directly with the camera ready
- Has a subtle pulse animation on first load if the user hasn't logged a meal in 4+ hours

### Pull-to-Refresh
- Home tab: refreshes glucose data and AI insight
- Trends tab: refreshes charts and recalculates weekly stats

### Transitions
- Tab switches: instant, no animation (feels native)
- Drill-down pages (Meal Detail): slide up from bottom as a modal sheet
- Log flow steps: slide left-to-right within the flow
- Back navigation: slide right-to-left or swipe down to dismiss modal

### Empty States
Every section needs an empty state for new users (Mei Ling persona):
- Home with no meals: "Log your first meal to see your daily summary! Tap the + button to get started."
- Trends with no data: "Your weekly trends will appear here after a few days of logging."
- Tools with no alerts: "No drug-food interaction alerts yet — keep logging and we'll flag any concerns."

### Notifications (push)
- Meal reminders at configurable times (default: 8am, 12pm, 7pm)
- Post-meal glucose reminder: 1.5 hours after a meal is logged
- Weekly summary available: Sunday evening
- High-risk alert: immediately after a meal is scored ≥ 80/100

---

## Comparison: Before vs After

| Aspect | Before (2 pages) | After (5 tabs) |
|---|---|---|
| Taps to log a meal | Scroll to section 3, tap camera | 1 tap (FAB or Log tab) |
| Taps to see full nutrients | Not available | Tap any meal → Meal Detail |
| Glucose data location | Mid-scroll on dashboard | Dedicated Trends tab, section 1 |
| Nutrition history | Mid-scroll, mixed with glucose | Trends tab, section 2 |
| Clinical tools | Bottom of the scroll | Dedicated Tools tab |
| Profile | Very bottom of scroll | Dedicated tab, always 1 tap away |
| Cognitive load per screen | 12 sections | 3–5 focused sections |
| New user experience | Overwhelming | Guided empty states |
| Primary action visibility | Buried | FAB visible on every screen |

---

## Implementation Priority

### Phase 1 — Navigation restructure
- Implement bottom tab bar with 5 tabs
- Move existing sections into their new tabs (no new features, just reorganisation)
- Add the FAB button
- Add the Meal Detail drill-down page

### Phase 2 — Log flow improvements
- Add AI portion estimation + confirmation screen (Feature 1)
- Add quick nutrient preview on confirmation screen
- Add time-based meal type default

### Phase 3 — Data screens
- Add weekly calorie summary cards and AI insight to Trends (Feature 3)
- Add full nutrient breakdown to Meal Detail page (Feature 2)
- Add AI nutritionist insight per meal (Feature 2)

### Phase 4 — Polish
- Empty states for all sections
- Push notification integration
- Pull-to-refresh
- Transition animations
- Filter/sort on meal history
