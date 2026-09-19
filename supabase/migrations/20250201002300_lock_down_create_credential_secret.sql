-- create_credential_secret (20250201002200_environment_authentication.sql)
-- was created with `revoke all ... from public` only, matching the
-- original get_credential_secret pattern — but that pattern was itself
-- later found insufficient for earlier functions (see
-- 20250201000800_lock_down_function_privileges.sql and
-- 20250201001400_lock_down_trigger_function.sql): Supabase's default
-- privileges grant EXECUTE on new functions directly to anon/authenticated,
-- not just via PUBLIC, so revoking from PUBLIC alone left both roles able
-- to call this secret-writing function via PostgREST RPC. Caught
-- immediately by the security advisor this time instead of drifting
-- unnoticed. The migration file itself
-- (20250201002200_environment_authentication.sql) has since been corrected
-- to the right revoke from the start, for a clean fresh apply — this file
-- exists only to match what was actually run against the real project.
revoke execute on function create_credential_secret(uuid, text) from public, anon, authenticated;
revoke execute on function validate_environment_auth_credential() from public, anon, authenticated;
grant execute on function create_credential_secret(uuid, text) to service_role;
