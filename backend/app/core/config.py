from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database — defaults to SQLite for local dev (no install required).
    # Set DATABASE_URL=postgresql://... in .env or Docker for full Postgres.
    database_url: str = "sqlite:///./findash.db"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # CORS — comma-separated list of extra allowed origins for production
    allowed_origins: str = ""

    # Cache TTLs (seconds)
    quote_ttl: int = 60
    history_ttl: int = 300
    name_ttl: int = 86400

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def cors_origins(self) -> list[str]:
        base = ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"]
        extras = [o.strip() for o in self.allowed_origins.split(",") if o.strip()]
        return base + extras


settings = Settings()
