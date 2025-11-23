FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 POETRY_VIRTUALENVS_CREATE=false
WORKDIR /app
COPY pyproject.toml ./
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip

# --- Node build stage for Tailwind ---
FROM node:20-alpine AS assets
WORKDIR /build
COPY app/ui/static/css ./css
COPY tailwind.config.js postcss.config.js package.json ./
RUN npm install --no-audit --no-fund && \
    mkdir -p css/build && \
    npx tailwindcss -c tailwind.config.js -i ./css/tailwind-input.css -o ./css/build/tailwind.css --minify

# --- Final image ---
FROM python:3.11-slim AS final
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY --from=base /usr/local /usr/local
COPY . .
COPY --from=assets /build/css/build/tailwind.css app/ui/static/css/tailwind.css
RUN pip install --no-cache-dir .
ENTRYPOINT ["python","-m","app.main"]
# Копируем остальной код (структура src/app)
COPY ./app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]