-- prevent_last_owner_removal() (20250201001300_membership_role_guardrails.sql)
-- is trigger-only, like the audit_*/handle_new_user/set_updated_at
-- functions locked down in 20250201000800_lock_down_function_privileges.sql
-- and 20250201000900_revoke_public_execute_on_triggers.sql — it should
-- never be callable directly via PostgREST RPC. Missed at the time
-- because it was added a migration later; caught by the security
-- advisor the same way the earlier ones were. Revoking EXECUTE doesn't
-- affect the trigger itself, which the trigger manager invokes directly
-- regardless of grants.
revoke execute on function prevent_last_owner_removal() from public, anon, authenticated;
