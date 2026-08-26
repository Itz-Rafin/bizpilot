-- BizPilot foundation migration. It creates only the dedicated bizpilot schema.
create schema if not exists bizpilot;
set search_path = bizpilot, public;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name varchar(160),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name varchar(160) not null,
  slug varchar(180) not null unique,
  logo_url text,
  email varchar(320),
  phone varchar(40),
  address text,
  business_type varchar(80),
  currency varchar(3) not null default 'USD' check (char_length(currency) = 3),
  timezone varchar(64) not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role varchar(20) not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name varchar(160) not null,
  email varchar(320), phone varchar(40), company varchar(160), address text, notes text,
  status varchar(20) not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists ix_bp_customers_org_name on customers(organization_id, name);

create table if not exists products (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  name varchar(160) not null, sku varchar(80), description text, price numeric(12,2) not null default 0 check (price >= 0),
  cost numeric(12,2) not null default 0 check (cost >= 0), quantity numeric(12,2) not null default 0 check (quantity >= 0),
  low_stock_threshold numeric(12,2) not null default 0 check (low_stock_threshold >= 0),
  status varchar(20) not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  name varchar(160) not null, description text, price numeric(12,2) not null default 0 check (price >= 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  status varchar(20) not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete restrict, invoice_number varchar(40) not null,
  issue_date date not null, due_date date not null, status varchar(20) not null default 'draft' check (status in ('draft','sent','paid','overdue','cancelled')),
  subtotal numeric(12,2) not null default 0, tax numeric(12,2) not null default 0, discount numeric(12,2) not null default 0, total numeric(12,2) not null default 0, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, invoice_number), check (due_date >= issue_date), check (subtotal >= 0 and tax >= 0 and discount >= 0 and total >= 0)
);
create index if not exists ix_bp_invoices_org_status on invoices(organization_id, status);
create index if not exists ix_bp_invoices_org_dates on invoices(organization_id, issue_date, due_date);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(), invoice_id uuid not null references invoices(id) on delete cascade,
  product_id uuid references products(id) on delete set null, service_id uuid references services(id) on delete set null,
  description varchar(240) not null, quantity numeric(12,2) not null check (quantity > 0), unit_price numeric(12,2) not null check (unit_price >= 0), total numeric(12,2) not null check (total >= 0)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade, amount numeric(12,2) not null check (amount > 0),
  payment_method varchar(30) not null, payment_date date not null, reference varchar(120), notes text,
  created_at timestamptz not null default now()
);
create index if not exists ix_bp_payments_org_date on payments(organization_id, payment_date);

create table if not exists expense_categories (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  name varchar(100) not null, created_at timestamptz not null default now(), unique (organization_id, name)
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  category_id uuid references expense_categories(id) on delete set null, description varchar(240) not null, amount numeric(12,2) not null check (amount > 0),
  expense_date date not null, payment_method varchar(30) not null, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists ix_bp_expenses_org_date on expenses(organization_id, expense_date);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade, type varchar(40) not null, title varchar(180) not null, message text not null,
  read boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict, action varchar(80) not null, entity_type varchar(80) not null,
  entity_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists ix_bp_activity_org_created on activity_logs(organization_id, created_at desc);

create or replace function bizpilot.is_member(target_org uuid)
returns boolean language sql stable security definer set search_path = bizpilot, public
as $$ select exists (select 1 from bizpilot.organization_members m where m.organization_id = target_org and m.user_id = auth.uid()); $$;

create or replace function bizpilot.has_role(target_org uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = bizpilot, public
as $$ select exists (select 1 from bizpilot.organization_members m where m.organization_id = target_org and m.user_id = auth.uid() and m.role = any(allowed_roles)); $$;

alter table profiles enable row level security;
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table customers enable row level security;
alter table products enable row level security;
alter table services enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table expense_categories enable row level security;
alter table expenses enable row level security;
alter table notifications enable row level security;
alter table activity_logs enable row level security;

create policy bp_profiles_self on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy bp_org_membership on organizations for all using (bizpilot.is_member(id)) with check (bizpilot.has_role(id, array['owner','admin']));
create policy bp_members_read on organization_members for select using (bizpilot.is_member(organization_id));
create policy bp_members_admin on organization_members for all using (bizpilot.has_role(organization_id, array['owner','admin'])) with check (bizpilot.has_role(organization_id, array['owner','admin']));
create policy bp_customers_tenant on customers for all using (bizpilot.is_member(organization_id)) with check (bizpilot.is_member(organization_id));
create policy bp_products_tenant on products for all using (bizpilot.is_member(organization_id)) with check (bizpilot.is_member(organization_id));
create policy bp_services_tenant on services for all using (bizpilot.is_member(organization_id)) with check (bizpilot.is_member(organization_id));
create policy bp_invoices_tenant on invoices for all using (bizpilot.is_member(organization_id)) with check (bizpilot.is_member(organization_id));
create policy bp_invoice_items_tenant on invoice_items for all using (exists (select 1 from invoices i where i.id = invoice_id and bizpilot.is_member(i.organization_id))) with check (exists (select 1 from invoices i where i.id = invoice_id and bizpilot.is_member(i.organization_id)));
create policy bp_payments_tenant on payments for all using (bizpilot.is_member(organization_id)) with check (bizpilot.is_member(organization_id));
create policy bp_categories_tenant on expense_categories for all using (bizpilot.is_member(organization_id)) with check (bizpilot.is_member(organization_id));
create policy bp_expenses_tenant on expenses for all using (bizpilot.is_member(organization_id)) with check (bizpilot.is_member(organization_id));
create policy bp_notifications_tenant on notifications for all using (bizpilot.is_member(organization_id) and (user_id is null or user_id = auth.uid())) with check (bizpilot.is_member(organization_id));
create policy bp_activity_tenant on activity_logs for select using (bizpilot.is_member(organization_id));

-- The backend connects with a restricted database role and uses its own tenant dependency.
-- RLS remains the defense-in-depth boundary for Supabase clients and future integrations.
grant usage on schema bizpilot to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema bizpilot to authenticated, service_role;
