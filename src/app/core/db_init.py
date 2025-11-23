import asyncio
import logging
from typing import Optional

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine

from app.models.base import Base

logger = logging.getLogger(__name__)

# Mutable state tracking DB availability
db_initialized: bool = False
db_last_error: Optional[str] = None
db_attempts: int = 0

async def try_initialize(engine: AsyncEngine) -> bool:
    """Attempt to create metadata; return True on success, False otherwise."""
    global db_initialized, db_last_error
    global db_attempts
    db_attempts += 1
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        db_initialized = True
        db_last_error = None
        logger.info("Database schema ensured successfully.")
        return True
    except (SQLAlchemyError, OSError) as exc:
        db_initialized = False
        db_last_error = str(exc)
        logger.warning("Database init attempt failed: %s", exc)
        return False

async def background_db_initializer(engine: AsyncEngine, interval_seconds: int = 10, max_attempts: int = 0) -> None:
    """Keep trying to initialize DB until success.

    interval_seconds: delay between attempts.
    max_attempts: 0 means infinite attempts.
    """
    attempt = 0
    while True:
        if max_attempts and attempt >= max_attempts:
            logger.error("Max DB init attempts (%d) reached; giving up.", max_attempts)
            break
        if await try_initialize(engine):
            break
        attempt += 1
        await asyncio.sleep(interval_seconds)
