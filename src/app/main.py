from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.api.routes.admin import router as admin_router
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.core.config import get_settings
from app.core.db import engine
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
app.mount("/static", StaticFiles(directory="src/app/ui/static"), name="static")

@app.on_event("startup")
async def on_startup():
    # Авто создание таблиц (для прототипа; в проде используйте Alembic)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
