# Changelog

All notable BizPilot changes are recorded here.

## 0.1.0 - Initial sale-ready baseline

### Product
- Added customer management with search, create, edit, and archive actions.
- Added product and service management.
- Added invoice creation, lifecycle actions, and PDF export.
- Added payment recording with remaining-balance checks.
- Added expense tracking.
- Added dashboard metrics and reports.
- Added workspace settings with role-aware editing.
- Added multi-organization workspace support.
- Added a public `/demo` route using fictional static data.

### Security and correctness
- Hardened JWT audience and issuer validation.
- Strengthened organization membership and tenant checks.
- Improved PostgreSQL RLS relationship integrity.
- Hardened Supabase Storage tenancy and upload validation.
- Added security headers and production API documentation protection.
- Fixed invoice numbering and financial lifecycle edge cases.
- Added partial-payment balance correctness and overpayment protection.
- Removed personal Supabase project values from reusable environment templates and CI configuration.

### Developer experience
- Added backend and frontend CI checks.
- Added linting, type checking, dependency auditing, and production build validation.
- Added deployment, selling, demo, and release documentation.
- Added buyer-focused setup and handover guidance.

### Known release limitations
- Live authenticated browser testing against a real Supabase project still needs to be performed before a production handoff.
- Docker image build verification requires a machine with Docker or another OCI-compatible builder.
- Supabase Postgres platform upgrades must be completed through Supabase's project controls when a patched version is available.
