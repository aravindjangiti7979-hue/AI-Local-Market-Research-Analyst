"""
Configuration settings for the application.
"""
from typing import List, Optional, Union
from pydantic_settings import BaseSettings
from pydantic import EmailStr, field_validator
import os


class Settings(BaseSettings):
    """Application settings."""

    # ------------------
    # Application
    # ------------------
    APP_NAME: str = "AI Local Market Research Analyst"
    PROJECT_NAME: str = "AI Local Market Research Analyst"
    VERSION: str = "1.0.0"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ------------------
    # Security
    # ------------------
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # ------------------
    # Application URLs
    # ------------------
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ]

    # ------------------
    # CORS / Hosts
    # ------------------
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ]
    ALLOWED_HOSTS: Union[List[str], str] = [
        "localhost",
        "127.0.0.1",
    ]

    # ------------------
    # Database
    # ------------------
    DATABASE_URL: str
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 40

    # ------------------
    # Redis
    # ------------------
    REDIS_URL: str = "redis://localhost:6379/0"

    # ------------------
    # Google Gemini
    # ------------------
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-1.5-pro"

    # ------------------
    # External APIs
    # ------------------
    GOOGLE_PLACES_API_KEY: Optional[str] = None
    YELP_API_KEY: Optional[str] = None
    NEWS_API_KEY: Optional[str] = None
    OPENWEATHER_API_KEY: Optional[str] = None
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    GEOAPIFY_API_KEY: Optional[str] = None
    FOURSQUARE_API_KEY: Optional[str] = None
    # Foursquare OAuth2
    FOURSQUARE_CLIENT_ID: Optional[str] = None
    FOURSQUARE_CLIENT_SECRET: Optional[str] = None
    FOURSQUARE_ACCESS_TOKEN: Optional[str] = None  # <-- ADD THIS LINE

    PYTHONIOENCODING: Optional[str] = None

    
    # Twitter/X API (Optional)
    TWITTER_BEARER_TOKEN: Optional[str] = None
    TWITTER_CONSUMER_KEY: Optional[str] = None
    TWITTER_CONSUMER_SECRET: Optional[str] = None

    # ------------------
    # Rate Limiting
    # ------------------
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_DAY: int = 1000
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 3600

    # ------------------
    # Logging
    # ------------------
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"

    # ------------------
    # File Storage
    # ------------------
    UPLOAD_DIR: str = "data/uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    # ------------------
    # Email
    # ------------------
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: Optional[EmailStr] = None

    # ------------------
    # Celery
    # ------------------
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # ------------------
    # Data Collection
    # ------------------
    MAX_DATA_SOURCES: int = 10
    MAX_ANALYSIS_RESULTS: int = 100
    DATA_RETENTION_DAYS: int = 30
    MAX_ANALYSIS_TOKENS: int = 4000
    SENTIMENT_THRESHOLD: float = 0.3
    CACHE_TTL: int = 3600

    # ------------------
    # API
    # ------------------
    API_V1_STR: str = "/api/v1"

    # ------------------
    # Pydantic Settings
    # ------------------
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "forbid"  # This is the default, but explicitly stating it

    # ------------------
    # Validators
    # ------------------
    @field_validator("CORS_ORIGINS", "ALLOWED_HOSTS", "BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_list(cls, v):
        """
        Allow both:
        - JSON arrays: ["http://localhost:3000"]
        - Comma-separated: http://localhost:3000,http://localhost:8000
        """
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v):
        if not v:
            raise ValueError("DATABASE_URL is required")
        return v

    @field_validator("GEMINI_API_KEY", mode="before")
    @classmethod
    def validate_gemini_key(cls, v):
        if not v:
            raise ValueError("GEMINI_API_KEY is required")
        return v


# ------------------
# Create settings
# ------------------
settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.dirname(settings.LOG_FILE), exist_ok=True)