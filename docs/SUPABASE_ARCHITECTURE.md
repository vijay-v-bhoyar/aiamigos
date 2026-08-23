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
- Private project, artifact, experiment, evaluation, and outcome rows require `auth.uid()` ownership.
- Anonymous readers can see only approved `public_playbooks` snapshots.
- Provider credentials are accepted only by `run-model`, never stored, never logged, and never returned.
- Public playbooks contain sanitized derived snapshots, not private source rows.
- Reviewers are identified through protected `app_metadata`, not editable user metadata.

## Human gate before remote application

1. Provision development, staging, and production Supabase projects.
2. Review the migration diff and run it against development only.
3. Run cross-user RLS tests and Supabase security/performance advisors.
4. Review Edge Function logs to prove credentials and content are not emitted.
5. Promote the migration and functions through staging before production.
