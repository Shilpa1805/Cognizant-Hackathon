"""
SQLAlchemy engine and session dependency.
Import `get_db` into routers to obtain a database session.
"""

import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)


def resolve_database_url() -> str:
    """Returns the DB URL actually usable — Postgres if reachable,
    otherwise a local SQLite fallback. Used by both the app and
    Alembic so they always agree on which database is live."""
    raw_url = settings.DATABASE_URL
    if "sqlite" in raw_url:
        return raw_url

    try:
        temp_engine = create_engine(
            raw_url,
            pool_pre_ping=True,
        )
        with temp_engine.connect() as conn:
            pass
        return raw_url
    except Exception as exc:
        logger.warning("PostgreSQL connection error: %s. Falling back to SQLite.", exc)
        return "sqlite:///interview_prep.db"


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------
db_url = resolve_database_url()

if "sqlite" in db_url:
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
    )

# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)



# ---------------------------------------------------------------------------
# Base class for all ORM models
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------
def get_db():
    """Yields a database session and ensures it is closed after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
