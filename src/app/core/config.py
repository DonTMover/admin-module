from functools import lru_cache
import os
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    app_name: str = Field(default="Admin Module")
    debug: bool = Field(default=True)
    postgres_host: str = Field(default="localhost")
    postgres_port: int = Field(default=5432)
    postgres_db: str = Field(default="admin_db")
    postgres_user: str = Field(default="admin")
    postgres_password: str = Field(default="admin")
    secret_key: str = Field(default="CHANGE_ME_SUPER_SECRET")
    jwt_algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=60)

    @property
    def database_url_async(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"\
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    class Config:
        env_prefix = "ADMIN_"
        case_sensitive = False
        env_file = os.path.join(os.getcwd(), ".env")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
