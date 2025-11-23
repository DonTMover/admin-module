from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: str | None = None
    password: str | None = None

class UserRead(UserBase):
    id: int

    # Pydantic v2: use from_attributes instead of orm_mode
    class Config:
        from_attributes = True
