from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.v1.router import api_router
from app.db.database import engine, Base
from app.models import models  # ensure models are imported for table creation


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed first super admin if not exists
    await seed_admin()
    yield
    # Shutdown
    await engine.dispose()


async def seed_admin():
    """Create the first super admin user on first launch"""
    from sqlalchemy import select
    from app.db.database import AsyncSessionLocal
    from app.models.models import User, UserRole, Subscriber, SubscriberStatus
    from app.core.security import get_password_hash

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.role == UserRole.SUPER_ADMIN)
        )
        if result.scalar_one_or_none():
            return  # Already seeded

        # Create ZCI bureau as a subscriber entity
        bureau = Subscriber(
            name="ZimCredit Intelligence (ZCI)",
            email=settings.FIRST_ADMIN_EMAIL,
            industry="Credit Bureau",
            status=SubscriberStatus.ACTIVE,
            city="Harare",
        )
        db.add(bureau)
        await db.flush()

        admin = User(
            full_name="System Administrator",
            email=settings.FIRST_ADMIN_EMAIL,
            hashed_password=get_password_hash(settings.FIRST_ADMIN_PASSWORD),
            role=UserRole.SUPER_ADMIN,
            subscriber_id=bureau.id,
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print(f"✅ Super admin seeded: {settings.FIRST_ADMIN_EMAIL}")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Zimbabwe's Credit Reference Bureau API",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "system": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}

# uvicorn app.main:app --reload --port 8000
