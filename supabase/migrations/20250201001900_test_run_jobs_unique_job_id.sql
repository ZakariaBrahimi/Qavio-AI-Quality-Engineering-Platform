-- Qavio Phase 6: `test_run_jobs` gets a unique constraint on `job_id` so
-- the worker can upsert exactly one row per BullMQ job (jobId = the test
-- run's own id, see packages/queue/src/producer.ts) instead of a new row
-- per retry attempt. This is what makes workers/web's `upsertJobRecord`
-- idempotent: retrying a job updates the same row (attempts, last_error,
-- status) rather than accumulating duplicates — see docs/test-run-engine.md's
-- Idempotency section ("a retry must not create duplicate records").
alter table test_run_jobs add constraint test_run_jobs_job_id_key unique (job_id);
