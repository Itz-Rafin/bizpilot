# BizPilot Focused Security-Hardening Evidence

**Repository:** `Itz-Rafin/bizpilot`  
**Supabase project:** `cmrjhjtpdtcoduximxkg`  
**Scope:** Focused security hardening only; no unrelated product feature work was introduced.

## Executive result

The focused pass is implemented and validated locally and against the selected BizPilot Supabase project. The central tenancy change is a persisted `bizpilot.profiles.active_organization_id` selected only through an authenticated, membership-checked backend endpoint. Tenant-scoped requests no longer accept a caller-selected organization header; the backend derives the active tenant from the persisted profile value and fails closed for multi-organization users without an active selection.

The payment path now has a concrete SQLAlchemy `FOR UPDATE` invoice lock and one staged commit for the payment plus invoice-status transition. RLS was reviewed and strengthened with explicit relationship checks, owner/admin membership controls, an active-profile membership check, an immutable-organization trigger on all organization-owned rows, and private storage path policies.

## Implemented controls

| Area | Evidence in repository | Result |
|---|---|---|
| Active organization | `profiles.active_organization_id`; `POST /api/v1/organizations/active`; typed `/me` context with membership summaries | Membership is verified server-side before persistence; multi-organization users without a selection receive HTTP 400 from tenant resolution |
| Tenant resolution | `get_tenant` derives the tenant from the authenticated user’s profile and membership rows | Client organization IDs are not trusted for ordinary tenant-scoped requests |
| Backend-only privilege | Service-role configuration is loaded only by backend infrastructure; frontend uses the public API and Supabase Auth session | No service-role key or JWT secret is placed in frontend source or public environment configuration |
| JWT verification | `SupabaseJwtVerifier` validates HS256 signature, expiry, UUID subject, configured audience, and project issuer | Invalid, expired, wrong-audience, wrong-issuer, malformed, and non-UUID-subject tokens fail closed |
| Payment integrity | `lock_for_payment`, staged repository writes, one final commit | Paid/cancelled invoices and overpayments are rejected; the concrete missing lock adapter is fixed |
| Tenant relationships | Migration `0006_bizpilot_rls_relationship_integrity.sql` | Invoices, invoice items, payments, expenses, and catalog references must remain within the same organization |
| Role protection | Migrations `0006` and `0008` | Owner/admin membership operations are explicit; admin policies cannot target owner rows; members fail the settings role gate |
| Tenant transfer prevention | Migration `0008_bizpilot_rls_role_transfer_fix.sql` | `organization_id` is immutable on organization-owned rows through a database trigger |
| Storage | Private `bizpilot-assets` bucket, generated organization-rooted paths, MIME/magic-byte/size/path checks, `upsert=false` | Traversal, nested paths, backslashes, unsupported types, magic mismatches, oversized files, cross-root paths, and overwrites are covered |
| RLS performance | Migration `0009_bizpilot_rls_initplan_fix.sql` | The Supabase `auth_rls_initplan` warning for the profile policy was remediated with statement-level `auth.uid()` evaluation |

## Automated test evidence

The final backend run completed **53 passing tests** with one non-failing Starlette/httpx deprecation warning. The suite includes the prior domain, JWT, API smoke, architecture, and authorization tests plus the focused security tests.

| Test category | Coverage |
|---|---|
| JWT | Valid token acceptance; malformed, wrong audience, wrong issuer, invalid UUID subject, and expired-token rejection |
| Active organization | Persisted active organization wins over membership order; missing active context fails closed; authorized switch persists; non-membership switch is denied |
| Roles | Owner and admin pass the settings role dependency; member receives HTTP 403 |
| Cross-tenant repository scoping | Customer, invoice, payment, product, service, expense, dashboard, and related lookup/list query paths include an explicit organization predicate; direct foreign organization IDs do not match the scoped lookup |
| Payment lifecycle | Other-organization invoice is not found; paid/cancelled invoice payments are rejected; staged payment/status changes commit atomically; concrete invoice lock emits `FOR UPDATE` |
| Storage attacks | Unsafe paths, unsupported MIME, magic-byte mismatch, size limit, organization-root separation, and `upsert=false` are covered |
| Architecture | Domain layer remains free of FastAPI, SQLAlchemy, Supabase, and HTTP imports |

