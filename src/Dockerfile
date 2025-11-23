#### Backend dependency build (production only)
FROM python:3.11-slim AS backend-build
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=off PIP_DISABLE_PIP_VERSION_CHECK=on
WORKDIR /build
# Install system build deps then only deps (pyproject) for better layer caching
COPY pyproject.toml ./
RUN apt-get update && apt-get install -y --no-install-recommends curl build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --upgrade pip \
    && pip install . --no-cache-dir
COPY app ./app

# --- Tailwind (legacy Jinja CSS) build stage ---
FROM node:20-alpine AS tailwind-css
WORKDIR /build-css
COPY tailwind.config.js postcss.config.js package.json ./
COPY app/ui/static/css ./css
RUN npm install --no-audit --no-fund --production && \
    npx tailwindcss -c tailwind.config.js -i ./css/tailwind-input.css -o ./css/build/tailwind.css --minify

# --- React SPA build stage ---
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/admin-frontend/package*.json ./
ENV ROLLUP_DISABLE_NATIVE=1
# Install with devDependencies so TypeScript/Vite and optional Rollup native binaries are available.
# Using npm install (vs ci --production) avoids the optional dependency bug on musl (see npm/cli#4828).
RUN npm install --no-audit --no-fund
COPY frontend/admin-frontend .
RUN npm run build

# --- Final runtime image ---
#### Final lean runtime image
FROM python:3.11-slim AS final
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY --from=backend-build /usr/local /usr/local
COPY app ./app
# Removed copying of files outside build context (Caddyfile, postgres-init) and unused src/main.py.
COPY --from=tailwind-css /build-css/css/build/tailwind.css app/ui/static/css/tailwind.css
COPY --from=frontend-build /frontend/dist ./app/ui/static/spa
 # Dependencies already provided via /usr/local from backend-build; no need to pip install again.
 # Create non-root user and adjust ownership.
RUN useradd -r -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
ENTRYPOINT ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
