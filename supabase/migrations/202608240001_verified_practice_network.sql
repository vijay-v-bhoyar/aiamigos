-- Verified practice network extension.
-- Apply to a reviewed development project first. Production activation remains fail-closed.

set local lock_timeout = '2s';
set local statement_timeout = '60s';

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.projects add column organization_id uuid references public.organizations(id) on delete set null;
alter table public.projects add column follow_up_due_at timestamptz;

create table public.evaluation_cases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  case_key text not null,
  input_fingerprint text not null,
  expected_criteria jsonb not null default '[]'::jsonb,
  sensitivity text not null default 'internal' check (sensitivity in ('public','internal','confidential')),
  created_at timestamptz not null default timezone('utc', now()),
  unique(project_id, case_key)
);

create table public.proof_packs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  schema_version integer not null default 1,
  private_snapshot jsonb not null,
  sanitized_snapshot jsonb,
  privacy_check_status text not null default 'not-run' check (privacy_check_status in ('not-run','passed','failed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.playbook_versions (
  id uuid primary key default gen_random_uuid(),
  public_playbook_id uuid not null references public.public_playbooks(id) on delete cascade,
  version integer not null check (version > 0),
  snapshot jsonb not null,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  reviewer_scope text not null,
  change_summary text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique(public_playbook_id, version)
);

create table public.benchmark_snapshots (
  id uuid primary key default gen_random_uuid(),
  task_slug text not null,
  track text not null check (track in ('business','careers','teaching','builders')),
  cohort_definition jsonb not null,
  sample_count integer not null check (sample_count >= 10),
  date_window daterange not null,
  metrics jsonb not null,
  limitations text[] not null default '{}',
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  review_status text not null check (review_status in ('approved','withdrawn')),
  published_at timestamptz not null default timezone('utc', now()),
  unique(task_slug, date_window)
);

create table public.follows (
  owner_id uuid not null references auth.users(id) on delete cascade,
  public_playbook_id uuid not null references public.public_playbooks(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key(owner_id, public_playbook_id)
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  track text not null check (track in ('business','careers','teaching','builders')),
  title text not null,
  protocol jsonb not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('draft','open','closed','archived')),
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.challenge_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  proof_pack_id uuid references public.proof_packs(id) on delete set null,
  submission_status text not null default 'private' check (submission_status in ('private','submitted','reviewed','withdrawn')),
  created_at timestamptz not null default timezone('utc', now()),
  unique(challenge_id, project_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  resource_id text,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.editorial_reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  resource_type text not null check (resource_type in ('proof-pack','playbook','benchmark','challenge','guide')),
  resource_id text not null,
  decision text not null check (decision in ('approved','changes-required','rejected','withdrawn')),
  scope text not null,
  evidence jsonb not null default '[]'::jsonb,
  limitations text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.corrections (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null,
  resource_id text not null,
  summary text not null,
  status text not null check (status in ('reported','confirmed','corrected','rejected')),
  reporter_id uuid references auth.users(id) on delete set null,
  reviewer_id uuid references auth.users(id) on delete set null,
  public_resolution text,
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

create table public.source_references (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null,
  resource_id text not null,
  url text not null check (url ~ '^https://'),
  title text not null,
  publisher text not null,
  published_at date,
  accessed_at date not null,
  source_class text not null check (source_class in ('primary','standard','government','research','vendor','other')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
drop trigger if exists proof_packs_updated_at on public.proof_packs;
create trigger proof_packs_updated_at before update on public.proof_packs for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.evaluation_cases enable row level security;
alter table public.proof_packs enable row level security;
alter table public.playbook_versions enable row level security;
alter table public.benchmark_snapshots enable row level security;
alter table public.follows enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_entries enable row level security;
alter table public.notifications enable row level security;
alter table public.editorial_reviews enable row level security;
alter table public.corrections enable row level security;
alter table public.source_references enable row level security;

revoke all on public.organizations, public.evaluation_cases, public.proof_packs, public.playbook_versions, public.benchmark_snapshots, public.follows, public.challenges, public.challenge_entries, public.notifications, public.editorial_reviews, public.corrections, public.source_references from anon, authenticated;
grant select on public.playbook_versions, public.benchmark_snapshots, public.challenges, public.corrections, public.source_references to anon, authenticated;
grant select, insert, update, delete on public.organizations, public.evaluation_cases, public.proof_packs, public.follows, public.challenge_entries, public.notifications to authenticated;
grant select, insert, update, delete on public.playbook_versions, public.benchmark_snapshots, public.challenges, public.editorial_reviews, public.corrections, public.source_references to authenticated;

create policy organizations_owner on public.organizations for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy evaluation_cases_owner on public.evaluation_cases for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy proof_packs_owner on public.proof_packs for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy playbook_versions_public_read on public.playbook_versions for select to anon, authenticated using (exists (select 1 from public.public_playbooks p where p.id=public_playbook_id and p.review_status='approved'));
create policy playbook_versions_reviewer_write on public.playbook_versions for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer());
create policy benchmarks_public_read on public.benchmark_snapshots for select to anon, authenticated using (review_status='approved' and sample_count>=10);
create policy benchmarks_reviewer_write on public.benchmark_snapshots for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer() and sample_count>=10);
create policy follows_owner on public.follows for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy challenges_public_read on public.challenges for select to anon, authenticated using (status in ('open','closed','archived'));
create policy challenges_reviewer_write on public.challenges for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer());
create policy challenge_entries_owner on public.challenge_entries for all to authenticated using (owner_id=auth.uid() or public.is_reviewer()) with check (owner_id=auth.uid() or public.is_reviewer());
create policy notifications_owner on public.notifications for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy editorial_reviews_reviewer on public.editorial_reviews for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer());
create policy corrections_public_read on public.corrections for select to anon, authenticated using (status in ('confirmed','corrected'));
create policy corrections_authenticated_insert on public.corrections for insert to authenticated with check (reporter_id=auth.uid());
create policy corrections_reviewer_update on public.corrections for update to authenticated using (public.is_reviewer()) with check (public.is_reviewer());
create policy sources_public_read on public.source_references for select to anon, authenticated using (true);
create policy sources_reviewer_write on public.source_references for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer());

create index projects_follow_up_due on public.projects(owner_id, follow_up_due_at) where follow_up_due_at is not null;
create index evaluation_cases_project on public.evaluation_cases(project_id, created_at);
create index proof_packs_project on public.proof_packs(project_id, created_at desc);
create index run_reports_accepted on public.playbook_run_reports(public_playbook_id, created_at) where moderation_status='accepted' and consent_to_aggregate=true;
create index benchmark_task_date on public.benchmark_snapshots(task_slug, published_at desc);
create index notifications_unread on public.notifications(owner_id, created_at desc) where read_at is null;
create index editorial_reviews_resource on public.editorial_reviews(resource_type, resource_id, created_at desc);
create index corrections_resource on public.corrections(resource_type, resource_id, created_at desc);
create index source_references_resource on public.source_references(resource_type, resource_id);
