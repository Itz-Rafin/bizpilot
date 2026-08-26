-- BizPilot private storage bucket. No existing bucket or object is modified.
insert into storage.buckets (id, name, public)
values ('bizpilot-assets', 'bizpilot-assets', false)
on conflict (id) do nothing;

create policy bp_assets_read on storage.objects for select to authenticated
using (bucket_id = 'bizpilot-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy bp_assets_insert on storage.objects for insert to authenticated
with check (bucket_id = 'bizpilot-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy bp_assets_update on storage.objects for update to authenticated
using (bucket_id = 'bizpilot-assets' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'bizpilot-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy bp_assets_delete on storage.objects for delete to authenticated
using (bucket_id = 'bizpilot-assets' and (storage.foldername(name))[1] = auth.uid()::text);
