FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/src

COPY services/innoter-service/pyproject.toml /app/pyproject.toml

RUN pip install --no-cache-dir uv

RUN uv venv \
  && . .venv/bin/activate \
  && python -c "import tomllib; p=tomllib.load(open('pyproject.toml','rb')); print('\n'.join(p['project']['dependencies']))" > requirements.txt \
  && uv pip install --no-cache-dir -r requirements.txt

COPY services/innoter-service/src /app/src

EXPOSE 8000

CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
