-- Public evidence platform v1. Apply only after human review in a verified development project.
-- Public reads are fail-closed. Private counsel strategy never belongs in these tables.

set local lock_timeout = '2s';
set local statement_timeout = '60s';

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  owner_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 5 and 180),
  contribution_type text not null check (contribution_type in ('method','specification','software','dataset','publication','other')),
  summary text not null,
  evidence_tier text not null default 'author-controlled' check (evidence_tier in ('author-controlled','jointly-verified','independent')),
  originality_status text not null,
  status text not null default 'draft' check (status in ('draft','published','withdrawn')),
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((status='published' and published_at is not null) or status<>'published')
);

create table public.contribution_versions (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  version text not null check (version ~ '^\d+\.\d+\.\d+$'),
  author_id uuid not null references auth.users(id) on delete restrict,
  specification jsonb not null,
  change_summary text not null,
  evidence_sha256 text not null check (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'draft' check (status in ('draft','released','superseded','withdrawn')),
  released_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique(contribution_id, version),
  unique(evidence_sha256),
  check ((status='released' and released_at is not null) or status<>'released')
);

create table public.prior_art_references (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  title text not null,
  publisher text not null,
  url text not null check (url ~ '^https://'),
  source_class text not null check (source_class in ('government','standard','research','software','practitioner','other')),
  relationship text not null,
  accessed_at date not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique(contribution_id, url)
);

create table public.adopters (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 2 and 160),
  sector text not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  region text,
  external_url text check (external_url is null or external_url ~ '^https://'),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','withdrawn')),
  public_consent boolean not null default false,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((verification_status='verified' and external_url is not null and verified_by is not null and verified_at is not null and public_consent) or verification_status<>'verified')
);

