from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Ensure connection string uses appropriate async driver
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite://") and not db_url.startswith("sqlite+aiosqlite://"):
    db_url = db_url.replace("sqlite://", "sqlite+aiosqlite://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

# Graceful fallback if asyncpg is not installed in local environment
if "asyncpg" in db_url:
    try:
        import asyncpg  # noqa: F401
    except ImportError:
        import logging
        import os
        project_root = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", ".."))
        local_db_path = os.path.join(project_root, "patientpilot.db").replace("\\", "/")
        logging.getLogger(__name__).warning(
            f"asyncpg driver is not installed. Falling back to sqlite+aiosqlite:///{local_db_path}"
        )
        db_url = f"sqlite+aiosqlite:///{local_db_path}"


engine_kwargs = {
    "echo": (settings.ENVIRONMENT == "development"),
    "future": True,
}
if not db_url.startswith("sqlite"):
    engine_kwargs["pool_pre_ping"] = True

engine = create_async_engine(db_url, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
