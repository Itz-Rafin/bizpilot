-- Explicit active organization context per user. Nullable for existing profiles.
alter table bizpilot.profiles
  add column if not exists active_organization_id uuid references bizpilot.organizations(id) on delete set null;

create index if not exists ix_bp_profiles_active_org
  on bizpilot.profiles(active_organization_id);
