-- Qavio Phase 7: two additive columns on `test_runs` for the real
-- Playwright QA engine.
--
-- `progress` — a short, human-readable status line the worker updates at
-- a handful of named milestones while RUNNING ("Discovering pages",
-- "Testing page 2 of 4", …), so the dashboard can show live progress via
-- the same Realtime subscription that already watches this row (see
-- 20250201001800_test_run_queue_infra.sql) — no new subscription needed.
-- Deliberately not part of the test_runs.status state machine; it never
-- gates a transition, only a display hint.
--
-- `summary` — the completion summary (total/passed/failed/skipped/
-- blocked checks, pages visited, console/network error counts, duration)
-- written once, on the run's final transition, symmetric with the
-- existing input-only `configuration` column.

alter table test_runs add column progress text;
alter table test_runs add column summary jsonb not null default '{}';

alter table test_runs add constraint test_runs_summary_is_object
  check (jsonb_typeof(summary) = 'object');
