-- Evaluate auth.uid() once per statement instead of once per profile row.
drop policy if exists bp_profiles_self on bizpilot.profiles;
create policy bp_profiles_self on bizpilot.profiles for all
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and (active_organization_id is null or bizpilot.is_member(active_organization_id))
);
