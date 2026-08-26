-- BizPilot does not use direct Supabase GraphQL table access from the frontend.
-- Keep the database service boundary private and retain only service_role access for the FastAPI adapter.
set search_path = bizpilot, public;
revoke all privileges on all tables in schema bizpilot from anon, authenticated;
revoke all privileges on all sequences in schema bizpilot from anon, authenticated;
grant usage on schema bizpilot to service_role;
grant select, insert, update, delete on all tables in schema bizpilot to service_role;
grant usage, select on all sequences in schema bizpilot to service_role;
