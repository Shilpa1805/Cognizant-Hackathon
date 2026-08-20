# 🎯 PrepPilot — AI Interview Preparation Companion

An AI-powered mock interview platform built during the Cognizant Hackathon. PrepPilot lets candidates practice role-specific questions, receive instant AI-scored feedback across multiple dimensions (embedding similarity, LLM judge, concept match), and track their longitudinal progress through a rich analytics dashboard.

**Stack:** FastAPI (Python 3.11) · SQLite/PostgreSQL · React 18 + Vite · Vanilla CSS Modules · Google Gemini · ChromaDB · sentence-transformers

---

## 📁 Project Structure

```
ai-interview-prep/
├── backend/          # FastAPI API server + ML scoring pipeline
│   ├── app/
│   │   ├── routers/  # Auth, questions, sessions, answers, scores, dashboard
│   │   ├── services/ # AI scoring, question generation, vector store
│   │   ├── models/   # SQLAlchemy ORM models
│   │   ├── schemas/  # Pydantic request/response schemas
│   │   └── main.py   # App entrypoint
│   ├── alembic/      # Database migration scripts
│   ├── tests/        # Pytest test suite
│   └── requirements.txt
├── frontend/         # React + Vite SPA (PrepPilot UI)
│   ├── src/
│   │   ├── components/  # Shared UI (Button, Card, NavHeader, OrbitVisual…)
│   │   ├── pages/       # All 14 routes
│   │   ├── context/     # AuthContext
│   │   ├── hooks/       # useAuth, useCountUp, useTypewriter
│   │   └── styles/      # tokens.css + global.css (design system)
│   └── package.json
└── ml/               # Offline ML scripts (ingestion, embeddings, eval)
```

---

## ✅ Prerequisites

Make sure all of the following are installed before starting:

| Requirement | Minimum Version | Install Link |
|---|---|---|
| **Python** | 3.11 | https://python.org/downloads |
| **Node.js** | 18 LTS | https://nodejs.org |
| **npm** | 9+ | Bundled with Node.js |
| **Git** | any | https://git-scm.com |

