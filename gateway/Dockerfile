FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir \
  fastapi \
  uvicorn \
  httpx

COPY gateway/api /app/gateway/api
COPY static /app/static
COPY site-i18n.js /app/site-i18n.js
COPY admin /app/admin
COPY frontend/dist /app/frontend/dist
COPY images /app/images

EXPOSE 8000

CMD ["uvicorn", "gateway.api.main:app", "--host", "0.0.0.0", "--port", "8000"]

