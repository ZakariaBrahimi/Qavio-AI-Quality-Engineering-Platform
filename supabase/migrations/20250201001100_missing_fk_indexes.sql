-- Covering indexes for foreign keys the performance advisor flagged as
-- unindexed against the real project. Every organization_id/project_id
-- FK was already indexed by its own migration (they're the RLS hot
-- path); these are the secondary FKs — mostly "who did this"
-- (created_by/triggered_by/connected_by/...) and a few parent-lookup
-- FKs — that weren't, because nothing in this phase queries by them yet.
-- Adding them now is cheap and avoids a future seq scan once the
-- execution engine and UI start filtering by them (e.g. "test runs I
-- triggered", "issues assigned to me").
create index if not exists idx_organizations_created_by on organizations (created_by);
create index if not exists idx_organization_members_invited_by on organization_members (invited_by);
create index if not exists idx_projects_created_by on projects (created_by);
create index if not exists idx_environments_created_by on environments (created_by);

create index if not exists idx_test_suites_created_by on test_suites (created_by);
create index if not exists idx_test_cases_project_id on test_cases (project_id);
create index if not exists idx_test_cases_created_by on test_cases (created_by);
create index if not exists idx_test_runs_test_suite_id on test_runs (test_suite_id);
create index if not exists idx_test_runs_environment_id on test_runs (environment_id);
create index if not exists idx_test_runs_triggered_by on test_runs (triggered_by);
create index if not exists idx_test_results_test_case_id on test_results (test_case_id);

create index if not exists idx_issues_test_run_id on issues (test_run_id);
create index if not exists idx_issues_test_result_id on issues (test_result_id);
create index if not exists idx_issues_assigned_to on issues (assigned_to);
create index if not exists idx_issues_created_by on issues (created_by);
create index if not exists idx_issue_comments_author_id on issue_comments (author_id);

create index if not exists idx_integrations_connected_by on integrations (connected_by);

create index if not exists idx_credentials_environment_id on credentials (environment_id);
create index if not exists idx_credentials_created_by on credentials (created_by);

create index if not exists idx_fix_suggestions_ai_analysis_id on fix_suggestions (ai_analysis_id);
create index if not exists idx_fix_suggestions_approved_by on fix_suggestions (approved_by);

create index if not exists idx_usage_events_project_id on usage_events (project_id);
create index if not exists idx_usage_events_test_run_id on usage_events (test_run_id);

create index if not exists idx_audit_logs_actor_id on audit_logs (actor_id);
