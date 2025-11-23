from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse
from pathlib import Path
from app.core.db import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.user_service import list_users
from app.core.security import get_current_user, ensure_is_admin

from alembic import command
from alembic.config import Config
import os

router = APIRouter(prefix="/admin", tags=["admin"])
SPA_INDEX = Path("app/ui/static/spa/index.html")

@router.get("/")
async def dashboard_redirect(request: Request, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    # API still validates auth; UI handled by React SPA
    if SPA_INDEX.exists():
        return FileResponse(SPA_INDEX)
    return RedirectResponse(url="/", status_code=302)

@router.get("/profile")
async def profile_spa(request: Request, current_user=Depends(get_current_user)):
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    days_since_creation = None
    hours_since_last_login = None
    if current_user.created_at:
        days_since_creation = (now - current_user.created_at).total_seconds() / 86400
    if current_user.last_login:
        hours_since_last_login = (now - current_user.last_login).total_seconds() / 3600
    if SPA_INDEX.exists():
        return FileResponse(SPA_INDEX)
    return {"current_user": current_user.email, "days_since_creation": days_since_creation, "hours_since_last_login": hours_since_last_login}

@router.get("/login", include_in_schema=False)
async def login_page(request: Request):
    if SPA_INDEX.exists():
        return FileResponse(SPA_INDEX)
    return RedirectResponse("/", status_code=302)


@router.get("/migrations/status", response_class=JSONResponse)
async def migrations_status(current_user=Depends(get_current_user)):
    ensure_is_admin(current_user)
    # For now just report that endpoint is available; can be extended
    # later to read from alembic_version table.
    return {"status": "ok"}


def _get_alembic_config() -> Config:
    config_path = os.getenv("ALEMBIC_INI", "alembic.ini")
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Alembic config not found at {config_path}")
    return Config(config_path)


@router.post("/migrations/upgrade", response_class=JSONResponse)
async def run_migrations_upgrade_head(current_user=Depends(get_current_user)):
    ensure_is_admin(current_user)
    try:
        cfg = _get_alembic_config()
        command.upgrade(cfg, "head")
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Alembic upgrade failed: {e}")
    return {"status": "ok", "message": "Migrations upgraded to head"}
