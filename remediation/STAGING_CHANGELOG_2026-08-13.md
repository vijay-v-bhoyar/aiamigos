# AI Amigos staging remediation changelog — 2026-08-13

Status: **staging work in progress; not approved for production promotion**.

This log separates changes made to the live site from changes made only on the isolated Hostinger staging site. It is not a claim that the hostile-audit findings are closed.

## Authority and rollback

- Hosting plane: Hostinger hPanel, WordPress on LiteSpeed.
- Isolated staging origin: `https://remediation.aiamigos.org/`.
- Staging `robots.txt`: `User-agent: *` and `Disallow: /`.
- A Hostinger daily backup dated 2026-08-13 05:40 was observed before remediation work.
- The original production menu and underlying drafted/demo records have been retained for recovery.

## Production change

Only one production setting has been changed:

- WordPress public registration was disabled.
- Anonymous verification: `/wp-login.php?action=register` redirects to `?registration=disabled` and reports that registration is not allowed.
- No existing user account was deleted or reclassified. The 293 subscriber accounts remain unclassified pending an export, allowlist rules, backup confirmation, and evidence-preserving review.

No production page, post, plugin, theme, menu, or source file has been changed in this remediation pass.

## Staging changes

### Platform

- WordPress updated from 6.4.10 to 7.0.4.
- Ads.txt Manager updated from 1.1.7.1 to 1.1.12.
- Contact Form 7 updated from 5.9.8 to 6.1.6.
- Rank Math SEO updated from 1.0.272 to 1.0.276.
- WP Consent API updated from 1.0.7 to 2.0.1.
- Public registration was disabled and anonymously verified at the staging registration endpoint.
- The active Sirat Pro theme still reports version 1.4. Its staging and production files have identical observed provenance, and no vendor update can be proven from the available evidence. An earlier claim that a Sirat Pro update completed successfully was incorrect and is withdrawn.
- Four inactive bundled themes (Twenty Twenty-One, Twenty Twenty-Two, Twenty Twenty-Three, and Twenty Twenty-Four) and their available translations were updated successfully.

### Reading and navigation

- Static front page set to page ID 20 (`Home`).
- Native posts page set to page ID 23 (`Blog`).
- `/` now renders the branded home page.
- `/blog/` and `/blog/page/2/` render distinct native post-archive pages.
- A new rollback-safe menu named `Primary - Remediation` is assigned to the primary location with these top-level targets: Home, Blog, About us, Academy, AI Career, Contact, Newsletter, and Privacy.
- The previous menu remains stored but unassigned.

### Recoverable content quarantine

The following records were changed to draft on staging:

- page 945 — AI Certifications;
- post 441 — GPT Models;
- post 783 — GrokAI;
- post 1405 — AI Model Benchmarks;
- page 1417 — duplicate Newsletter page;
- page 552 — empty Others page;
- page 6 — empty Shop page;
- class record 34 — Recent Case Title 01.

Theme-demo IDs 36, 40, 42, 44, 46, 48, and 50 remain published in the database. The remediation plugin excludes those exact IDs from public queries and sitemaps and returns `410 Gone` for their exact public paths while keeping the admin records recoverable. The staging regression crawl verified those eight exact 410 responses after activation.

An additional fail-closed staging batch was applied after exact REST identity checks and full pre-change exports:

- posts 1411, 1407, 1421, and 926 (unfulfilled technical promises) changed from published to draft;
- pages 21 and 22 (unverified services/courses) changed from published to draft;
- pages 877 and 149 (child-safety and affiliate-review gates) changed from published to draft.

All eight now return `404` publicly on staging. Their complete pre-change edit-context records and SHA-256 manifest are retained under `remediation/staging-backups/quarantine-2026-08-13T17-25-51-990Z/`. An intermediate sitemap response contained stale cached entries; after cache invalidation, the cache-bypassed HTTP crawl found 75 clean sitemap URLs with none of these records exposed.

Team record ID 38 is the genuine Vijay Bhoyar record and is deliberately excluded from quarantine.

### Accountable identity

The staging administrator profile now displays `Vijay Bhoyar`, links to `https://www.aiamigos.org/`, and uses this bounded biography:

> Founder and editor of AI Amigos. Vijay Bhoyar reviews and maintains the site's articles about artificial intelligence education, tools, and careers. Content may change as products and standards evolve.

No credential, independent-review claim, or invented expertise was added.

### Update-request form

The Contact Form 7 form titled `Subscribe Newsletter Form` was rewritten as an explicit manual update request. The version 1.4.0 runtime now keeps collection forms disabled by default and renders a direct email path instead. Contact and Newsletter form assets are removed unless an explicit approval filter is enabled and the exact canonical Newsletter invariant is satisfied. This is a fail-closed staging policy, not proof of a production mailing workflow.

The version 1.4.0 runtime also supplies bounded About and Contact copy, keeps the legacy privacy page accessible but out of the sitemap with a `noindex` directive, removes unreviewed chatbot assets, disables legacy footer-widget claims, and uses the existing custom logo as a site-icon fallback. These are staging runtime outputs; they do not establish the truth of any unpublished business, legal, credential, retention, or response-time claim.

### Theme compatibility patches

Two exact Sirat Pro renderers were patched on staging behind preimage and postimage SHA-256 gates:

- The home-blog renderer was first changed from raw original image URLs to WordPress responsive-image output. Its responsive-image postimage was `8cc6a5771f0b7ae557c263a3cf422976751eb655079f0b611a19d02828206258`.
- A later accessibility/title patch changed that same home renderer to one visible `h3.aiamigos-blog-card-title` per card while preserving the responsive-image change. The current canonical remote hash is `174c72bf0ca894cdddd60132a59d66937a0b7b86dc47b05bd8bf38872a35fd32`.
- The three archive-card image branches were changed to WordPress responsive-image output. The current remote hash is `f24051f220b6191122db539201a3aad582e474b8e402d917f3b9ae392272c070`.

