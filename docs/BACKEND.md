# Backend

Подробное описание backend‑части Admin Module.

## Технологический стек

- FastAPI — веб‑фреймворк и декларация маршрутов.
- SQLAlchemy Async — работа с PostgreSQL в асинхронном режиме.
- Pydantic / pydantic-settings — валидация данных и конфигурация.
- Alembic — миграции схемы БД.

## Конфигурация (`app/core/config.py`)

Класс `Settings` описывает настройки приложения, читаемые из переменных окружения с префиксом `ADMIN_`:

- `app_name`, `debug` — базовые настройки.
- `postgres_host`, `postgres_port`, `postgres_db`, `postgres_user`, `postgres_password` — параметры подключения к БД.
- `secret_key`, `jwt_algorithm`, `access_token_expire_minutes` — безопасность и JWT.

Свойство `database_url_async` строит URL вида:

```text
postgresql+asyncpg://<user>:<password>@<host>:<port>/<db>
```

`get_settings()` кэшируется (`@lru_cache()`), чтобы не пересоздавать объект настроек.

## Подключение к БД (`app/core/db.py`, `app/core/db_init.py`)

### `app/core/db.py`

- `engine = create_async_engine(settings.database_url_async, echo=settings.debug, future=True)` — создаёт async‑движок.
- `SessionLocal = async_sessionmaker(..., class_=AsyncSession)` — фабрика сессий.
- `async def get_db()` — зависимость FastAPI:
  - Открывает `AsyncSession` через контекстный менеджер;
  - `yield` сессию в обработчик;
  - по выходу автоматически закрывает.

### `app/core/db_init.py`

- `try_initialize(engine)` — пытается создать таблицы (`Base.metadata.create_all`) и отмечает результат.
- `background_db_initializer(engine, interval_seconds)` — фоновая корутина, которая периодически повторяет попытку подключения и создания схемы.
- Глобальные переменные:
  - `db_initialized: bool` — признак, удалось ли инициализировать БД.
  - `db_last_error: str | None` — последний текст ошибки.
  - `db_attempts: int` — количество попыток.

Эти значения используются в эндпоинте `/health`.

## Модели (`app/models`)

### Базовый класс (`app/models/base.py`)

Содержит общий `Base` (обычно `DeclarativeBase`), от которого наследуются все модели SQLAlchemy.

### Модель пользователя (`app/models/user.py`)

Модель `User` описывает таблицу пользователей:

- `id: int` — первичный ключ.
- `email: str` — уникальный email, индексированный.
- `full_name: str | None` — опциональное ФИО.
- `password_hash: str` — хеш пароля.
- `is_admin: bool` — флаг, определяющий, является ли пользователь админом.
- `created_at: datetime` — дата создания.
- `last_login: datetime | None` — последнее время логина.
- `login_count: int` — счётчик логинов.

## Безопасность и JWT (`app/core/security.py`)

Используется `passlib` для хеширования паролей и `python-jose` для JWT.

Основные функции:

- `hash_password(password: str) -> str` — хеширует пароль.
- `verify_password(password: str, hashed: str) -> bool` — проверяет пароль.
- `create_access_token(subject: str, expires_delta: Optional[int]) -> str` — создаёт JWT с `sub` (обычно email пользователя) и `exp`.

### Аутентификация пользователя

- `oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")` — стандартная схема для получения токена.
- `async def get_current_user(token=Depends(oauth2_scheme), db=Depends(get_db)) -> User`:
  - Декодирует JWT, достаёт `sub` (email).
  - Ищет пользователя в БД через SQLAlchemy.
  - При ошибках выбрасывает `HTTP_401_UNAUTHORIZED`.

### Проверка прав админа

- `ensure_is_admin(user: User)` — вспомогательная функция:
  - Если `user.is_admin` не `True`, выбрасывает `HTTP_403_FORBIDDEN` с сообщением `"Admin privileges required"`.

Эта функция используется в админских эндпоинтах, например для вызова Alembic‑миграций.

## FastAPI‑приложение (`app/main.py`)

Создание приложения:

- Опции `docs_url`, `redoc_url`, `openapi_url` сдвинуты под префикс `/admin/*`, чтобы документация была доступна только из админской зоны.

Регистрация роутеров:

