from fastapi import FastAPI, Request
import asyncio
import logging
from fastapi.responses import RedirectResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from app.api.routes.admin import router as admin_router
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.db_admin import router as db_admin_router
from app.core.config import get_settings
from app.core.db import engine
from app.core.db_init import background_db_initializer, db_initialized, db_last_error, db_attempts, try_initialize
from fastapi.exceptions import HTTPException
from fastapi import status
from pathlib import Path
from app.models.base import Base
from fastapi.middleware.cors import CORSMiddleware
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

# CORS: ограничиваем доступ к API только с доверенных фронтенд-оригинов
origins = [
    "http://localhost:5173",  # Vite dev server (по умолчанию)
    "http://localhost",       # Caddy/SPA на локалхосте
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Роуты
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(admin_router)
app.include_router(db_admin_router)
SPA_INDEX = Path("app/ui/static/spa/index.html")

@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    # Return JSON for API consumers; SPA will interpret status codes
    return HTMLResponse(
        content=f"<h1>{exc.status_code}</h1><p>{exc.detail}</p>",
        status_code=exc.status_code,
    )
# Статика (CSS/JS)
# Общая статика (старые стили/ресурсы)
app.mount("/static", StaticFiles(directory="app/ui/static"), name="static")

# Статика SPA-бандла (Vite кладёт JS/CSS в /assets рядом с index.html)
app.mount(
    "/assets",
    StaticFiles(directory="app/ui/static/spa/assets"),
    name="spa-assets",
)

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "db_initialized": db_initialized,
        "db_error": db_last_error,
        "db_attempts": db_attempts,
    }

@app.get("/", include_in_schema=False)
async def root_redirect():
    return RedirectResponse(url="/admin/")

# Serve SPA for any /admin path not matched by API routes
@app.get("/admin/{path:path}", include_in_schema=False)
async def spa_catch_all(path: str):
    if SPA_INDEX.exists():
        return FileResponse(SPA_INDEX)
    return HTMLResponse("<h1>SPA not built</h1>", status_code=503)

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
