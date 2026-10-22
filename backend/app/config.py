from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="RANKDLAB_", env_file=ROOT / ".env", extra="ignore"
    )

    environment: Literal["development", "test", "production"] = "development"
    data_dir: Path = ROOT / "data"
    database_url: str = f"sqlite:///{(ROOT / 'data' / 'rankdlab.db').as_posix()}"
    origins: list[str] = ["http://127.0.0.1:5173", "http://localhost:5173"]
    hosts: list[str] = ["127.0.0.1", "localhost"]
    secure_cookies: bool = False
    max_upload_mb: int = Field(default=20, ge=1, le=100)
    parser_timeout: int = Field(default=90, ge=1, le=300)
    start_worker: bool = True

    @model_validator(mode="after")
    def production_requirements(self):
        if self.environment == "production":
            if not self.secure_cookies or not self.database_url.startswith("postgresql"):
                raise ValueError("Production requires PostgreSQL and secure cookies")
            if not self.origins or any(
                not origin.startswith("https://") for origin in self.origins
            ):
                raise ValueError("Production requires explicit HTTPS origins")
            if "*" in self.hosts or "*" in self.origins:
                raise ValueError("Wildcard production hosts/origins are forbidden")
        return self
