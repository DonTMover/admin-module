# Frontend

Подробное описание фронтенд‑части Admin Module (React SPA).

## Технологический стек

- React + TypeScript.
- Vite — сборка и dev‑сервер.
- React Router — маршрутизация.
- @tanstack/react-query — работа с запросами к API и кешированием.
- MUI (Material UI) + Emotion — реализация дизайна в стиле Material Design 3.
- Axios — HTTP‑клиент.

Исходники фронта находятся в `frontend/admin-frontend`.

## Точка входа (`src/App.tsx`)

- Создаётся `QueryClient` для `react-query`.
- Настраивается MUI‑тема через `createTheme` (primary цвет `#6750A4`, закругления и т.п.).
- Корневой компонент оборачивает всё в:
  - `QueryClientProvider` — чтобы `react-query` был доступен по всему приложению.
  - `ThemeProvider` с темой MUI.
  - `CssBaseline` — базовый сброс стилей.
  - `BrowserRouter` — маршрутизация на стороне клиента.
- Внутри рендерится `AppRoutes`.

## Маршрутизация (`src/routes/AppRoutes.tsx`)

Файл описывает основные маршруты приложения:

- `isAuthed()` — утилита, проверяющая наличие `access_token` в `localStorage`.

Маршруты:

- `/` → `Navigate` на `/admin`.
- `/admin` → `Dashboard` при наличии токена, иначе `NotAuthenticated`.
- `/admin/profile` → `Profile` при наличии токена, иначе `NotAuthenticated`.
- `/admin/migrations` → `MigrationsPage` при наличии токена, иначе `NotAuthenticated`.
- `/admin/login` → `Login`.
- `/auth/register` → `Register`.
- `*` → `NotAuthenticated`.

Все эти маршруты вложены в общий `Layout`, который задаёт верхнюю панель и контейнер для контента.

## Layout (`src/ui/Layout.tsx`)

- Использует MUI `AppBar`, `Toolbar`, `Container`, `Box` и другие компоненты.
- Заголовок: "Панель администратора".
- Навигационные кнопки:
  - `Dashboard` → `/admin`.
  - `Register` → `/auth/register`.
  - Если пользователь авторизован (есть токен):
    - `Profile` → `/admin/profile`.
    - `Migrations` → `/admin/migrations`.
- В правой части:
  - Если токена нет — кнопка `Login`.
  - Если токен есть — иконка `Logout`, которая очищает `localStorage` и перенаправляет на `/admin/login`.
- Контент (`<Outlet />`) центрирован и ограничен по ширине (`maxWidth: 960`), что даёт аккуратный вид на широких экранах.

## Клиент API (`src/services/api.ts`)

- Создаётся экземпляр `axios` с `baseURL: '/'`.
- В `interceptors.request` добавляется заголовок `Authorization: Bearer <token>` при наличии `access_token` в `localStorage`.

Экспортируемые функции:

- `login(email, password)` — отправляет форму на `/auth/token`, сохраняет `access_token` в `localStorage`.
- `fetchUsers()` — `GET /admin/users/`, список пользователей для дашборда.
- `fetchCurrentUser()` — `GET /auth/me`, при ошибке возвращает `null`.
- `migrationsStatus()` — `GET /admin/migrations/status`.
- `migrationsUpgradeHead()` — `POST /admin/migrations/upgrade`.

Интерфейс `User` описывает минимальный набор полей пользователя (email, full_name, даты и т.д.).

## Страницы

### Login (`src/pages/Login.tsx`)

- Форма логина на основе MUI `Card`, `TextField`, `Button`.
- При сабмите вызывает `login(email, password)`.
- В случае успеха перенаправляет на `/admin`.
- Показывает ошибки (например, неверные учётные данные).

### Register (`src/pages/Register.tsx`)

- Форма регистрации (email, имя, пароль и подтверждение).
- Обращается к backend `/auth/register` (через POST‑запрос / форму) и, при успехе, перенаправляет на страницу логина.
- Использует те же MUI‑компоненты для единообразного вида.

### Dashboard (`src/pages/Dashboard.tsx`)

- Использует `react-query` для загрузки списка пользователей через `fetchUsers()`.
- Показывает:
  - Карточки/статистику (например, количество пользователей).
  - Таблицу пользователей (`Table`, `TableRow`, `TableCell` и т.д.).
- Обрабатывает состояния загрузки и ошибок (Skeleton / Alert).

### Profile (`src/pages/Profile.tsx`)

- Загрузка текущего пользователя через `fetchCurrentUser()`.
- Отображает информацию о пользователе (email, имя, время создания, последнее посещение и т.п.).
- Кнопка logout, дублирующая поведение в `Layout`.

### NotAuthenticated (`src/pages/NotAuthenticated.tsx`)

- Страница, которая показывается, если пользователь не авторизован.
- Содержит поясняющий текст и кнопки для перехода на `/admin/login` и `/auth/register`.
- Оформлена в виде двух колонок / блоков на MUI `Grid` и `Paper`.

### Migrations (`src/pages/Migrations.tsx`)

- Страница управления миграциями БД (Alembic).
- Использует `react-query`:
  - `useQuery` для `migrationsStatus()` — проверяет, доступен ли сервис миграций.
  - `useMutation` для `migrationsUpgradeHead()` — выполняет `alembic upgrade head` через backend.
- Отображает:
  - `Alert` с текущим статусом (доступен/недоступен).
  - Кнопку "Выполнить upgrade head".
  - Сообщения об успехе/ошибке выполнения миграций.

### DbBrowser (`src/pages/DbBrowser.tsx`)

- Обозреватель таблиц активного подключения к БД.
- Позволяет:
  - выбирать существующие таблицы и смотреть строки с пагинацией;
  - добавлять/редактировать/удалять строки (кроме режима read-only подключений);
  - создавать новые таблицы с разными типами колонок (id, string, text, number, boolean, datetime);
  - удалять таблицы целиком.
- Для колонок типа `text` форма редактирования использует многострочный `TextField` с подсказкой, что поддерживается Markdown (заголовки, списки, ссылки и т.д.).
- Под полями `text` отображается компактный «черновой предпросмотр» введённого Markdown‑текста (как обычный текст), чтобы быстро проверить содержимое перед сохранением.
- В блоке «Колонки» у пометки `PK` отображается `Tooltip` с расшифровкой (*Primary Key — уникальный идентификатор строки в таблице*), который появляется при наведении курсора.

## Работа с аутентификацией на фронте

1. Пользователь логинится через форму `Login`, которая вызывает `login()`.
2. При удачной аутентификации токен сохраняется в `localStorage`.
3. Все последующие запросы к API автоматически получают заголовок `Authorization` через axios‑интерцептор.
4. `AppRoutes` использует `isAuthed()` для решения, какой компонент рендерить на защищённых маршрутах.
5. Logout очищает токен и возвращает пользователя на страницу логина.

## Сборка и статика

- В режиме сборки Vite создаёт папку `dist/` с `index.html` и ассетами (`/assets/*`).
- Dockerfile копирует `dist` в `app/ui/static/spa`.
- FastAPI раздаёт эти файлы на `/admin/*` и `/assets/*`.

Фронтенд не знает о Caddy или Docker — он просто работает через относительные пути к API (`/auth/...`, `/admin/...`).
