# AI Amigos staging content patch plan

[`content-patch-plan.json`](./content-patch-plan.json) is a **proposal-only, staging-only** execution plan. It records what to change and how to prove it; it does not claim that the changes are live.

## What it covers

- 19 ordered content patch groups;
- exact WordPress IDs, post types, slugs, captured originals, and snapshot references where the evidence exposes them;
- recoverable quarantine for false, unsupported, duplicate, empty, demo, child-safety, affiliate-style, and unfulfilled-artifact pages;
- bounded copy for Home, Blog, Newsletter, Academy, Career, About, Contact, and the real team profile;
- exact broken-link replacements;
- 21 priority metadata rewrites, seven heading repairs, and eight known category terms;
- draft-only trust-policy outlines that must be filled from actual operations, not generic policy claims;
- per-patch rollback and validation criteria.

The complete deterministic audit backlog remains in [`remediation-registry.json`](./remediation-registry.json). This plan selects the highest-risk executable content batch; it does not silently discard the remaining registry queue.

## Safety rules

1. Export the exact staging record and retain its WordPress revision before editing.
2. Stop if ID, post type, slug, or current status differs from the plan.
3. Apply one patch group at a time only on `https://remediation.aiamigos.org`.
4. Keep unverifiable items in draft or noindex quarantine. Never fill evidence gaps with plausible-sounding credentials, customers, safety guarantees, legal terms, benchmarks, or product capabilities.
5. Update body and evidence before publishing its proposed metadata.
6. Do not treat a content edit as proof that theme, plugin, runtime, header, media, or performance defects are fixed.

## Execution order

1. `P0_QUARANTINE`: retain the factual-risk, demo, duplicate, empty, and unfulfilled-artifact records as recoverable drafts.
2. `P0_HUBS_AND_LINKS`: establish honest Home/Blog/Newsletter/Academy/Career hubs and remove exact broken or redirecting body links.
3. `P1_TRUST_AND_SAFETY`: rewrite About and Contact, gate Privacy, quarantine child/affiliate content, verify the real profile, and draft operating-policy pages.
4. `P1_METADATA_HEADINGS_TAXONOMY`: apply metadata only after body review, repair semantic headings, then noindex and rationalize taxonomy from an assignment export.

## Acceptance boundary

Re-run the staging regression harness and require the relevant route, link, metadata, heading, leak, and discovered-indexable checks to pass. Retain named reviewer, source, legal, relationship, and owner-approval evidence for every gated publication. Drill rollback on a representative page, post, custom post type, and term.

Production promotion is a separate decision. Do not publish the staging database wholesale without reconciling production users, comments, registration settings, and newer content; use a scoped manifest of exact records and fields after staging acceptance.

## Local artifact validation

- strict JSON parse: passed;
- 19/19 patch IDs unique;
- 78 ID/slug references covering 67 unique WordPress records matched a captured WordPress REST or shortlink ID;
- 21/21 priority metadata records matched the captured title and title/description lengths;
- all 68 unique local evidence references exist;
- all proposed priority titles and descriptions are within the plan's 10-60 and 50-160 character review ranges.
