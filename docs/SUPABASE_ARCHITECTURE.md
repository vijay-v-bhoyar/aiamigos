# AI Amigos Supabase architecture

This document is the Phase 1 architecture boundary for the AI Practice OS. The repository contains the migration and Edge Function source, but no live Supabase project is connected yet. Apply the migration only after a human reviews the SQL and verifies the development project identity.

## Native, custom, external

| Capability | Classification | Contract |
| --- | --- | --- |
| Magic-link and Google authentication | Native Supabase | Auth JWTs are passed to RLS and Edge Functions. |
| Row-level security | Native Supabase/Postgres | Every exposed table is RLS-enabled with explicit grants. |
| Project/artifact synchronization | Custom | IndexedDB client store plus idempotent upload queue; conflicts create copies. |
| Model proxy | Custom Supabase Edge Function | Authenticated, ephemeral credential, no persistence, no prompt/output analytics. |
| Provider generation | External | OpenAI, Anthropic, or Gemini; manual import is always available. |
| Approved public playbooks | Custom | Reviewer-approved snapshot is separate from private project rows. |
| Static SEO pages | Existing Astro/Hostinger | Approved snapshots are exported during a controlled build. |

## Security invariants

- The browser receives only the Supabase publishable key.
- `service_role` is restricted to Edge Functions and migrations.
- Project membership is owner-controlled. Members can view project records; editors can create project records under their own identity; viewers cannot write; outsiders cannot attach rows to a known project ID.
- Project access is enforced by `is_project_owner`, `can_view_project`, and `can_edit_project` security-definer helpers with an empty search path and authenticated-only execution.
- Private project outcomes live in `public.outcome_measurements`; reviewed, sanitized public evidence lives in the separate `public.verified_outcome_measurements` table.
- Anonymous readers can see only approved `public_playbooks` snapshots.
- Provider credentials are accepted only by `run-model`, never stored, never logged, and never returned.
- Public playbooks contain sanitized derived snapshots, not private source rows.
- Reviewers are identified through protected `app_metadata`, not editable user metadata.

## Human gate before remote application

Run `npm run test:migrations` first. This executes every ordered migration in a PostgreSQL-compatible engine, verifies the private/public outcome split, and proves anonymous and ordinary authenticated users cannot publish verified outcomes. It complements, but does not replace, a Supabase development-project reset and advisor run.

1. Provision development, staging, and production Supabase projects.
2. Review the migration diff and run it against development only.
3. Run cross-user RLS tests and Supabase security/performance advisors.
4. Review Edge Function logs to prove credentials and content are not emitted.
5. Promote the migration and functions through staging before production.

Migration packets are tracked under `docs/migrations/`. Production remains fail-closed until each packet has current development and staging evidence plus a verified backup/restore point.
