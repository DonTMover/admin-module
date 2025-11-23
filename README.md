## Встраиваемая админка (FastAPI + PostgreSQL)

Прототип административного модуля: FastAPI + PostgreSQL, Jinja2 шаблоны и статика, JWT авторизация. Поддерживает отложенную (повторную) инициализацию БД: приложение стартует даже если Postgres не готов и периодически пытается создать схему.

### Структура
```
src/
	app/
		core/        # Конфигурация и подключение к БД
		models/      # SQLAlchemy модели
		schemas/     # Pydantic схемы
		services/    # Логика и доступ к данным
		api/routes/  # Маршруты FastAPI (админка)
		ui/          # Шаблоны и статика
		main.py      # Инициализация приложения
	main.py        # Точка входа (uvicorn)
```

### Переменные окружения (`ADMIN_`)
Все переменные теперь задаются напрямую внутри `docker-compose.yml` (без файла `.env`). Для изменения конфигурации правьте блок `environment:` у сервиса `admin-module`.

| Переменная | Текущее значение (compose) | Назначение |
|------------|---------------------------|-----------|
| `ADMIN_POSTGRES_HOST` | `postgres` | Хост БД (имя сервисa Postgres) |
| `ADMIN_POSTGRES_PORT` | `5432` | Порт |
| `ADMIN_POSTGRES_DB` | `admin_db` | Имя базы |
| `ADMIN_POSTGRES_USER` | `admin` | Пользователь |
| `ADMIN_POSTGRES_PASSWORD` | `supersecretpassword` | Пароль |
| `ADMIN_SECRET_KEY` | `CHANGE_ME_SUPER_SECRET` | JWT секрет |

Строка подключения (async): `postgresql+asyncpg://user:pass@host:port/db`.

### Установка зависимостей
```powershell
cd src
pip install .  # или 'pip install -e .'
```
Или минимально:
```powershell
pip install fastapi uvicorn[standard] sqlalchemy asyncpg jinja2 alembic pydantic pydantic-settings
```

### Dev-запуск
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Админка: http://localhost:8000/admin/

### Эндпоинты (основные)
| Назначение | Метод | Путь |
|------------|-------|------|
| Получить токен | POST | `/auth/token` |
| CRUD пользователи | GET/POST/PUT/DELETE | `/admin/users/…` |
| Дашборд | GET | `/admin/` |

### OpenAPI
Swagger: `/admin/docs` • ReDoc: `/admin/redoc` • JSON: `/admin/openapi.json`

### Healthcheck и статус БД
`GET /health` →
```json
{
	"status": "ok",
	"db_initialized": true/false,
	"db_error": "<last error or null>"
}
```
Если база недоступна при старте — фоновой task повторяет попытки каждые ~10 секунд до успеха.

### Миграции (Alembic)
Рекомендуется заменить авто‑создание на миграции:
```powershell
alembic init migrations
alembic revision --autogenerate -m "init"
alembic upgrade head
```

### Тесты (пример)
```python
def test_placeholder():
		assert True
```
Запуск: `pytest`

### JWT Авторизация
Получение токена:
```powershell
curl -X POST -d "username=<email>&password=<password>" http://localhost:8000/auth/token
```
Ответ содержит `access_token`. Передавайте: `Authorization: Bearer <token>`.

### Seed пользователя (временно)
```python
from app.core.db import SessionLocal
from app.services.user_service import create_user
import asyncio

async def seed():
		async with SessionLocal() as db:
				await create_user(db, email="admin@example.com", full_name="Admin", password="admin123")

asyncio.run(seed())
```

### Docker Compose (локально с Postgres)
Сервисы: `postgres`, `admin-module`, `caddy`.

Базовые переменные (host, port, db, user) определены в `docker-compose.yml`. Чувствительные данные вынесены в `docker-compose.override.yml`:

`docker-compose.yml` (фрагмент):
```yaml
	admin-module:
		environment:
			- ADMIN_POSTGRES_HOST=postgres
			- ADMIN_POSTGRES_PORT=5432
			- ADMIN_POSTGRES_DB=admin_db
			- ADMIN_POSTGRES_USER=admin
			# Пароль и секрет вынесены в docker-compose.override.yml
```

`docker-compose.override.yml`:
```yaml
services:
	admin-module:
		environment:
			- ADMIN_POSTGRES_PASSWORD=supersecretpassword
			- ADMIN_SECRET_KEY=CHANGE_ME_SUPER_SECRET
```

Compose автоматически подхватит override файл при запуске. Для продакшена рекомендуется НЕ коммитить файл с секретами, а передавать их через внешние механизмы (Docker secrets, Swarm/K8s config/secrets, Vault, переменные окружения CI/CD).

Запуск:
```powershell
docker compose up --build -d
```
Изменение параметров: правьте `environment:` у `admin-module` и перезапустите `docker compose up -d`.

### Caddy Proxy
`Caddyfile` пример:
```caddy
admin.example.com {
	encode gzip
	reverse_proxy admin-module:8000
}
```

### Использование как отдельного контейнера
```yaml
admin-module:
	image: your-registry/admin-module:latest
	environment:
		ADMIN_POSTGRES_HOST: postgres
		ADMIN_POSTGRES_PORT: 5432
		ADMIN_POSTGRES_DB: admin_db
		ADMIN_POSTGRES_USER: admin
		ADMIN_POSTGRES_PASSWORD: supersecretpassword
		ADMIN_SECRET_KEY: CHANGE_ME_SUPER_SECRET
	ports:
		- "8000:8000"
```

### План дальнейшего развития
- RBAC / роли
- Пагинация, сортировка, фильтры
- Аудит действий
- Полные Alembic миграции (отказ от auto-create + seed)
- Observability (metrics / tracing)
- Вынесение секретов из compose (Docker secrets / Vault) для продакшена

---
Локальная автоподключаемость к БД реализована через фоновые повторные попытки — упрощает разработку и последовательный старт контейнеров.

