### Tech stack decisions for 72-hour demo build

用户:
Q: Frontend framework — what's the team most comfortable shipping in 72 hours? A: Team has no strong preference, you pick
Q: Backend — keep Buildora's FastAPI or switch? A: FastAPI (reuse Buildora backend code)
Q: LLM provider for the agents — what's your budget/access situation? A: OpenAI (GPT-4o, GPT-4V) — paid API, no limits worry
Q: Agent orchestration framework A: LangGraph (Buildora setup — reuse)
Q: Database & state — Firebase (Buildora) or something else? A: Firebase (Firestore + Realtime DB + Storage + Auth — reuse Buildora)
Q: Deployment for the demo — where does it live on demo day? (Select all that apply) A: Localhost only for now but ability to vercel full-stack
Q: Which web search tool for Agents 1 and 8? A: ur Tavily api for now but ability to change later
Q: Telegram alerts (Agent 5) — keep or drop for demo? A: drop - show alerts only in dashboard but ability to add tele or ws or email later

Claude:
ow I have the full context. Let me build the complete PRD with all the answered stack decisions locked in.
ow I have everything I need. Let me build the full PRD as a polished artifact.
ow I'll write the full PRD as a well-structured markdown file, then create a beautiful visual summary widget.
ow let me build the visual PRD summary widget:
RD is locked and ready. Here's what's in it:

**Everything decided, nothing left open:**

- Stack fully locked — React/Tailwind + FastAPI (Buildora reuse) + GPT-4o/4V + LangGraph + Firebase + Tavily + ReportLab + Recharts + Localhost/Vercel
- Alerts are dashboard-only with clean stubs for Telegram/email/WS whenever you want them
- Auth is two hardcoded users — no time wasted on signup flow
- Agent 4 is deliberately a slide — it's noted in the Tier 3 section so no one wastes time building it

**What to build first (hit the quick-start buttons in the widget):**

The five buttons at the bottom of the widget are your build queue — click them in order and I'll generate the actual code for each piece. The highest-value first build is the LangGraph orchestrator + Agent 8 (misinfo debunker), because Agent 8 is your emotional demo moment and judges will remember it most.

The full PRD file has the Firebase schema, all API endpoints, the file structure, environment variables, 72-hour hour-by-hour plan, and the exact 3-live-moment + 1-slide demo script. Print it, divide it, ship it.


