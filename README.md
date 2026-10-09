# Les Marinettes — site + API + admin

Stack: **FastAPI** (uv, Ruff, Pydantic v2, SQLAlchemy async, Alembic), **PostgreSQL** (JSONB site payload), **React + Vite** admin under `/admin/`, deployment target **Render + Neon**.

## Prérequis

- Python 3.12+
- [uv](https://docs.astral.sh/uv/)
- Node 20+ (pour l’admin)
- PostgreSQL 16+ (ou `docker compose up -d`)

## Configuration

```bash
cp .env.example .env
# Éditer DATABASE_URL (ex. Neon pooled URL) et SECRET_KEY
```

## Base de données

```bash
docker compose up -d   # optionnel, Postgres local
uv sync
uv run alembic upgrade head
uv run python -m app.seed
```

Le seed charge `content.json` dans `site_content`. Il crée aussi le premier
administrateur lorsque `ADMIN_EMAIL` et `ADMIN_PASSWORD` (12 caractères
minimum) sont définis. Aucun identifiant par défaut n'est fourni.

## Lancer l’API + site statique

```bash
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- Site : http://127.0.0.1:8000/
- API docs : http://127.0.0.1:8000/docs
- Contenu public JSON : `GET /api/public/site-content`

## Admin React (développement)

```bash
cd frontend
npm install
npm run dev
```

Vite proxy envoie `/api` vers `http://127.0.0.1:8000`. Ouvrir http://localhost:5173/admin/

## Admin React (production intégrée)

```bash
cd frontend && npm run build
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Ouvrir http://127.0.0.1:8000/admin/

## Rôles

| Rôle        | CMS / galerie     | Admissions | Finance   |
|------------|-------------------|------------|-----------|
| `admin`    | tout              | tout       | tout      |
| `teacher`  | `team`, `gallery`, `fullGallery` | lecture | —         |
| `accountant` | —               | dossiers **enrolled** seulement | facturation / paiements / CSV |

Création d’utilisateurs : `POST /api/auth/users` (admin), corps JSON aligné sur le schéma OpenAPI.

## Déploiement (Render + Neon)

Variables d’environnement à définir sur le service Render (voir aussi [.env.example](.env.example)) :

| Variable | Rôle |
|----------|------|
| `DATABASE_URL` | URL Neon (pooler OK). Le préfixe `postgresql://` est converti en `postgresql+asyncpg://` par l’app. |
| `SECRET_KEY` | Secret JWT — utiliser une valeur aléatoire longue (ex. `openssl rand -hex 32`). |
| `APP_ENV` | `production` sur Render : exige un secret fort et désactive la documentation API publique. |
| `PUBLIC_CONTENT_SOURCE` | `repository` sert temporairement le texte depuis `content.json` et rend le CMS public en lecture seule. Utiliser `database` pour réactiver les modifications du dashboard. |
| `ADMIN_EMAIL` | Adresse du premier administrateur. |
| `ADMIN_PASSWORD` | Mot de passe initial unique (12 caractères minimum). Remplace aussi l'ancien mot de passe de démonstration sans écraser ensuite un mot de passe réel. |
| `CORS_ORIGINS` | Origines autorisées pour l’admin, séparées par des virgules. Inclure l’URL publique du site (ex. `https://votre-service.onrender.com`) si l’API et l’admin sont servis depuis le même host. |

Le fichier [render.yaml](render.yaml) configure :

- **Build** : installation de `uv`, `uv sync --frozen`, puis `npm ci` / `npm run build` dans `frontend/` (variable **`NODE_VERSION=20`** pour disposer de Node).
- **Pre-deploy** : `.venv/bin/alembic upgrade head` (migrations avant bascule du trafic).
- **Start** : `.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

### Première mise en production

1. Créer la base **Neon** et renseigner `DATABASE_URL` sur Render.
2. Déployer ; les migrations s’appliquent via le pre-deploy.
3. **Une seule fois** : exécuter le seed pour charger `content.json` et créer l’admin (depuis la console Render ou votre machine avec `DATABASE_URL` pointant vers Neon) :

   ```bash
   uv sync && uv run python -m app.seed
   ```

4. Se connecter avec `ADMIN_EMAIL` / `ADMIN_PASSWORD`. `ADMIN_PASSWORD` peut
   ensuite être retiré de l'environnement.

### Fichiers uploadés (médias)

Les fichiers sont écrits sous `uploads/` et publiés à l'URL
`/images/uploads/...`. Le Blueprint monte un disque Render persistant à cet
emplacement afin que les médias survivent aux redéploiements.

### Vérification après déploiement

- `GET https://<votre-host>/api/health` → `{"status":"ok"}`
- Ouvrir `/admin/`, se connecter, tester une section CMS si besoin.

## Tests (smoke)

```bash
uv sync --group dev
uv run pytest
```

## Lint Python

```bash
uv run ruff check app
uv run ruff format app
```