- `auth_router` (`app/api/routes/auth.py`).
- `users_router` (`app/api/routes/users.py`).
- `admin_router` (`app/api/routes/admin.py`).

Обработчик ошибок:

- Кастомный `@app.exception_handler(HTTPException)` возвращает HTML‑ответ с кодом и текстом.

Статика и SPA:

- `/static` — общая статика из `app/ui/static`.
- `/assets` — ассеты SPA (`app/ui/static/spa/assets`), которые подгружаются из Vite‑бандла.
- `SPA_INDEX = Path("app/ui/static/spa/index.html")` — корневой `index.html` SPA.
- `/` → редирект на `/admin/`.
- `/admin/{path:path}` → отдаёт `index.html` SPA (если существует), иначе `503`.

Health:

- `/health` — JSON со статусом и информацией о доступности БД (значения из `db_init.py`).

Startup:

- `on_startup` вызывает `try_initialize(engine)`, а если БД недоступна, запускает `background_db_initializer`.

## Роуты аутентификации (`app/api/routes/auth.py`)

### `POST /auth/token`

- Принимает `OAuth2PasswordRequestForm` (`username`, `password`).
- Использует `authenticate_user(db, username, password)` из `user_service`.
- При успехе возвращает JWT (`access_token`, `token_type`).

### `GET /auth/me`

- Зависит от `get_current_user`.
- Возвращает Pydantic‑схему `UserRead` (email, имя и т.п.).

### `GET /auth/register`

- При наличии собранной SPA (`SPA_INDEX.exists()`) отдаёт `index.html`, остальное делает фронтенд.
- При отсутствии SPA отдаёт JSON `{"spa": "missing"}`.

### `POST /auth/register`

- Принимает поля `email`, `full_name`, `password` из HTML‑формы.
- Проверяет, что пользователя с таким email ещё нет.
- Создаёт пользователя через `create_user`.
- После успешной регистрации редиректит на `/admin/login`.

## Админские роуты и Alembic (`app/api/routes/admin.py`)

### SPA‑маршруты

- `GET /admin/` — отдаёт `index.html` SPA для авторизованных пользователей.
- `GET /admin/profile` — SPA‑страница профиля (плюс расчёт статистики по пользователю, если нужно).
- `GET /admin/login` — SPA‑страница логина.

### Alembic

Импорты:

- `from alembic import command`
- `from alembic.config import Config`

Утилита:

- `_get_alembic_config()` — ищет `alembic.ini` в пути из `ALEMBIC_INI` или по умолчанию `alembic.ini` в рабочей директории. Если файл не найден — `FileNotFoundError`.

Эндпоинты:

- `GET /admin/migrations/status`:
  - Требует авторизованного пользователя и `ensure_is_admin(current_user)`.
  - Возвращает `{ "status": "ok" }` — индикатор доступности сервиса миграций.

- `POST /admin/migrations/upgrade`:
  - Также требует админа (через `ensure_is_admin`).
  - Загружает конфиг Alembic: `cfg = _get_alembic_config()`.
  - Вызывает `command.upgrade(cfg, "head")`.
  - При ошибках возвращает `HTTP_500` с деталями.
  - При успехе — `{ "status": "ok", "message": "Migrations upgraded to head" }`.

## Пользовательский сервис (`app/services/user_service.py`)

Основные функции (упрощённо):

- `authenticate_user(db, email, password)` — проверяет логин и пароль.
- `create_user(db, email, full_name, password)` — создаёт пользователя с хешированным паролем.
- `get_user_by_email(db, email)` — поиск пользователя по email.
- `list_users(db)` — список пользователей (для админского дашборда).

## Pydantic‑схемы (`app/schemas/user.py`)

- Содержат DTO для обмена данными между backend и frontend, например:
  - `UserRead` — то, что возвращается в `/auth/me`.

## Поток аутентификации и авторизации

1. Пользователь отправляет логин и пароль на `/auth/token`.
2. Backend проверяет их и выдаёт JWT.
3. Фронтенд сохраняет JWT в `localStorage` и подставляет в заголовок `Authorization`.
4. При обращении к защищённым эндпоинтам backend использует `get_current_user`.
5. Для операций, требующих админских прав (например, миграции), вызывается `ensure_is_admin`.
