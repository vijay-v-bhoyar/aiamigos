# AI Amigos runtime and security remediation plan

**Prepared:** 2026-08-13  
**Evidence refresh:** 2026-08-13 17:29-17:32 UTC  
**Findings covered:** H1 (obsolete runtime and exposed versions), M6 (weak response hardening and cache policy)  
**Release posture:** **OPEN / NO-GO for production promotion**

This is a read-only remediation plan. Preparing it did not change production, staging, or the remediation plugin. It separates public response evidence, authenticated changes already recorded on staging, and work that still requires Hostinger/WordPress authority.

## Executive disposition

H1 and M6 are only partially remediated on staging and remain open on production.

- Staging is now on WordPress 7.0.4, which WordPress.org lists as the latest release as of August 12, 2026. The four named third-party plugin updates are also at their current WordPress.org releases.
- Both production and staging still run and disclose PHP 8.1.34 on responses not intercepted by the staging remediation plugin. PHP 8.1 reached end of life on December 31, 2025.
- The staging front-end now emits the remediation plugin's HSTS, `nosniff`, frame, referrer, permissions, and short public-cache policy, and suppresses `X-Powered-By` and the WordPress core generator on those front-end responses.
- Those application-level controls do not cover the whole origin. Staging REST and login responses still expose `PHP/8.1.34`; they do not receive the same complete header set. Production still lacks the M6 baseline on ordinary HTML.
- The Sirat Pro updater reported success, but both public stylesheets still declare version 1.4 and are byte-for-byte identical. The update is therefore not proof of a newer theme code release or WordPress 7/PHP 8.4 compatibility.
- No full production database replacement is safe: production has newer user/comment state that staging must not overwrite. Runtime remediation must be a scoped files/configuration deployment plus explicit, reviewed database mutations.
- A separately downloaded official PHP 8.4.24 NTS CLI archive matched PHP's published SHA-256. All 16 local plugin/release/theme PHP artifacts passed `php -l`, and the pure policy suite passed 28/28 assertions. See [`runtime-evidence/PHP_8_4_24_VALIDATION_2026-08-13.md`](./runtime-evidence/PHP_8_4_24_VALIDATION_2026-08-13.md). This closes the local parser-evidence gap only; it is not remote web-SAPI compatibility evidence.

## Evidence and confidence rules

| Evidence class | What it proves | What it does not prove |
|---|---|---|
| Public response/header probe | What an anonymous client received at the stated timestamp | Authenticated package inventory, filesystem integrity, or exploitability |
| Public asset/generator version | A version string was advertised | That the string is trustworthy, that all plugin files match that release, or that an undisclosed plugin is absent |
| Authenticated staging changelog | The recorded WordPress/hPanel operation completed and the visible version after it | Production state, vendor source integrity, or compatibility under a new PHP branch |
| WordPress.org/PHP/Hostinger primary documentation | Current upstream release/support policy | Site-specific compatibility |
| Regression crawl | The configured URLs passed its assertions | Admin, REST, login, PHP configuration, backups, restore capability, or undiscovered endpoints |

The hostile review correctly avoided turning exposed version strings into vulnerability claims. A clean update screen is also not a security attestation; package inventory, checksums, advisories, and runtime tests are all required.

## Observed runtime and package inventory

### Production: `https://www.aiamigos.org/`

| Component | Observed version/state | Evidence strength | Disposition |
|---|---:|---|---|
| PHP | 8.1.34 | Direct `X-Powered-By` on `/`, REST, login, and 404 responses | **EOL; blocker** |
| WordPress core | 6.4.10 | Direct core generator and core asset tokens | Current patch of an old branch, but not the actively maintained 7.0 line; upgrade required |
| Sirat Pro active theme | 1.4 | Direct `style.css` header; SHA-256 `28021c28ab26472ff1c6e438e5b42def689d0c4c3ec5ae1ac2dde1a6767ae720` | Vendor release/compatibility not proven; blocker |
| Contact Form 7 | 5.9.8 | Direct public CSS/JS query tokens | Behind staging/current 6.1.6 |
| WP Consent API | 1.0.7 | Direct public JS query token | Behind staging/current 2.0.1 |
| Site Kit by Google | 1.185.0 | Direct generator | Current on WordPress.org at evidence refresh |
| Rank Math SEO | 1.0.272 | Last authenticated pre-staging update inventory; not directly re-proven by public HTML | Behind staging/current 1.0.276; re-inventory before cutover |
| Ads.txt & App-ads.txt Manager | 1.1.7.1 | Last authenticated pre-staging update inventory; not directly re-proven by public HTML | Behind staging/current 1.1.12; re-inventory before cutover |
| Twenty Twenty-One | 2.1 | Direct inactive-theme `style.css` header | Staging has 2.8 |
| Twenty Twenty-Two | 1.6 | Direct inactive-theme `style.css` header | Staging has 2.1 |
| Twenty Twenty-Three | 1.3 | Direct inactive-theme `style.css` header | Staging has 1.6 |
| Twenty Twenty-Four | 1.0 | Direct inactive-theme `style.css` header | Staging has 1.5 |
| AI Amigos Remediation | Not installed/deployed | Production non-change boundary | Do not deploy until staging is green |

