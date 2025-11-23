from fastapi import APIRouter, Depends, Request, HTTPException, status
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path
from app.core.db import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.user_service import list_users
from app.core.security import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

# Robust template path resolution: try both repo layouts.
_candidate_paths = [Path("app/ui/templates"), Path("src/app/ui/templates")]
for _p in _candidate_paths:
    if _p.exists():
        templates = Jinja2Templates(directory=str(_p))
        break
else:
    # Fallback (will raise later if really absent).
    templates = Jinja2Templates(directory="app/ui/templates")

@router.get("/", response_class=HTMLResponse)
async def dashboard(request: Request, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    users = await list_users(db)
    return templates.TemplateResponse(
        "admin/dashboard.html",
        {"request": request, "users": users, "current_user": current_user}
    )

@router.get("/profile", response_class=HTMLResponse)
async def profile(request: Request, current_user=Depends(get_current_user)):
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    days_since_creation = None
    hours_since_last_login = None
    if current_user.created_at:
        days_since_creation = (now - current_user.created_at).total_seconds() / 86400
    if current_user.last_login:
        hours_since_last_login = (now - current_user.last_login).total_seconds() / 3600
    return templates.TemplateResponse(
        "admin/profile.html",
        {
            "request": request,
            "current_user": current_user,
            "days_since_creation": days_since_creation,
            "hours_since_last_login": hours_since_last_login,
        }
    )

@router.get("/login", response_class=HTMLResponse, include_in_schema=False)
async def login_page(request: Request):
    # If already authenticated (token supplied), could redirect.
    return templates.TemplateResponse("admin/login.html", {"request": request, "current_user": None})
