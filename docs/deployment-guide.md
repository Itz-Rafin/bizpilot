# BizPilot Deployment Guide

This guide is for a fresh BizPilot installation. The application has two services: a Next.js frontend and a FastAPI backend. Supabase provides authentication and PostgreSQL.

## Before deployment

Create your own Supabase project and keep its credentials separate from the repository.

Apply the SQL files in `supabase/migrations` in filename order. The current list is:

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

Do not copy the example Supabase URL from this repository into a real deployment. Put your own project values in the environment variables.

## Backend

Required values:

```text
DATABASE_URL
SUPABASE_URL
SUPABASE_JWT_SECRET
SUPABASE_JWT_AUDIENCE
SUPABASE_SERVICE_ROLE_KEY
CORS_ORIGINS
```

Set `APP_ENV=production` so the API documentation is not exposed publicly and use an HTTPS URL for the deployed API.

Use a process command equivalent to:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Frontend

Required values:

```text
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

`NEXT_PUBLIC_API_URL` must point to the deployed FastAPI URL. The publishable Supabase key is safe for browser use; never place the service-role key or JWT secret in a `NEXT_PUBLIC_*` variable.

Build and start with:

```bash
npm ci
npm run build
npm run start
```

## Supabase Auth

Configure the deployed frontend URL under Supabase Authentication URL Configuration. Add the production site URL and any required redirect URLs used by your application.

Keep development and production Supabase projects separate when possible. Never use a customer's production database as your test database.

## CORS

Set `CORS_ORIGINS` to the exact frontend origin(s) that should call the API. Avoid using `*` for a production deployment.

Example:

```text
CORS_ORIGINS=https://app.example.com
```

## Storage

BizPilot uses the private `bizpilot-assets` bucket. Apply the storage migrations before testing invoice or asset downloads. The application expects organization-scoped storage paths.

## Health check

The backend exposes a health endpoint through the FastAPI application. Use the deployed service's health-check mechanism to verify that the API is reachable before testing authenticated pages.

## Docker

The repository includes Dockerfiles for both services and a development `docker-compose.yml`.

The Docker images run without root privileges. The compose file is intentionally development-oriented: it mounts source code and runs the development servers. For production, use your hosting provider's normal build/start flow or create an isolated production compose configuration for your environment.

## Final deployment checklist

Before handing the installation to a customer:

- Apply every migration once.
- Set production Supabase Auth URLs.
- Use a production `CORS_ORIGINS` value.
- Keep backend-only secrets out of frontend variables.
- Run the CI checks from the repository.
- Create a non-owner test account and verify its permissions.
- Create a test customer, product, invoice, partial payment, and expense.
- Download an invoice PDF.
- Confirm the dashboard outstanding balance changes after payment.
- Verify logout and sign-in again.

Production deployment is environment-specific. CI passing means the repository checks are healthy; it does not replace a real authenticated smoke test against the buyer's own Supabase project.
