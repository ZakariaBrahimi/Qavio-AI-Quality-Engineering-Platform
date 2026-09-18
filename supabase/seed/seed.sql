-- Minimal local-dev seed data. Run automatically by `supabase db reset`.
-- Does not create an auth.users row — sign up locally first, then insert
-- an organization_members row for your user id to see data in the app.

insert into organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Qavio Demo', 'qavio-demo')
on conflict (id) do nothing;

insert into projects (id, organization_id, name, slug, platform)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Marketing Site',
  'marketing-site',
  'web'
)
on conflict (id) do nothing;

insert into environments (id, project_id, name, kind, base_url)
values (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  'Staging',
  'staging',
  'https://staging.example.com'
)
on conflict (id) do nothing;