create table public.adoption_attestations (
  id uuid primary key default gen_random_uuid(),
  adopter_id uuid not null references public.adopters(id) on delete cascade,
  contribution_version_id uuid not null references public.contribution_versions(id) on delete restrict,
  scope text not null,
  adopted_at date not null,
  external_verification_url text not null check (external_verification_url ~ '^https://'),
  verifier_name text not null,
  relationship_disclosure text not null,
  evidence_sha256 text not null check (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected','withdrawn')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique(adopter_id, contribution_version_id, adopted_at),
  check ((review_status='approved' and reviewed_by is not null and reviewed_at is not null) or review_status<>'approved')
);

create table public.implementations (
  id uuid primary key default gen_random_uuid(),
  adoption_attestation_id uuid not null references public.adoption_attestations(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  task_slug text not null,
  sanitized_scope text not null,
  started_at date not null,
  ended_at date,
  method_deviations text[] not null default '{}',
  privacy_status text not null default 'not-run' check (privacy_status in ('not-run','passed','failed')),
  publication_status text not null default 'private' check (publication_status in ('private','submitted','approved','withdrawn')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check ((publication_status='approved' and privacy_status='passed' and reviewed_by is not null and reviewed_at is not null) or publication_status<>'approved')
);

-- Public, editorially reviewed measurements are intentionally separate from
-- the private project outcome_measurements table created by the Practice OS.
create table public.verified_outcome_measurements (
  id uuid primary key default gen_random_uuid(),
  implementation_id uuid not null references public.implementations(id) on delete cascade,
  metric text not null,
  unit text not null,
  baseline_value numeric not null,
  result_value numeric not null,
  sample_size integer not null check (sample_size > 0),
  window_start date not null,
  window_end date not null check (window_end >= window_start),
  collection_method text not null,
  confounders text[] not null default '{}',
  limitations text[] not null check (cardinality(limitations) > 0),
  human_decision text not null check (human_decision in ('stop','revise','pilot','deploy','rollback')),
  privacy_status text not null default 'not-run' check (privacy_status in ('not-run','passed','failed')),
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected','withdrawn')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check ((review_status='approved' and privacy_status='passed' and reviewed_by is not null and reviewed_at is not null) or review_status<>'approved')
);

create table public.external_evidence (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('contribution','adoption','implementation','outcome','review','citation','recognition','publication','judging')),
  subject_id uuid not null,
  issuer text not null,
  controlled_by text not null,
  evidence_tier text not null check (evidence_tier in ('author-controlled','jointly-verified','independent')),
  source_url text not null check (source_url ~ '^https://'),
  archive_url text check (archive_url is null or archive_url ~ '^https://'),
  observed_at date not null,
  evidence_sha256 text not null check (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  permission_status text not null check (permission_status in ('not-required','granted','restricted','revoked')),
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected','withdrawn')),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique(subject_type, subject_id, source_url)
);

create table public.independent_reviews (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('contribution-version','implementation','outcome','benchmark','publication')),
  subject_id uuid not null,
  reviewer_name text not null,
  reviewer_qualification text not null,
  reviewer_affiliation text,
  reviewed_version text not null,
  scope text not null,
  decision text not null check (decision in ('approved','changes-required','rejected','withdrawn')),
  conflict_disclosure text not null,
  compensation_disclosure text not null,
  external_verification_url text not null check (external_verification_url ~ '^https://'),
  review_sha256 text not null check (review_sha256 ~ '^[a-f0-9]{64}$'),
  publication_status text not null default 'pending' check (publication_status in ('pending','approved','withdrawn')),
  approved_by uuid references auth.users(id) on delete set null,
  reviewed_at date not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique(subject_type, subject_id, reviewer_name, reviewed_version)
);

create table public.reviewer_conflicts (
  id uuid primary key default gen_random_uuid(),
  independent_review_id uuid not null references public.independent_reviews(id) on delete cascade,
  conflict_type text not null check (conflict_type in ('employment','financial','authorship','supervision','family','other','none')),
  disclosure text not null,
  mitigation text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.citations (
  id uuid primary key default gen_random_uuid(),
  contribution_version_id uuid not null references public.contribution_versions(id) on delete restrict,
  citing_title text not null,
  citing_issuer text not null,
  citing_url text not null check (citing_url ~ '^https://'),
  citation_type text not null check (citation_type in ('scholarly','trade','institutional','software','standard','other')),
  published_at date not null,
  relationship_disclosure text not null,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','withdrawn')),
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique(contribution_version_id, citing_url)
);

create table public.publications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  publication_type text not null check (publication_type in ('journal','conference','trade','preprint','dataset','software-release','presentation','other')),
  publisher text not null,
  external_url text not null check (external_url ~ '^https://'),
  persistent_id text,
  published_at date not null,
  contributors jsonb not null,
  relationship_disclosure text not null,
  status text not null default 'pending' check (status in ('pending','verified','corrected','withdrawn','retracted')),
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique(external_url)
);

create table public.recognition_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  issuer text not null,
  recognition_type text not null check (recognition_type in ('award','media','invitation','appointment','grant','other')),
  external_url text not null check (external_url ~ '^https://'),
  issued_at date not null,
  selection_basis text,
  relationship_disclosure text not null,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','withdrawn')),
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique(external_url)
);

create table public.judging_events (
  id uuid primary key default gen_random_uuid(),
  event_title text not null,
  issuer text not null,
  role text not null,
  field text not null,
  criteria text not null,
  completed_at date not null,
  external_url text not null check (external_url ~ '^https://'),
  relationship_disclosure text not null,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','withdrawn')),
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique(event_title, issuer, completed_at)
);

create table public.endeavor_milestones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  title text not null,
  target_date date not null,
  target_measure text not null,
  status text not null default 'planned' check (status in ('planned','in-progress','achieved','missed','retired')),
  evidence_summary text,
  public_status boolean not null default false,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.evidence_claims (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  claim_key text not null,
  exact_claim text not null,
  fact_date date not null,
  possible_mappings text[] not null default '{}',
  evidence_tier text not null check (evidence_tier in ('author-controlled','jointly-verified','independent','unknown')),
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  contradictory_evidence text[] not null default '{}',
  confidentiality text not null default 'counsel-only' check (confidentiality in ('public','counsel-only','restricted')),
  counsel_status text not null default 'not-reviewed' check (counsel_status in ('not-reviewed','reviewed','exclude','needs-evidence')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(owner_id, claim_key)
);

create table public.evidence_links (
  claim_id uuid not null references public.evidence_claims(id) on delete cascade,
  external_evidence_id uuid not null references public.external_evidence(id) on delete restrict,
  relationship text not null check (relationship in ('supports','contradicts','qualifies','context-only')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key(claim_id, external_evidence_id)
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  granted_by text not null,
  scope text not null,
  granted_at timestamptz not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  evidence_sha256 text not null check (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique(subject_type, subject_id, evidence_sha256)
);

create table public.evidence_snapshots (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  version integer not null check (version > 0),
  public_snapshot jsonb not null,
  snapshot_sha256 text not null check (snapshot_sha256 ~ '^[a-f0-9]{64}$'),
  review_status text not null default 'pending' check (review_status in ('pending','approved','corrected','withdrawn')),
  reviewed_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique(subject_type, subject_id, version),
  unique(snapshot_sha256),
  check ((review_status in ('approved','corrected') and reviewed_by is not null and published_at is not null) or review_status not in ('approved','corrected'))
);

alter table public.contributions enable row level security;
alter table public.contribution_versions enable row level security;
alter table public.prior_art_references enable row level security;
alter table public.adopters enable row level security;
alter table public.adoption_attestations enable row level security;
alter table public.implementations enable row level security;
alter table public.verified_outcome_measurements enable row level security;
alter table public.external_evidence enable row level security;
alter table public.independent_reviews enable row level security;
alter table public.reviewer_conflicts enable row level security;
alter table public.citations enable row level security;
alter table public.publications enable row level security;
alter table public.recognition_events enable row level security;
alter table public.judging_events enable row level security;
alter table public.endeavor_milestones enable row level security;
alter table public.evidence_claims enable row level security;
alter table public.evidence_links enable row level security;
alter table public.consent_records enable row level security;
alter table public.evidence_snapshots enable row level security;

revoke all on public.contributions, public.contribution_versions, public.prior_art_references, public.adopters, public.adoption_attestations, public.implementations, public.verified_outcome_measurements, public.external_evidence, public.independent_reviews, public.reviewer_conflicts, public.citations, public.publications, public.recognition_events, public.judging_events, public.endeavor_milestones, public.evidence_claims, public.evidence_links, public.consent_records, public.evidence_snapshots from anon, authenticated;
grant select on public.contributions, public.contribution_versions, public.prior_art_references, public.adopters, public.adoption_attestations, public.implementations, public.verified_outcome_measurements, public.external_evidence, public.independent_reviews, public.reviewer_conflicts, public.citations, public.publications, public.recognition_events, public.judging_events, public.endeavor_milestones, public.evidence_snapshots to anon, authenticated;
grant select, insert, update, delete on public.contributions, public.contribution_versions, public.prior_art_references, public.adopters, public.adoption_attestations, public.implementations, public.verified_outcome_measurements, public.external_evidence, public.independent_reviews, public.reviewer_conflicts, public.citations, public.publications, public.recognition_events, public.judging_events, public.endeavor_milestones, public.evidence_claims, public.evidence_links, public.consent_records, public.evidence_snapshots to authenticated;

create policy contributions_public_read on public.contributions for select to anon, authenticated using (status='published');
create policy contributions_editorial_write on public.contributions for all to authenticated using (owner_id=auth.uid() or public.is_reviewer()) with check (owner_id=auth.uid() or public.is_reviewer());
create policy contribution_versions_public_read on public.contribution_versions for select to anon, authenticated using (status in ('released','superseded') and exists (select 1 from public.contributions c where c.id=contribution_id and c.status='published'));
create policy contribution_versions_editorial_write on public.contribution_versions for all to authenticated using (author_id=auth.uid() or public.is_reviewer()) with check (author_id=auth.uid() or public.is_reviewer());
create policy prior_art_public_read on public.prior_art_references for select to anon, authenticated using (exists (select 1 from public.contributions c where c.id=contribution_id and c.status='published'));
create policy prior_art_editorial_write on public.prior_art_references for all to authenticated using (created_by=auth.uid() or public.is_reviewer()) with check (created_by=auth.uid() or public.is_reviewer());
create policy adopters_public_read on public.adopters for select to anon, authenticated using (verification_status='verified' and public_consent);
create policy adopters_reviewer_write on public.adopters for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer());
create policy adoption_attestations_public_read on public.adoption_attestations for select to anon, authenticated using (review_status='approved' and exists (select 1 from public.adopters a where a.id=adopter_id and a.verification_status='verified' and a.public_consent));
create policy adoption_attestations_reviewer_write on public.adoption_attestations for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer());
create policy implementations_public_read on public.implementations for select to anon, authenticated using (publication_status='approved' and privacy_status='passed');
create policy implementations_reviewer_write on public.implementations for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer());
create policy verified_outcomes_public_read on public.verified_outcome_measurements for select to anon, authenticated using (review_status='approved' and privacy_status='passed' and exists (select 1 from public.implementations i where i.id=implementation_id and i.publication_status='approved'));
create policy verified_outcomes_reviewer_write on public.verified_outcome_measurements for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer());
create policy external_evidence_public_read on public.external_evidence for select to anon, authenticated using (review_status='approved' and permission_status in ('not-required','granted'));
create policy external_evidence_reviewer_write on public.external_evidence for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer());
create policy independent_reviews_public_read on public.independent_reviews for select to anon, authenticated using (publication_status='approved');
create policy independent_reviews_reviewer_write on public.independent_reviews for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer());
create policy reviewer_conflicts_public_read on public.reviewer_conflicts for select to anon, authenticated using (exists (select 1 from public.independent_reviews r where r.id=independent_review_id and r.publication_status='approved'));
create policy reviewer_conflicts_reviewer_write on public.reviewer_conflicts for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer());
create policy citations_public_read on public.citations for select to anon, authenticated using (verification_status='verified');
create policy citations_reviewer_write on public.citations for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer());
create policy publications_public_read on public.publications for select to anon, authenticated using (status in ('verified','corrected','withdrawn','retracted'));
create policy publications_reviewer_write on public.publications for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer());
create policy recognition_public_read on public.recognition_events for select to anon, authenticated using (verification_status in ('verified','withdrawn'));
create policy recognition_reviewer_write on public.recognition_events for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer());
create policy judging_public_read on public.judging_events for select to anon, authenticated using (verification_status in ('verified','withdrawn'));
create policy judging_reviewer_write on public.judging_events for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer());
create policy milestones_public_read on public.endeavor_milestones for select to anon, authenticated using (public_status and reviewed_by is not null);
create policy milestones_owner_write on public.endeavor_milestones for all to authenticated using (owner_id=auth.uid() or public.is_reviewer()) with check (owner_id=auth.uid() or public.is_reviewer());
create policy evidence_claims_private on public.evidence_claims for all to authenticated using (owner_id=auth.uid() or public.is_reviewer()) with check (owner_id=auth.uid() or public.is_reviewer());
create policy evidence_links_private on public.evidence_links for all to authenticated using (exists (select 1 from public.evidence_claims c where c.id=claim_id and (c.owner_id=auth.uid() or public.is_reviewer()))) with check (exists (select 1 from public.evidence_claims c where c.id=claim_id and (c.owner_id=auth.uid() or public.is_reviewer())));
create policy consent_records_reviewer_only on public.consent_records for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer());
create policy evidence_snapshots_public_read on public.evidence_snapshots for select to anon, authenticated using (review_status in ('approved','corrected') and published_at is not null);
create policy evidence_snapshots_reviewer_write on public.evidence_snapshots for all to authenticated using (public.is_reviewer()) with check (public.is_reviewer());

