# BizPilot

> Run your entire small business from one place.

BizPilot is a multi-tenant small-business management SaaS for customers, products, services, invoices, payments, expenses, reporting, team access, and operational visibility. The repository is intentionally split into a Next.js presentation frontend and a FastAPI Clean Architecture backend.

## Current repository

The private repository is [Itz-Rafin/bizpilot](https://github.com/Itz-Rafin/bizpilot). The selected Supabase project is `cmrjhjtpdtcoduximxkg` in `ap-south-1`. The project was restored from inactive state with approval. Its public schema was empty before migration, and BizPilot objects are isolated in a dedicated `bizpilot` schema. The Supabase control-plane display name could not be renamed through the available management integration; the project ID is therefore the authoritative identifier.

## Architecture

```text
Browser -> Next.js / TypeScript -> REST / JSON -> FastAPI Presentation
                                                     |
                                                     v
                                               Application Use Cases
                                                     |
                                                     v
                                                  Domain + Ports
                                                     ^
                                                     |
                                       SQLAlchemy / Supabase Infrastructure
                                                     |
                                                     v
                                            Supabase PostgreSQL + RLS
```

The backend follows practical Clean/Hexagonal Architecture. Domain entities and rules do not import FastAPI, SQLAlchemy, Supabase, HTTP, PostgreSQL, or frontend code. Application use cases depend on domain ports. Infrastructure adapters implement those ports. FastAPI routers remain thin. See [`docs/architecture.md`](docs/architecture.md).

## Repository structure

```text
backend/app/domain/              framework-independent entities and ports
backend/app/application/         use cases and orchestration
backend/app/infrastructure/      SQLAlchemy and Supabase adapters
backend/app/presentation/        FastAPI routers, schemas, auth dependencies
frontend/app/                    Next.js App Router pages
frontend/lib/api/                centralized typed REST client
frontend/lib/supabase/           browser auth boundary
supabase/migrations/             reproducible SQL, indexes, helper functions, RLS
docs/                             architecture and security notes
```

## Local setup

Copy `.env.example` to `.env` and fill in the Supabase database password, JWT secret, and publishable key. The backend uses the direct PostgreSQL connection with `search_path=bizpilot,public`; do not commit `.env` or any secret.

```bash
cp .env.example .env
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload --port 8000
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:3000`. FastAPI documentation is available at `http://localhost:8000/api/v1/docs`, `http://localhost:8000/api/v1/redoc`, and `http://localhost:8000/api/v1/openapi.json`; the health endpoint is `http://localhost:8000/health`.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

The frontend and backend are separate services. Hosted Supabase is not containerized.

## Database and RLS

The migrations [`supabase/migrations/0001_bizpilot_foundation.sql`](supabase/migrations/0001_bizpilot_foundation.sql), [`0002_bizpilot_security_hardening.sql`](supabase/migrations/0002_bizpilot_security_hardening.sql), and [`0003_bizpilot_storage.sql`](supabase/migrations/0003_bizpilot_storage.sql) create only the dedicated `bizpilot` schema, harden direct table privileges, and add a private `bizpilot-assets` bucket with user-scoped object policies. They use `create ... if not exists` or conflict-safe inserts and do not drop tables or delete unrelated data. The schema defines normalized tables, foreign keys, numeric monetary columns, indexes, membership helper functions, RLS policies, and storage boundaries. Do not seed demo data into production accounts. Development seed data should be run only against a dedicated development project or branch.

## API security model

Supabase Auth issues the JWT. FastAPI validates the token, resolves the user’s membership, and scopes all organization-owned reads and writes to the membership-derived organization. Supabase RLS provides a second tenant boundary. Production CORS must contain explicit frontend origins; unrestricted wildcard CORS is not used.

## Testing

Backend unit tests are designed to exercise domain rules without FastAPI, PostgreSQL, or Supabase. Run:

```bash
cd backend
pytest
ruff check app tests
```

Frontend checks:

```bash
cd frontend
npm run typecheck
npm run build
```

## Deployment readiness

The backend can be deployed as a Python 3.12 container using `backend/Dockerfile`; the frontend can be deployed as a Next.js application using `frontend/Dockerfile`. Set the production environment variables from `.env.example`, configure explicit CORS origins, apply the SQL migration once to the selected Supabase project, configure Supabase Auth redirect URLs, and use a private storage bucket for business assets. Production deployment is intentionally not performed in this pass.

## Roadmap boundaries

Paid billing, email delivery, SMS/WhatsApp, recurring invoices, client portal access, AI assistants, accounting integrations, and calendar integrations are intentionally not dependencies of this MVP. The architecture leaves adapter boundaries for these features without faking their implementation.
