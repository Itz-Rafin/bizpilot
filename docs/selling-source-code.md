# Selling BizPilot as Source Code

BizPilot can be packaged as a reusable small-business SaaS starter instead of requiring a hosted SaaS business on day one.

## What the buyer receives

The codebase includes:

- Next.js frontend
- FastAPI backend
- Supabase/PostgreSQL schema and migrations
- Authentication and tenant isolation
- Role-based access
- Customers, products, services, invoices, payments, expenses, and reports
- Invoice PDF generation
- CI checks for backend and frontend
- Setup and deployment documentation

The value proposition is the time saved by starting from a working multi-tenant business application instead of building the foundation from scratch.

## Suggested license model

Do not describe the repository as open source unless you intentionally choose an open-source license.

A simple commercial package can use these internal tiers:

```text
Personal / learning:      single buyer, non-resale use
Commercial:               one commercial application
Agency / white-label:     client deployments and customization rights
```

The final legal license text should be chosen deliberately before a public sale. A paid source-code product should clearly state whether resale, redistribution, sublicensing, and support are allowed.

## Buyer demo flow

The fastest demo is one business workflow:

```text
Sign in
  -> Add customer
  -> Add product or service
  -> Create invoice
  -> Download invoice PDF
  -> Record partial payment
  -> Show reduced outstanding balance
  -> Add expense
  -> Show dashboard/reporting result
```

Keep the demo account free of private or real customer data.

## Sales page checklist

A good listing should show:

1. A clear product name and one-sentence value proposition.
2. Screenshots of the dashboard, customers, invoices, payments, expenses, and reports.
3. A short setup summary.
4. The technology stack.
5. Exactly what files and rights the buyer receives.
6. The license terms.
7. What is included and excluded from support.
8. A live demo link when available.
9. The repository version or release tag being sold.

## Suggested positioning

Avoid selling it as just an "invoice app." A stronger positioning is:

> BizPilot is a ready-to-customize multi-tenant small-business management SaaS starter for developers, agencies, and entrepreneurs who want to launch faster.

The buyer is paying for the codebase, architecture, security foundation, and saved development time.

## Before the first sale

- Create a release tag for the exact version being sold.
- Remove development-only credentials and personal environment values.
- Verify CI is green on the release commit.
- Run a fresh installation from a clean checkout.
- Test the full buyer demo workflow.
- Prepare a ZIP or release artifact containing only the files the buyer should receive.
- Publish the deployment guide with the release.
