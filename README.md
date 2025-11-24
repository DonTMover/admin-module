## Встраиваемая админка (FastAPI + PostgreSQL + React/MUI)

Административный модуль для управления пользователями и сущностями. Backend на FastAPI + PostgreSQL, frontend на React + TypeScript + Vite + MUI. Поддерживает отложенную (повторную) инициализацию БД: приложение стартует даже если Postgres не готов и периодически пытается создать схему.

### Структура
```
src/
	app/
		core/        # Конфигурация и подключение к БД
		models/      # SQLAlchemy модели
		schemas/     # Pydantic схемы
		services/    # Логика и доступ к данным
		api/routes/  # Маршруты FastAPI (API админки)
		ui/static/spa/ # Собранная React SPA
		main.py      # Инициализация приложения
	frontend/
		admin-frontend/ # Исходники React/MUI SPA (Vite)
```

Более подробное описание архитектуры — в `docs/ARCHITECTURE.md`, а также:

- Backend: `docs/BACKEND.md`
- Frontend: `docs/FRONTEND.md`
- Деплой: `docs/DEPLOYMENT.md`

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

> ⚠️ **Важно:** запуск приложения предполагается **только через Docker** (compose). Локальная установка зависимостей и прямой запуск `uvicorn` допускается только для отладки и не описан здесь подробно.

### Эндпоинты (основные)
| Назначение | Метод | Путь |
|------------|-------|------|
| Получить токен | POST | `/auth/token` |
| Текущий пользователь | GET | `/auth/me` |
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

Миграции уже настроены через Alembic (`alembic.ini`, каталог `alembic/`).

Варианты применения миграций:

1. **Через web‑интерфейс (рекомендуется):**
	- Залогиниться под админом.
	- Перейти на `/admin/migrations`.
	- Нажать кнопку "Выполнить upgrade head" — backend выполнит `alembic upgrade head`.

2. **Через CLI (для разработчиков):**
	- Локально установить dev‑зависимости (`pip install .[dev]`).
	- Выполнить:
	  ```powershell
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

### Запуск через Docker Compose (единственный поддерживаемый способ)

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

### Инициализация дополнительной БД `admin`
Чтобы подавить сообщения вида `FATAL:  database "admin" does not exist` добавлен файл `postgres-init/init-extra.sql` монтируемый в контейнер (`/docker-entrypoint-initdb.d`). Он создаёт вторую пустую БД `admin` при первом старте (когда каталог данных ещё пуст). Если volume уже существовал, скрипт не выполнится — удалите volume `admin-module_pg_data`, если хотите заново пересоздать все базы.

### Caddy: dev vs prod
Файл `Caddyfile` теперь по умолчанию настроен на локальный режим:
```caddy
localhost:80 {
	encode gzip
	reverse_proxy admin-module:8000
	respond /health 200
}
```
Продакшен пример (с публичным доменом и автоматическим TLS) оставлен закомментированным внизу файла. В деве внешний ACME отключён — это ускоряет запуск и избавляет от лишних попыток выдачи сертификата. Для локального HTTPS можно заменить `localhost:80` на:
```caddy
localhost {
	encode gzip
	tls internal
	reverse_proxy admin-module:8000
}
```

### Удаление устаревшего ключа `version`
В обоих compose файлах убран атрибут `version` (Docker игнорирует его в новых версиях, чтобы избежать путаницы).

Запуск (из корня репозитория):
```powershell
docker compose build
docker compose up -d
```

После старта:

- Открыть `http://localhost` — Caddy проксирует на FastAPI/SPA.
- Админка доступна по `/admin`.

Изменение параметров: правьте `environment:` у `admin-module` в `docker-compose.yml` / `docker-compose.override.yml` и перезапускайте `docker compose up -d`.

### Caddy Proxy
`Caddyfile` пример:
```caddy
admin.example.com {
	encode gzip
	reverse_proxy admin-module:8000
}
```

### Использование как отдельного контейнера (продакшн)

В продакшн‑окружении образ `admin-module` может подключаться к внешней БД и Caddy/nginx:

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

### Frontend (React/MUI SPA)

Jinja2‑шаблоны и Tailwind‑цепочка больше не используются в основном UI. Админка реализована как SPA на React + MUI в `src/frontend/admin-frontend` и собирается в Docker‑образе в папку `app/ui/static/spa`.

Обозреватель БД (`/admin/db`):

