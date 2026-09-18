-- Qavio object storage: the "artifacts" bucket, holding screenshots,
-- videos, Playwright traces, logs, DOM snapshots, and JSON reports.
-- Bytes live here; `artifacts.storage_path` (see the test-model
-- migration) just references a path in this bucket. Path convention:
--   organizations/{organization_id}/projects/{project_id}/test-runs/{test_run_id}/{filename}
--
-- Workers (service role) write artifacts; members only ever read them,
-- and only from their own organization's folder.

insert into storage.buckets (id, name, public)
values ('artifacts', 'artifacts', false)
on conflict (id) do nothing;

create policy "members can read their organization's artifacts"
  on storage.objects for select
  using (
    bucket_id = 'artifacts'
    and (storage.foldername(name))[1] = 'organizations'
    and is_organization_member(((storage.foldername(name))[2])::uuid)
  );

-- No insert/update/delete policy for anon/authenticated: only the
-- service role (workers) writes into this bucket, by design.
