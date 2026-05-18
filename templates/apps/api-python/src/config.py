from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = {{apiPort}}
    database_url: str = "postgres://postgres:postgres@localhost:5432/db_{{snakeCase name}}"
    redis_url: str = "redis://localhost:6379/1"
    allowed_origins: str = ""

    # Zitadel — required when using Zitadel auth mode
    zitadel_domain: str = ""
    zitadel_webhook_secret: str = ""

    # Local auth — required when using local auth mode
    secret_key: str = ""

    def model_post_init(self, __context: object) -> None:
        {{#if (eq authMode "local")}}
        if not self.secret_key or len(self.secret_key) < 32:
            raise ValueError("SECRET_KEY must be set and at least 32 characters (generate: openssl rand -hex 32)")
        {{/if}}
        {{#if (eq authMode "zitadel")}}
        if not self.zitadel_domain:
            raise ValueError("ZITADEL_DOMAIN must be set")
        if not self.zitadel_webhook_secret or len(self.zitadel_webhook_secret) < 16:
            raise ValueError("ZITADEL_WEBHOOK_SECRET must be set (generate: openssl rand -hex 32)")
        {{/if}}

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
