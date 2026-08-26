-- Asset paths must be rooted at the organization UUID: <organization_id>/<asset-path>.
create or replace function bizpilot.is_member_text(p_organization_id text)
returns boolean
language sql
security definer
set search_path = bizpilot, public
stable
as $$
  select exists (
    select 1 from bizpilot.organization_members m
    where m.organization_id::text = p_organization_id
      and m.user_id = (select auth.uid())
  );
$$;
revoke all on function bizpilot.is_member_text(text) from public, anon, authenticated;
grant execute on function bizpilot.is_member_text(text) to authenticated;

drop policy if exists bp_assets_read on storage.objects;
drop policy if exists bp_assets_insert on storage.objects;
drop policy if exists bp_assets_update on storage.objects;
drop policy if exists bp_assets_delete on storage.objects;
create policy bp_assets_read on storage.objects for select to authenticated
using (bucket_id = 'bizpilot-assets' and bizpilot.is_member_text((storage.foldername(name))[1]));
create policy bp_assets_insert on storage.objects for insert to authenticated
with check (bucket_id = 'bizpilot-assets' and bizpilot.is_member_text((storage.foldername(name))[1]));
create policy bp_assets_update on storage.objects for update to authenticated
using (bucket_id = 'bizpilot-assets' and bizpilot.is_member_text((storage.foldername(name))[1]))
with check (bucket_id = 'bizpilot-assets' and bizpilot.is_member_text((storage.foldername(name))[1]));
create policy bp_assets_delete on storage.objects for delete to authenticated
using (bucket_id = 'bizpilot-assets' and bizpilot.is_member_text((storage.foldername(name))[1]));