These are staging parent-theme patches. Sirat Pro still identifies itself as version 1.4, the observed staging and production theme provenance is identical, and vendor maintenance/update status remains unproven. A future vendor update can overwrite the patches and must be reviewed against fresh preimages.

## Local remediation source and tests

- WordPress plugin source: `remediation/wp-plugin/aiamigos-remediation/`.
- Read-only regression harness: `remediation/tests/`.
- Graph-to-finding map: `remediation/GRAPH_IMPACT_MAP.md`.
- Machine remediation registry: `remediation/remediation-registry.json`.

### Version 1.4.0 deployment

The staging plugin was advanced to version 1.4.0. The deployment used a dependency-safe order: the new accessibility PHP, CSS, and JavaScript files were created and byte-verified first; the runtime class was replaced next; and the bootstrap that requires the new class was replaced last. This prevented an intermediate request from loading a bootstrap whose dependency was absent.

The exact staging remote SHA-256 values after deployment were:

| Remote plugin file | SHA-256 |
|---|---|
| `aiamigos-remediation.php` | `b9dd04514141c9654a7f6fcef6c697e8267dfd9218d285f52f23ca88ae58644b` |
| `includes/class-aiamigos-remediation-plugin.php` | `98afb3ce2b85f3d6517adabbc4959ce8f22f1aadb4edd2ae8bc814b5b30be208` |
| `includes/class-aiamigos-accessibility-remediation.php` | `d28292ad665cae246681b9bb0f363a1c5c544313fe6d47104630e9372ba8ce31` |
| `assets/css/aiamigos-accessibility-remediation.css` | `b2e3bb2005a14198d1616ad598a01ffcfefe9dd881d0a5342856dda389f8bd02` |
| `assets/js/aiamigos-accessibility-remediation.js` (`a11y2`) | `2d2c4c4742ac9cd85049e55eccc932b4ae6aa8d86ad65ae7fb17e4e8bfeffb76` |

The plugin was activated successfully and public staging requests rendered without a fatal error. A subsequent isolated local gate used the official PHP 8.4.24 NTS CLI archive after verifying its published SHA-256: all 16 plugin/release/theme PHP artifacts passed `php -l`, and the pure policy suite passed 28/28 assertions. See `remediation/runtime-evidence/PHP_8_4_24_VALIDATION_2026-08-13.md`. The remote Hostinger web runtime remains a separate compatibility gate.

### Regression evidence

- The cache-bypassed HTTP crawl recorded 16 checks: **14 pass, 0 fail, 2 skip**. The two skips are the browser-runtime and rendered-performance checks. It discovered 75 clean sitemap URLs and 99 unique internal targets.
- The first browser-required run recorded **15 pass, 1 fail, 0 skip** because external resource requests encountered transient `net::ERR_QUIC_PROTOCOL_ERROR` failures. The performance budget passed in that same run.
- A clean browser rerun recorded **16 pass, 0 fail, 0 skip**, again with 75 sitemap URLs. This proves the tested version 1.4.0 staging state at that point; it does not prove production readiness.
- After the final `a11y2` JavaScript revision was deployed, a direct rendered-browser accessibility check found 20/20 carousel dots with deterministic names, adopted controls measuring at least 44 by 44 CSS pixels, menu and search keyboard activation, `Escape` close behavior with focus transfer/return, and no carousel autoplay movement over a greater-than-six-second observation.
- The final cache-bypassed, browser-required post-`a11y2` crawl recorded **16 pass, 0 fail, 0 skip** in 153,085 ms. It checked 75 clean sitemap URLs and 99 unique internal targets; all four rendered pages returned 200 with zero captured exceptions, console/log errors, network failures, WAF blocks, or horizontal overflow. The result is stored in `remediation/tests/results/seo-regression-staging-v1.4.0-a11y2-browser.json`.

The local static, DOM-fixture, theme-patch, performance, and harness checks remain bounded implementation evidence. The public staging observations above are separately identified so they are not mistaken for production proof.

## Known non-changes and release blockers

- The attempted Academy introduction edit was not proven saved and is not counted as a change.
- PHP remains 8.1.34. A supported-version migration has not been attempted because Hostinger exposes a plan-level change with a wider blast radius. Local PHP 8.4.24 syntax and policy gates now pass, but they do not substitute for an isolated Hostinger web-runtime migration and log review.
- Comments and existing subscriber accounts have not been deleted or moderated.
- Large media-library format conversion, editorial rewriting, factual source review, credential verification, child-safety review, affiliate/legal approval, privacy/retention approval, and manual alt-text decisions remain human-owned gates.
- Sirat Pro vendor provenance, maintenance eligibility, and update status remain unproven; the active header still reports version 1.4.
- No Hostinger staging-to-production publication has occurred.
- The temporary WordPress staging application password named `Codex staging remediation 2026-08-13` was revoked after the final evidence run. A read-before-delete check found exactly one matching credential, WordPress returned `deleted: true`, and the revoked credential then received `401 Unauthorized`. It cannot be recovered; future authenticated staging work must issue a new bounded credential.

Production is **NO-GO**. Production remains untouched except for the explicit registration setting described above. None of the staging plugin, theme, content, menu, platform, or quarantine changes has been promoted.

Before any production promotion, confirm that the promotion mechanism will not overwrite newer production comments/users or re-enable registration. Prefer a scoped file/plugin deployment plus explicit database changes over an unreviewed full database replacement.
