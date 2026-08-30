# BizPilot Demo Assets

Use this guide when preparing screenshots, a short video, or a marketplace listing.

## Screenshot order

Capture these screens in this order so the buyer sees the value quickly:

1. **Dashboard** — workspace name, revenue, expenses, net profit, customer count, recent invoices, and navigation.
2. **Customers** — search, customer list, add customer flow, and edit/archive actions.
3. **Invoices** — invoice list and creation flow with line items, tax, discount, totals, status actions, and PDF export.
4. **Payments** — sent/overdue invoice selection, remaining balance, payment entry, and validation against overpayment.
5. **Expenses** — expense list, create/edit/delete actions, and category handling.
6. **Reports** — reporting screen with workspace currency and business totals.
7. **Settings** — workspace settings with owner/admin edit permissions.

## Demo data rules

- Use fictional business names, customer names, emails, addresses, invoice numbers, and amounts.
- Never use real customer or financial information.
- Keep the demo dataset small enough to understand at a glance.
- Make invoice and payment examples internally consistent.
- Use one currency consistently within a demo workspace.

## Visual guidelines

Keep screenshots at a consistent desktop width and crop out the browser chrome. Use the normal BizPilot application styles rather than adding graphics on top of screenshots. Capture both light-background dashboard screens and the dark login panel if showing the authentication experience.

For a short product video, keep the camera moving through one workflow instead of opening every menu:

```text
Dashboard
  -> Customers
  -> Add customer
  -> Invoices
  -> Create invoice
  -> PDF download
  -> Payments
  -> Record partial payment
  -> Dashboard / Reports
```

## Current public demo

The application includes a public `/demo` route with fictional static data. It is safe to share as a product preview because it does not write to Supabase or create an account.

## Before publishing

Confirm that the screenshot release matches the code version being sold, no environment values are visible, no real data is shown, and the buyer receives the same features described in the sales page.
