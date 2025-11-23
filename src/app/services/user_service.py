from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from app.models.user import User
from app.core.security import hash_password, verify_password
from datetime import datetime, timezone
from typing import Optional

async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User))
    return list(result.scalars().all())

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()

async def get_user(db: AsyncSession, user_id: int) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

async def create_user(db: AsyncSession, email: str, full_name: Optional[str], password: str) -> User:
    user = User(email=email, full_name=full_name, password_hash=hash_password(password))
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise ValueError("Email already exists")
    await db.refresh(user)
    return user

async def update_user(db: AsyncSession, user: User, full_name: Optional[str] = None, password: Optional[str] = None) -> User:
    if full_name is not None:
        user.full_name = full_name
    if password is not None:
        user.password_hash = hash_password(password)
    await db.commit()
    await db.refresh(user)
    return user

async def delete_user(db: AsyncSession, user: User) -> None:
    await db.delete(user)
    await db.commit()

async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
    user = await get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    # Update login stats
    user.login_count = (user.login_count or 0) + 1
    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user
