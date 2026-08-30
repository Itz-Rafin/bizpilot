# BizPilot Sales Page Copy

## Product name

BizPilot — Small Business SaaS Starter

## One-line value proposition

A ready-to-customize multi-tenant small-business management SaaS for developers, agencies, and entrepreneurs who want to launch faster.

## Hero section

**Run the business. Keep the numbers clear.**

BizPilot brings customers, products, services, invoices, payments, expenses, and reporting into one business workspace.

**Primary CTA:** View Demo  
**Secondary CTA:** Get the Source Code

## What the buyer gets

- Next.js frontend
- FastAPI backend
- Supabase/PostgreSQL database schema and migrations
- Supabase Auth integration
- Multi-organization workspace model
- Role-based access control
- PostgreSQL RLS tenant isolation
- Customer management
- Product and service management
- Invoice creation and PDF export
- Payment tracking
- Expense tracking
- Dashboard and reports
- Workspace settings
- Docker configuration
- CI for backend and frontend
- Setup and deployment documentation

## Why buy a starter instead of building from zero?

Building a SaaS like this from scratch means solving authentication, tenant isolation, database design, CRUD workflows, financial calculations, authorization, PDF generation, frontend states, deployment, and testing before the product is even ready for customization.

BizPilot gives a buyer a working foundation they can adapt to their own business idea, agency client, or SaaS product.

## Ideal buyers

**Developers** who want a business-management foundation they can customize.

**Agencies** that repeatedly build dashboards, invoicing, customer management, and business portals for clients.

**Entrepreneurs** who want to turn an existing codebase into a focused vertical SaaS.

## Core workflow

Customer → Product/Service → Invoice → Payment → Expense → Dashboard

The financial workflow is designed around authoritative backend calculations, tenant-aware access control, and consistent currency handling.

## Technology stack

```text
Frontend:  Next.js + React + TypeScript + Tailwind CSS
Backend:   FastAPI + Python 3.12 + SQLAlchemy
Database:  PostgreSQL via Supabase
Auth:      Supabase Auth
Storage:   Supabase Storage
PDF:       ReportLab
CI:        GitHub Actions
```

## Security foundation

BizPilot uses layered tenant protection rather than relying only on frontend checks. The backend validates authenticated membership and organization context, while PostgreSQL RLS provides an additional database-level boundary.

The repository also includes security hardening for JWT validation, cross-tenant relationships, storage paths, payment rules, and API behavior.

## Demo promise

The public demo uses fictional data only. It is intended to show the product experience without creating or modifying real business records.

## Suggested package structure

### Starter — $49

For learning, evaluation, and personal projects. Includes the source code and setup documentation. No resale rights.

### Commercial — $149

For one commercial application. Includes source code, deployment documentation, and one project deployment/use license.

### Agency / White-label — $399+

For agencies or buyers who need client customization and white-label deployment rights. Final terms should be defined in the separate commercial license.

These prices are testing suggestions, not guaranteed market values.

## What is not included

- Hosting costs
- Supabase project ownership
- Third-party service fees
- Payment processor merchant accounts
- Guaranteed revenue or customers
- Unlimited custom development
- Legal/accounting advice

## Support policy

A source-code sale should define support separately from the software license.

Suggested default:

- Documentation support: included
- Installation troubleshooting: limited after purchase
- Custom feature development: paid separately
- Client-specific customization: paid separately

## Buyer objections

**“Why not build this myself?”**  
You can, but the buyer is paying for the time saved by starting with an existing architecture and working business workflows.

**“Can I use it commercially?”**  
Only according to the commercial license purchased with the product.

**“Can I resell the code?”**  
Not under the default commercial tier. Resale or redistribution must be explicitly licensed.

**“Does the demo use real customer information?”**  
No. The public demo uses fictional static data.

## Final CTA

**Start from a working foundation. Customize the product around your market instead of rebuilding the basics.**

View the demo, review the architecture, and choose the license that fits your use case.
