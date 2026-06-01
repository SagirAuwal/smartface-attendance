import os

class Settings:
    PROJECT_NAME: str = "SmartFace Attendance System"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-smartface-key-development-987654321")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./smartface.db")
    
    # AI Engine
    # 'real' or 'mock'
    AI_ENGINE_MODE: str = os.getenv("AI_ENGINE_MODE", "real")
    RECOGNITION_THRESHOLD: float = float(os.getenv("RECOGNITION_THRESHOLD", "0.60"))
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3001", "http://127.0.0.1:3001"]

settings = Settings()
