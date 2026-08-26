# BizPilot Security Notes

## Tenant isolation

The authenticated user is derived from the Supabase JWT, never from an ID submitted by the browser. The profile stores `active_organization_id`; the authenticated user can change it only through the backend after membership verification, and multi-organization users without an active selection fail closed. FastAPI derives every tenant context from that persisted value and passes a `Tenant` context into the application layer. Repository queries include both the authenticated organization ID and requested record ID, so object-ID manipulation returns a not-found result rather than another tenant's record.

Supabase RLS is enabled on every organization-owned BizPilot table. The policies use security-definer membership functions in the isolated `bizpilot` schema. The frontend does not query BizPilot tables directly; the security hardening migration revokes direct table privileges from `anon` and `authenticated` and retains database access for the backend service role.

## Role enforcement

Owner and admin roles are required for organization settings and membership administration. Members can use business operations but cannot alter organization settings or roles. Future invitation flows must use a signed, expiring invitation record; the MVP does not create fake email invitations.

## Monetary integrity

The domain uses `Decimal` and PostgreSQL `numeric(12,2)` for money. Invoice totals are recalculated on the backend from validated line items. Payments are rejected when the cumulative amount would exceed the invoice total. Payment recording locks the tenant-scoped invoice row, stages the payment and status change, and commits once after both validations complete.

## Secret handling

Secrets are environment variables only. Service-role credentials are backend-only. Logs do not contain access tokens or passwords. Production CORS must be explicitly configured.

## Advisor result

