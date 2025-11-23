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

    class Config:
        orm_mode = True
