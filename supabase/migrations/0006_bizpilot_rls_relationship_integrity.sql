-- RLS must validate logical tenant relationships, not only the submitted organization_id.
drop policy if exists bp_invoices_tenant on bizpilot.invoices;
create policy bp_invoices_tenant on bizpilot.invoices for all
using (bizpilot.is_member(organization_id))
with check (
  bizpilot.is_member(organization_id)
  and exists (select 1 from bizpilot.customers c where c.id = customer_id and c.organization_id = invoices.organization_id)
);

drop policy if exists bp_invoice_items_tenant on bizpilot.invoice_items;
create policy bp_invoice_items_tenant on bizpilot.invoice_items for all
using (
  exists (
    select 1 from bizpilot.invoices i
    where i.id = invoice_id
      and bizpilot.is_member(i.organization_id)
      and (product_id is null or exists (select 1 from bizpilot.products p where p.id = invoice_items.product_id and p.organization_id = i.organization_id))
      and (service_id is null or exists (select 1 from bizpilot.services s where s.id = invoice_items.service_id and s.organization_id = i.organization_id))
  )
)
with check (
  exists (
    select 1 from bizpilot.invoices i
    where i.id = invoice_id
      and bizpilot.is_member(i.organization_id)
      and (product_id is null or exists (select 1 from bizpilot.products p where p.id = invoice_items.product_id and p.organization_id = i.organization_id))
      and (service_id is null or exists (select 1 from bizpilot.services s where s.id = invoice_items.service_id and s.organization_id = i.organization_id))
  )
);

drop policy if exists bp_payments_tenant on bizpilot.payments;
create policy bp_payments_tenant on bizpilot.payments for all
using (
  bizpilot.is_member(organization_id)
  and exists (select 1 from bizpilot.invoices i where i.id = payments.invoice_id and i.organization_id = payments.organization_id)
)
with check (
  bizpilot.is_member(organization_id)
  and exists (select 1 from bizpilot.invoices i where i.id = payments.invoice_id and i.organization_id = payments.organization_id)
);

drop policy if exists bp_expenses_tenant on bizpilot.expenses;
create policy bp_expenses_tenant on bizpilot.expenses for all
using (
  bizpilot.is_member(organization_id)
  and (category_id is null or exists (select 1 from bizpilot.expense_categories c where c.id = expenses.category_id and c.organization_id = expenses.organization_id))
)
with check (
  bizpilot.is_member(organization_id)
  and (category_id is null or exists (select 1 from bizpilot.expense_categories c where c.id = expenses.category_id and c.organization_id = expenses.organization_id))
);

drop policy if exists bp_members_insert on bizpilot.organization_members;
create policy bp_members_insert on bizpilot.organization_members for insert
with check (bizpilot.has_role(organization_id, array['owner']) or (bizpilot.has_role(organization_id, array['admin']) and role <> 'owner'));
drop policy if exists bp_members_update on bizpilot.organization_members;
create policy bp_members_update on bizpilot.organization_members for update
using (bizpilot.has_role(organization_id, array['owner']) or (bizpilot.has_role(organization_id, array['admin']) and role <> 'owner'))
with check (bizpilot.has_role(organization_id, array['owner']) or (bizpilot.has_role(organization_id, array['admin']) and role <> 'owner'));
drop policy if exists bp_members_delete on bizpilot.organization_members;
create policy bp_members_delete on bizpilot.organization_members for delete
using (bizpilot.has_role(organization_id, array['owner']) or (bizpilot.has_role(organization_id, array['admin']) and role <> 'owner'));
