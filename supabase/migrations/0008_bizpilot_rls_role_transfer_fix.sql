-- Remove the original broad membership policy so restricted owner/admin policies are authoritative.
drop policy if exists bp_members_admin on bizpilot.organization_members;

-- A profile may select only an organization in which its user is a member.
drop policy if exists bp_profiles_self on bizpilot.profiles;
create policy bp_profiles_self on bizpilot.profiles for all
using (id = auth.uid())
with check (
  id = auth.uid()
  and (active_organization_id is null or bizpilot.is_member(active_organization_id))
);

-- Tenant identity is immutable after insert. This blocks direct-client attempts to move
-- an object from organization A to organization B, even when a user belongs to both.
create or replace function bizpilot.prevent_organization_transfer()
returns trigger language plpgsql security invoker set search_path = bizpilot, public
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id is immutable';
  end if;
  return new;
end;
$$;


drop trigger if exists bp_org_transfer_guard on bizpilot.organization_members;
create trigger bp_org_transfer_guard before update on bizpilot.organization_members
for each row execute function bizpilot.prevent_organization_transfer();

drop trigger if exists bp_org_transfer_guard on bizpilot.customers;
create trigger bp_org_transfer_guard before update on bizpilot.customers
for each row execute function bizpilot.prevent_organization_transfer();

drop trigger if exists bp_org_transfer_guard on bizpilot.products;
create trigger bp_org_transfer_guard before update on bizpilot.products
for each row execute function bizpilot.prevent_organization_transfer();

drop trigger if exists bp_org_transfer_guard on bizpilot.services;
create trigger bp_org_transfer_guard before update on bizpilot.services
for each row execute function bizpilot.prevent_organization_transfer();

drop trigger if exists bp_org_transfer_guard on bizpilot.invoices;
create trigger bp_org_transfer_guard before update on bizpilot.invoices
for each row execute function bizpilot.prevent_organization_transfer();

drop trigger if exists bp_org_transfer_guard on bizpilot.payments;
create trigger bp_org_transfer_guard before update on bizpilot.payments
for each row execute function bizpilot.prevent_organization_transfer();

drop trigger if exists bp_org_transfer_guard on bizpilot.expense_categories;
create trigger bp_org_transfer_guard before update on bizpilot.expense_categories
for each row execute function bizpilot.prevent_organization_transfer();

drop trigger if exists bp_org_transfer_guard on bizpilot.expenses;
create trigger bp_org_transfer_guard before update on bizpilot.expenses
for each row execute function bizpilot.prevent_organization_transfer();

drop trigger if exists bp_org_transfer_guard on bizpilot.notifications;
create trigger bp_org_transfer_guard before update on bizpilot.notifications
for each row execute function bizpilot.prevent_organization_transfer();

drop trigger if exists bp_org_transfer_guard on bizpilot.activity_logs;
create trigger bp_org_transfer_guard before update on bizpilot.activity_logs
for each row execute function bizpilot.prevent_organization_transfer();
