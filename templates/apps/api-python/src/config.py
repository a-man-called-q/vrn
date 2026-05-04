from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = {{apiPort}}
    database_url: str = "postgres://postgres:postgres@localhost:5432/db_{{snakeCase name}}"
    redis_url: str = "redis://localhost:6379/1"
    allowed_origins: str = ""

    # Zitadel
    zitadel_domain: str = ""
    zitadel_webhook_secret: str = ""

    # Local auth (Authlib JWT)
    secret_key: str = ""

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
