from functools import lru_cache

from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    app_env: str = "development"
    database_url: str
    supabase_url: str
    supabase_jwt_secret: str | None = None
    supabase_jwt_audience: str = "authenticated"
    supabase_service_role_key: str | None = None
    cors_origins: str = "http://localhost:3000"
    log_level: str = "INFO"
    storage_bucket: str = "bizpilot-assets"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    try:
        return Settings()
    except ValidationError as exc:
        missing = [
            str(error["loc"][0]).upper() for error in exc.errors() if error.get("type") == "missing"
        ]
        if missing:
            variables = ", ".join(sorted(set(missing)))
            raise RuntimeError(
                "BizPilot backend configuration is incomplete. "
                f"Missing required environment variable(s): {variables}. "
                "Copy backend/.env.example to backend/.env and fill in the values "
                "before starting FastAPI."
            ) from exc
        raise
