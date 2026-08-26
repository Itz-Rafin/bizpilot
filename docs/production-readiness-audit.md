# BizPilot Production-Readiness Audit

**Audit scope:** Security, Clean Architecture, authentication, authorization, multi-tenancy, RLS, storage, financial correctness, API behavior, frontend integration, mobile considerations, deployment configuration, dependency safety, and CI.

**Repository:** [Itz-Rafin/bizpilot](https://github.com/Itz-Rafin/bizpilot)  
**Supabase project:** `cmrjhjtpdtcoduximxkg`  
**Audit date:** 26 August 2026

## Executive conclusion

The audit found several real correctness and security issues in the initial implementation. They were fixed in the repository and, where applicable, in the selected Supabase project. The current code is materially safer and better aligned with Clean/Hexagonal Architecture, but this audit does **not** claim production certification: Docker could not be built because the sandbox has no Docker executable, and authenticated end-to-end testing against real Supabase accounts was intentionally not performed to avoid creating or mutating real user data.

## Findings and fixes

| Area | Finding | Resolution | Status |
|---|---|---|---|
| JWT validation | Audience validation was disabled and issuer was not checked. | JWT verification now requires the configured audience and the selected project issuer. | Fixed |
| Tenant selection | Users with multiple memberships were silently bound to the first organization. | `X-Organization-ID` is now required for multi-organization users and membership is validated server-side. | Fixed |
| Invoice lifecycle | Draft update/delete methods were attached to the dashboard repository, while routes instantiated the invoice repository. | Methods were moved to `SqlAlchemyInvoiceRepository` and covered by tests. | Fixed |
| Payment rules | Payments could be attempted against cancelled invoices, and balance checks were vulnerable to concurrent read-then-write races. | Locked invoice reads, cancelled/paid guards, and balance calculation now run through the application use case. | Fixed in code; live concurrency test remains environment-limited |
| Invoice status | Send/cancel routes could bypass domain transition rules. | Application-layer status guards now reject invalid transitions. | Fixed |
| Storage tenancy | Storage policies used the user ID as the first path segment, which did not model organization-scoped assets for multi-organization users. | Added `is_member_text` security-definer function and organization-rooted paths: `<organization_id>/<asset>`. | Fixed in Supabase and migration `0005` |
| Storage uploads | Adapter accepted arbitrary filenames, MIME claims, sizes, and overwrite behavior. | Added filename/path validation, 5 MB limit, allowlisted types, magic-byte checks, and unique non-overwriting paths. | Fixed |
| RLS relationships | Some policies checked only submitted organization IDs and did not validate customer, product, service, category, invoice, and payment relationships. | Added relationship-integrity policies and owner/admin ownership protections in migration `0006`. | Fixed in Supabase and migration `0006` |
| Frontend identity | Dashboard rendered placeholder organization and user names. | Added `/me` context endpoint and authenticated workspace/profile rendering. | Fixed |
| Frontend logout | Dashboard lacked an actual logout action. | Profile control now signs out through Supabase Auth and redirects to `/login`. | Fixed |
| Dependency security | `npm audit` reported vulnerable PostCSS through the Next.js dependency tree. | Added patched PostCSS version and npm override; `npm audit --omit=dev` now reports zero vulnerabilities. | Fixed |
| Container security | Images ran as root by default. | Backend runs as a system `app` user; frontend runs as the image’s non-root `node` user. | Fixed; image build unavailable in sandbox |
| Security headers | Next.js had no explicit response security headers. | Added `nosniff`, `DENY` framing, strict referrer policy, and restrictive permissions policy. | Fixed |

## Clean Architecture audit

The dependency direction is now enforced as follows:

```text
Presentation → Application → Domain
       Infrastructure → implements ports used inward
```

The domain layer contains framework-independent billing entities, value calculations, status transitions, and payment invariants. The application layer contains customer, billing, catalog, and expense orchestration. The infrastructure layer contains SQLAlchemy repositories, JWT verification, Supabase Storage, PDF rendering, and database session concerns. FastAPI routes are responsible for HTTP translation, dependency injection, and response schemas rather than owning financial rules.

The architecture test scans the domain layer for forbidden imports, including FastAPI, SQLAlchemy, Supabase, HTTP clients, and infrastructure modules. It passes.

## Authentication and authorization audit

Unauthenticated access to protected API routes returned `401`. Malformed tokens, expired tokens, wrong-audience tokens, wrong-issuer tokens, and invalid subject UUIDs are rejected by the JWT verifier. Frontend middleware redirected an unauthenticated dashboard request to `/login` during browser smoke testing.

The backend derives the authenticated user from the verified JWT and derives the organization from a validated membership query. Client-supplied organization IDs are not trusted as tenant authority. When multiple memberships exist, an explicit `X-Organization-ID` header is required and must match a membership of the authenticated user.

Application-level red-team tests simulate organization A and organization B and verify that cross-organization invoice creation and payment attempts are rejected. Real Supabase account creation was not performed because the audit was designed not to create or alter real users.

## Supabase database and RLS audit

The selected project began with an empty `public` table inventory. BizPilot objects are isolated in the `bizpilot` schema. The following migrations are recorded in the selected project:

| Migration | Purpose |
|---|---|
| `bizpilot_foundation` | Normalized business tables, constraints, helper functions, indexes, and baseline RLS |
| `bizpilot_security_hardening` | Removes unnecessary direct table privileges from `anon` and `authenticated` |
| `bizpilot_storage` | Creates the private `bizpilot-assets` bucket and initial policies |
| `bizpilot_performance_hardening` | Adds justified foreign-key indexes and improves RLS planning |
| `bizpilot_storage_tenant_fix` | Changes storage authorization to organization membership and safe path handling |
| `bizpilot_rls_relationship_integrity` | Validates logical tenant relationships and protects ownership operations |

Read-only policy verification confirmed RLS policies for customers, products, services, invoices, invoice items, payments, expenses, notifications, activity logs, profiles, organizations, memberships, and storage objects. Supabase security advisors report no remaining GraphQL table-exposure lints. The remaining security warning is platform-level: Postgres `17.4.1.069` has patches available and should be upgraded through Supabase’s platform controls. See [Supabase database upgrades](https://supabase.com/docs/guides/platform/upgrading).

The performance advisor reports informational unused-index notices because the new project has no production workload yet. The indexes remain because they cover documented tenant, date, foreign-key, and reporting query patterns; they were not removed merely to silence an advisor.

## Financial and PDF correctness

The domain uses `Decimal` with cent quantization and `ROUND_HALF_UP`. Tests cover decimal prices, multiple line items, tax, discounts, zero and negative quantities, negative prices, invalid dates, tax boundaries, overpayment, partial payment, exact payment, and cancelled/paid payment guards. The backend calculates invoice totals authoritatively; frontend values are not trusted.

Invoice PDFs are rendered by the open-source ReportLab adapter and are generated from tenant-scoped invoice records. The route first loads the invoice through the organization-scoped repository, preventing a caller from selecting another organization’s invoice by ID.

## Test and build results

The expanded backend suite contains **33 passing tests** covering domain rules, authentication, API smoke behavior, architecture boundaries, storage safety, and simulated cross-tenant authorization. Ruff checks and Python compilation pass. The only reported test warning is Starlette’s deprecation warning about the installed `httpx` integration.

The frontend passes TypeScript validation, Next.js production build, and `npm audit --omit=dev` with zero vulnerabilities. The built routes include `/`, `/login`, `/onboarding`, and dynamic workspace sections.

The public login page rendered successfully in a browser smoke test. An unauthenticated request to `/` redirected to `/login`. No real credentials were entered, and no account-creation form was submitted.

Docker Compose syntax and image builds could not be executed because the sandbox does not contain a `docker` executable. The Dockerfiles were statically reviewed and hardened for non-root execution.

## Residual limitations

The following are genuine unresolved or environment-limited items:

1. The Supabase control-plane display name could not be renamed because the enabled management integration exposes no project-rename operation. The selected project ID is documented as authoritative.
2. The selected Supabase Postgres version needs a platform upgrade through the Supabase dashboard.
3. A live two-user/two-organization red-team run against Supabase Auth and RLS was not performed because it would require creating or mutating real accounts. Application-level simulation and read-only policy verification were performed instead.
4. Live payment concurrency and storage download/upload tests require a configured database connection and authenticated test identities. The code includes transactional invoice locking and storage policy fixes, but these specific live tests remain to be run in a dedicated non-production Supabase branch or test project.
5. Docker build verification requires a machine with Docker or an equivalent OCI builder.
6. Full authenticated browser workflows—including signup, onboarding against live Supabase, invoice creation, payment recording, settings changes, and logout—require test credentials and a running configured backend. Public-route and unauthenticated redirect smoke tests were completed.

## Audit commits

The audit fixes are staged for a dedicated commit after final validation. No secrets were added to Git. Backend-only secrets remain outside `NEXT_PUBLIC_*` variables.

## References

[1]: https://supabase.com/docs/guides/platform/upgrading "Supabase database upgrades"
