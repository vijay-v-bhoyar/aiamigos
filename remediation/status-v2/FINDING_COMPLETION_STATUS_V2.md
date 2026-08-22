# AI Amigos hostile-audit status v2

**As of:** 2026-08-13  
**Authority:** current-worktree completion ledger  
**Current release posture:** **NO-GO / `PREPARED_NOT_DEPLOY_READY`**

## Outcome

None of the 32 hostile-audit findings is production-complete. The earlier staging v1.4.0 result is useful historical evidence, not current-candidate or production proof. The settled local plugin is now packaged as a source-equivalent v1.4.1 candidate and its local PHP, policy, schema/author, package-integrity, and Graphify gates pass. It has not been deployed and has no current staging browser, web-SAPI, or log proof.

The machine authority for this document is [finding-completion-ledger.json](./finding-completion-ledger.json). It deliberately leaves every finding's `completion.production`, `completion.stagingCurrentCandidate`, and `completion.localReleaseReady` value false.

## Truth boundary

- Production-closed findings: **0/32**.
- Only observed production mutation: public WordPress registration was disabled. That change does not close any of the 32 findings.
- Historical staging evidence: plugin v1.4.0 passed a retained browser-required crawl with 16 passes, 0 failures, and 0 skips across 75 sitemap URLs and 99 internal targets.
- Stricter route-policy attempt: the saved run failed because six unpublished 404 routes were still classified as readable quarantine routes. The configuration was corrected locally, but the corrected live rerun was blocked by network quota.
- Local candidate: plugin v1.4.1 is packaged but undeployed. It materially changes tombstones, newsletter behavior, schema filtering, links, collection behavior, and identity language.
- Release artifact: `remediation/releases/aiamigos-remediation-1.4.1-candidate.zip`, SHA-256 `EAE265DCE613022C0BFDE1EFCAA9EE14387963BACC5C1DD9D6D8CB39260E7FCA`, contains eight runtime files that are byte-equivalent to the settled source. The separate v1.4.0 ZIP remains historical.
- PHP/package proof: under a hash-verified official PHP 8.4.24 CLI, current-source lint passed 7/7, policy assertions passed 29/29, schema/author assertions passed 36/36, the candidate extracted all 8 expected runtime files, and packaged PHP lint passed 5/5.
- Graph proof: the final current-source Graphify refresh contains 257 nodes and 389 edges with zero missing, dangling, self-loop, duplicate, or collapsed edges.
- Deployment boundary: no supported-PHP Hostinger web-SAPI smoke, current-candidate staging activation, browser-required crawl, or server-log review has passed.
- Current production spot-check (2026-08-21): Playwright still observed the pre-remediation root/home split, repeated pagination, raw MailPoet shortcodes, HTTP YouTube link, PHP/8.1.34 disclosure, and `wp is not defined`. Evidence: [production browser spot-check](../tests/results/PRODUCTION_BROWSER_SPOTCHECK_2026-08-21.md). This confirms production remains unchanged; it is not deployment proof for the candidate.

## Current distribution

| Current status | Findings | Meaning |
| --- | ---: | --- |
| Historical staging mechanical evidence | 6 | A mechanism passed on staging v1.4.0; it is not current-candidate or production proof. |
| Historical staging containment evidence | 7 | Risky material was hidden, drafted, or tombstoned; its underlying claims were not repaired. |
| Partial | 12 | A bounded control or inventory exists, with material gates still open. |
| Human or legal gate | 6 | Accountable approval cannot be inferred from automation. |
| Open runtime | 1 | The deployed runtime condition remains present. |

## Finding-by-finding status

