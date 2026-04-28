from pydantic_settings import BaseSettings
from typing import List, Union


class Settings(BaseSettings):
    # App
    APP_NAME: str = "ZimCredit Intelligence"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ALLOWED_ORIGINS: Union[List[str], str] = ["http://localhost:5173"]

    def get_allowed_origins(self) -> List[str]:
        if isinstance(self.ALLOWED_ORIGINS, str):
            return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]
        return self.ALLOWED_ORIGINS

    # Database
    DATABASE_URL: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Admin seed
    FIRST_ADMIN_EMAIL: str = "admin@zimcredit.co.zw"
    FIRST_ADMIN_PASSWORD: str = "Admin@123!"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()