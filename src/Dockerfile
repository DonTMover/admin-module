FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	POETRY_VIRTUALENVS_CREATE=false

WORKDIR /app

# Скопируем только pyproject.toml для кеширования зависимостей
COPY pyproject.toml ./

RUN pip install --no-cache-dir --upgrade pip \
	&& pip install --no-cache-dir .

# Копируем остальной код (структура src/app)
COPY ./app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]