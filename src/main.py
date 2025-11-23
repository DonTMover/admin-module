"""Точка входа для локального запуска через python src/main.py.

Использует uvicorn для старта FastAPI приложения.
"""

if __name__ == "__main__":
    import uvicorn  # lazy import
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
