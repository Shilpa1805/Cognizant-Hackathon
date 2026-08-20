"""
Application configuration via Pydantic Settings.
Values are read from environment variables or a .env file.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # -----------------------------------------------------------------------
    # Database
    # -----------------------------------------------------------------------
    DATABASE_URL: str = "sqlite:///./interview_prep.db"

    # -----------------------------------------------------------------------
    # JWT  (stub values — auth pair will replace with real secret management)
    # -----------------------------------------------------------------------
    JWT_SECRET: str = "CHANGE_ME_IN_PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 h

    # -----------------------------------------------------------------------
    # CORS
    # -----------------------------------------------------------------------
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # -----------------------------------------------------------------------
    # AI Services (Gemini)
    # -----------------------------------------------------------------------
    GEMINI_API_KEY: str = ""

    # -----------------------------------------------------------------------
    # App meta
    # -----------------------------------------------------------------------
    APP_ENV: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()