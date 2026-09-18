-- Follow-up to 20250201000800_lock_down_function_privileges.sql: revoking
-- EXECUTE "from anon, authenticated" on the trigger-only functions didn't
-- actually close them off, because those functions were created without
-- ever revoking the default `EXECUTE ... TO PUBLIC` grant Postgres adds
-- to every new function — and PUBLIC-granted privileges are inherited by
-- every role, anon/authenticated included, regardless of a separate
-- per-role REVOKE. Confirmed via `has_function_privilege('anon', …)`
-- still returning true after the previous migration. The functions this
-- migration DID close (get_credential_secret, get_integration_access_token,
-- create_organization) were unaffected by this gap only because their own
-- migrations already ran `revoke all ... from public` at creation time.
--
-- Fix: revoke from PUBLIC directly, which removes the inherited grant for
-- every role at once. This still does not affect trigger invocation itself
-- (the trigger manager calls the function directly, bypassing the EXECUTE
-- privilege check) — it only blocks a direct RPC call.
revoke execute on function audit_credential_change() from public;
revoke execute on function audit_fix_suggestion_approved() from public;
revoke execute on function audit_issue_status_change() from public;
revoke execute on function audit_organization_member_role_change() from public;
revoke execute on function audit_test_run_cancelled() from public;
revoke execute on function handle_new_user() from public;
revoke execute on function set_updated_at() from public;
