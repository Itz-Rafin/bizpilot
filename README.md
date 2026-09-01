# BizPilot

> Run your entire small business from one place.

**Current version: 0.1.0**

BizPilot is a multi-tenant small-business management SaaS for customers, products, services, invoices, payments, expenses, reporting, team access, and operational visibility. The repository is split into a Next.js frontend and a FastAPI backend.

## Product demo

A public demo screen is available at `/demo`. It uses fictional, in-page sample data and does not write to Supabase or create an account.

Use the demo to show the product flow before asking a buyer or tester to sign in. The real application remains protected behind authentication.

## Buyer materials

The repository includes buyer-facing material under [`docs/`](docs):

- [`sales-page-copy.md`](docs/sales-page-copy.md) — product positioning, package ideas, buyer FAQ, and sales copy
- [`demo-script.md`](docs/demo-script.md) — a short walkthrough for recording a product demo
- [`selling-source-code.md`](docs/selling-source-code.md) — source-code sales and licensing guidance
- [`deployment-guide.md`](docs/deployment-guide.md) — deployment/setup notes
- [`release-checklist.md`](docs/release-checklist.md) — checklist for preparing a version for sale
- [`demo-assets.md`](docs/demo-assets.md) — recommended screenshots, demo flow, and presentation assets

## Version history

See [`CHANGELOG.md`](CHANGELOG.md) for the current release history.

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

Fill in the values before starting the app. Keep `SUPABASE_SERVICE_ROLE_KEY` and any legacy `SUPABASE_JWT_SECRET` in the backend only.

If invoice email delivery is enabled, also configure the SMTP variables in `backend/.env`.

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
0011_bizpilot_authenticated_rls.sql
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
| `SUPABASE_JWT_SECRET` | No | Legacy HS256 secret. Leave empty when using asymmetric Supabase signing keys. |
| `SUPABASE_JWT_AUDIENCE` | Yes | Normally `authenticated` |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Backend-only privileged key for integrations that need it |
| `CORS_ORIGINS` | Yes | Comma-separated browser origins |
| `LOG_LEVEL` | No | Defaults to `INFO` |
| `STORAGE_BUCKET` | No | Defaults to `bizpilot-assets` |
| `SMTP_HOST` | No | SMTP host for invoice delivery |
| `SMTP_PORT` | No | Defaults to `587` |
| `SMTP_USERNAME` | No | SMTP username |
| `SMTP_PASSWORD` | No | SMTP password |
| `SMTP_FROM_EMAIL` | No | Verified sender address |
| `SMTP_USE_TLS` | No | Defaults to `true` |
| `RATE_LIMIT_REQUESTS` | No | Requests allowed per process/window; defaults to `120` |
| `RATE_LIMIT_WINDOW_SECONDS` | No | Rate-limit window; defaults to `60` |

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
docs/                            architecture, deployment, security, and sales notes
```

## Main features

- Customer management
- Product and service management
- Invoice creation and branded PDF-ready export
- Invoice email delivery with PDF attachment
- Invoice send/cancel/delete-draft actions
- Payment recording
- Expense tracking and editing
- Automatic overdue status refresh on dashboard/report reads
- Dashboard metrics
- Reports
- Multi-organization workspaces
- Role-based access
- Supabase RLS with authenticated database context
- Authenticated API with tenant checks
- API rate limiting and security headers

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

CI runs these backend and frontend checks automatically for pushes to `main` and pull requests.

## Docker

The repository includes Docker Compose for the frontend and backend. Hosted Supabase remains external.

```bash
docker compose config
docker compose up --build
```

The local validation environment used during development did not include Docker, so run the Compose path on a machine with Docker installed.

## Security notes

BizPilot uses Supabase Auth for user identity, FastAPI for API access control, and PostgreSQL RLS as defense in depth. The backend verifies asymmetric Supabase JWTs through the project's JWKS endpoint and falls back to HS256 only when a legacy JWT secret is explicitly configured. The tenant dependency sets the authenticated Postgres role and JWT claims before tenant-scoped SQL is executed.

Do not commit real `.env` files. Do not expose `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_JWT_SECRET` through any `NEXT_PUBLIC_*` variable.

For a production deployment, set explicit CORS origins, configure Supabase Auth redirect/site URLs, apply all migrations once, configure transactional email, and provide backend secrets through the hosting provider's secret manager. The built-in rate limiter is process-local; multi-instance deployments should also use a shared gateway or distributed limiter.

## Source code license

This repository does not grant a public open-source license. Copyright and all rights are reserved by the repository owner unless a separate written license is provided to a buyer. Third-party packages keep their own licenses.

For commercial use, redistribution, resale, or white-label deployment, obtain an appropriate license from the seller.

## Status

BizPilot is an early-stage SaaS/codebase project. The core invoicing workflow now includes actual invoice email delivery, with security and tenant-isolation hardening in place. Production deployment still requires environment-specific testing, transactional-email credentials, and a real Postgres integration test run before charging customers.
