FROM python:3.11-slim AS backend-base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY pyproject.toml ./
RUN apt-get update && apt-get install -y --no-install-recommends curl build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir .[dev]

# --- Tailwind (legacy Jinja CSS) build stage ---
FROM node:20-alpine AS tailwind-css
WORKDIR /build-css
COPY tailwind.config.js postcss.config.js package.json ./
COPY app/ui/static/css ./css
RUN npm install --no-audit --no-fund && \
    npx tailwindcss -c tailwind.config.js -i ./css/tailwind-input.css -o ./css/build/tailwind.css --minify

# --- React SPA build stage ---
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/admin-frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/admin-frontend .
RUN npm run build

# --- Final runtime image ---
FROM python:3.11-slim AS final
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY --from=backend-base /usr/local /usr/local
COPY . .
COPY --from=tailwind-css /build-css/css/build/tailwind.css app/ui/static/css/tailwind.css
COPY --from=frontend-build /frontend/dist ./app/ui/static/spa
RUN pip install --no-cache-dir .

EXPOSE 8000
ENTRYPOINT ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