Production public registration was disabled and anonymously verified. No production page, post, theme, plugin, source file, existing user, or comment was otherwise changed in this pass.

### Isolated staging: `https://remediation.aiamigos.org/`

| Component | Observed version/state | Evidence strength | Disposition |
|---|---:|---|---|
| PHP | 8.1.34 | Direct `X-Powered-By` on REST and login | **EOL; blocker** |
| WordPress core | 7.0.4 | Authenticated update plus direct core asset tokens | Current latest release at evidence refresh |
| Sirat Pro active theme | 1.4 | Direct `style.css` header; same SHA-256 as production | Update action completed, but code-release change and compatibility are unproven |
| Contact Form 7 | 6.1.6 | Authenticated update plus direct public asset tokens | Current WordPress.org release |
| Rank Math SEO | 1.0.276 | Authenticated update | Current WordPress.org release |
| WP Consent API | 2.0.1 | Authenticated update plus direct public asset token | Current WordPress.org release |
| Ads.txt & App-ads.txt Manager | 1.1.12 | Authenticated update | Current WordPress.org release |
| Site Kit by Google | 1.185.0 | Direct generator | Current WordPress.org release |
| Twenty Twenty-One | 2.8 | Direct inactive-theme `style.css` header | Updated; keep at most one recovery theme after rollback window |
| Twenty Twenty-Two | 2.1 | Direct inactive-theme `style.css` header | Updated; unused copy should be removed after rollback window |
| Twenty Twenty-Three | 1.6 | Direct inactive-theme `style.css` header | Updated; unused copy should be removed after rollback window |
| Twenty Twenty-Four | 1.5 | Direct inactive-theme `style.css` header | Updated; unused copy should be removed after rollback window |
| AI Amigos Remediation | 1.1.0 last recorded as deployed; local candidate now declares 1.2.0 | Staging changelog plus local bootstrap inspection | Do not call 1.2.0 deployed until its files are installed and verified |

Staging remains blocked from indexing by `robots.txt: Disallow: /`. `WP_DEBUG`, `WP_DEBUG_DISPLAY`, and `WP_DEBUG_LOG` were restored to false after diagnosis. The retained staging `wp-content/debug.log` returned 403 in the read-only probe; export and hash it as diagnostic evidence, then remove it from the web tree. The temporary diagnostic PHP file was moved to trash and must not be restored.

### Theme update evidence gap

Production and staging Sirat Pro `style.css` responses both have length 19,823 bytes and the same SHA-256 hash shown above. Production reported `Last-Modified: Thu, 19 Oct 2023 23:43:08 GMT`; staging reported `Last-Modified: Thu, 13 Aug 2026 15:40:47 GMT`. A newer timestamp with identical public content and the same `Version: 1.4` header proves a file operation, not a newer vendor release.

Before release, obtain the licensed current Sirat Pro package and changelog directly from VW Themes, record its package hash and supported WordPress/PHP matrix, and compare the entire installed theme tree—not only `style.css`. If the vendor cannot document maintenance and compatibility with current WordPress and PHP 8.4, replace Sirat Pro with a maintained theme rather than carrying an unverifiable premium package into production.

## Current response-header matrix

Read-only `HEAD` probes were sampled across home, blog, REST, login, and an intentional 404.

