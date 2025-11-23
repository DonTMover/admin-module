# Deployment

Описание развёртывания Admin Module.

## Компоненты окружения

- **Backend/SPA контейнер** — собирается из `src/Dockerfile` и содержит:
  - Python + FastAPI приложение.
  - Собранный фронтенд (React SPA, Vite `dist`).
- **PostgreSQL** — база данных для хранения пользователей и других сущностей.
- **Caddy** — reverse proxy, который принимает HTTP‑запросы и проксирует их на контейнер backend/SPA.

(Точные сервисы и их настройки описаны в корневом `docker-compose.yml`.)

## Dockerfile (src/Dockerfile)

Dockerfile использует многоэтапную сборку.

### Этап 1: backend-build

- Базовый образ: `python:3.11-slim`.
- Копируется `pyproject.toml`.
- Устанавливаются системные зависимости (build-essential и т.п.).
- Обновляется `pip`, выполняется `pip install .` — установка зависимостей и самого приложения.
- Копируется папка `app/`.

На выходе — слой с установленными Python‑зависимостями и исходниками backend.

### Этап 2: frontend-build

- Базовый образ: `node:20-alpine`.
- Рабочая директория: `/frontend`.
- Копируются `package*.json` фронтенда.
- Выполняется `npm install` (с dev‑зависимостями: TypeScript, Vite и т.п.).
- Копируются остальные исходники фронта `frontend/admin-frontend`.
- Выполняется `npm run build`.

На выходе — папка `dist/` со статическим бандлом SPA.

### Этап 3: final

- Базовый образ: `python:3.11-slim`.
- Рабочая директория: `/app`.
- Копируется `/usr/local` из `backend-build` (все Python‑пакеты и интерпретатор).
- Копируется папка `app/`.
- Копируется результат фронтенд‑сборки (`/frontend/dist`) в `./app/ui/static/spa`.
- Создаётся системный пользователь `appuser`, меняются права на `/app`.
- Открывается порт `8000`.
- Точка входа: `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

## Поток HTTP‑запросов

1. Клиент обращается к Caddy (обычно `http://localhost` или домен).
2. Caddy проксирует запрос на контейнер `admin-module` (FastAPI на порту 8000).
3. FastAPI:
   - Для `/admin/*` — отдаёт `index.html` SPA или обрабатывает API‑роуты.
   - Для `/auth/*`, `/users/*`, `/admin/migrations/*` — обрабатывает API‑запросы.
   - Для `/assets/*` — отдаёт статические ассеты Vite.

## Переменные окружения

Backend считывает настройки из переменных окружения с префиксом `ADMIN_` (см. `Settings` в `app/core/config.py`):

- `ADMIN_POSTGRES_HOST`
- `ADMIN_POSTGRES_PORT`
- `ADMIN_POSTGRES_DB`
- `ADMIN_POSTGRES_USER`
- `ADMIN_POSTGRES_PASSWORD`
- `ADMIN_SECRET_KEY` — секрет для JWT.
- `ADMIN_DEBUG` — включает/выключает debug‑режим.

Также для Alembic можно задать:

- `ALEMBIC_INI` — путь к `alembic.ini` внутри контейнера (по умолчанию `alembic.ini` в рабочей директории).

## Миграции БД (Alembic)

### CLI

Вне контейнера (или внутри, если установлен Alembic) можно выполнять:

```powershell
alembic revision -m "описание"
alembic upgrade head
alembic downgrade -1
```

Настройки хранятся в `alembic.ini` и `alembic/` (версии миграций).

### Через web‑интерфейс

- Страница `/admin/migrations` доступна только авторизованным пользователям (на фронте), а backend дополнительно проверяет `is_admin`.
- Кнопка на странице вызывает `POST /admin/migrations/upgrade`, который:
  - Загружает конфиг Alembic.
  - Выполняет `upgrade head`.

Это удобный способ применить последние миграции без доступа к CLI, но только доверенным администраторам.

## Типичный сценарий запуска в Docker

1. Собрать образы:

```powershell
cd C:\Users\minec\vscode-projects\admin-module
docker compose build
```

2. Запустить сервисы:

```powershell
docker compose up
```

3. Дождаться, пока Postgres будет готов и backend инициализирует БД (см. `/health`).

4. Открыть в браузере `http://localhost` — Caddy проксирует на FastAPI/SPA.

5. Создать первого пользователя‑админа (через SQL/Alembic), выставив ему `is_admin = true`.

6. Залогиниться через `/admin/login` и пользоваться UI (управление пользователями, миграции и т.д.).

## Обновление приложения

- При изменении Python‑кода или зависимостей:
  - Пересобрать образ `admin-module` (backend‑контейнер).
- При изменении фронтенда:
  - Сборка `docker compose build` автоматически пересоберёт SPA и скопирует новый `dist` в образ.

После деплоя можно использовать страницу миграций для применения новых миграций Alembic в prod‑окружении (если это предусмотрено политиками безопасности).
