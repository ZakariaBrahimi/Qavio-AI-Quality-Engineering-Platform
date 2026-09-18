-- ──────────────────────────────────────────────────────────────────────
-- DEVELOPMENT SEED DATA ONLY.
-- Run automatically by `supabase db reset` against your local stack.
-- Everything below is fake, clearly-labeled dev fixture data — never
-- run this against a real/production project.
-- ──────────────────────────────────────────────────────────────────────

-- Dev user: dev@qavio.local / devpassword123 (local login only).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-0000000000d1',
  'authenticated',
  'authenticated',
  'dev@qavio.local',
  crypt('devpassword123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Dev User"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

-- profiles row is normally created by the handle_new_user() trigger on
-- auth.users insert — this is a safety net in case seeding order or a
-- future auth provider bypasses it.
insert into public.profiles (id, full_name)
values ('00000000-0000-0000-0000-0000000000d1', 'Dev User')
on conflict (id) do nothing;

-- Dev organization + membership (owner).
insert into public.organizations (id, name, slug, created_by)
values (
  '00000000-0000-0000-0000-0000000000e1',
  '[DEV] Qavio Demo',
  'qavio-demo-dev',
  '00000000-0000-0000-0000-0000000000d1'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role)
values (
  '00000000-0000-0000-0000-0000000000e1',
  '00000000-0000-0000-0000-0000000000d1',
  'owner'
)
on conflict (organization_id, user_id) do nothing;

-- Dev project + environment.
insert into public.projects (id, organization_id, name, slug, platform, created_by)
values (
  '00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-0000000000e1',
  '[DEV] Marketing Site',
  'dev-marketing-site',
  'web',
  '00000000-0000-0000-0000-0000000000d1'
)
on conflict (id) do nothing;

insert into public.environments (id, organization_id, project_id, name, kind, base_url, created_by)
values (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-0000000000e1',
  '00000000-0000-0000-0000-0000000000f1',
  '[DEV] Staging',
  'staging',
  'https://staging.example.com',
  '00000000-0000-0000-0000-0000000000d1'
)
on conflict (id) do nothing;

-- Dev test suite + test cases.
insert into public.test_suites (id, organization_id, project_id, name, description, created_by)
values (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-0000000000e1',
  '00000000-0000-0000-0000-0000000000f1',
  '[DEV] Smoke Tests',
  'Seed data: a small suite covering the marketing site homepage.',
  '00000000-0000-0000-0000-0000000000d1'
)
on conflict (id) do nothing;

insert into public.test_cases (
  id, organization_id, project_id, test_suite_id, title, description, steps, expected_result, priority, created_by
)
values
  (
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-0000000000e1',
    '00000000-0000-0000-0000-0000000000f1',
    '00000000-0000-0000-0000-000000000201',
    '[DEV] Homepage loads successfully',
    'Seed data.',
    '[{"action": "goto", "target": "/"}, {"action": "assertStatus", "expected": 200}]',
    'The homepage responds with HTTP 200.',
    'high',
    '00000000-0000-0000-0000-0000000000d1'
  ),
  (
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-0000000000e1',
    '00000000-0000-0000-0000-0000000000f1',
    '00000000-0000-0000-0000-000000000201',
    '[DEV] Navigation links resolve',
    'Seed data.',
    '[{"action": "goto", "target": "/"}, {"action": "clickAll", "target": "nav a"}]',
    'Every navigation link resolves without a 404.',
    'medium',
    '00000000-0000-0000-0000-0000000000d1'
  )
on conflict (id) do nothing;