After migration, Supabase security advisors reported no remaining GraphQL table-exposure warnings. One platform-level warning remains: the selected project is running Postgres `17.4.1.069` and Supabase recommends upgrading to a patched version. This is a platform upgrade action rather than an application migration and was not performed automatically. Remediation is documented at [Supabase database upgrades](https://supabase.com/docs/guides/platform/upgrading). The performance advisor now reports only informational `unused_index` notices because the new tables have no workload yet; the indexes are intentionally retained for the documented tenant, date, and foreign-key query patterns.

## Storage path convention

Files must be uploaded under `<organization_id>/<generated-name>-<safe-filename>`. The storage adapter rejects path components, backslashes, unsupported MIME types, mismatched magic bytes, files larger than 5 MB, and overwrite requests. Supabase Storage policies call the security-definer membership function against the organization path segment, so users with access to one organization cannot use another organization’s path.

## JWT validation

The backend accepts only HS256 Supabase user tokens whose signature, expiry, `sub`, configured audience, and project issuer validate successfully. The audience defaults to `authenticated` and is configurable through `SUPABASE_JWT_AUDIENCE`. CI sets this value explicitly; all verification failures fail closed.


## Final authenticated RLS validation status

The following controls are verified without using paid disposable infrastructure: application-level tenant isolation, FastAPI authorization, JWT validation, repository tenant scoping, RLS policy structure, storage policy structure, active-organization authorization logic, and the automated security suite. The live authenticated-role RLS test was **not executed**. The selected Supabase project has no existing development branch, and creating one has a non-zero hourly cost. No branch, test user, test record, or disposable storage object was created in the main project, and no policy was weakened for testing.

| Validation item | Final status |
|---|---|
| Application-level tenant isolation | Verified by automated authorization and repository-scope tests |
| FastAPI authorization | Verified by authenticated dependency, active-organization, and role tests |
| JWT validation | Verified for signature, issuer, audience, expiry, subject format, and malformed tokens |
| Repository tenant scoping | Verified across customer, catalog, invoice, payment, expense, notification/activity, dashboard, and report paths |
| RLS policy structure | Verified by read-only policy inspection in the selected project |
| Storage policy structure | Verified by read-only storage-policy inspection and adapter attack tests |
| Live authenticated-role, two-user RLS | Not executed; requires a free isolated test environment |

## Manual authenticated two-user RLS procedure

Run this procedure only against a disposable local Supabase stack or a separate free test project. Do not run the setup SQL against the BizPilot main project or any project containing real users. The recommended no-cost environment is a local Supabase CLI stack with the BizPilot migrations applied. If a separate test project is used, confirm its cost is zero before creating anything.

### 1. Prepare an isolated environment

Create a temporary working directory, copy the BizPilot migrations into it, and start the local Supabase stack according to the installed Supabase CLI documentation. Apply migrations `0001` through `0009` in order. Record the local project URL, anon/publishable key, database connection string, JWT secret, and storage endpoint. The assertions below must use ordinary authenticated user access tokens, never the database `postgres` role or a service-role token.

Expose the `bizpilot` schema to the local PostgREST API only in this isolated environment, if the local stack does not expose it by default. The REST requests should use the `bizpilot` profile through `Accept-Profile: bizpilot` and `Content-Profile: bizpilot`. Do not make this exposure change in the production project as part of the test.

```bash
export TEST_URL="http://127.0.0.1:54321"
export TEST_ANON_KEY="<isolated-anon-or-publishable-key>"
export TEST_DB_URL="<isolated-database-url>"
export TEST_JWT_SECRET="<isolated-jwt-secret>"
export TEST_BUCKET="bizpilot-assets"
export ORG_A="11111111-1111-4111-8111-111111111111"
export ORG_B="22222222-2222-4222-8222-222222222222"
export USER_A="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
export USER_B="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
```

### 2. Create two disposable authenticated identities

Create User A and User B through the isolated Supabase Auth signup endpoint or the local Auth dashboard. Use separate disposable email addresses and passwords. If email confirmation is enabled locally, confirm both users through the local dashboard or the documented local test flow. Capture each returned access token as `TOKEN_A` and `TOKEN_B`; never place either token in source control.

```bash
export TOKEN_A="<access-token-for-user-a>"
export TOKEN_B="<access-token-for-user-b>"
```

Verify the identities before continuing. A request to the Auth user endpoint with each bearer token must resolve to the expected disposable user ID. If the token subject does not match the intended ID, stop and clean up.

### 3. Create isolated organizations, memberships, profiles, and records

Use the isolated database administrator connection only for fixture setup. The setup connection is not evidence of RLS behavior. Create Organization A and Organization B, membership rows User A → Organization A and User B → Organization B, and a profile row for each user with `active_organization_id` set to its organization. To cover active-organization switching, additionally add User A as a member of Organization B, then set User A’s profile active organization to `NULL` for the fail-closed case.

Create one clearly labeled record per organization in `customers`, `products`, `services`, `invoices`, `invoice_items`, `payments`, `expense_categories`, `expenses`, `notifications`, and `activity_logs`. Ensure each invoice references its organization’s customer and catalog rows, each payment references its organization’s invoice, each invoice item references its organization’s invoice and optional catalog row, and each expense category/expense relationship stays within its organization. Create one private storage object beneath `<ORG_A>/` and one beneath `<ORG_B>/`. Record every generated fixture ID in a temporary file outside the repository.

A minimal setup transaction should use fixed UUIDs from the isolated environment and should be rolled back or fully cleaned up if any fixture fails. Do not use the setup connection for positive or negative assertions.

### 4. Test authenticated reads and writes through the user context

For each request, use the ordinary Supabase REST endpoint with the corresponding user’s `Authorization: Bearer $TOKEN_A` or `Authorization: Bearer $TOKEN_B`, the project anon/publishable key, and the `bizpilot` profile headers. Do not send a service-role key.

User A must be able to select Organization A’s profile, organization, membership, customer, product, service, invoice, invoice item, payment, expense category, expense, notification, and activity-log rows. User B must be able to select the analogous Organization B rows. User A’s own notification rows and organization-wide notifications should be visible only under the existing notification policy; activity logs should remain organization-scoped.

User A must not receive Organization B rows from direct UUID filters, modified query parameters, or modified URL path IDs. The response should be an empty result or a not-found response, depending on the endpoint. Repeat the same negative read cases with User B against Organization A. Check both the table’s `organization_id` and relationship IDs, including another organization’s customer ID, invoice ID, payment ID, expense ID, and catalog IDs.

Test writes with a small, disposable payload for every table where the policy permits writes. User A’s inserts with `organization_id = ORG_A` must succeed where the role permits them. User A’s inserts with `organization_id = ORG_B` must fail with an authorization error or affect zero rows. Repeat with User B in the opposite direction. Attempt modified bodies that pair an Organization A invoice with an Organization B customer, an Organization A payment with an Organization B invoice, an Organization A expense with an Organization B category, and an invoice item whose product or service belongs to the other organization; all must be rejected.

For updates, first update an Organization A record with User A and confirm the changed value is visible to User A. Then issue the same update against an Organization B record by changing only the URL ID, query filter, or request body organization ID; it must not change the row. Repeat in the opposite direction for User B. Test the immutable-tenant trigger by attempting to change an existing row’s `organization_id`; the request must fail and the row must remain unchanged.

For deletes and archives, delete or archive only records created for the caller’s organization and confirm the change. Attempt to delete or archive the other organization’s IDs and verify that no row is affected. Include organization-member role cases: a member cannot change organization settings or membership roles; an admin cannot modify or remove an owner; and an owner can perform only the explicitly allowed membership operations. Confirm profiles are self-only and that a profile cannot select an organization in which its user is not a member.

### 5. Test private storage isolation

Upload a small valid PNG or PDF as User A beneath the Organization A root and verify that User A can read it. Attempt to read, update, delete, overwrite, or upload beneath the Organization B root using User A’s token; every operation must be denied or affect zero objects. Explicitly test a path containing another organization’s UUID, `../`, nested components, backslashes, and an overwrite request with the same object path. Repeat all cases with User B against Organization B and Organization A in the opposite direction.

For a REST storage check, use the isolated storage endpoint and include the user bearer token, not the service-role key. A successful upload must use `upsert=false`; a second upload to the same object path must not silently replace the first object.

### 6. Test active-organization behavior through the backend API

Run the FastAPI backend against the isolated database and isolated JWT configuration. With User A belonging to Organizations A and B and `profiles.active_organization_id = NULL`, call a tenant-scoped endpoint such as `GET /api/v1/customers` with `TOKEN_A`; it must return HTTP 400 with the active-organization selection error. Call `POST /api/v1/organizations/active` with Organization A; it must return success only because User A is a member, and subsequent tenant-scoped requests must resolve to Organization A. Switch to Organization B and repeat the request to verify the persisted context changes. Attempt to switch to an unrelated Organization C; it must return HTTP 403 and leave the persisted active organization unchanged. Remove User A’s membership from an organization and confirm that selecting it is rejected.

### 7. Capture evidence and clean up

Save the test timestamp, isolated project or local-stack identifier, disposable user IDs, organization IDs, tested table list, positive results, negative results, storage results, active-organization results, and any HTTP status/body needed to reproduce a failure. Redact access tokens, passwords, database URLs, service-role keys, and JWT secrets from the evidence.

Clean up in a `finally` block even when an assertion fails. Delete storage objects first, then delete payments, invoice items, invoices, expenses, notifications, activity logs, catalog rows, customers, expense categories, profiles, organization memberships, organizations, and finally the two Auth users. Re-query each table with the isolated administrator connection and confirm zero fixture IDs remain. If using a local stack, stopping and removing the temporary stack is acceptable only after the explicit cleanup check. Never merge, reset, or delete a production project as part of this procedure.

The final conclusion must state either that the authenticated two-user RLS test passed in the isolated environment, with the captured evidence location, or that it was not completed and why. Policy inspection alone must never be reported as a live authenticated authorization test.
