# Migration packet — 20260825 public evidence platform

## PLAN

intent: Establish separate private project measurements and sanitized, editorially reviewed public outcome evidence without allowing either trust domain to overwrite the other.

phase: pre-launch-direct. This exception expires when a remote Supabase project accepts real user data; later changes must use expand/migrate/switch/contract.

statements:

- Bound each migration transaction with a two-second lock timeout and sixty-second statement timeout — unbounded lock or execution wait — fail quickly so an operator can investigate.
- Retain `public.outcome_measurements` for private project records — schema collision/data-domain ambiguity — keep its project-oriented contract unchanged.
- Create `public.verified_outcome_measurements` for sanitized public evidence — relation collision and accidental disclosure — use a distinct name, reviewer-only writes, privacy/review checks, and approved-implementation public reads.
- Enable RLS and explicit grants before exposure — unintended default access — anonymous access is read-only and policy-filtered; ordinary authenticated writes are denied.

sync impact: none. No active remote client contract is configured; future generated clients must expose both table names explicitly.

rls impact: `public.outcome_measurements` and `public.verified_outcome_measurements`; executable allow/deny coverage is in `tests/supabase-migrations.integration.test.mjs`.

## CLASSIFICATION

mark: UNKNOWN

evidence: The ordered forward chain and RLS checks pass in PGlite. No down migration or restored-snapshot round-trip has been executed, so reversibility is not claimed.

## RUNBOOK

pre-flight:

- [ ] Verify the exact Supabase organization, project reference, and environment are development—not staging or production.
- [ ] Run `npm run test:migrations` at the intended Git revision.
- [ ] Restore the latest development backup to a disposable target and record the restore evidence.
- [ ] Confirm no remote migration named `202608250001_public_evidence_platform` was partially applied.
- [ ] Review the SQL diff and both outcome table contracts.

execute: A human operator runs `supabase db push --linked --dry-run` against the verified development project, reviews the plan, then runs `supabase db push --linked` as a separate approved step.

verify: Run a fresh development database reset, cross-user RLS tests, Supabase security/performance advisors, and catalog checks for both outcome tables and their policies.

monitor: Observe migration logs, Postgres errors, lock waits, denied-write audit signals, and API error rates for at least one supervised development test cycle.

down path: Before real traffic, restore the verified backup or recreate the disposable development database. After real traffic, use a reviewed forward fix; dropping either outcome table could destroy user or evidence records.
