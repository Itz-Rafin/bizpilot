-- Security hardening: SECURITY DEFINER tenant helper functions must not be
-- executable by PUBLIC/anonymous callers. Keep execution available only to
-- authenticated users and the service role used by trusted backend paths.
REVOKE USAGE ON SCHEMA bizpilot FROM anon;

REVOKE ALL ON FUNCTION bizpilot.is_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION bizpilot.has_role(uuid, text[]) FROM PUBLIC;

GRANT USAGE ON SCHEMA bizpilot TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION bizpilot.is_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION bizpilot.has_role(uuid, text[]) TO authenticated, service_role;
