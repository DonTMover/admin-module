import pytest
from httpx import AsyncClient
from fastapi import status

from app.main import app
from app.core.db import get_db
from app.services.user_service import create_user


async def _create_admin_user():
    async for db in get_db():
        # naive check if any user exists
        exists = await db.execute("SELECT id FROM users LIMIT 1")
        if exists.first():
            return
        await create_user(db, email="admin@example.com", full_name="Admin", password="adminpass123")
        # direct update to mark as admin
        await db.execute("UPDATE users SET is_admin = true WHERE email = :email", {"email": "admin@example.com"})
        await db.commit()
        return


async def _login(email: str, password: str) -> str:
    async with AsyncClient(app=app, base_url="http://test") as client:
        resp = await client.post("/auth/token", data={"username": email, "password": password})
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        return data["access_token"]


@pytest.mark.asyncio
async def test_migrations_status_requires_admin():
    await _create_admin_user()
    token = await _login("admin@example.com", "adminpass123")
    async with AsyncClient(app=app, base_url="http://test") as client:
        # as admin
        headers = {"Authorization": f"Bearer {token}"}
        resp = await client.get("/admin/migrations/status", headers=headers)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["status"] == "ok"

        # without token
        resp_unauth = await client.get("/admin/migrations/status")
        assert resp_unauth.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


@pytest.mark.asyncio
async def test_migrations_upgrade_head_protected():
    await _create_admin_user()
    token = await _login("admin@example.com", "adminpass123")

    async with AsyncClient(app=app, base_url="http://test") as client:
        # as admin
        headers = {"Authorization": f"Bearer {token}"}
        resp = await client.post("/admin/migrations/upgrade", headers=headers)
        # if alembic is misconfigured, we still expect 5xx, but not 4xx
        assert resp.status_code in (status.HTTP_200_OK, status.HTTP_500_INTERNAL_SERVER_ERROR)

        # anonymous should be rejected
        resp_anon = await client.post("/admin/migrations/upgrade")
        assert resp_anon.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
