# BizPilot Release Checklist

Use this checklist before selling or handing over a BizPilot release.

## Code

- [ ] Main branch is clean and the release commit is identified.
- [ ] GitHub Actions is green for backend and frontend.
- [ ] No real `.env` files or service-role credentials are committed.
- [ ] Example environment files contain placeholders only.
- [ ] Database migrations are complete and listed in order.

## Product

- [ ] Sign up works.
- [ ] Onboarding creates the first organization and owner membership.
- [ ] Customer create/edit/archive works.
- [ ] Product and service create/edit/archive works.
- [ ] Invoice creation calculates totals correctly.
- [ ] Invoice send/cancel/delete-draft actions work.
- [ ] Invoice PDF download works.
- [ ] Partial payments update remaining balances correctly.
- [ ] Overpayments are rejected.
- [ ] Expense create/edit/delete works.
- [ ] Dashboard and reports show the expected currency and totals.
- [ ] Settings respect owner/admin permissions.
- [ ] Logout and sign-in again work.

## Security

- [ ] Supabase RLS migrations have been applied to the target project.
- [ ] Production CORS allows only intended frontend origins.
- [ ] Supabase Auth redirect URLs point to the intended frontend.
- [ ] Backend-only secrets never appear in `NEXT_PUBLIC_*` variables.
- [ ] Test users cannot access another organization's records.
- [ ] Storage remains organization-scoped and private.

## Handover

- [ ] Deployment guide is included.
- [ ] Source-code sales terms are included with the release.
- [ ] The buyer receives the exact release version being sold.
- [ ] A fresh installation from a clean checkout has been tested.
- [ ] A demo account contains only fake/sample data.
- [ ] The buyer knows what support is included.

## Release note

Passing CI is necessary but not sufficient for a production deployment. A real authenticated smoke test against the target Supabase project should be completed before the release is handed to a customer.
