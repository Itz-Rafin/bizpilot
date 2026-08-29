# BizPilot

> Run your entire small business from one place.

BizPilot is a multi-tenant small-business management SaaS for customers, products, services, invoices, payments, expenses, reporting, team access, and operational visibility. The repository is split into a Next.js frontend and a FastAPI backend.

## Product demo

A public demo screen is available at `/demo`. It uses fictional, in-page sample data and does not write to Supabase or create an account.

Use the demo to show the product flow before asking a buyer or tester to sign in. The real application remains protected behind authentication.

## Quick Start

This is the normal local setup for a fresh checkout. It assumes you already have a Supabase project.

### 1. Clone the project

```bash
git clone https://github.com/Itz-Rafin/bizpilot.git
cd bizpilot
```

Use Python 3.12+ and Node.js 22+.

### 2. Create local environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Fill in the values before starting the app. Keep `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_JWT_SECRET` in the backend only.

### 3. Apply the database migrations

The Supabase SQL migrations in [`supabase/migrations`](supabase/migrations) are the source of truth. Apply them in filename order:

```text
0001_bizpilot_foundation.sql
0002_bizpilot_security_hardening.sql
0003_bizpilot_storage.sql
0004_bizpilot_performance_hardening.sql
0005_bizpilot_storage_tenant_fix.sql
0006_bizpilot_rls_relationship_integrity.sql
0007_bizpilot_active_organization.sql
0008_bizpilot_rls_role_transfer_fix.sql
0009_bizpilot_rls_initplan_fix.sql
0010_bizpilot_function_privilege_hardening.sql
```

The easiest method is Supabase Dashboard → **SQL Editor**. Run each file completely, in the order above.

### 4. Start the backend

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -e '.[dev]'
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at `http://localhost:8000`.

### 5. Start the frontend

Open a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:3000`.

### 6. Create an account

Use **Create an account**, sign in, and complete onboarding. The first organization and owner membership are created through the FastAPI backend.

## Environment variables

### Backend

| Variable | Required | Notes |
|---|---:|---|
| `DATABASE_URL` | Yes | SQLAlchemy URL using `postgresql+psycopg://` |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_JWT_SECRET` | Yes | Server-side JWT secret |
| `SUPABASE_JWT_AUDIENCE` | Yes | Normally `authenticated` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Backend-only privileged key |
| `CORS_ORIGINS` | Yes | Comma-separated browser origins |
| `LOG_LEVEL` | No | Defaults to `INFO` |
| `STORAGE_BUCKET` | No | Defaults to `bizpilot-assets` |

### Frontend

| Variable | Required | Notes |
|---|---:|---|
| `NEXT_PUBLIC_API_URL` | Yes | FastAPI browser URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Publishable/anon key only; never put service-role secrets here |

## Project structure

```text
backend/app/domain/              business rules and ports
backend/app/application/         use cases
backend/app/infrastructure/      SQLAlchemy/Supabase adapters
backend/app/presentation/        FastAPI routes, schemas, auth
frontend/app/                    Next.js pages
frontend/components/             reusable UI components
frontend/lib/api/                typed API client
frontend/lib/supabase/           browser Auth client
supabase/migrations/             SQL schema, indexes, helper functions, RLS
docs/                            architecture and security notes
```

## Main features

- Customer management
- Product and service management
- Invoice creation and PDF export
- Invoice send/cancel/delete-draft actions
- Payment recording
- Expense tracking
- Dashboard metrics
- Reports
- Multi-organization workspaces
- Role-based access
- Supabase RLS
- Authenticated API with tenant checks

## Running tests

Backend:

```bash
cd backend
source .venv/bin/activate
ruff check app tests
python -m compileall -q app tests
pytest -q
```

Frontend:

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm run build
```

## Docker

The repository includes Docker Compose for the frontend and backend. Hosted Supabase remains external.

```bash
docker compose config
docker compose up --build
```

The local validation environment used during development did not include Docker, so run the Compose path on a machine with Docker installed.

## Security notes

BizPilot uses Supabase Auth for user identity, FastAPI for API access control, and PostgreSQL RLS as defense in depth. The backend resolves the active organization from authenticated membership and every tenant-scoped repository query is organization-bound.

Do not commit real `.env` files. Do not expose `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_JWT_SECRET` through any `NEXT_PUBLIC_*` variable.

For a production deployment, set explicit CORS origins, configure Supabase Auth redirect/site URLs, apply all migrations once, and provide backend secrets through the hosting provider's secret manager.

## Source code license

This repository does not grant a public open-source license. Copyright and all rights are reserved by the repository owner unless a separate written license is provided to a buyer. Third-party packages keep their own licenses.

For commercial use, redistribution, resale, or white-label deployment, obtain an appropriate license from the seller.

## Status

BizPilot is an early-stage SaaS/codebase project. It is suitable as a development starting point and can be extended or deployed for commercial use. Production deployment still requires environment-specific testing and configuration.
