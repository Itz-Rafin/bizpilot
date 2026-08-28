-- RLS policies should apply to signed-in users only.
-- Anonymous access to the bizpilot schema is already blocked, but keeping the
-- policies on authenticated makes the access rule explicit.
alter policy bp_profiles_self on bizpilot.profiles to authenticated;
alter policy bp_org_membership on bizpilot.organizations to authenticated;
alter policy bp_members_read on bizpilot.organization_members to authenticated;
alter policy bp_members_insert on bizpilot.organization_members to authenticated;
alter policy bp_members_update on bizpilot.organization_members to authenticated;
alter policy bp_members_delete on bizpilot.organization_members to authenticated;
alter policy bp_customers_tenant on bizpilot.customers to authenticated;
alter policy bp_products_tenant on bizpilot.products to authenticated;
alter policy bp_services_tenant on bizpilot.services to authenticated;
alter policy bp_invoices_tenant on bizpilot.invoices to authenticated;
alter policy bp_invoice_items_tenant on bizpilot.invoice_items to authenticated;
alter policy bp_payments_tenant on bizpilot.payments to authenticated;
alter policy bp_categories_tenant on bizpilot.expense_categories to authenticated;
alter policy bp_expenses_tenant on bizpilot.expenses to authenticated;
alter policy bp_notifications_tenant on bizpilot.notifications to authenticated;
alter policy bp_activity_tenant on bizpilot.activity_logs to authenticated;