| Control | Production root | Staging root/blog | Staging REST | Staging login | Control owner / conclusion |
|---|---|---|---|---|---|
| `Strict-Transport-Security` | Missing | `max-age=15552000` | Missing | Missing | Plugin-only; move to Hostinger/CDN so every HTTPS response receives one authoritative value |
| `X-Content-Type-Options` | Missing | `nosniff` | `nosniff` from core | Missing | Partial; set at host/CDN |
| Frame protection | Missing | `X-Frame-Options: SAMEORIGIN` | Missing | `SAMEORIGIN` from core | Partial; final CSP should also use `frame-ancestors` |
| `Referrer-Policy` | Missing | `strict-origin-when-cross-origin` | Missing | `strict-origin-when-cross-origin` | Partial; set at host/CDN |
| `Permissions-Policy` | Missing | camera, microphone, geolocation, payment, and USB denied | Missing | Missing | Plugin-only; set at host/CDN and extend only for proven features |
| HTML `Cache-Control` | Missing on ordinary HTML | `public, max-age=300, stale-while-revalidate=30` | No explicit policy in sample | `no-cache, must-revalidate, max-age=0, no-store, private` | Front-end baseline passes; classify forms, authenticated, preview, password, and personalized responses before CDN caching |
| `X-Powered-By` | `PHP/8.1.34` | Suppressed | `PHP/8.1.34` | `PHP/8.1.34` | Application removal is incomplete; disable `exposePhp`/`expose_php` at the PHP/host layer |
| CSP | Only `upgrade-insecure-requests` | Only `upgrade-insecure-requests` | Same | Same | This upgrades mixed URLs but is not an effective resource/embedding policy; CSP remains open |
| Server/platform | `LiteSpeed`, `platform: hostinger`, `panel: hpanel` | `hcdn`, Hostinger platform/panel | Same | Same | Lower-priority provider disclosure; remove only if Hostinger supports it without breaking diagnostics |

The staging crawl's `responses.headers` assertion passed because it evaluates healthy canonical HTML pages. That is valid front-end evidence, but it is not evidence for REST, login, admin, static assets, or host/PHP configuration.

## Required target state

### Runtime

1. Run the latest Hostinger-supplied PHP 8.4 patch release. PHP 8.4 remains in active support through December 31, 2026 and security support through December 31, 2028. PHP 8.3 is an acceptable temporary supported fallback through December 31, 2027 if a documented dependency blocks 8.4. Do not choose PHP 8.2 for a new migration because its security support ends December 31, 2026.
2. Run the latest actively maintained WordPress series at the time of release. The exact evidence-day target is 7.0.4; re-check immediately before production because this value will age.
3. Have zero pending high/critical advisories for installed core, plugins, and themes, or a written exception with owner, compensating control, and expiry.
4. Remove unused plugins and all but one known-good inactive recovery theme after the rollback window. Inactive code is still deployed code.
5. Set `DISALLOW_FILE_EDIT` to true after confirming that the deployment path does not depend on dashboard source editing.
6. Keep `WP_DEBUG`, `WP_DEBUG_DISPLAY`, and `WP_DEBUG_LOG` false in production. Store operational logs outside the public web tree where the plan permits; never leave a diagnostic PHP endpoint or `phpinfo()` file behind.
7. Verify core checksums and record hashes/provenance for premium/custom packages. A version label alone is not an integrity result.

### Response handling