| ID | Current status | Exact progress | Remaining gate |
| --- | --- | --- | --- |
| C1 | Historical staging mechanical evidence | v1.4.0 historically served the brand at `/`, Blog at `/blog/`, and redirected `/home/` in one hop. The source-equivalent v1.4.1 package and local gates now pass. | Deploy v1.4.1 to isolated staging; pass corrected no-skip routing/canonical/sitemap/browser, web-SAPI, and log proof; then repeat on production. |
| C2 | Historical staging mechanical evidence | v1.4.0 historically exposed all 65 staging sitemap posts through Blog pagination and redirected legacy pager routes. | Prove complete, differentiated, self-canonical v1.4.1 pagination on staging and then production. |
| C3 | Historical staging containment evidence | The eight demo records historically returned exact 410 responses and were excluded from discovery; the hardened attempt still observed all configured gone routes at 410. | Pass corrected v1.4.1 route/feed/sitemap/query/link/preservation tests, then deploy and prove the same production containment. |
| C4 | Partial | v1.4.0 removed raw shortcode output and used email fallback; local v1.4.1 proposes retiring both newsletter routes and all collection forms. | Owner chooses retired newsletter or a real provider-backed consent-to-unsubscribe workflow; deploy and test the approved result. |
| C5 | Historical staging containment evidence | The certifications page was draft/404 on historical staging; local v1.4.1 proposes exact 410. No credential was corrected. | Keep retired or rebuild from current issuer evidence under accountable review; pass staging and production containment/publication tests. |
| C6 | Historical staging containment evidence | The GPT Models post was draft/404 on historical staging; local v1.4.1 proposes exact 410. The known errors remain uncorrected. | Keep retired or complete a full primary-source technical rewrite and review; pass staging and production tests. |
| C7 | Historical staging containment evidence | The GrokAI post was draft/404 on historical staging; local v1.4.1 proposes exact 410. No vendor or capability was verified. | Keep retired or establish the real product from primary evidence and rewrite; pass staging and production tests. |
| C8 | Human or legal gate | A 71-post queue records missing visible author signal on all 71. Local v1.4.1 removes the earlier unattested sitewide Vijay responsibility claim. | Attest responsibility page by page; approve bios, sourcing, corrections, AI-use, conflicts, affiliates, reviewers, and publisher policies; validate output. |
| H1 | Open runtime | Hash-verified PHP 8.4.24 CLI evidence now passes 7/7 current-source lint, 29/29 policy, 36/36 schema/author, 8/8 candidate extraction, and 5/5 packaged PHP lint. The candidate matches all eight settled runtime files, and the final current-source Graphify refresh is clean at 257 nodes/389 edges. | Deploy on supported-PHP isolated staging; prove extension parity, web-SAPI and WordPress/theme/plugin interoperability, clean logs, theme provenance, origin-wide disclosure removal, then production. |
| H2 | Historical staging mechanical evidence | Historical v1.4.0 checked 110 destinations from 76 pages with no broken or redirecting target; v1.4.1 changes the tombstoned link surface. | Run full current-candidate link integrity on staging and repeat after production deployment. |
| H3 | Partial | Historical four-route mobile budgets passed below 0.9 MB total and 0.42 MB image transfer on the largest sample. | AVIF/WebP work, visual diffs, identified LCP, cold/warm Lighthouse, and production field evidence remain. |
| H4 | Historical staging mechanical evidence | Historical v1.4.0 metadata/social-field assertions passed across 75 sitemap URLs. v1.4.1 changes that inventory. | Rerun complete current-candidate metadata, canonical, uniqueness, and social checks on staging and production. |
| H5 | Partial | Historical structural heading checks passed; the new 71-post inventory supplies machine-draft content dispositions. | An editor must enrich, merge, or retire every thin/unclear page; rerun structural and intent gates on staging and production. |
| H6 | Historical staging mechanical evidence | Historical v1.4.0 removed known leak patterns across 75 pages and recorded no runtime error on four rendered routes. | Browser-required, cache-bypassed, no-skip v1.4.1 crawl plus logs on staging, then production monitoring. |
| H7 | Human or legal gate | Unsupported propositions were suppressed/drafted; v1.4.1 proposes broader reversible tombstones. | Executive approval of one audience, promise, business model, brand vocabulary, journeys, and accountable owners; implement and validate. |
| H8 | Historical staging containment evidence | Child-risk routes were draft/404 or exact 410 historically; v1.4.1 proposes both as 410 tombstones. | Corrected containment proof plus parent/educator, age, supervision, privacy, ads, moderation, accessibility, learning, and legal review before any republication. |
| H9 | Historical staging containment evidence | The book page was draft/404 historically; v1.4.1 proposes an exact 410 tombstone. | Corrected containment proof; no republication without compensation disclosure, edition/ISBN, age method, selection evidence, limitations, and editor approval. |
| H10 | Partial | Historical staging bounded About copy and suppressed unsupported claims; v1.4.1 removes more unattested identity language. | Substantiate operator, qualifications, methods, metrics, events, customers, services, and curricula; deploy and validate approved claims only. |
| H11 | Human or legal gate | Historical staging minimized optional collection; v1.4.1 hard-disables forms and retires newsletters locally. | Legal approval of real controller, vendors, cookies, collection, children, affiliates, retention, rights, security, and collection notices; validate data flows. |
| H12 | Partial | A machine inventory maps 71 posts to 7 clusters and 59 intents, flags 21 overlap signals, and exposes one unreconciled staging-post delta. The all-category rule is locally corrected. | Retain exact staging sitemap URLs, resolve the one-post delta, approve merge/redirect decisions, pass corrected current-candidate crawl, then use production Search Console evidence. |
| H13 | Historical staging containment evidence | Five artifact-promise records were historically drafted/404; v1.4.1 proposes exact 410 tombstones. | Corrected exact containment proof; no republication without repositories, fixtures, data, versions, method, limitations, and reproducibility review. |
| M1 | Partial | Historical social fields existed. The latest local candidate is 1200x630 and preserves the source mark; approval is still pending for text/brand owner signoff, platform previews, and deployment wiring. | Approve the exact 1200x630 brand-preserving card, complete Facebook/LinkedIn/X previews, and wire and test it on staging and production. |
| M2 | Human or legal gate | Inventory covers 974 images and 184 empty-alt instances. Only ALT-162 and ALT-163 have safe remove decisions; 182 remain. | Human pixel/context/link-purpose decisions for 182, implementation of all 184, recapture, screen-reader/control proof, and production validation. |
| M3 | Partial | Historical JSON-LD was parseable. The v1.4.1 structural-only schema filter passes source/package PHP lint and 36/36 schema/author assertions, but remains undeployed. | Deploy and crawl the filter on isolated staging; prove web-SAPI output and relationships, obtain human entity attestations and external schema validation before restoring claim-bearing entities, then repeat on production. |
| M4 | Historical staging mechanical evidence | Historical v1.4.0 found zero HTTP references across 75 sitemap pages. | Repeat complete mixed-scheme checks on deployed v1.4.1 and production. |
| M5 | Partial | Direct historical mobile checks covered control names/sizes, state, keyboard/Escape/focus, clone hiding, autoplay focus, and overflow. The retained full-crawl JSON does not contain structured control-level results. | Save structured current-candidate accessibility evidence, complete screen-reader sampling and M2, then repeat on production. |
| M6 | Partial | Historical canonical HTML headers passed. A local origin-policy package exists but is explicitly dormant and unauthorized for production. | Approved staging insertion/rollback; full anonymous/authenticated HTML/REST/login/error/asset/cache matrix; CSP reporting; disclosure removal; repeat on production. |
| M7 | Human or legal gate | The 71-post queue flags formulaic body language on 63 posts and title language on 19 without claiming AI authorship. | Accountable evidence-based rewrite/merge/retire decisions and an enforced publication standard; validate surviving staging and production content. |
| M8 | Partial | Historical staging removed known deterministic defects, but the full corpus has not been line edited and v1.4.1 changes copy. | Human line edit plus publication checklist; rerun deterministic and rendered checks on staging and production. |
| M9 | Partial | Historical taxonomy surfaces were noindex/sitemap-excluded. The current gate bans all `/category/` paths, but its corrected live rerun was quota-blocked; 7 machine clusters are unapproved. | Pass all-category current-candidate tests; approve taxonomy, archive copy, merge strategy, and journeys; repeat on production. |
| M10 | Partial | Historical staging minimized collection to email. v1.4.1 hard-disables collection forms locally, but no retention or response expectation is approved. | Approve purpose, handling, retention/deletion, response expectation, security boundary, and collection notice; test the real exchange on staging and production. |
| M11 | Human or legal gate | The new queue covers 71 posts: 70 stale over 365 days; 12 critical, 32 high, 27 medium. All recommendations are machine drafts, with one unexplained staging delta. | Named-owner approval for 71/71 dispositions, primary-source reviews, truthful review/correction records, delta reconciliation, sustainable cadence, staging and production validation. |

