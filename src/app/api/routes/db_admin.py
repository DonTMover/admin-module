from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine

from app.core.db import engine as default_engine, get_db
from app.core.security import get_current_user, ensure_is_admin


router = APIRouter(prefix="/admin/db", tags=["db-admin"])


# --- Simple in-memory connection registry (process-local, non-persistent) ---

class DbConnection:
    def __init__(self, conn_id: int, name: str, dsn: str, read_only: bool, engine: AsyncEngine):
        self.id = conn_id
        self.name = name
        self.dsn = dsn
        self.read_only = read_only
        self.engine = engine


_connections: Dict[int, DbConnection] = {}
_next_conn_id: int = 1
_active_connection_id: Optional[int] = None


async def get_active_engine() -> AsyncEngine:
    """Return engine for active connection or default app engine.

    For now, admin DB UI can switch between process-local connections.
    """
    if _active_connection_id is None:
        return default_engine
    conn = _connections.get(_active_connection_id)
    if conn is None:
        return default_engine
    return conn.engine


@router.get("/connections")
async def list_connections(current_user=Depends(get_current_user)):
    """List available DB connections (process-local).

    Connection id=0 represents the default application database.
    """
    ensure_is_admin(current_user)
    items = [
        {
            "id": 0,
            "name": "default",
            "dsn": "<app default>",
            "read_only": False,
            "active": _active_connection_id is None,
        }
    ]
    for conn_id, conn in _connections.items():
        items.append(
            {
                "id": conn_id,
                "name": conn.name,
                "dsn": conn.dsn,
                "read_only": conn.read_only,
                "active": _active_connection_id == conn_id,
            }
        )
    return items


@router.post("/connections/test")
async def test_connection(payload: Dict[str, Any], current_user=Depends(get_current_user)):
    """Test DSN by attempting simple SELECT 1.

    Body: {"dsn": "postgresql+asyncpg://...", "read_only": bool?, "name": str?}
    """
    ensure_is_admin(current_user)
    dsn = payload.get("dsn")
    if not isinstance(dsn, str) or not dsn:
        raise HTTPException(status_code=400, detail="'dsn' must be non-empty string")

    test_engine = create_async_engine(dsn, echo=False, future=True)
    try:
        async with test_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Connection failed: {exc}") from exc
    finally:
        await test_engine.dispose()

    return {"ok": True}


@router.post("/connections")
async def create_connection(payload: Dict[str, Any], current_user=Depends(get_current_user)):
    """Create a new named connection and make it available for selection.

    Body: {"name": str, "dsn": str, "read_only": bool?}
    """
    global _next_conn_id
    ensure_is_admin(current_user)
    name = payload.get("name") or "custom"
    dsn = payload.get("dsn")
    read_only = bool(payload.get("read_only") or False)
    if not isinstance(dsn, str) or not dsn:
        raise HTTPException(status_code=400, detail="'dsn' must be non-empty string")

    # create engine but do not test here (recommend using /connections/test first)
    new_engine = create_async_engine(dsn, echo=False, future=True)
    conn_id = _next_conn_id
    _next_conn_id += 1

    _connections[conn_id] = DbConnection(conn_id, str(name), dsn, read_only, new_engine)
    return {
        "id": conn_id,
        "name": name,
        "dsn": dsn,
        "read_only": read_only,
    }


@router.post("/connections/{conn_id}/activate")
async def activate_connection(conn_id: int, current_user=Depends(get_current_user)):
    """Activate given connection id, or 0 to use default app DB."""
    global _active_connection_id
    ensure_is_admin(current_user)
    if conn_id == 0:
        _active_connection_id = None
        return {"active": 0}
    if conn_id not in _connections:
        raise HTTPException(status_code=404, detail="Connection not found")
    _active_connection_id = conn_id
    return {"active": conn_id}