These are deterministic application/repository and policy-structure tests. They do not claim a live two-user Supabase RLS session test because no test users or business records were seeded into the selected project, and the available SQL execution context reported database role `postgres` with no JWT subject. This was intentional to avoid modifying real user data and because a privileged SQL context would not be a valid proof of `authenticated`-role RLS behavior.

## Supabase migration and RLS verification

The selected project was verified by project ID before writes. Applied BizPilot migration history now includes `bizpilot_active_organization`, `bizpilot_rls_role_transfer_fix`, and `bizpilot_rls_initplan_fix` after the previously applied foundation, security, storage, performance, storage-tenant, and relationship-integrity migrations. All migrations are isolated to the `bizpilot` schema or the existing `bizpilot-assets` bucket and are non-destructive with respect to unrelated schemas and projects.

A read-only `pg_policies` query verified **15 BizPilot table policies** covering activity logs, customers, expense categories, expenses, invoice items, invoices, notifications, organization members, organizations, payments, products, profiles, and services. A separate read-only query verified **four private storage object policies** for select, insert, update, and delete. A trigger query verified the immutable-tenant guard on **10 organization-owned tables**: activity logs, customers, expense categories, expenses, invoices, notifications, organization members, payments, products, and services.

The Supabase security advisor reports one remaining platform-level warning: the project is running Postgres `17.4.1.069` and Supabase recommends a patched platform upgrade. The performance advisor no longer reports the profile RLS initialization-plan finding; remaining notices are informational unused-index notices expected for a new schema without production workload. The platform upgrade is intentionally not performed by an application migration. See [Supabase database upgrades][1].

## Final validation commands

| Check | Result |
|---|---|
| `ruff check app tests` | Passed |
| `python3 -m compileall -q app tests` | Passed |
| `pytest -q` | 53 passed, 1 warning |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; Next.js production build completed |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities |
| `git diff --check` | Passed |
| Secret-pattern scan for common API-key/JWT forms | No matches |
| Browser unauthenticated smoke | `/` redirected to `/login`; login form rendered |
| Docker build/run | Not executed: Docker binary is unavailable in the sandbox |

## Residual risks and deployment actions

The remaining database advisor warning requires a Supabase platform Postgres upgrade and should be scheduled through the Supabase project controls rather than bundled into application SQL. A production deployment must provide a real `SUPABASE_JWT_SECRET`, explicitly configured `SUPABASE_JWT_AUDIENCE`, restricted CORS origins, a production database connection, and the backend-only service-role credential through the deployment secret manager. Docker images were not built in this environment because the Docker executable is unavailable. A true authenticated-role, two-user RLS integration test remains a deployment/branch validation item; it should run against an isolated Supabase branch with disposable test identities and rollback/cleanup controls, not against real user accounts.

[1]: https://supabase.com/docs/guides/platform/upgrading "Supabase database upgrades"


## Final no-cost decision

No disposable Supabase branch was created because the available branch estimate was non-zero and the project budget is strictly zero. No test users, organizations, records, storage objects, or policy changes were created in the main Supabase project. The live authenticated-role RLS test remains the single outstanding validation item. The complete procedure for a later free isolated environment is documented in [the security manual procedure](security.md#manual-authenticated-two-user-rls-procedure).

The final status is therefore: application-level tenant isolation **verified**; FastAPI authorization **verified**; JWT validation **verified**; repository tenant scoping **verified**; RLS policy structure **verified**; storage policy structure **verified**; live authenticated-role RLS **not executed due to the no-cost safety constraint**.