## Admission gate for the next status change

A finding may move forward only when evidence matches the bytes and environment being described. The immediate candidate gate is:

1. Use the exact v1.4.1 candidate bytes identified by SHA-256 `EAE265DCE613022C0BFDE1EFCAA9EE14387963BACC5C1DD9D6D8CB39260E7FCA`; rebuild and reverify if any source byte changes.
2. Deploy those exact bytes to isolated staging with rollback and database-preservation evidence.
3. Prove supported-PHP web-SAPI and installed-extension parity, WordPress/theme/plugin interoperability, and clean server logs.
4. Run the corrected no-skip HTTP/browser policy, route, sitemap, metadata, schema, accessibility, performance, header, registration, and log suite. The quota-blocked corrected rerun has not satisfied this step.
5. Complete every named human/legal decision that affects the finding.
6. Use an approved production manifest that preserves the production database, users, comments, and disabled registration.
7. Only then run and retain equivalent production evidence. Until step 7 succeeds for a finding, its production completion value remains false.

## Verification

Run the dependency-free ledger gate from the repository root:

```powershell
node remediation/tests/finding-completion-ledger.mjs
```

The gate requires exactly the unique IDs `C1`-`C8`, `H1`-`H13`, and `M1`-`M11`; checks summary counts and truth-boundary facts; and fails if any finding claims production completion.
