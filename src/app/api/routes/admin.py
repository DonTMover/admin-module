from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from app.core.db import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.user_service import list_users

router = APIRouter(prefix="/admin", tags=["admin"])
templates = Jinja2Templates(directory="src/app/ui/templates")

@router.get("/", response_class=HTMLResponse)
async def dashboard(request: Request, db: AsyncSession = Depends(get_db)):
    users = await list_users(db)
    return templates.TemplateResponse("admin/dashboard.html", {"request": request, "users": users})
