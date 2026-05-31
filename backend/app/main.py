import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.models import models
from app.core import security
from app.api import endpoints

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smartface.main")

# Auto-create tables (SQLite or configured Postgres database)
logger.info("Initializing database and tables...")
Base.metadata.create_all(bind=engine)

# Seed database with default admin & lecturer if empty
db = SessionLocal()
try:
    admin_user = db.query(models.User).filter(models.User.email == "admin@smartface.com").first()
    if not admin_user:
        logger.info("Seeding database with default admin and lecturer accounts...")
        # Create admin
        admin = models.User(
            fullname="System Administrator",
            email="admin@smartface.com",
            role="admin",
            password_hash=security.get_password_hash("adminpassword")
        )
        db.add(admin)
        
        # Create lecturer
        lecturer = models.User(
            fullname="Dr. Tariq Yusuf",
            email="lecturer@smartface.com",
            role="lecturer",
            password_hash=security.get_password_hash("lecturerpassword")
        )
        db.add(lecturer)
        db.commit()
        db.refresh(lecturer)
        
        # Create a sample course for the lecturer
        course = models.Course(
            course_code="COE501",
            course_name="Biometric Systems and Applications",
            lecturer_id=lecturer.id
        )
        db.add(course)
        db.commit()
        logger.info("Database seeding completed.")
except Exception as e:
    logger.error(f"Error seeding database: {e}")
finally:
    db.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Setup static directories and mount StaticFiles
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static")
profile_pics_dir = os.path.join(static_dir, "profile_pictures")
os.makedirs(profile_pics_dir, exist_ok=True)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(endpoints.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": f"Welcome to the {settings.PROJECT_NAME} API. Access documentation at /docs",
        "ai_engine_mode": settings.AI_ENGINE_MODE
    }
