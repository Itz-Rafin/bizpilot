# BizPilot

> Run your entire small business from one place.

BizPilot is a multi-tenant small-business management SaaS for customers, products, services, invoices, payments, expenses, reporting, team access, and operational visibility. The repository is split into a Next.js presentation frontend and a FastAPI Clean Architecture backend.

## Quick Start

The following path is the verified local-development workflow. It assumes a Supabase project already exists and that you have its database connection details, JWT secret, publishable key, and service-role key. The service-role key is backend-only and must never be placed in `frontend/.env.local`.

### 1. Clone and enter the repository

```bash
git clone https://github.com/Itz-Rafin/bizpilot.git
cd bizpilot
```

Use Python 3.12 or newer and Node.js 22 or newer. The frontend lockfile is committed, so use `npm ci` rather than `npm install` for a clean checkout.

### 2. Configure environment files

Create the two runtime environment files from the committed templates:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Edit both files and fill in the required Supabase values. The root `.env.example` is retained as a combined reference, but the commands above are the canonical setup because Docker Compose reads `backend/.env` and `frontend/.env.local` separately.

### 3. Apply the BizPilot database migrations

BizPilot’s database is managed by the ordered SQL files under [`supabase/migrations`](supabase/migrations). Apply every file in lexical order, from `0001` through the latest migration. The files create and modify only the dedicated `bizpilot` schema and the `bizpilot-assets` storage boundary. Do not run these migrations against a project containing unrelated production data unless that project is the approved BizPilot project.

The simplest route is Supabase Dashboard → **SQL Editor**: open each migration file, paste its complete contents into a new query, and run them in filename order. For a machine with `psql` installed, use a standard PostgreSQL URL, not the SQLAlchemy `postgresql+psycopg://` URL used by the backend:

```bash
export SUPABASE_DB_URL='postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres'
for migration in supabase/migrations/*.sql; do
  echo "Applying $migration"
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$migration"
done
```

The repository does not use `alembic upgrade` for the BizPilot schema. The `backend/alembic` files are a minimal SQLAlchemy integration scaffold; the authoritative application migrations are the Supabase SQL files.

### 4. Install and start the backend

Open a terminal at the repository root and run:

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -e '.[dev]'
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

FastAPI loads `backend/.env` when the process is started from `backend`. The API is then available at `http://localhost:8000`.

### 5. Install and start the frontend

Open a second terminal at the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With the frontend Supabase variables configured, unauthenticated visits to the dashboard redirect to `/login`.

### 6. Register, log in, and complete onboarding

Choose **Create an account** on the login page, register with an email and a password of at least eight characters, and confirm the email if email confirmation is enabled in Supabase Auth. Sign in, complete the one-step onboarding form, and then use the dashboard. Onboarding creates the first organization, owner membership, profile, and persisted active organization through the FastAPI backend.

## Environment variables

The committed templates are [`backend/.env.example`](backend/.env.example) and [`frontend/.env.local.example`](frontend/.env.local.example). Values below are required for the normal hosted-Supabase workflow.

| Variable | Runtime | Required | Purpose |
|---|---|---:|---|
| `DATABASE_URL` | Backend | Yes | SQLAlchemy PostgreSQL connection string using `postgresql+psycopg://`; use a URL-encoded password |
| `SUPABASE_URL` | Backend | Yes | Supabase project URL used by JWT verification and backend adapters |
| `SUPABASE_JWT_SECRET` | Backend | Yes | Supabase JWT signing secret; keep server-side only |
| `SUPABASE_JWT_AUDIENCE` | Backend | Yes | JWT audience, normally `authenticated` |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Yes for storage/admin adapters | Privileged Supabase credential; keep server-side only and never expose to Next.js |
| `CORS_ORIGINS` | Backend | Yes | Comma-separated browser origins; local default is `http://localhost:3000` |
| `LOG_LEVEL` | Backend | No | Backend log level; local default is `INFO` |
| `STORAGE_BUCKET` | Backend | No | Private bucket name; local default is `bizpilot-assets` |
| `NEXT_PUBLIC_API_URL` | Frontend | Yes | Browser URL for FastAPI, normally `http://localhost:8000/api/v1` |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend | Yes | Supabase project URL for browser Auth and SSR middleware |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Frontend | Yes | Supabase publishable/anon key; this is the only Supabase key used by the browser |

For local development, `backend/.env` and `frontend/.env.local` should contain the same project URL. If the database password contains characters such as `@`, `:`, `/`, or `#`, URL-encode it in `DATABASE_URL`.

## Supabase configuration

Use the intended Supabase project URL and project reference in both templates. The database connection must reach PostgreSQL and must permit the backend to use the `bizpilot` schema; the backend session config adds `search_path=bizpilot,public`. The private storage bucket is named `bizpilot-assets` by default and is created by the storage migration.

In Supabase Auth → URL Configuration, set the local **Site URL** to `http://localhost:3000` while developing locally. The current login page uses email/password Auth directly and does not use an OAuth callback route or a custom `redirectTo` URL. If email confirmation is enabled, configure the local site URL and complete the confirmation link flow before signing in.