@router.get("/tables")
async def list_tables(
    current_user=Depends(get_current_user),
):
    """Return list of user tables in the current database.

    Only for authenticated admins.
    """
    ensure_is_admin(current_user)
    engine = await get_active_engine()
    # Works for PostgreSQL; filters out internal schemas
    q = text(
        """
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name
        """
    )
    async with AsyncSession(engine) as session:
        result = await session.execute(q)
        rows = result.mappings().all()
    return [
        {
            "schema": row["table_schema"],
            "name": row["table_name"],
            "full_name": f"{row['table_schema']}.{row['table_name']}",
        }
        for row in rows
    ]


@router.get("/table/{schema}/{table}")
async def read_table(
    schema: str,
    table: str,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user=Depends(get_current_user),
):
    """Return rows of the given table with simple pagination.

    Only for authenticated admins.
    """
    ensure_is_admin(current_user)

    identifier = f'"{schema}"."{table}"'
    engine = await get_active_engine()

    async with AsyncSession(engine) as session:
        # Fetch total count
        count_q = text(f"SELECT COUNT(*) AS cnt FROM {identifier}")
        try:
            count_result = await session.execute(count_q)
        except Exception as exc:  # table might not exist, etc.
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        total = int(count_result.scalar_one())

        # Fetch page of data
        data_q = text(f"SELECT * FROM {identifier} OFFSET :offset LIMIT :limit")
        data_result = await session.execute(data_q, {"offset": offset, "limit": limit})
        rows = [dict(r) for r in data_result.mappings().all()]

    return {"total": total, "rows": rows}


@router.get("/table/{schema}/{table}/meta")
async def table_meta(
    schema: str,
    table: str,
    current_user=Depends(get_current_user),
):
    """Return basic metadata for the given table (columns, PK, uniques)."""
    ensure_is_admin(current_user)
    engine = await get_active_engine()

    # Columns
    cols_q = text(
        """
        SELECT
          c.column_name,
          c.data_type,
          c.is_nullable = 'YES' AS is_nullable,
          c.column_default       AS column_default
        FROM information_schema.columns c
        WHERE c.table_schema = :schema
          AND c.table_name   = :table
        ORDER BY c.ordinal_position
        """
    )
    async with AsyncSession(engine) as session:
        cols_res = await session.execute(cols_q, {"schema": schema, "table": table})
    columns: List[Dict[str, Any]] = []
    for row in cols_res.mappings().all():
        columns.append(
            {
                "name": row["column_name"],
                "data_type": row["data_type"],
                "is_nullable": bool(row["is_nullable"]),
                "has_default": row["column_default"] is not None,
                "default": row["column_default"],
                "is_primary_key": False,  # filled below
                "is_unique": False,       # filled below
            }
        )

    # Primary key
    pk_q = text(
        """
        SELECT
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema    = kcu.table_schema
        WHERE tc.table_schema = :schema
          AND tc.table_name   = :table
          AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position
        """
    )
    async with AsyncSession(engine) as session:
        pk_res = await session.execute(pk_q, {"schema": schema, "table": table})
    pk_columns = [r[0] for r in pk_res.fetchall()]

    # Unique constraints
    uniq_q = text(
        """
        SELECT
          tc.constraint_name,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema    = kcu.table_schema
        WHERE tc.table_schema = :schema
          AND tc.table_name   = :table
          AND tc.constraint_type = 'UNIQUE'
        ORDER BY tc.constraint_name, kcu.ordinal_position
        """
    )
    async with AsyncSession(engine) as session:
        uniq_res = await session.execute(uniq_q, {"schema": schema, "table": table})
    unique_indexes: Dict[str, List[str]] = {}
    for cname, col in uniq_res.fetchall():
        unique_indexes.setdefault(cname, []).append(col)

    # Mark PK / unique flags on columns
    pk_set = set(pk_columns)
    uniq_cols = set(col for cols in unique_indexes.values() for col in cols)
    for col in columns:
        if col["name"] in pk_set:
            col["is_primary_key"] = True
        if col["name"] in uniq_cols:
            col["is_unique"] = True

    return {
        "schema": schema,
        "name": table,
        "primary_key": pk_columns,
        "unique_indexes": [
            {"name": name, "columns": cols} for name, cols in unique_indexes.items()
        ],
        "columns": columns,
    }


