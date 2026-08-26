# BizPilot Security Notes

## Tenant isolation

The authenticated user is derived from the Supabase JWT, never from an ID submitted by the browser. FastAPI resolves the first organization membership for the user and passes a `Tenant` context into the application layer. Repository queries include both the authenticated organization ID and requested record ID, so object-ID manipulation returns a not-found result rather than another tenant's record.

Supabase RLS is enabled on every organization-owned BizPilot table. The policies use security-definer membership functions in the isolated `bizpilot` schema. The frontend does not query BizPilot tables directly; the security hardening migration revokes direct table privileges from `anon` and `authenticated` and retains database access for the backend service role.

## Role enforcement

Owner and admin roles are required for organization settings and membership administration. Members can use business operations but cannot alter organization settings or roles. Future invitation flows must use a signed, expiring invitation record; the MVP does not create fake email invitations.

## Monetary integrity

The domain uses `Decimal` and PostgreSQL `numeric(12,2)` for money. Invoice totals are recalculated on the backend from validated line items. Payments are rejected when the cumulative amount would exceed the invoice total.

## Secret handling

Secrets are environment variables only. Service-role credentials are backend-only. Logs do not contain access tokens or passwords. Production CORS must be explicitly configured.

## Advisor result

After migration, Supabase security advisors reported no remaining GraphQL table-exposure warnings. One platform-level warning remains: the selected project is running Postgres `17.4.1.069` and Supabase recommends upgrading to a patched version. This is a platform upgrade action rather than an application migration and was not performed automatically. Remediation is documented at [Supabase database upgrades](https://supabase.com/docs/guides/platform/upgrading). The performance advisor now reports only informational `unused_index` notices because the new tables have no workload yet; the indexes are intentionally retained for the documented tenant, date, and foreign-key query patterns.
