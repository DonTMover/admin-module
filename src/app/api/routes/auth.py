from fastapi import APIRouter, Depends, HTTPException, status, Request, Form
from fastapi.responses import RedirectResponse, FileResponse, JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.services.user_service import authenticate_user, create_user, list_users, get_user_by_email
from app.core.security import create_access_token, get_current_user
from app.schemas.user import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])  # /auth/token
SPA_INDEX = Path("app/ui/static/spa/index.html")

@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(user.email)
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=UserRead)
async def me(current_user=Depends(get_current_user)):
    """Возвращает текущего аутентифицированного пользователя.
    Требует заголовок Authorization: Bearer <token>."""
    return current_user

@router.get("/register", include_in_schema=False)
async def register_page(request: Request, db: AsyncSession = Depends(get_db)):
    if SPA_INDEX.exists():
        return FileResponse(SPA_INDEX)
    # Fallback minimal HTML if SPA missing
    return JSONResponse({"spa": "missing"}, status_code=503)

@router.post("/register", include_in_schema=False)
async def register_submit(
    request: Request,
    email: str = Form(...),
    full_name: str = Form("") ,
    password: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    existing = await get_user_by_email(db, email)
    if existing:
        return JSONResponse({"error": "Email уже существует"}, status_code=400)
    user = await create_user(db, email=email, full_name=full_name or None, password=password)
    # Авто выдача токена после регистрации
    token = create_access_token(user.email)
    # Можно редирект + токен в query, но оставим simple страницу
    return RedirectResponse(url="/admin/login", status_code=302)
