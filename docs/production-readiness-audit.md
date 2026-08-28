# BizPilot Production-Readiness Audit

**Audit scope:** Security, Clean Architecture, authentication, authorization, multi-tenancy, RLS, storage, financial correctness, API behavior, frontend integration, mobile considerations, deployment configuration, dependency safety, and CI.

**Repository:** [BizPilot](https://github.com/Itz-Rafin/bizpilot)  
**Audit date:** 28 August 2026

## Executive conclusion

The audit found several real correctness and security issues in the initial implementation. They were fixed in the repository and, where applicable, in the connected Supabase project. The current code is materially safer and better aligned with Clean/Hexagonal Architecture, but this audit does **not** claim production certification: Docker image builds and fully authenticated live end-to-end testing still require an environment with configured credentials and infrastructure.

## Findings and fixes

| Area | Finding | Resolution | Status |
|---|---|---|---|
| JWT validation | Audience validation was disabled and issuer was not checked. | JWT verification now requires the configured audience and the selected project issuer. | Fixed |
| Tenant selection | Users with multiple memberships were silently bound to the first organization. | Active organization is persisted and membership is validated server-side. | Fixed |
| Invoice lifecycle | Draft update/delete methods were attached to the dashboard repository, while routes instantiated the invoice repository. | Methods were moved to `SqlAlchemyInvoiceRepository` and covered by tests. | Fixed |
| Payment rules | Payments could be attempted against cancelled/paid invoices, and balance checks needed concurrency protection. | Locked invoice reads, status guards, and transactional balance calculation now run through the application use case. | Fixed in code; live concurrency test remains environment-limited |
| Invoice status | Send/cancel routes could bypass domain transition rules. | Application-layer status guards now reject invalid transitions. | Fixed |
| Storage tenancy | Storage policies did not model organization-scoped assets correctly for multi-organization users. | Organization-rooted paths and membership checks were added. | Fixed in Supabase and migrations |
| Storage uploads | Adapter accepted arbitrary filenames, MIME claims, sizes, and overwrite behavior. | Added filename/path validation, 5 MB limit, allowlisted types, magic-byte checks, and unique non-overwriting paths. | Fixed |
| RLS relationships | Some policies checked submitted organization IDs without validating related tenant ownership. | Added relationship-integrity policies and ownership protections. | Fixed |
| Frontend identity | Dashboard rendered placeholder organization and user names. | Added `/me` context endpoint and authenticated workspace/profile rendering. | Fixed |
| Frontend logout | Dashboard lacked an actual logout action. | Profile control signs out through Supabase Auth and redirects to `/login`. | Fixed |
| Dependency security | `npm audit` reported a vulnerable PostCSS dependency path. | Added a patched PostCSS version and npm override. | Fixed; high-severity audit is green |
| Container security | Images ran as root by default. | Backend runs as a system `app` user; frontend uses the image's non-root `node` user. | Fixed; image build remains environment-limited |
| Security headers | Next.js had no explicit response security headers. | Added `nosniff`, `DENY` framing, strict referrer policy, and restrictive permissions policy. | Fixed |
| Financial display | Dashboard outstanding value ignored partial payments. | Outstanding now uses invoice total minus organization-scoped recorded payments. | Fixed |
| Payment UI | Payment form allowed selections that could never succeed and hid remaining balance. | Only payable invoices are shown and remaining balance is displayed before submission. | Fixed |

## Clean Architecture audit

The dependency direction is enforced as follows:

```text
Presentation → Application → Domain
       Infrastructure → implements ports used inward
```

The domain layer contains framework-independent billing entities, value calculations, status transitions, and payment invariants. The application layer contains customer, billing, catalog, and expense orchestration. The infrastructure layer contains SQLAlchemy repositories, JWT verification, Supabase Storage, PDF rendering, and database session concerns. FastAPI routes are responsible for HTTP translation, dependency injection, and response schemas rather than owning financial rules.

The architecture test scans the domain layer for forbidden imports, including FastAPI, SQLAlchemy, Supabase, HTTP clients, and infrastructure modules.

## Authentication and authorization audit

Protected API routes require authentication. Malformed tokens, expired tokens, wrong-audience tokens, wrong-issuer tokens, and invalid subject UUIDs are rejected by the JWT verifier.

The backend derives the authenticated user from the verified JWT and derives the organization from validated membership and active-organization state. Client-supplied organization IDs are not trusted as tenant authority.

Application-level tests simulate organization A and organization B and verify that cross-organization invoice creation and payment attempts are rejected. Live two-user Supabase red-team testing remains a separate environment task.

## Supabase database and RLS audit

BizPilot objects are isolated in the application schema. RLS policies cover customers, products, services, invoices, invoice items, payments, expenses, notifications, activity logs, profiles, organizations, memberships, and storage objects.

The remaining Supabase platform-level warning is the PostgreSQL patch-level upgrade, which must be performed through Supabase platform controls. Free-plan Auth limitations may also leave the leaked-password protection advisor warning enabled; that warning does not mean the application is storing plaintext passwords.

Performance-advisor unused-index notices are informational for a project without production workload. The indexes remain because they cover documented tenant, date, foreign-key, and reporting query patterns.

## Financial and PDF correctness

The domain uses `Decimal` with cent quantization and `ROUND_HALF_UP`. Tests cover decimal prices, multiple line items, tax, discounts, zero and negative quantities, negative prices, invalid dates, tax boundaries, overpayment, partial payment, exact payment, and cancelled/paid payment guards. The backend calculates invoice totals authoritatively; frontend values are not trusted.

Invoice PDFs are rendered by the ReportLab adapter and are generated from tenant-scoped invoice records.

## Test and build results

The current GitHub Actions pipeline is expected to validate backend Ruff checks, backend tests, frontend linting, TypeScript, high-severity npm audit, and the Next.js production build on each push.

The latest validated CI run before this packaging-only update had both backend and frontend jobs green. A subsequent documentation/configuration-only change should trigger the same pipeline again.

Docker Compose syntax and image builds remain environment-dependent.

## Residual limitations

The following are genuine unresolved or environment-limited items:

1. The Supabase Postgres version needs a platform upgrade through the Supabase dashboard.
2. Leaked-password protection is unavailable on the current Auth plan and therefore may remain as an advisor warning.
3. Live two-user/two-organization red-team testing against real Supabase Auth/RLS still requires dedicated test identities.
4. Live payment concurrency and storage upload/download tests require configured infrastructure and authenticated test identities.
5. Docker image-build verification requires a machine with Docker or an equivalent OCI builder.
6. Full authenticated browser workflows require test credentials and a running configured backend.

## Repository safety

Reusable environment examples contain placeholders rather than the owner's Supabase project details. Backend secrets are never placed in `NEXT_PUBLIC_*` variables. The repository does not grant a public open-source license; commercial redistribution or white-label use requires a separate written license.

## Audit status

The application and CI hardening work is complete for the current development milestone. Remaining items above are deployment/platform validation rather than known application defects.
