# Engineering decisions

## 2026-09-05 — Execute migrations in PGlite during repository tests

Status: accepted for local and CI migration verification; Supabase development-project validation remains mandatory before remote application.

Decision: Use the pinned `@electric-sql/pglite` development dependency, including its packaged `pgcrypto` extension, to execute the complete ordered SQL migration chain and cross-user RLS scenarios inside `node:test`.

Why: The previous tests only matched SQL text and therefore could not detect duplicate relations, malformed statements, dependency-order failures, or policy behavior. PGlite provides a PostgreSQL 18-compatible executable boundary without requiring Docker for every contributor.

Security and maintenance: The dependency is development-only, lockfile-pinned, and never enters the Astro browser bundle or production artifact. The package is the intended scoped ElectricSQL distribution. Repository dependency audit must remain green. PGlite is not treated as proof of Supabase extensions, advisors, backups, Edge Functions, or the remote project identity.

Alternative rejected: A custom SQL parser would validate grammar fragments but not PostgreSQL execution, RLS enforcement, grants, constraints, or transaction order. Docker-based Supabase remains the stronger optional integration environment but is not installed on every maintenance host.
