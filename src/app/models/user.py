from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base

class User(Base):
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(String(255), default=None)
    password_hash: Mapped[str] = mapped_column(String(255))
