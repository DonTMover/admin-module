from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.user_service import (
    list_users, get_user, create_user, update_user, delete_user
)

router = APIRouter(prefix="/admin/users", tags=["users"])

@router.get("/", response_model=list[UserRead])
async def users_list(db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    return await list_users(db)

@router.get("/{user_id}", response_model=UserRead)
async def users_get(user_id: int, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    user = await get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def users_create(payload: UserCreate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    try:
        user = await create_user(db, email=payload.email, full_name=payload.full_name, password=payload.password)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
    return user

@router.put("/{user_id}", response_model=UserRead)
async def users_update(user_id: int, payload: UserUpdate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    user = await get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user = await update_user(db, user, full_name=payload.full_name, password=payload.password)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def users_delete(user_id: int, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    user = await get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    await delete_user(db, user)
    return None
