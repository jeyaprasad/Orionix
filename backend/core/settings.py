from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    OPENROUTER_API_KEY: str                            # Required — set in .env
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    MODEL_NAME: str = "openai/gpt-oss-20b"             # Default (fast, free-tier friendly on OpenRouter, good for live demos). Fallback: "openai/gpt-oss-120b" for higher-quality offline report generation.
    REPORT_MODEL: str | None = None
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"

settings = Settings()