@router.post("/table/{schema}/{table}/rows")
async def insert_row(
    schema: str,
    table: str,
    payload: Dict[str, Any],
    current_user=Depends(get_current_user),
):
    """Insert a new row into the table.

    Expects body: {"values": {"col": value, ...}}
    """
    ensure_is_admin(current_user)
    engine = await get_active_engine()
    values = payload.get("values") or {}
    if not isinstance(values, dict):
        raise HTTPException(status_code=400, detail="'values' must be an object")

    identifier = f'"{schema}"."{table}"'
    if not values:
        # Simple case: rely purely on defaults
        q = text(f"INSERT INTO {identifier} DEFAULT VALUES RETURNING *")
        async with AsyncSession(engine) as session:
            result = await session.execute(q)
            row = result.mappings().first()
            await session.commit()
        return {"row": dict(row) if row is not None else None}

    cols = list(values.keys())
    col_names = ", ".join(f'"{c}"' for c in cols)
    col_params = ", ".join(f':{c}' for c in cols)
    q = text(f"INSERT INTO {identifier} ({col_names}) VALUES ({col_params}) RETURNING *")
    try:
        async with AsyncSession(engine) as session:
            result = await session.execute(q, values)
            row = result.mappings().first()
            await session.commit()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"row": dict(row) if row is not None else None}


@router.put("/table/{schema}/{table}/rows")
async def update_row(
    schema: str,
    table: str,
    payload: Dict[str, Any],
    current_user=Depends(get_current_user),
):
    """Update a row identified by key.

    Body: {"key": {"id": ...}, "values": {"col": newValue, ...}}
    """
    ensure_is_admin(current_user)
    engine = await get_active_engine()
    key = payload.get("key") or {}
    values = payload.get("values") or {}
    if not isinstance(key, dict) or not key:
        raise HTTPException(status_code=400, detail="'key' must be a non-empty object")
    if not isinstance(values, dict) or not values:
        raise HTTPException(status_code=400, detail="'values' must be a non-empty object")

    identifier = f'"{schema}"."{table}"'

    set_parts = [f'"{col}" = :set_{col}' for col in values.keys()]
    where_parts = [f'"{col}" = :key_{col}' for col in key.keys()]

    params: Dict[str, Any] = {}
    for col, val in values.items():
        params[f"set_{col}"] = val
    for col, val in key.items():
        params[f"key_{col}"] = val

    q = text(
        f"UPDATE {identifier} SET "
        + ", ".join(set_parts)
        + " WHERE "
        + " AND ".join(where_parts)
        + " RETURNING *"
    )

    try:
        async with AsyncSession(engine) as session:
            result = await session.execute(q, params)
            rows = result.mappings().all()
            await session.commit()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not rows:
        raise HTTPException(status_code=404, detail="Row not found")
    if len(rows) > 1:
        raise HTTPException(status_code=409, detail="Row not uniquely identified by key")

    return {"row": dict(rows[0])}


@router.delete("/table/{schema}/{table}/rows")
async def delete_row(
    schema: str,
    table: str,
    payload: Dict[str, Any],
    current_user=Depends(get_current_user),
):
    """Delete a row identified by key.

    Body: {"key": {"id": ...}}
    """
    ensure_is_admin(current_user)
    engine = await get_active_engine()
    key = payload.get("key") or {}
    if not isinstance(key, dict) or not key:
        raise HTTPException(status_code=400, detail="'key' must be a non-empty object")

    identifier = f'"{schema}"."{table}"'
    where_parts = [f'"{col}" = :key_{col}' for col in key.keys()]
    params: Dict[str, Any] = {f"key_{col}": val for col, val in key.items()}

    q = text(
        f"DELETE FROM {identifier} WHERE "
        + " AND ".join(where_parts)
    )

    try:
        async with AsyncSession(engine) as session:
            result = await session.execute(q, params)
            deleted = result.rowcount or 0
            await session.commit()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if deleted == 0:
        raise HTTPException(status_code=404, detail="Row not found")
    # If deleted > 1, это всё равно действие пользователя; можно предупредить, но не ошибка

    return {"deleted": deleted}
