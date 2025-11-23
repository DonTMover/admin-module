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

### Эндпоинты API
| Назначение | Метод | Путь |
|------------|-------|------|
| Получить токен (OAuth2 Password) | POST | `/auth/token` |
| Список пользователей | GET | `/admin/users/` |
| Получить пользователя | GET | `/admin/users/{id}` |
| Создать пользователя | POST | `/admin/users/` |
| Обновить пользователя | PUT | `/admin/users/{id}` |
| Удалить пользователя | DELETE | `/admin/users/{id}` |
| Админ дашборд (HTML) | GET | `/admin/` |

### Документация OpenAPI
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

### Авторизация
Используется JWT Bearer. Получение токена:
```powershell
curl -X POST -d "username=<email>&password=<password>" http://localhost:8000/auth/token
```
Ответ:
```json
{"access_token": "<JWT>", "token_type": "bearer"}
```
Передавайте токен в заголовке:
`Authorization: Bearer <JWT>`

### Создание первого пользователя
Так как эндпоинты CRUD требуют авторизации, создайте первого пользователя вручную (скрипт или временный хук) либо добавьте seed:
Пример Python seed (временно):
```python
from app.core.db import SessionLocal
from app.services.user_service import create_user
import asyncio

async def seed():
	async with SessionLocal() as db:
		await create_user(db, email="admin@example.com", full_name="Admin", password="admin123")

asyncio.run(seed())
```
После этого получите токен через `/auth/token`.

### Далее (рекомендации)
### Запуск в Docker

Build & run (docker-compose):
```powershell
docker compose up --build -d
```

Сервисы:
| Service | Port (host:container) | Description |
|---------|-----------------------|-------------|
| admin-module | 8000:8000 | FastAPI админка (Swagger /admin/docs) |
| admin-postgres | 5433:5432 | PostgreSQL база данных |

Проверка:
```
http://localhost:8000/admin/
http://localhost:8000/admin/docs
```

Переменные окружения задаются в `docker-compose.yml` (префикс `ADMIN_`). Для продакшена вынесите секреты в `.env` и добавьте секцию `env_file:`.

### Использование как отдельный контейнер
Для интеграции в существующий стек добавьте сервис в ваш compose файл:
```yaml
	admin-module:
		image: your-registry/admin-module:latest
		environment:
			- ADMIN_POSTGRES_HOST=db
			- ADMIN_POSTGRES_PORT=5432
			- ADMIN_POSTGRES_DB=admin_db
			- ADMIN_POSTGRES_USER=admin
			- ADMIN_POSTGRES_PASSWORD=${ADMIN_POSTGRES_PASSWORD}
			- ADMIN_SECRET_KEY=${ADMIN_SECRET_KEY}
		ports:
			- "8000:8000"
		depends_on:
			- db
```
И импортируйте router при необходимости в ваше основное приложение или обращайтесь по HTTP.
- Роли и права доступа (RBAC)
- Пагинация и фильтрация списков
- Логирование аудита действий
- Alembic миграции вместо auto-create

