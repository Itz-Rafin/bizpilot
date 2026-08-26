# BizPilot Architecture

## Boundaries

BizPilot uses a practical Clean/Hexagonal Architecture. Dependencies point inward: presentation depends on application, application depends on domain ports, and infrastructure implements those ports. The domain layer has no imports from FastAPI, SQLAlchemy, Supabase, PostgreSQL, HTTP, or frontend code.

```text
Next.js UI
    |
    v
FastAPI Presentation (routers, schemas, dependencies)
    |
    v
Application Use Cases (orchestration)
    |
    v
Domain (entities, rules, value objects, ports)
    ^
    |
Infrastructure adapters (SQLAlchemy, Supabase Auth/Storage, PostgreSQL)
```

## Backend structure

| Layer | Responsibility | Representative paths |
|---|---|---|
| Domain | Entities, invariants, money-safe calculation, status transitions, repository ports | `backend/app/domain/` |
| Application | Use-case orchestration and DTO boundaries | `backend/app/application/` |
| Infrastructure | SQLAlchemy models, session management, repository adapters, Supabase adapters | `backend/app/infrastructure/` |
| Presentation | FastAPI routers, Pydantic schemas, authentication and tenant dependencies | `backend/app/presentation/` |

Routes are deliberately thin. They decode and validate input, obtain the authenticated tenant, invoke a use case, and map the result to a response. SQLAlchemy models never appear in domain entities, and domain rules can be unit-tested without a database or HTTP client.

## Tenant security

The API derives the user from a validated Supabase JWT and derives the organization from membership. It does not trust an organization ID supplied by the browser. Every organization-owned query includes the authenticated organization ID. The Supabase migration places BizPilot tables in the isolated `bizpilot` schema, enables RLS, and adds membership-based policies as defense in depth.

## Frontend boundaries

The browser UI is organized as presentation components plus a centralized typed API client. API calls are not scattered through arbitrary components. Supabase session access is isolated to `frontend/lib/supabase`, while API request and error handling lives in `frontend/lib/api`.

## Practicality rule

The project uses interfaces where replacement and independent testing are meaningful: repository ports separate domain/application code from SQLAlchemy, while the frontend keeps a single API client boundary. It intentionally avoids an extra service abstraction for every trivial field update.
