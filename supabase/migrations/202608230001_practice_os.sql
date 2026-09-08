-- AI Amigos Practice OS foundation.
-- Apply only to a reviewed Supabase development project first.

set local lock_timeout = '2s';
set local statement_timeout = '60s';

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.is_reviewer()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt()->'app_metadata'->>'role') = 'reviewer', false);
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  public_handle text not null unique,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  track text not null check (track in ('business', 'careers', 'teaching', 'builders')),
  title text not null check (char_length(title) between 1 and 160),
  schema_version integer not null default 1,
  blueprint_version integer not null default 1,
  stage text not null default 'frame' check (stage in ('frame', 'baseline', 'experiment', 'evaluate', 'decide', 'follow-up', 'publish')),
  status text not null default 'active' check (status in ('active', 'ready-to-share', 'submitted-for-review', 'archived')),
  sensitivity text not null default 'internal' check (sensitivity in ('public', 'internal', 'confidential')),
  goal text not null default '',
  owner_note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'editor' check (member_role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (project_id, user_id)
);

create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  artifact_type text not null,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  visibility text not null default 'private' check (visibility in ('private', 'submission-snapshot')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  method text not null default 'manual import',
  provider text not null default 'not recorded',
  model text not null default 'not recorded',
  input_label text not null,
  output_content jsonb not null default '{}'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  case_label text not null,
  score numeric(3,2) not null check (score >= 0 and score <= 5),
  expected text not null default '',
  observed text not null default '',
  failure text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.outcome_measurements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  metric text not null,
  baseline text not null default '',
  target text not null default '',
  measured_value numeric,
  unit text not null default '',
  measured_at date,
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.playbook_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  snapshot jsonb not null,
  license text not null check (license = 'CC BY-SA 4.0'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewer_id uuid references auth.users(id) on delete set null,
  review_note text not null default '',
  submitted_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz
);

create table if not exists public.public_playbooks (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.playbook_submissions(id) on delete restrict,
  slug text not null unique,
  title text not null,
  summary text not null,
  snapshot jsonb not null,
  author_handle text not null,
  version integer not null default 1,
  review_status text not null default 'approved' check (review_status = 'approved'),
  published_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.playbook_forks (
  id uuid primary key default gen_random_uuid(),
  public_playbook_id uuid not null references public.public_playbooks(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (public_playbook_id, project_id)
);

create table if not exists public.playbook_run_reports (
  id uuid primary key default gen_random_uuid(),
  public_playbook_id uuid not null references public.public_playbooks(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  measures jsonb not null default '{}'::jsonb,
  consent_to_aggregate boolean not null default false,
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  event_name text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
drop trigger if exists artifacts_updated_at on public.artifacts;
create trigger artifacts_updated_at before update on public.artifacts for each row execute function public.set_updated_at();
drop trigger if exists public_playbooks_updated_at on public.public_playbooks;
create trigger public_playbooks_updated_at before update on public.public_playbooks for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.artifacts enable row level security;
alter table public.experiments enable row level security;
alter table public.evaluations enable row level security;
alter table public.outcome_measurements enable row level security;
alter table public.playbook_submissions enable row level security;
alter table public.public_playbooks enable row level security;
alter table public.playbook_forks enable row level security;
alter table public.playbook_run_reports enable row level security;
alter table public.audit_events enable row level security;

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
grant select on public.public_playbooks to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

create policy profiles_self on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy projects_owner on public.projects for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy project_members_owner_or_member on public.project_members for all to authenticated using (user_id = auth.uid() or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())) with check (user_id = auth.uid() or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy artifacts_owner on public.artifacts for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy experiments_owner on public.experiments for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy evaluations_owner on public.evaluations for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy outcomes_owner on public.outcome_measurements for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy submissions_owner_or_reviewer on public.playbook_submissions for all to authenticated using (owner_id = auth.uid() or public.is_reviewer()) with check (owner_id = auth.uid() or public.is_reviewer());
create policy public_playbooks_read_approved on public.public_playbooks for select to anon, authenticated using (review_status = 'approved');
create policy public_playbooks_reviewer_write on public.public_playbooks for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer());
create policy forks_owner on public.playbook_forks for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy run_reports_owner on public.playbook_run_reports for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy audit_owner_insert on public.audit_events for insert to authenticated with check (owner_id = auth.uid());
create policy audit_owner_read on public.audit_events for select to authenticated using (owner_id = auth.uid() or public.is_reviewer());

create index if not exists projects_owner_updated on public.projects(owner_id, updated_at desc);
create index if not exists artifacts_project_created on public.artifacts(project_id, created_at desc);
create index if not exists evaluations_project_created on public.evaluations(project_id, created_at desc);
create index if not exists outcomes_project_measured on public.outcome_measurements(project_id, measured_at desc);
create index if not exists public_playbooks_published on public.public_playbooks(published_at desc);
