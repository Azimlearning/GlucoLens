# GlucoLens

Clinical Nutrition Companion for Malaysian Type 2 Diabetes patients.

## Stack
- **Backend**: FastAPI + LangGraph + OpenAI GPT-4o + Firebase + Tavily
- **Frontend**: Next.js 14 + Tailwind CSS + Firebase JS SDK

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

## Docs
- `docs/GlucoLens_PRD_v2.md` — full product spec
- `docs/File_Structure.md` — canonical file tree
- `docs/Checklist.md` — build checklist
