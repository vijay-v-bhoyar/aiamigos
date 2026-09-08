# Migration packet — 20260905 project authorization hardening

## PLAN

intent: Prevent membership self-enrollment and cross-project row attachment while preserving owner, editor, viewer, reviewer, and anonymous responsibilities.

phase: switch. The migration atomically replaces permissive policies with relationship-aware policies; it does not alter or delete stored rows.

statements:

- Create `is_project_owner`, `can_view_project`, and `can_edit_project` helpers — recursive RLS policy lookups — security-definer functions use fully qualified names, an empty search path, boolean-only results, and authenticated-only execution.
- Replace the combined project policy — object-level authorization ambiguity — only owners create, update, and delete projects; approved members may select them.
- Replace the combined membership policy — self-enrollment privilege escalation — only the project owner may add, change, or remove editor/viewer memberships.
- Replace child-table owner-only policies — known-project-ID attachment and broken collaboration — reads require project membership; writes require editor access and creator identity; project owners retain record-management authority.
- Constrain submissions, forks, reports, challenge entries, and audit events — detached or cross-project references — nullable project links are allowed only when explicitly supported; non-null links require project access.

sync impact: none. Existing owner workflows remain valid. Member behavior becomes explicit: editor writes and viewer reads are accepted; self-grant and outsider attachment are rejected.

rls impact: `projects`, `project_members`, `artifacts`, `experiments`, `evaluations`, `outcome_measurements`, `evaluation_cases`, `proof_packs`, `playbook_submissions`, `playbook_forks`, `playbook_run_reports`, `challenge_entries`, and `audit_events`. Cross-user allow/deny evidence is in `tests/supabase-migrations.integration.test.mjs`.

## CLASSIFICATION

mark: UNKNOWN

evidence: The full ordered forward chain and owner/editor/viewer/outsider scenarios pass in PGlite. No restored-snapshot round-trip or post-traffic down path has been executed.

## RUNBOOK

pre-flight:

- [ ] Verify the exact linked project is a disposable development project.
- [ ] Run `npm run test:migrations` at the intended Git revision.
- [ ] Restore the latest development backup into a disposable target and retain evidence.
- [ ] Inventory existing `project_members` rows, especially any `member_role='owner'` records, and resolve unexpected rows before applying.
- [ ] Confirm application code does not rely on members editing the project owner or organization relationship.

execute: A human operator runs `supabase db push --linked --dry-run` against the verified development project, reviews every policy replacement, then runs `supabase db push --linked` as a separate approved step.

verify: Repeat the owner/editor/viewer/outsider matrix against the real Supabase API, run security/performance advisors, and confirm denied attempts do not expose row contents or SQL details.

monitor: Observe Postgres policy errors, API authorization failures, project collaboration support signals, and unexpected denial-rate changes through one supervised development cycle.

down path: Before traffic, restore the verified backup. After traffic, use a reviewed forward policy fix; reverting to the permissive membership policy would reopen a privilege-escalation path.
