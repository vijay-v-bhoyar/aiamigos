# AIAmigos remediation registry

This directory contains the machine-readable baseline backlog and the retained remediation evidence for the 2026-08-13 deployed-site audit.

- [`remediation-registry.json`](./remediation-registry.json) is the authoritative baseline registry of observed work items and their original fail-closed verification contracts; it has not been mass-marked complete from staging evidence.
- [`FINDING_CLOSURE_STATUS_2026-08-13.md`](./FINDING_CLOSURE_STATUS_2026-08-13.md) is the current 32-finding staging disposition: 8 staging-proven closed, 8 safely quarantined/fail-closed, 9 partial, 6 human/legal gated, and 1 runtime open. No finding is production-closed.
- It records observed evidence and intended work. `SEC-01` records one narrow authenticated production change: public WordPress registration was disabled and `users_can_register=false` was verified after reload. It does **not** claim that Subscriber review, quarantine, cleanup, or any other live remediation is complete.
- Every item is initially `blocked` or `pending`. A status may change only after its verification assertions run against the declared scope and evidence is retained.
- The source is a deployed WordPress snapshot, not an authoritative PHP/template/database repository.

## Coverage

| Coverage dimension | Count |
|---|---:|
| Top-level hostile-review findings | 32/32 |
| Bullet-level report subfindings | 57 |
| Nonempty deterministic SEO queues represented | 22/22 |
| Deterministic per-page/group queue records | 924 |
| Sitemap URLs referenced | 114/114 |
| Low-severity baseline guardrails | 7 |
| Prioritized P0/P1/P2 workstreams | 20 |
| Ongoing governance controls | 6 |
| Authenticated security findings | 1 |
| Authenticated security prerequisite controls | 3 |
| Authenticated security review/quarantine workstreams | 1 |
| Total registry records | 1051 |

## Record model

Each record includes:

- stable `id` and optional `parent_id`;
- `kind`, `severity`, and initial `status`;
- exact affected `urls`, `patterns`, and exclusions;
- current evidence and local evidence-source paths;
- intended fix;
- executable verification assertions with scope, method, and required evidence;
- dependencies;
- explicit production authority required.

IDs are append-stable:

- `C1`–`C8`, `H1`–`H13`, and `M1`–`M11`: review findings;
- `<finding>-SFnn`: bullet-level subfindings in report order;
- `DQ-<QUEUE>-nnn-<URLHASH>`: deterministic queue item; ordering plus URL fingerprint;
- `LGnn`: low-severity/baseline guardrails;
- `P0-nn`, `P1-nn`, `P2-nn`: prioritized workstreams;
- `GOV-nn`: recurring governance controls.
- `SEC-nn`: authenticated security findings;
- `SEC-nn-CTL-nn`: evidence, policy, and recovery prerequisites;
- `SEC-nn-Wnn`: evidence-preserving security review workstreams.

## Authenticated security evidence addendum

On 2026-08-13, the authorized operator reported these authenticated production observations and actions:

- Before the control change, WordPress **Settings > General** had **Anyone can register** enabled.
- The authenticated **Users** inventory showed **294 total accounts: 1 Administrator and 293 Subscribers**.
- Sampled Subscriber rows were dominated by scam-, crypto-, casino-, or spam-themed identities. This is a triage signal only: it does **not** classify all 293 Subscriber accounts as malicious.
- The operator disabled public registration on production and verified after reloading the setting that `users_can_register=false`.
- This evidence update did not review, quarantine, delete, or otherwise clean up the Subscriber population. No account-level conclusion is recorded without the full export and approved review process.

The open security work is intentionally sequenced:

1. Export and preserve the complete user inventory with a timestamp, integrity hash, protected storage, and a reconciliation against the 294-account observation.
2. Approve an allowlist and evidence-based classification rubric that does not rely only on names, sampled rows, or apparent identity themes.
3. Create a protected backup and prove restoration in an isolated environment.
4. Review every reconciled Subscriber account, preserve account-level decisions, and use only an approved reversible quarantine state before any separately authorized deletion.

The standing live-control gate is exact: `users_can_register` must remain `false`, and a signed-out request to `https://www.aiamigos.org/wp-login.php?action=register` must not expose or permit public registration.

## Deterministic source queues

| Queue | Registry records |
|---|---:|
| `genericTitle` | 6 |
| `titlesTooLong` | 38 |
| `titlesTooShort` | 38 |
| `duplicateTitles` | 2 |
| `missingDescriptions` | 12 |
| `descriptionsTooLong` | 50 |
| `descriptionsTooShort` | 13 |
| `duplicateDescriptions` | 1 |
| `h1Missing` | 1 |
| `h1Multiple` | 3 |
| `thinPagesUnder300Words` | 29 |
| `duplicateContent` | 4 |
| `missingOgImage` | 25 |
| `missingTwitterDescription` | 11 |
| `emptyImageAlt` | 77 |
| `emptyLinks` | 114 |
| `insecureHttpLinks` | 114 |
| `insecureEmbeddedUrls` | 114 |
| `emailAsTelephone` | 114 |
| `rawShortcodes` | 5 |
| `missingVisibleAuthorSignal` | 114 |
| `missingVisibleDateSignal` | 39 |

Zero-result source checks are retained in the registry coverage/baseline boundary: non-200 sitemap pages, missing titles, missing canonicals, canonical mismatches, noindex sitemap URLs, schema parse errors, missing alt attributes, and mojibake all had zero entries in the captured deterministic audit. They are not falsely represented as defects.

## Status and evidence rules

- `blocked`: production credentials, named owner decisions, legal/editorial approval, staging, external property access, or a dependent remediation is required.
- `pending`: actionable review/governance work whose next step does not itself prove a production change.
- No item becomes complete merely because local HTML, tests, or a snapshot changed. `SEC-01` remains `pending`: its registration-control assertion is live-verified, while its account-review scope is still open.
- Live completion requires the item’s assertions, production evidence, responsible owner, approval, and deployment/operation record.
- Heuristic title/description thresholds and empty-alt/empty-link queues require human judgment; they are not automatic ranking or accessibility failures.
- `EXTRACTED` Graphify relationships mean explicit in the captured material, not factually verified.

## Validation

The registry is intended to be validated with any strict JSON parser plus these invariants:

1. IDs are unique and every non-null parent/dependency exists.
2. Severity, status, kind, and verification scope use only declared values.
3. Every record has at least one exact URL or explicit pattern.
4. Every record has evidence, intended fix, at least one verification assertion, production-authority requirements, dependencies, and a blocked/pending status.
5. The only live change claimed is the narrow authenticated `SEC-01` registration-control change; no Subscriber cleanup or other remediation is claimed complete.
6. All 32 hostile-review findings, the additional authenticated `SEC-01` finding, all 57 report bullet subfindings, all 22 nonempty deterministic audit queues, and all 114 sitemap URLs remain covered.