1. Configure HSTS once at the Hostinger CDN/LiteSpeed layer so it covers HTML, REST, login, errors, and static responses. Start with `max-age=15552000`; add `includeSubDomains` only after every subdomain and delegated service is inventoried and HTTPS-only. Do not request preload until that stronger commitment has been separately approved.
2. Configure `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and the approved `Permissions-Policy` at the same host layer. Use one policy source to avoid duplicate/conflicting header values.
3. Retain `X-Frame-Options: SAMEORIGIN` during transition and add CSP `frame-ancestors 'self'` in the final enforced policy.
4. Disable PHP disclosure using Hostinger PHP Options (`exposePhp`/`expose_php`), then verify it is absent on front-end, REST, login, admin redirects, and errors. The plugin's `header_remove()` remains defense in depth, not the primary control.
5. Do not strip every asset query string merely to hide versions. Those strings provide cache invalidation and are not a substitute for patching. Remove the WordPress generator and avoid unnecessary plugin generators, but treat software currency and integrity as the real control.
6. Develop CSP in `Content-Security-Policy-Report-Only` on staging from observed resource requirements. The final policy must set at least `default-src`, `base-uri 'self'`, `object-src 'none'`, `frame-ancestors`, `form-action`, and explicit source lists for scripts, styles, images, fonts, connections, and frames. Do not enforce a guessed policy against the theme, Site Kit, Contact Form 7, or approved embeds.
7. Define cache classes instead of one blanket value:
   - anonymous, non-personalized editorial HTML may use the short public policy already tested;
   - login, admin, preview, password-protected content, account/user-specific responses, and any response containing a user-bound nonce or private data must be `private, no-store`;
   - form pages require an explicit test proving that cached HTML contains no user-bound token and that submissions/consent work across fresh and cached sessions;
   - REST routes must be classified individually; authenticated or personal-data responses are never shared-cacheable.

## Controlled staging sequence

### Gate 0 — capture a restorable baseline

1. Confirm the authoritative Hostinger website, document root, database name, active theme, active/inactive plugin list, cron jobs, and CDN/cache mode.
2. Export a matched database-and-files backup set. Include `wp-config.php`, `.htaccess`, uploads, plugins, themes, and any mu-plugins. Record creation time, byte size, and SHA-256 manifests.
3. Restore that set into a separate disposable location and prove login, home, REST, and a representative post. A listed daily backup is not a tested rollback.
4. Capture machine-readable inventories where available:
   - `wp core version` and `wp core verify-checksums`;
   - `wp plugin list --fields=name,status,version,update,auto_update --format=json`;
   - `wp theme list --fields=name,status,version,update,auto_update --format=json`;
   - PHP version, SAPI, extensions, relevant `php.ini` values, and database server version;
   - Hostinger vulnerability/advisory export with advisory IDs and affected versions.
5. Preserve and hash the staging diagnostic log, then remove it from `wp-content`. Reconfirm its URL is 403 or 404 and that no diagnostic PHP files remain.

### Gate 1 — resolve theme and extension provenance

1. Obtain/verify the current Sirat Pro vendor package and compatibility statement, or select a maintained replacement theme.
2. Compare the full theme tree to the approved package; preserve customizations in a child theme or the custom remediation plugin rather than editing vendor files.
3. Inventory all plugins, including Hostinger tools/mu-plugins that public REST namespaces suggest may exist. Confirm business purpose, maintainer, update source, license, and current advisory state for each.
4. Delete unused plugins. After the rollback window, retain one updated default recovery theme and delete the other inactive themes.
5. Re-run checksums/inventory and store the resulting manifests.

### Gate 2 — migrate PHP without widening the blast radius

Hostinger's current PHP-version documentation says the hPanel selection can apply to all websites on a hosting plan. Before changing it, map every affected domain/subdomain. If staging cannot receive an isolated hPanel PHP configuration, move the clone to a separate plan/environment for compatibility testing. Do not use a folder-level `.htaccess` handler as the permanent solution; Hostinger warns that it does not carry the selected extensions/options with it.

1. On isolated staging, switch to the latest Hostinger PHP 8.4 patch.
2. Reconcile the extension list and runtime limits against the captured 8.1 inventory; disable `exposePhp`.
3. Clear OPcache/LiteSpeed/hCDN caches through supported controls.
4. Verify WordPress Site Health, admin login/editor, REST, cron/loopback, media handling, Contact Form 7 delivery path, sitemaps, and every remediation route.
5. Run the full deterministic crawl and required mobile browser probe. Require no 5xx, PHP fatal, uncaught browser exception, console error, or network failure.
6. Review PHP/server logs for deprecations and warnings from Sirat Pro and every active plugin. A visually correct home page is not enough.
7. If compatibility fails, revert the isolated staging PHP setting and fix/replace the dependency. Do not promote while PHP 8.1 is the only working branch.

### Gate 3 — move headers to the host/CDN plane

1. Add the approved headers at hCDN/LiteSpeed/Hostinger configuration level.
2. Disable duplicate application-level values only after the host policy is verified, leaving the plugin as a documented fallback if needed.
3. Run CSP in report-only mode, exercise the front-end/admin/form flows, review all violations, and allowlist only required origins. Enforce only after a clean functional run.
4. Probe this exact matrix with both `GET` and `HEAD`: `/`, `/blog/`, one post, `/wp-json/`, `/wp-login.php`, an intentional 404, `robots.txt`, sitemap index/children, one CSS file, and one image.
5. Repeat probes with anonymous, authenticated, preview, and fresh-cookie sessions to validate cache separation.

## Production-safe deployment boundary

### Hard constraints

- Do **not** use an unreviewed “push staging to production” or full staging database restore. Production currently has 294 users and 790 comments; staging has divergent settings/content and cannot be allowed to overwrite those tables or re-enable registration.
- Deploy files by an explicit allowlist: approved WordPress core update, approved plugin packages, approved theme package/replacement, and the verified remediation plugin package.
- Apply database changes through a reviewed manifest of exact option/content IDs and before-values. Export each affected record before mutation.
- Preserve production `users`, `usermeta`, `comments`, and `commentmeta` unless a separately approved security-cleanup run explicitly targets them. Public registration must remain false after every step.
- Determine the Hostinger PHP-setting blast radius before touching it. A setting that also changes unrelated sites is outside this release unless all affected sites have passed the same compatibility gate.
- Revoke temporary staging application passwords/tokens after staging operations. Do not copy them into production.

### Cutover sequence

1. Re-run the full staging gates against the exact packages and PHP/header configuration intended for production.
2. Freeze the release manifest and hashes. Record current production versions, user/comment counts, latest comment/user IDs, registration setting, and backup timestamp.
3. Create and verify a fresh matched production files/database backup. For a rollback-sensitive window, pause writes or put the site in controlled maintenance so restoring cannot discard new comments.
4. Deploy approved code/packages without replacing uploads or the database. Apply explicit database mutations separately.
5. Change production PHP to the proven branch only after approved code is in place and the blast radius is known.
6. Apply host/CDN header and PHP disclosure settings. Purge OPcache, LiteSpeed, Rank Math sitemap, and hCDN caches through supported controls.
7. Run the validation matrix below. Reconfirm registration is disabled and user/comment counts/watermarks did not move backward.
8. Monitor origin/CDN/PHP logs and HTTP status/error rates through the agreed observation window before ending maintenance and declaring GO.

### Rollback sequence

1. For a header/CSP fault, remove or revert only the offending host rule, purge CDN cache, and re-probe. Do not restore the database.
2. For a PHP compatibility fault, revert the PHP branch to the captured prior configuration as an emergency availability action, purge runtime caches, and keep the production release in NO-GO. PHP 8.1 may be used only long enough to restore service while the blocking dependency is fixed or replaced.
3. For a package/code fault without schema changes, restore the exact allowlisted files from the pre-change manifest and clear caches.
4. For a core/plugin update that changed database schema or data, restore the matched files **and** database backup as one set. WordPress warns that partial downgrades are unsafe. Account for any writes after the backup before restoration.
5. Re-run registration, users/comments watermarks, home/blog/REST/login, 404, headers, and the full regression crawl after rollback. A rollback is incomplete until these checks pass.

## Release validation matrix

Every item is required unless an owner signs an explicit, expiring risk exception.

| Gate | Pass condition |
|---|---|
| PHP support | Exact runtime is the latest Hostinger 8.4.x patch (or documented temporary 8.3.x fallback); no endpoint advertises 8.1 |
| WordPress core | Exact release equals the latest actively maintained WordPress series at cutover; core checksums pass |
| Plugins/themes | Full authenticated inventory captured; no update pending for active packages; official packages/checksums or vendor hashes recorded; no unaccepted high/critical advisory |
| Sirat Pro | Current vendor package/changelog and WP/PHP support proven, full-tree hash matched, or maintained replacement deployed and tested |
| Debug/secrets | Debug constants off; diagnostic log removed from public tree; no `phpinfo`, temporary diagnostic PHP, backup archive, `.env`, or config contents are publicly readable |
| Front-end runtime | `/`, `/blog/`, pagers, representative posts/pages, forms, and 404s return expected statuses with no PHP/browser/network errors |
| REST/admin runtime | REST index and required routes work; login/admin work; cron/loopback/site health pass; unauthorized requests remain unauthorized |
| HSTS | Exactly one HSTS value with at least `max-age=15552000` on the full HTTPS matrix; no `includeSubDomains` until inventory approval |
| MIME/referrer/permissions | `nosniff`, approved referrer policy, and approved permissions policy appear on the intended full response matrix |
| Framing | `frame-ancestors 'self'` in enforced CSP, with `SAMEORIGIN` retained during compatibility transition |
| CSP | Report-only observations reviewed; enforced policy has explicit directives and produces no unexplained violation or functional failure; `upgrade-insecure-requests` alone is not a pass |
| PHP disclosure | No `X-Powered-By` on home, REST, login, error, or admin redirect responses; `exposePhp` is off at host/PHP level |
| Cache isolation | Anonymous public HTML caches as intended; authenticated/private/preview/password/user-bound responses are `private, no-store`; no private body is served cross-session |
| SEO/security crawl | Remediation harness exits 0 with browser mode required; header check has zero misses; no 5xx; no required check skipped |
| Data preservation | Registration remains off; production user/comment counts and latest-ID watermarks are preserved; no staging credentials remain |
| Recovery | A matched files/database restore was tested before cutover; rollback owner and stop thresholds are named |

## Lifecycle policy after release

1. **Daily:** review Hostinger security/advisory and uptime/error alerts; automatically apply only the update classes approved by policy.
2. **Security/minor core:** enable managed automatic maintenance/security releases, with alerts and a recoverable backup.
3. **Major core:** test on isolated staging, run the full gate, then schedule a scoped production update. Do not let major auto-update bypass the premium-theme compatibility gate.
4. **Plugins:** enable auto-updates only for vetted WordPress.org plugins with a working backup/monitoring path. Treat premium/custom packages and high-impact plugins as staged updates.
5. **Theme:** maintain vendor entitlement and changelog; test every release. If Sirat Pro cannot meet that contract, migrate off it.
6. **Weekly:** export package inventory/update state and run checksum/advisory checks; remove abandoned or unused code.
7. **Monthly:** probe the full header/cache matrix and run the public regression suite.
8. **Quarterly:** perform a restore drill and review PHP/WordPress support dates. Begin branch migration before a runtime enters security-only endgame, not after EOL.
9. **On every incident/update:** preserve logs and hashes, document before/after versions, and keep staging proof separate from production proof.

## Authoritative references

- [PHP supported versions](https://www.php.net/supported-versions.php) and [unsupported branches](https://www.php.net/eol.php)
- [WordPress runtime requirements](https://wordpress.org/about/requirements/)
- [WordPress release archive](https://wordpress.org/download/releases/)
- [WordPress hardening handbook](https://developer.wordpress.org/advanced-administration/security/hardening/)
- [WordPress upgrade and automatic-update handbook](https://developer.wordpress.org/advanced-administration/upgrade/upgrading/)
- [WordPress backup handbook](https://developer.wordpress.org/advanced-administration/security/backup/)
- [Hostinger: change the PHP version](https://www.hostinger.com/support/1575755-how-to-change-the-php-version-of-your-hostinger-hosting-plan/)
- [Hostinger: manage PHP extensions and options](https://www.hostinger.com/support/4667515-how-to-manage-php-extensions-and-options-in-hostinger/)
- [Hostinger WordPress Overview](https://support.hostinger.com/en/articles/5609910-how-to-use-the-wordpress-overview-in-hpanel)
- [Contact Form 7](https://wordpress.org/plugins/contact-form-7/), [Rank Math SEO](https://wordpress.org/plugins/seo-by-rank-math/), [WP Consent API](https://wordpress.org/plugins/wp-consent-api/), [Ads.txt & App-ads.txt Manager](https://wordpress.org/plugins/app-ads-txt/), and [Site Kit by Google](https://wordpress.org/plugins/google-site-kit/) release pages

## Local evidence used

- `AIAMIGOS_HOSTILE_SEO_CONTENT_REVIEW_2026-08-13.md` — H1/M6 baseline and source limits
- `remediation/STAGING_CHANGELOG_2026-08-13.md` — authenticated change/non-change boundary
- `remediation/tests/results/seo-regression-staging-post-fix2.json` — staging canonical-HTML header pass and remaining crawl state
- `remediation/tests/seo-regression.mjs` — required header/cache/disclosure assertions
- `remediation/wp-plugin/aiamigos-remediation/includes/class-aiamigos-remediation-plugin.php` — application-level header scope and cache logic (inspection only)

## Closure decision

- **H1 closes only when:** production runs a supported PHP branch and current WordPress/packages; the active theme has verified provenance/compatibility or is replaced; unused code is removed; automatic/security lifecycle is documented; and runtime disclosure is absent across the full endpoint matrix.
- **M6 closes only when:** production passes the full response matrix from the host/CDN plane, cache separation is proven across sessions, and a tested enforced CSP replaces the current single-directive policy.

Until both conditions are met and production is independently re-probed, the truthful status is **staging progress, production NO-GO**.
