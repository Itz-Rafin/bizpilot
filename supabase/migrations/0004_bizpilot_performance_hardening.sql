-- Cover foreign keys used by tenant and aggregate queries.
create index if not exists ix_bp_activity_user on bizpilot.activity_logs(user_id);
create index if not exists ix_bp_expenses_category on bizpilot.expenses(category_id);
create index if not exists ix_bp_invoice_items_invoice on bizpilot.invoice_items(invoice_id);
create index if not exists ix_bp_invoice_items_product on bizpilot.invoice_items(product_id);
create index if not exists ix_bp_invoice_items_service on bizpilot.invoice_items(service_id);
create index if not exists ix_bp_invoices_customer on bizpilot.invoices(customer_id);
create index if not exists ix_bp_notifications_org on bizpilot.notifications(organization_id);
create index if not exists ix_bp_notifications_user on bizpilot.notifications(user_id);
create index if not exists ix_bp_members_user on bizpilot.organization_members(user_id);
create index if not exists ix_bp_payments_invoice on bizpilot.payments(invoice_id);
create index if not exists ix_bp_products_org on bizpilot.products(organization_id);
create index if not exists ix_bp_services_org on bizpilot.services(organization_id);

-- Avoid per-row auth function re-evaluation.
drop policy if exists bp_profiles_self on bizpilot.profiles;
create policy bp_profiles_self on bizpilot.profiles for all using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists bp_notifications_tenant on bizpilot.notifications;
create policy bp_notifications_tenant on bizpilot.notifications for all using (bizpilot.is_member(organization_id) and (user_id is null or user_id = (select auth.uid()))) with check (bizpilot.is_member(organization_id));

-- Keep membership SELECT on one policy; writes are separately role-gated.
drop policy if exists bp_members_admin on bizpilot.organization_members;
create policy bp_members_insert on bizpilot.organization_members for insert with check (bizpilot.has_role(organization_id, array['owner','admin']));
create policy bp_members_update on bizpilot.organization_members for update using (bizpilot.has_role(organization_id, array['owner','admin'])) with check (bizpilot.has_role(organization_id, array['owner','admin']));
create policy bp_members_delete on bizpilot.organization_members for delete using (bizpilot.has_role(organization_id, array['owner','admin']));
