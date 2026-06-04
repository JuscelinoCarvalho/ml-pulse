from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "ML Pulse"
    frontend_url: str = "http://localhost:3000"

    # Database
    database_url: str

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Security
    secret_key: str
    fernet_key: str
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    otp_expire_minutes: int = 15

    # Email
    smtp_host: str = "mailpit"
    smtp_port: int = 1025
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@mlpulse.local"
    smtp_tls: bool = False

    # Mercado Livre
    ml_client_id: str
    ml_client_secret: str
    ml_redirect_uri: str = "http://localhost:8000/api/auth/ml/callback"
    ml_site_id: str = "MLB"


settings = Settings()
