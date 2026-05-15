"""
GlucoLens backend configuration.
Loads environment variables into a typed Pydantic Settings object.
Import the `settings` singleton from anywhere in the codebase.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # === OpenAI ===
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4o-2024-08-06"
    OPENAI_VISION_MODEL: str = "gpt-4o"
    OPENAI_TEMPERATURE: float = 0.1
    OPENAI_TIMEOUT_S: int = 30

    # === Tavily ===
    TAVILY_API_KEY: str

    # === Firebase Admin ===
    FIREBASE_PROJECT_ID: str
    FIREBASE_PRIVATE_KEY: str
    FIREBASE_CLIENT_EMAIL: str
    FIREBASE_DATABASE_URL: str
    FIREBASE_STORAGE_BUCKET: str

    # === Feature flags ===
    MYDIETCAM_ENABLED: bool = False
    TELEGRAM_ENABLED: bool = False
    EMAIL_ENABLED: bool = False

    # === App ===
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"

    # === Pipeline ===
    AGENT_NODE_TIMEOUT_S: int = 20
    PIPELINE_TIMEOUT_S: int = 45
    PIPELINE_RECURSION_LIMIT: int = 12


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


# Convenience: most modules just import this.
settings = get_settings()
