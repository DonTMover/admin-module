# Admin Module — обзор архитектуры

Этот файл даёт краткий обзор проекта и ссылки на более подробные документы.

## Что это за проект

Admin Module — административный модуль для управления пользователями и сущностями.

Компоненты:

- **Backend** — FastAPI + SQLAlchemy Async + PostgreSQL.
- **Frontend** — React + TypeScript + Vite + MUI (Material Design 3‑подобная тема).
- **Инфраструктура** — Docker (multi-stage build) + Caddy как reverse proxy.
- **Alembic** — миграции БД с кнопкой `upgrade head` в web‑интерфейсе (только для админов).

Backend и фронт собираются в один контейнер (`src/Dockerfile`), FastAPI отдаёт API и статический бандл SPA, а Caddy проксирует HTTP‑трафик на FastAPI.

## Где искать подробности

- `BACKEND.md` — детали backend: конфигурация, БД, безопасность, модели, роуты, Alembic.
- `FRONTEND.md` — структура фронта: маршрутизация, страницы, MUI‑тема, работа с API.
- `DEPLOYMENT.md` — развёртывание: Dockerfile, окружения, Caddy, миграции и типичный сценарий запуска.

## Основная структура исходников (src)

- `app/` — весь backend‑код FastAPI.
- `frontend/admin-frontend/` — исходники React SPA.
- `Dockerfile` — multi-stage сборка backend + frontend в один образ.
- `pyproject.toml` — Python‑зависимости и настройки.
- `tests/` — автотесты backend.

За деталями по каждому слою смотри соответствующие файлы в `docs/`.
