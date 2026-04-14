# Services

Each microservice is a **standalone Python package** with the same [BenavLabs-style](https://github.com/benavlabs/FastAPI-boilerplate) layout: package name **`app`** under `src/app/` (one service per container / per `uv` project).

## Canonical layout

```
services/<name>/
  pyproject.toml          # uv, ruff, mypy, pytest
  Dockerfile
  alembic.ini
  alembic/
  src/
    app/
      main.py             # create_app(), app = create_app()
      api/
        deps.py           # optional: shared FastAPI dependencies
        errors.py         # exception handlers
        routers/          # thin HTTP handlers
      core/
        config.py         # pydantic_settings
        logging.py
      db/
        base.py           # SQLAlchemy DeclarativeBase (Alembic metadata)
        session.py        # engine + session (when using Postgres)
      models/             # SQLAlchemy 2.0 models
      schemas/            # Pydantic DTOs
      services/           # use cases / domain operations
      integrations/       # RabbitMQ, S3, SES, etc.
  tests/
```

The **gateway** ([`gateway/`](../gateway/)) is the public entrypoint and reverse-proxies `/api/*` during migration.

## New service checklist

1. Copy `cms-service/` as a template (or follow the tree above).
2. Set `service_name` and `database_url` in `app/core/config.py`.
3. Adjust `alembic.ini` default URL and `Dockerfile` `COPY services/<name>/...` paths.
4. Register the service in [`infra/docker-compose.dev.yml`](../infra/docker-compose.dev.yml) when you add a database and ports.

See also: [`docs/architecture/benavlabs-service-template.md`](../docs/architecture/benavlabs-service-template.md).