- Позволяет просматривать таблицы/строки и создавать новые таблицы.
- Для колонок с типом `text` форма ввода поддерживает удобный ввод многострочного текста с подсказкой по Markdown (заголовки, списки, ссылки и т.п.).
- В диалоге добавления/редактирования строк показывается «черновой предпросмотр» введённого Markdown‑текста.
- В списке колонок используется подсказка по наведению на пометку `PK`, раскрывающая термин (*Primary Key*).

### План дальнейшего развития
- RBAC / роли
- Пагинация, сортировка, фильтры
- Аудит действий
- Полные Alembic миграции (отказ от auto-create + seed)
- Observability (metrics / tracing)
- Вынесение секретов из compose (Docker secrets / Vault) для продакшена
- Улучшение accessibility (контраст, aria-атрибуты)
- CSP / security заголовки через Caddy

### React (SPA) структура

Отдельный фронтенд Vite + React + TypeScript находится в `src/frontend/admin-frontend` и **полностью заменяет** Jinja2‑шаблоны.

Ключевые маршруты SPA:

| Путь | Компонент |
|------|-----------|
| `/admin` | `Dashboard.tsx` |
| `/admin/login` | `Login.tsx` |
| `/auth/register` | `Register.tsx` |
| `/admin/profile` | `Profile.tsx` |
| `/admin/migrations` | `Migrations.tsx` |

Layout реализован в `Layout.tsx`. Токен после логина (`/auth/token`) хранится в `localStorage` (для продакшена можно перейти на HttpOnly cookie).

Следующие шаги SPA:
- Refresh токены / ротация.
- Ввести глобальный AuthContext вместо прямого чтения `localStorage`.
- Пагинация/фильтры пользователей, optimistic updates.
- Обработка 401/403 через Axios interceptor + авто-logout при exp.
- Перенос темизации и анимаций из сырых CSS в Tailwind слои/variants.
- Кодогенерация типов из OpenAPI (например `openapi-typescript`).

Усиление безопасности:
- HttpOnly cookie + CSRF защита.
- CSP (script-src 'self') + отключение inline скриптов.
- Регулярная валидация exp / refresh токенов.

### Оптимизация зависимостей и Docker multi-stage
В продакшн зависимостях исключён `alembic` (перенесён в `dev` extras). Runtime теперь включает только необходимые пакеты: FastAPI, SQLAlchemy, asyncpg, Jinja2, Pydantic(+settings), email-validator, passlib, python-jose, python-multipart.

Docker multi-stage:
1. `backend-build` – устанавливает продакшн зависимости и собирает Python код.
2. `tailwind-css` – генерирует минифицированный `tailwind.css` для Jinja fallback.
3. `frontend-build` – собирает React SPA (Vite → `dist`).
4. `final` – минимальный образ: копируются site-packages, backend код, CSS и SPA, создаётся **непривилегированный пользователь** `appuser`.

Дополнительные оптимизации:
- `.dockerignore` исключает `.venv`, `node_modules`, артефакты сборки → меньший контекст.
- Установка зависимостей после копирования только `pyproject.toml` повышает кешируемость слоя.
- В продакшн стадии Node использует `--production` для минимизации зависимостей.
- Переход на non-root пользователя уменьшает поверхность атаки.
- Разделение CSS и фронтенда ускоряет инкрементальные изменения (изменение React кода не пересобирает Python deps).
- Финальная стадия НЕ выполняет повторный `pip install .`, повторное создание wheel исключено — зависимости приходят из слоя `backend-build`.

Сборка и запуск:
```powershell
docker compose build admin-module
docker compose up -d
```

Многоархитектурная сборка (пример с buildx):
```powershell
docker buildx create --name multi --use
docker buildx build --platform linux/amd64,linux/arm64 -t yourrepo/admin-module:latest --push ./src
```

При необходимости разработки/миграций установите dev extras локально:
```powershell
pip install .[dev]
alembic revision --autogenerate -m "init"
alembic upgrade head
```

Быстрая проверка:
1. Зарегистрируйтесь `/auth/register`.
2. Войдите `/admin/login`.
3. Дашборд `/admin` загрузит список пользователей.
4. Профиль `/admin/profile` покажет текущего пользователя (эвристически).

---
Локальная автоподключаемость к БД реализована через фоновые повторные попытки — упрощает разработку и последовательный старт контейнеров.

### License

Proprietary, all rights reserved. See `LICENSE` for details.

