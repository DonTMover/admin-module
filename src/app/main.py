from fastapi import FastAPI
import asyncio
import logging
from fastapi.staticfiles import StaticFiles
from app.api.routes.admin import router as admin_router
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.core.config import get_settings
from app.core.db import engine
from app.core.db_init import background_db_initializer, db_initialized, db_last_error, try_initialize
from app.models.base import Base
import uvicorn

settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    description="Административный модуль для управления сущностями и пользователями.",
    version="0.1.0",
    docs_url="/admin/docs",
    redoc_url="/admin/redoc",
    openapi_url="/admin/openapi.json",
    contact={"name": "Egor"},
    license_info={"name": "Proprietary"},
)

# Роуты
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(admin_router)
# Статика (CSS/JS)
# Correct relative path: running from 'src' so omit leading 'src/'
app.mount("/static", StaticFiles(directory="app/ui/static"), name="static")

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "db_initialized": db_initialized,
        "db_error": db_last_error,
    }

@app.on_event("startup")
async def on_startup():
    # Попытка быстрой инициализации БД (не блокирующая падением)
    logger = logging.getLogger("startup")
    initialized = await try_initialize(engine)
    if not initialized:
        logger.warning("DB not available on startup; starting background retry task.")
        # Фоновые повторные попытки пока не удастся подключиться
        asyncio.create_task(background_db_initializer(engine, interval_seconds=10))

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