> **Optional (for PostgreSQL):** If you want a persistent production-grade database instead of SQLite, install [PostgreSQL 15+](https://www.postgresql.org/download/).
> The app works out of the box with the bundled SQLite file (`backend/interview_prep.db`) — no Postgres required for local dev.

---

## 🚀 Full Local Setup (Both Backend + Frontend)

### 1. Clone the repository

```bash
git clone https://github.com/Shilpa1805/Cognizant-Hackathon.git
cd Cognizant-Hackathon/ai-interview-prep
```

---

### 2. Backend Setup

```bash
cd backend
```

#### 2a. Create and activate a virtual environment

**Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**
```cmd
python -m venv .venv
.venv\Scripts\activate.bat
```

**macOS / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

#### 2b. Install Python dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> ⚠️ **spaCy model required.** After pip install, run:
> ```bash
> python -m spacy download en_core_web_sm
> ```

#### 2c. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# For local dev — SQLite is pre-configured, no change needed
# To use PostgreSQL instead, replace with your connection string:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/interview_prep

# Change this to a long random string in production
JWT_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_STRING
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# Allowed CORS origins (Vite dev server)
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# Google Gemini API key (required for AI scoring and question generation)
GOOGLE_API_KEY=your_google_gemini_api_key_here

APP_ENV=development
```

> 🔑 **Getting a Google Gemini API key:**
> Visit [Google AI Studio](https://aistudio.google.com/app/apikey), sign in, and create a free API key. Paste it into `.env` as `GOOGLE_API_KEY`.

#### 2d. Run database migrations (PostgreSQL only)

If you are using PostgreSQL, run Alembic migrations:
```bash
alembic upgrade head
```

If you are using the default **SQLite** setup, skip this step — the database is created automatically on first server start.

#### 2e. Start the backend API server

```bash
uvicorn app.main:app --reload --port 8000
```

The server will:
- Auto-create all database tables on startup
- Seed the database with sample roles, topics, and questions
- Be available at **http://localhost:8000**
- Serve interactive API docs at **http://localhost:8000/docs**

---

### 3. Frontend Setup

Open a **new terminal window/tab**, then:

```bash
cd ai-interview-prep/frontend
```

#### 3a. Install Node dependencies

```bash
npm install
```

#### 3b. Configure environment (optional)

The Vite dev server automatically proxies `/api/*` → `http://localhost:8000`. No manual CORS or URL configuration is needed for local development.

If you need to point at a different backend URL:
```bash
cp .env.example .env
# Edit .env:
# VITE_API_URL=http://localhost:8000
```

#### 3c. Start the dev server

```bash
npm run dev
```

The frontend will be available at **http://localhost:5173**

---

## 🖥️ Running Everything Together

Open **two terminals** side-by-side:

| Terminal 1 — Backend | Terminal 2 — Frontend |
|---|---|
| `cd ai-interview-prep/backend` | `cd ai-interview-prep/frontend` |
| `.venv\Scripts\activate` (Windows) | |
| `uvicorn app.main:app --reload --port 8000` | `npm run dev` |
| http://localhost:8000 | http://localhost:5173 |

Navigate to **http://localhost:5173**, click **Sign Up**, complete onboarding, and start practicing.

---

## 🔑 Complete Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `sqlite:///./interview_prep.db` | Database connection string |
| `JWT_SECRET` | ✅ | — | Long random string for JWT signing (change in production) |
| `JWT_ALGORITHM` | ❌ | `HS256` | JWT signing algorithm |
| `JWT_EXPIRE_MINUTES` | ❌ | `1440` | Session expiry (24 hours) |
| `CORS_ORIGINS` | ❌ | `["http://localhost:5173"]` | JSON array of allowed origins |
| `GOOGLE_API_KEY` | ✅ | — | Google Gemini API key for AI scoring |
| `APP_ENV` | ❌ | `development` | Environment name |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | ❌ | *(proxied to :8000)* | Override backend base URL |

---

## 🧪 Running Tests

```bash
# From the backend directory (with venv active)
cd backend
pytest tests/ -v
```

---

## 🔍 Linting

```bash
# Backend — Ruff linter
cd backend
ruff check app/ tests/

# Frontend — ESLint
cd frontend
npm run lint
```

---

## 🏗️ Production Build (Frontend)

To create an optimised production bundle:

```bash
cd frontend
npm run build
# Output: frontend/dist/
```

Preview the production build locally:
```bash
npm run preview
```

---

## ☁️ Deployment

### Backend (Render / Railway)

| Setting | Value |
|---|---|
| **Runtime** | Python 3.11 (see `backend/runtime.txt`) |
| **Build Command** | `pip install -r requirements.txt && python -m spacy download en_core_web_sm` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Environment Variables** | Set `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_API_KEY`, `CORS_ORIGINS` in service settings |

### Frontend (Vercel / Netlify)

| Setting | Value |
|---|---|
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Environment Variables** | Set `VITE_API_URL` to your deployed backend URL |

---

## 🌐 API Endpoints

Interactive docs: **http://localhost:8000/docs**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `POST` | `/auth/signup` | Register new user (returns JWT) |
| `POST` | `/auth/login` | Login (returns JWT) |
| `GET` | `/questions` | List questions (`?role=&topic=&count=`) |
| `GET` | `/questions/next` | Get next adaptive question |
| `POST` | `/sessions` | Create a mock interview session |
| `POST` | `/sessions/{id}/answers` | Submit answer → get AI score |
| `GET` | `/dashboard/summary` | Topic progress summary (`?user_id=`) |
| `GET` | `/study-plan/{user_id}` | Prioritised study plan |

---

## 🗄️ Database

The app uses **SQLite by default** (zero-config) and is fully compatible with **PostgreSQL** for production.

10 core tables: `users` · `job_roles` · `topics` · `questions` · `mock_sessions` · `session_questions` · `answers` · `scores` · `topic_progress` · `study_plan`

The database is seeded automatically on first startup with sample roles (Backend Engineer, Frontend Engineer, etc.), topics (DSA, System Design, Behavioral…), and questions.

To inspect the SQLite database directly:
```bash
# Windows — use SQLite Browser or:
cd backend
python -c "from app.database import engine; from app.models import *; print('DB OK')"
```

---

## 🤖 ML / AI Pipeline Notes

The scoring pipeline uses **Google Gemini** for LLM judging and **sentence-transformers** for embedding-based similarity. The `scoring/` and `chroma_db/` directories inside `backend/` hold the local vector store and model caches.

If you see warnings about missing ChromaDB collections on first run, this is expected — the collections are created automatically as answers are submitted.

For offline ML experimentation, see [`ml/README.md`](ml/README.md).

---

## 👥 Team Folder Ownership

| Folder | Responsibility |
|---|---|
| `backend/app/routers/` + `schemas/` | FastAPI endpoints, Pydantic models, DB queries |
| `backend/app/services/scoring.py` | Embedding similarity + LLM judge + concept match |
| `backend/app/services/question_generation.py` + `vector_store.py` | LLM question gen + ChromaDB retrieval |
| `frontend/src/` | React pages, CSS modules, API integration |
| `ml/` | Data ingestion, embeddings, offline evaluation |
| `backend/alembic/` | DB migrations |

---

## ❓ Troubleshooting

**`ModuleNotFoundError: No module named 'app'`**
→ Make sure your virtual environment is activated and you are running `uvicorn` from inside the `backend/` directory.

**spaCy `OSError: [E050] Can't find model 'en_core_web_sm'`**
→ Run `python -m spacy download en_core_web_sm` with the venv active.

**Frontend shows "Network Error" / cannot reach API**
→ Ensure the backend is running on port 8000. Check `frontend/vite.config.ts` for the proxy config.

**`GOOGLE_API_KEY` errors / AI scoring returns 0**
→ Add a valid Gemini API key to `backend/.env`. Without it, the LLM judge score will fall back to 0 but the app still functions.

**Port 8000 already in use**
→ `uvicorn app.main:app --reload --port 8001` — then update `CORS_ORIGINS` and the Vite proxy accordingly.
