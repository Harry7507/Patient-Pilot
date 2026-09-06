from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Supabase Settings
    SUPABASE_URL: str = Field(default="https://placeholder.supabase.co")
    SUPABASE_KEY: str = Field(default="placeholder-anon-key")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="placeholder-service-key")
    SUPABASE_JWT_SECRET: str = Field(default="patientpilot-jwt-dev-secret-key-32bytes-minimum!")

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
    )

    # AI & Speech
    LLM_API_KEY: str = Field(default="")
    LLM_MODEL: str = Field(default="gemini-2.5-flash")
    SPEECH_TO_TEXT_API_KEY: Optional[str] = Field(default=None)

    # Application
    ENVIRONMENT: str = Field(default="development")
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ]
    )
    PORT: int = Field(default=8000)
    HOST: str = Field(default="0.0.0.0")


    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = Settings()
