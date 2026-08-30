# BizPilot Marketplace Listing Plan

## Primary offer

**BizPilot — Multi-Tenant Small-Business SaaS Starter**

**Launch price:** $149 one-time for a single commercial application license.

## Listing headline

Launch from a working small-business SaaS foundation instead of rebuilding authentication, tenant isolation, billing workflows, and dashboards from zero.

## Short description

BizPilot is a production-oriented Next.js + FastAPI + Supabase starter for developers, agencies, and entrepreneurs building small-business management products. It includes customers, products, services, invoices, payments, expenses, reports, role-aware workspaces, RLS, PDF invoices, CI, and deployment documentation.

## What makes it worth buying

The buyer is not paying for a logo or a generic dashboard template. The value is the working foundation: multi-tenant architecture, database migrations, authenticated API access, business workflows, financial calculations, PDF generation, security hardening, testing, and documentation.

## Best buyer profiles

- Developer building a vertical SaaS
- Agency building repeated client business portals
- Founder validating a small-business product idea
- Developer who wants a FastAPI + Next.js + Supabase reference architecture

## Screenshots to publish

1. Public demo hero
2. Dashboard with metrics and recent invoices
3. Customers page
4. Invoice creation screen
5. Payment recording screen with remaining balance
6. Expenses page
7. Reports page
8. Settings with role-aware controls
9. Login/signup screen

Do not publish real customer records, real email addresses, secret environment values, or screenshots containing private Supabase information.

## Buyer proof points

- Backend and frontend CI are configured.
- Backend tests and frontend build checks run on GitHub Actions.
- High-severity npm audit failures fail CI.
- Tenant access is enforced in application code and PostgreSQL RLS.
- The public demo does not require an account and uses fictional static data.
- The repository contains deployment and handover documentation.

## Pricing ladder to test

| Offer | Price | Rights |
|---|---:|---|
| Commercial | $149 | One commercial application; no resale of BizPilot source |
| Agency / White-label | $399+ | Client/white-label rights defined by separate agreement |
| Custom development | Quote separately | Paid engineering work outside the source-code license |

Do not describe the repository as open source unless a separate open-source license is intentionally added.

## Recommended launch order

### 1. Direct digital sale

Start with a storefront such as Lemon Squeezy or Gumroad. There is no need to pay a monthly fee just to test demand. Lemon Squeezy currently advertises no monthly ecommerce fee and a 5% + 50¢ base transaction fee, while Gumroad currently lists 10% + $0.50 for direct/profile sales; marketplace discovery sales on both platforms carry different higher fees. Verify the provider's current onboarding and payout availability for your country before opening the store.

### 2. Marketplace discovery

Apply to a code marketplace only after the listing, screenshots, installation process, and support policy are strong. A marketplace should be treated as an additional discovery channel, not the only sales channel.

### 3. Direct outreach

Send the demo to developers and agencies that are already building invoicing, CRM, business dashboards, or vertical SaaS products. Lead with saved development time and customization rights, not with generic AI claims.

## Buyer delivery package

The release package should contain:

```text
BizPilot-0.1.0/
  README.md
  CHANGELOG.md
  backend/
  frontend/
  supabase/
  docs/
  docker-compose.yml
  .env.example
```

Exclude real `.env` files, local caches, node_modules, `.next`, virtual environments, IDE settings, and private deployment credentials.

## Important limitation

This listing plan is a sales/packaging document. It is not a legal license or legal advice. The actual commercial license and refund/support terms should be finalized before taking payment.