## Database and demo data

There is no automatic seed or demo-data script in this repository. This is intentional: migrations never create business records or seed a real account. After registration, use onboarding to create an organization and then use the dashboard to create development records. If repeatable fixture data is needed, create it only in a separate disposable development project or local Supabase environment and keep the fixture script outside production execution paths.

The authoritative migration sequence is:

```text
supabase/migrations/0001_bizpilot_foundation.sql
supabase/migrations/0002_bizpilot_security_hardening.sql
supabase/migrations/0003_bizpilot_storage.sql
supabase/migrations/0004_bizpilot_performance_hardening.sql
supabase/migrations/0005_bizpilot_storage_tenant_fix.sql
supabase/migrations/0006_bizpilot_rls_relationship_integrity.sql
supabase/migrations/0007_bizpilot_active_organization.sql
supabase/migrations/0008_bizpilot_rls_role_transfer_fix.sql
supabase/migrations/0009_bizpilot_rls_initplan_fix.sql
```

## API, health check, and local URLs

FastAPI’s interactive OpenAPI documentation is available at [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs), ReDoc is at [http://localhost:8000/api/v1/redoc](http://localhost:8000/api/v1/redoc), and the raw specification is at [http://localhost:8000/api/v1/openapi.json](http://localhost:8000/api/v1/openapi.json). The health endpoint is:

```bash
curl http://localhost:8000/health
```

A healthy response is `{"status":"healthy","service":"bizpilot-api"}`. The frontend browser API base URL is controlled centrally by `NEXT_PUBLIC_API_URL`; do not hardcode a different backend URL in individual pages.

## Docker Compose

Docker Compose configuration is included for the two-service development setup. It reads `backend/.env` for FastAPI and `frontend/.env.local` for Next.js:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
# Fill in both files first.
docker compose config
docker compose up --build
```

The backend is exposed at port 8000 and the frontend at port 3000. Hosted Supabase remains external; Compose does not start a local database or local Supabase Auth instance. The current validation sandbox does not have `docker` or `docker compose`, so the Compose build and run path could not be executed here. The configuration has been checked against the Dockerfiles and service commands but should be run on a developer machine with Docker installed.

To stop the services:

```bash
docker compose down
```

## Testing and linting

Run backend checks from `backend` with the virtual environment active:

```bash
cd backend
source .venv/bin/activate
ruff check app tests
python -m compileall -q app tests
pytest -q
```

Run frontend checks from `frontend`:

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm run build
```

`npm run lint` uses the ESLint CLI and is non-interactive. `npm run typecheck` runs TypeScript without emitting files. `npm run build` creates the production Next.js build. To serve that build locally:

```bash
npm run start
```

The frontend lockfile is committed, so `npm ci` reproduces the declared dependency tree on a clean checkout. The backend declares its runtime and development dependencies in [`backend/pyproject.toml`](backend/pyproject.toml); pip resolves those compatible versions during installation.

## Architecture and security

The backend follows practical Clean/Hexagonal Architecture. Domain entities and rules do not import FastAPI, SQLAlchemy, Supabase, HTTP, PostgreSQL, or frontend code. Application use cases depend on domain ports. Infrastructure adapters implement those ports. FastAPI routers remain thin. See [`docs/architecture.md`](docs/architecture.md).

Supabase Auth supplies the user JWT. FastAPI verifies the signature, issuer, audience, expiry, and UUID subject, then resolves the persisted active organization from authenticated membership. The frontend does not query BizPilot tables directly. RLS remains a defense-in-depth boundary, and service-role credentials remain backend-only. See [`docs/security.md`](docs/security.md) and [`docs/focused-hardening-evidence.md`](docs/focused-hardening-evidence.md).

## Repository structure

```text
backend/app/domain/              framework-independent entities and ports
backend/app/application/         use cases and orchestration
backend/app/infrastructure/      SQLAlchemy and Supabase adapters
backend/app/presentation/        FastAPI routers, schemas, auth dependencies
frontend/app/                    Next.js App Router pages
frontend/lib/api/                centralized typed REST client
frontend/lib/supabase/           browser Auth boundary
supabase/migrations/             reproducible SQL, indexes, helper functions, RLS
backend/.env.example             backend setup template
frontend/.env.local.example      frontend setup template
docs/                             architecture, security, and readiness notes
```

## Deployment boundary

Production deployment is intentionally not performed in this repository pass. A deployment must provide the real backend secrets through a secret manager, set explicit production CORS origins, configure the Supabase Auth site/redirect URLs, apply the SQL migrations once, and use the non-root Dockerfiles or an equivalent hardened runtime. Do not copy the service-role key into any `NEXT_PUBLIC_*` variable.

## References

[1]: https://supabase.com/docs/guides/auth/redirect-urls "Supabase Auth redirect URLs"
[2]: https://supabase.com/docs/guides/database/connecting-to-postgres "Supabase PostgreSQL connection guidance"
