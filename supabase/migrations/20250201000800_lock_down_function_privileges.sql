-- Lock down function privileges that the earlier migrations left wider
-- than intended, found by running Supabase's security advisor against a
-- real project. Root cause: Supabase's own default privileges grant
-- EXECUTE on every new `public` function to `anon`, `authenticated`, and
-- `service_role` individually, independent of the PUBLIC pseudo-role —
-- so `revoke all on function ... from public` (used in
-- 20250201000300_integrations.sql and 20250201000400_credentials.sql)
-- never actually revoked `anon`/`authenticated` access. This was only
-- observable against a real Supabase-provisioned database, not the
-- locally stubbed one used to verify earlier migrations.

-- Secret decryption: service_role only, full stop. This is the fix for
-- the exact gap get_credential_secret()/get_integration_access_token()
-- were designed to close.
revoke execute on function get_credential_secret(uuid) from anon, authenticated;
revoke execute on function get_integration_access_token(uuid) from anon, authenticated;

-- Trigger-only functions: never meant to be called directly via
-- PostgREST RPC. Revoking EXECUTE does not break the trigger itself —
-- trigger invocation bypasses the EXECUTE privilege check entirely; it
-- only blocks a direct `select public.audit_credential_change()` style
-- call.
revoke execute on function audit_credential_change() from anon, authenticated;
revoke execute on function audit_fix_suggestion_approved() from anon, authenticated;
revoke execute on function audit_issue_status_change() from anon, authenticated;
revoke execute on function audit_organization_member_role_change() from anon, authenticated;
revoke execute on function audit_test_run_cancelled() from anon, authenticated;
revoke execute on function handle_new_user() from anon, authenticated;
revoke execute on function set_updated_at() from anon, authenticated;

-- create_organization is for signed-in users only, never anonymous ones.
revoke execute on function create_organization(text, text) from anon;

-- Pin search_path on the two functions that didn't set one, so a caller
-- can't influence name resolution by manipulating search_path ahead of
-- the call. Both are self-contained (an enum CASE and `now()`, which
-- resolves via pg_catalog regardless), so search_path = '' is safe.
alter function set_updated_at() set search_path = '';
alter function organization_role_rank(organization_role) set search_path = '';
