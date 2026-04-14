FROM python:3.12-slim

# Set up environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # UV specific: Compile bytecode for faster startup
    UV_COMPILE_BYTECODE=1

WORKDIR /app

# 1. Install uv via the official standalone image (Fastest method)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# 2. Copy dependency files first to maximize layer caching
# Note: If you generate a uv.lock file locally, add it here too!
COPY pyproject.toml uv.lock* ./

# 3. Install dependencies natively using uv
# --system installs to the container's python, avoiding the need for a .venv
RUN uv pip install --system --no-cache-dir -r pyproject.toml

# 4. Create a non-root user and group for security
RUN addgroup --system appgroup && adduser --system --group appuser

# 5. Copy the application code and assets
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
COPY static ./static
COPY site-i18n.js ./
COPY admin ./admin
COPY frontend/dist ./frontend/dist
COPY images ./images

# 6. Transfer ownership of the app directory to the non-root user
RUN chown -R appuser:appgroup /app

# 7. Drop root privileges
USER appuser

EXPOSE 8000

# 8. Run uvicorn directly from the system path
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]