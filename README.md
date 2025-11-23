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

### Frontend & Tailwind
Добавлена полноценная цепочка сборки Tailwind:
1. Исходник `app/ui/static/css/tailwind-input.css` с `@tailwind` директивами и кастомными компонентами.
2. Конфиг `tailwind.config.js` (путь к шаблонам, палитра `brand`).
3. PostCSS конфиг `postcss.config.js` + зависимости (`tailwindcss`, `autoprefixer`).
4. Мультистейдж Docker собирает минифицированный `tailwind.css` и копирует в финальный образ.
Существующие `styles.css`, `theme.css`, `animations.css` остаются для переменных и анимаций.

401 ответы на маршрутах `/admin/*` теперь автоматически рендерят анимированный шаблон `not_authenticated.html` через кастомный `HTTPException` handler.

### План дальнейшего развития
- RBAC / роли
- Пагинация, сортировка, фильтры
- Аудит действий
- Полные Alembic миграции (отказ от auto-create + seed)
- Observability (metrics / tracing)
- Вынесение секретов из compose (Docker secrets / Vault) для продакшена
- Улучшение accessibility (контраст, aria-атрибуты)
- CSP / security заголовки через Caddy

### React (SPA) миграция админки
Отдельный фронтенд Vite + React + TypeScript находится в `src/frontend/admin-frontend` и постепенно заменяет Jinja2 шаблоны.

| Шаблон | Путь (SPA) | Компонент |
|--------|-----------|-----------|
| `admin/dashboard.html` | `/admin` | `Dashboard.tsx` |
| `admin/login.html` | `/admin/login` | `Login.tsx` |
| `admin/register.html` | `/auth/register` | `Register.tsx` |
| `admin/profile.html` | `/admin/profile` | `Profile.tsx` |
| `admin/not_authenticated.html` | Guard (401) | `NotAuthenticated.tsx` |
| — | `/auth/me` (API) | (используется в `fetchCurrentUser`) |

Layout (`base.html`) перенесён в `Layout.tsx`. Токен после логина (`/auth/token`) хранится в `localStorage` (для продакшена предпочтительно HttpOnly cookie).

Запуск фронтенда:
```powershell
cd src/frontend/admin-frontend
npm install
npm run dev
```
По умолчанию: `http://localhost:5173`. Backend: `http://localhost:8000`. Возможные стратегии интеграции:
1. Оставить два origin и включить CORS.
2. Reverse proxy (Caddy) объединяет: статический SPA + прокси на API.
3. Сборка (`npm run build`) и раздача `dist` через FastAPI (`StaticFiles`).

API слой: `src/services/api.ts` (Axios + интерцептор Authorization). Функции: `login`, `fetchUsers`, временный `fetchCurrentUser` (по payload JWT). Рекомендуется добавить эндпоинт `/auth/me`.
Теперь реализован `/auth/me` и `fetchCurrentUser` обращается напрямую.

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

Быстрая проверка:
1. Зарегистрируйтесь `/auth/register`.
2. Войдите `/admin/login`.
3. Дашборд `/admin` загрузит список пользователей.
4. Профиль `/admin/profile` покажет текущего пользователя (эвристически).

---
Локальная автоподключаемость к БД реализована через фоновые повторные попытки — упрощает разработку и последовательный старт контейнеров.

