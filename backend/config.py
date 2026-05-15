from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # OpenAI
    openai_api_key: str = Field(..., env="OPENAI_API_KEY")
    openai_model: str = Field("gpt-4o-2024-08-06", env="OPENAI_MODEL")
    openai_vision_model: str = Field("gpt-4o", env="OPENAI_VISION_MODEL")

    # Tavily
    tavily_api_key: str = Field(..., env="TAVILY_API_KEY")

    # Firebase Admin
    firebase_project_id: str = Field(..., env="FIREBASE_PROJECT_ID")
    firebase_private_key: str = Field(..., env="FIREBASE_PRIVATE_KEY")
    firebase_client_email: str = Field(..., env="FIREBASE_CLIENT_EMAIL")
    firebase_database_url: str = Field(..., env="FIREBASE_DATABASE_URL")
    firebase_storage_bucket: str = Field(..., env="FIREBASE_STORAGE_BUCKET")

    # Feature flags
    mydietcam_enabled: bool = Field(False, env="MYDIETCAM_ENABLED")
    telegram_enabled: bool = Field(False, env="TELEGRAM_ENABLED")
    email_enabled: bool = Field(False, env="EMAIL_ENABLED")

    # App config
    app_env: str = Field("development", env="APP_ENV")
    log_level: str = Field("INFO", env="LOG_LEVEL")
    backend_url: str = Field("http://localhost:8000", env="BACKEND_URL")
    frontend_url: str = Field("http://localhost:3000", env="FRONTEND_URL")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