drop trigger if exists contributions_updated_at on public.contributions;
create trigger contributions_updated_at before update on public.contributions for each row execute function public.set_updated_at();
drop trigger if exists adopters_updated_at on public.adopters;
create trigger adopters_updated_at before update on public.adopters for each row execute function public.set_updated_at();
drop trigger if exists endeavor_milestones_updated_at on public.endeavor_milestones;
create trigger endeavor_milestones_updated_at before update on public.endeavor_milestones for each row execute function public.set_updated_at();
drop trigger if exists evidence_claims_updated_at on public.evidence_claims;
create trigger evidence_claims_updated_at before update on public.evidence_claims for each row execute function public.set_updated_at();

create index contribution_versions_contribution on public.contribution_versions(contribution_id, released_at desc);
create index adoption_attestations_version on public.adoption_attestations(contribution_version_id, adopted_at desc) where review_status='approved';
create index implementations_task on public.implementations(task_slug, started_at desc) where publication_status='approved';
create index verified_outcome_measurements_implementation on public.verified_outcome_measurements(implementation_id, created_at desc) where review_status='approved';
create index external_evidence_subject on public.external_evidence(subject_type, subject_id, observed_at desc);
create index independent_reviews_subject on public.independent_reviews(subject_type, subject_id, reviewed_at desc) where publication_status='approved';
create index citations_version on public.citations(contribution_version_id, published_at desc) where verification_status='verified';
create index evidence_claims_owner on public.evidence_claims(owner_id, fact_date desc);
create index evidence_snapshots_subject on public.evidence_snapshots(subject_type, subject_id, version desc);
