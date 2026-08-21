import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models.user import User
from app.routers import auth, questions, sessions, answers, scores, dashboard, calibration
from app.seed import seed_database
from app.services.calibration import pre_warm_calibration_cache

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema tables exist on startup
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Lightweight startup sanity check against a core table
        db.execute(select(User).limit(1))
    except Exception as exc:
        logger.error(
            "Database sanity check failed: unable to query 'users' table (%s). "
            "Ensure migrations have been run with 'alembic upgrade head'.",
            exc,
        )

    try:
        seed_database(db)
    except Exception as e:
        logger.warning(f"Auto-seed notification: {e}")
    finally:
        db.close()

    # Pre-warm calibration cache in background so /calibration/coefficients
    # responds instantly once the scoring pipeline has run once.
    import threading
    t = threading.Thread(target=pre_warm_calibration_cache, daemon=True)
    t.start()

    yield


app = FastAPI(
    title="AI Interview Prep API",
    description="Backend for the AI Interview Preparation Companion.",
    version="0.1.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router,        prefix="/auth",        tags=["auth"])
app.include_router(questions.router,   prefix="/questions",   tags=["questions"])
app.include_router(sessions.router,    prefix="/sessions",    tags=["sessions"])
app.include_router(answers.router,     prefix="/sessions",    tags=["answers"])
app.include_router(answers.router,     prefix="/answers",     tags=["answers"])
app.include_router(scores.router,      prefix="/scores",      tags=["scores"])
app.include_router(calibration.router, prefix="/calibration", tags=["calibration"])
app.include_router(dashboard.router,   prefix="",             tags=["dashboard"])


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
def health_check() -> dict:
    """Liveness probe — always returns 200 OK."""
    return {"status": "ok"}

