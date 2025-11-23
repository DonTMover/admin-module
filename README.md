## Встраиваемая админка (FastAPI + PostgreSQL)

Проект представляет собой прототип встраиваемого административного модуля для работы с PostgreSQL и простым веб UI (шаблоны Jinja2 + статика).

### Структура
```
src/
	app/
		core/        # Конфигурация и подключение к БД
		models/      # SQLAlchemy модели
		schemas/     # Pydantic схемы
		services/    # Логика и доступ к данным
		api/routes/  # Маршруты FastAPI (админка)
		ui/          # Шаблоны и статические файлы
		main.py      # Инициализация приложения
	main.py        # Точка входа (uvicorn)
```

### Переменные окружения
Используются префиксом `ADMIN_` (см. `config.py`):

| Переменная | Значение по умолчанию |
|------------|-----------------------|
| `ADMIN_POSTGRES_HOST` | `localhost` |
| `ADMIN_POSTGRES_PORT` | `5432` |
| `ADMIN_POSTGRES_DB`   | `admin_db` |
| `ADMIN_POSTGRES_USER` | `admin` |
| `ADMIN_POSTGRES_PASSWORD` | `admin` |

Формат строки подключения (async): `postgresql+asyncpg://user:pass@host:port/db`.

### Установка зависимостей
Используется стандартный `pyproject.toml`.

```powershell
cd src
pip install .  # или 'pip install -e .' для разработки
```

Либо напрямую:
```powershell
pip install fastapi uvicorn[standard] SQLAlchemy asyncpg jinja2 alembic pydantic
```

### Запуск дев-сервера
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

После запуска админка доступна: http://localhost:8000/admin/

Swagger UI: http://localhost:8000/admin/docs  
ReDoc: http://localhost:8000/admin/redoc  
OpenAPI JSON: http://localhost:8000/admin/openapi.json

### Миграции (Alembic)
Для продакшена рекомендуется настроить Alembic:
```powershell
alembic init migrations
# обновить env.py на использование async engine
alembic revision --autogenerate -m "init"
alembic upgrade head
```

### Тесты
Пример (создайте файл `tests/test_health.py`):
```python
def test_placeholder():
		assert True
```

Запуск:
```powershell
pytest
```

### Встраивание
Модуль можно импортировать как пакет и монтировать router `admin_router` в ваше приложение FastAPI:
```python
from app.api.routes.admin import router as admin_router
app.include_router(admin_router)
```

### Далее
- Добавить авторизацию (JWT / OAuth2)
- Расширить модели
- Реализовать CRUD интерфейсы
- Подключить систему ролей

