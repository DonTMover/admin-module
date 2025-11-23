import asyncio
import json
from httpx import AsyncClient
from fastapi import status
from app.main import app
from app.core.db import get_db
from app.services.user_service import create_user

# Utility to create a user once.
async def ensure_user():
    async for db in get_db():  # get_db is a generator dependency
        existing = await db.execute("SELECT id FROM users LIMIT 1")
        if existing.first():
            return
        await create_user(db, email="test@example.com", full_name="Test", password="testpass123")
        return

async def _login(client: AsyncClient, email: str, password: str):
    resp = await client.post("/auth/token", data={"username": email, "password": password})
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    return data["access_token"]

async def test_auth_me_flow():
    await ensure_user()
    async with AsyncClient(app=app, base_url="http://test") as client:
        token = await _login(client, "test@example.com", "testpass123")
        headers = {"Authorization": f"Bearer {token}"}
        me = await client.get("/auth/me", headers=headers)
        assert me.status_code == status.HTTP_200_OK
        body = me.json()
        assert body["email"] == "test@example.com"
        assert "id" in body

async def test_auth_me_unauthorized():
    async with AsyncClient(app=app, base_url="http://test") as client:
        me = await client.get("/auth/me")
        assert me.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
