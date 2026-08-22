# AI Amigos dormant origin server policy

**Status:** DORMANT / NOT DEPLOYED  
**Scope:** staging candidate for H1 and M6 only  
**Target:** the document-root `.htaccess` for `https://remediation.aiamigos.org/` on Hostinger/LiteSpeed  
**Production authority:** none

`aiamigos-origin-policy.htaccess` is an exact insertion block, not a complete replacement `.htaccess`. Nothing in this directory changes the running site. The package deliberately does not modify WordPress rewrites, PHP, hPanel, hCDN, the remediation plugin, production, staging, users, comments, or the database.

## Why this package exists

The public snapshot is the observed baseline, not the private server configuration. Its 114 HTML entries all recorded `server: LiteSpeed`, `x-powered-by: PHP/8.1.34`, only `content-security-policy: upgrade-insecure-requests`, and no HSTS, `nosniff`, frame, referrer, permissions or cache policy (`public-site-snapshot/snapshot-manifest.json`). The exact final staging crawl passed the application-level header check for 75 canonical HTML URLs, but that check did not cover REST, login, errors or static assets (`remediation/tests/results/seo-regression-staging-v1.4.0-a11y2-browser.json`). The current plugin confirms that boundary: its header filter exits for non-front-end requests and its public cache decision is application-level (`remediation/wp-plugin/aiamigos-remediation/includes/class-aiamigos-remediation-plugin.php`, `filter_response_headers`).

The candidate therefore moves response hardening to the origin plane and makes shared caching fail closed. It covers normal HTML, REST, login/admin, WordPress mutation endpoints, error responses, discovery XML/`robots.txt`, CSS/JavaScript and images/fonts. It does not claim to upgrade PHP or prove that hCDN will preserve origin headers.

## Policy decisions

| Class | Browser response policy | LiteSpeed origin store | Reason |
|---|---|---|---|
| Unknown/dynamic HTML | `private, no-store, max-age=0, must-revalidate` | disabled | Fail closed when a route has not been classified. |
| Six exact public HTML routes selected for staging exercise | `public, max-age=300, stale-while-revalidate=30`; `Vary: Cookie, Authorization` | disabled | Bounded allowlist; every cookie, query, authorization header, non-GET/HEAD request, `Set-Cookie` response or error overrides it to private/no-store. The retired `/newsletter/` and `/newsletter-2/` routes are excluded. The `Vary` keys tell compliant intermediary caches not to reuse an anonymous representation across those state-bearing request headers. |
| REST, login/admin, XML-RPC, cron, comments, signup/activation | private/no-store | disabled | May carry credentials, nonces, user state or mutations. REST is intentionally not classified route-by-route yet. |
| `robots.txt` and exact sitemap-name XML | public for 300 seconds | disabled | Public discovery documents with short freshness. Generic XML is not public by default. |
| CSS/JavaScript/source maps | public for one day | disabled | Public static code, without `immutable` because URLs may be reused. |
| Images/fonts by extension | public for seven days | disabled | Public static media, still bounded and reversible. |
| 4xx/5xx or any response with `Set-Cookie` | private/no-store | disabled | Prevent accidental caching of error detail or state-setting responses. |

The block first removes the application/CDN-visible copies of each owned header from both Apache response-header tables and then uses `Header always set`, which also reaches error responses. HSTS is emitted only when Apache sees HTTPS or Hostinger supplies `X-Forwarded-Proto: https`. It intentionally omits `includeSubDomains` and `preload`. The current PHP version is still EOL even if `X-Powered-By` is suppressed.

The CSP is report-only. It is deliberately permissive (`https:`, inline scripts/styles and `unsafe-eval`) so the first staging observation does not break the current Sirat/Site Kit/WordPress stack. It still fixes the policy skeleton—`default-src`, `base-uri`, `object-src`, `frame-ancestors`, `form-action` and explicit resource classes. There is no invented report endpoint: collect violations from browser developer tooling or an independently approved same-origin endpoint. Do not enforce CSP until the full anonymous/admin/editor/form/embed matrix is clean and the policy is narrowed to observed origins.

## Exact preimage and placement gate

Do not apply this package unless every item below is true:

1. Hostinger File Manager identifies the authoritative staging document root for `remediation.aiamigos.org`; do not assume a production `public_html` path is staging.
2. Download the current staging `.htaccess` as raw bytes. Record its SHA-256, byte length and UTC capture time. Keep that untouched file outside the web root as the rollback preimage.
3. Require a non-empty file of at most 1,048,576 bytes, exactly one `# BEGIN WordPress` line and exactly one later `# END WordPress` line. Abort on a missing, duplicate, reversed or nested WordPress marker.
4. Require zero existing `# BEGIN AIAMIGOS ORIGIN POLICY v1` or `# END AIAMIGOS ORIGIN POLICY v1` lines. Abort instead of stacking a second block.
5. Inventory provider/plugin-managed blocks. The insertion point must be after the last complete provider/cache block, including any `# END LSCACHE`, `# END NON_LSCACHE` or Hostinger-managed end marker, and **immediately before the first `# BEGIN WordPress`**. If that single placement cannot be identified byte-for-byte, abort.
6. Verify the candidate against `policy-manifest.json` and run `node remediation/tests/server-policy-static-check.mjs`. Do not copy from rendered Markdown.
7. Create the candidate file by inserting exactly one LF-delimited policy block at that point. Preserve every preimage byte outside the inserted block; do not normalize the existing file's line endings, encoding or trailing newline.
8. Compare the candidate outside the inserted marker range with the preimage. They must be byte-identical. Record candidate SHA-256 and byte length before upload.

The custom block contains no `RewriteRule`, `RewriteCond`, redirect, substitution, `# BEGIN WordPress` or `# END WordPress`. Its only LiteSpeed directive disables the public origin store. Placement outside the WordPress-managed region prevents permalink refreshes from rewriting this policy.

## Staging-only apply and smoke gate

Applying this is a separate, authorized change; this dormant package does not grant that authority.

1. Confirm a restorable staging files/database backup and a tested way to restore the `.htaccess` preimage.
2. Upload the candidate atomically to the authoritative staging document root. Do not edit production.
3. Flush only the staging Hostinger/LiteSpeed/hCDN caches.
4. Probe both `GET` and `HEAD` over HTTPS for `/`, `/blog/`, one post not in the HTML public allowlist, `/wp-json/`, `/wp-login.php`, an intentional 404, `/robots.txt`, `/sitemap_index.xml`, one sitemap child, one CSS file and one image.
5. Require exactly one value for HSTS, `nosniff`, frame, referrer, permissions and CSP-Report-Only. Require no enforcing `Content-Security-Policy`, no `X-Powered-By`, and no `Server`/platform claim of removal.
6. Require public caching only for the named HTML routes and safe static/discovery classes. Repeat with a cookie, query string, `Authorization` header, POST, a `Set-Cookie` path and error; each must be private/no-store and must not show a public LiteSpeed cache hit.
7. Exercise anonymous home/blog/post, admin login, authenticated admin/editor, REST, preview, search, feeds, comments-disabled behavior and every approved embed. Capture CSP violations without enforcing them.
8. Re-run the exact SEO crawl and required mobile browser gate. A header-only pass does not prove runtime compatibility or cache separation.

## Exact rollback

Preferred rollback is a byte-for-byte atomic restore of the recorded `.htaccess` preimage, followed by a staging-only cache purge and the same GET/HEAD smoke matrix. Verify the restored file's SHA-256 exactly matches the recorded preimage.

If and only if no other bytes changed after deployment, the bounded alternative is to delete from the line `# BEGIN AIAMIGOS ORIGIN POLICY v1` through `# END AIAMIGOS ORIGIN POLICY v1`, inclusive, plus only the one insertion newline. Before saving, prove the remaining bytes exactly match the recorded preimage hash. If they do not, stop and restore the saved preimage; do not hand-merge an unknown `.htaccess`.

## Local verification evidence

`node remediation/tests/server-policy-static-check.mjs` passes 101 positive assertions and 6/6 negative mutation tests. The checked policy is 4,848 bytes of the 8,192-byte maximum and has SHA-256 `f211e0af8ce7090222647965fa079a9af85ca4afbaba7336aceaa0b2e5245421`. `node --check` also passes for the verifier. The mutation suite proves failure on a missing HSTS requirement, `CacheEnable public /`, an unguarded public response-cache setter, an enforcing CSP setter, a missing cookie boundary and ambiguous WordPress-marker placement.

This workspace has no Apache/LiteSpeed binary, so no real `apachectl -t`/LiteSpeed parser proof exists. Gitleaks, TruffleHog and Semgrep are also unavailable; a bounded high-signal secret-pattern fallback found no match, and the dependency-free verifier received a manual auth/config/input/filesystem/web checklist review. These are explicit coverage degradations, not server compatibility evidence.

## What remains open

- H1 remains open until staging is isolated, migrated from PHP 8.1.34 to a currently supported Hostinger PHP branch, `expose_php` is disabled at the PHP/host layer, Sirat Pro provenance/compatibility is proven or the theme is replaced, inventories/checksums are clean, and the full functional/log gate passes.
- M6 remains partial until this origin candidate is deployed to staging, CDN/header ordering is observed, cache separation is tested with real sessions, CSP violations are collected and narrowed, then the exact production configuration is separately approved and verified.
- `.htaccess` cannot remove headers added after origin processing by hCDN, prove restore capability, guarantee modules/overrides are enabled, or establish PHP runtime currency. Hostinger plan type and `.htaccess` support must be confirmed first.

## Primary references

- [Apache `mod_headers`](https://httpd.apache.org/docs/2.4/mod/mod_headers.html) documents late response-header replacement/removal, `always`, conditions and the separate header tables.
- [Apache `mod_setenvif`](https://httpd.apache.org/docs/2.4/mod/mod_setenvif.html) documents request classification and `SetEnvIfExpr` in `.htaccess` context.
- [Apache caching guide](https://httpd.apache.org/docs/2.4/caching.html) warns that shared caches change the authorization model and that private/no-store responses must not be stored.
- [LiteSpeed Cache configuration](https://docs.litespeedtech.com/lscache/noplugin/settings/) recommends disabling public caching by default and selectively enabling only proven URLs; this package deliberately stops before enabling origin storage.
- [WordPress server configuration handbook](https://developer.wordpress.org/advanced-administration/server/) recommends a recorded original configuration, backup and staging test before server changes.
- [W3C CSP Level 3](https://www.w3.org/TR/CSP/) defines `Content-Security-Policy-Report-Only` as monitoring rather than enforcement and supports iterative policy development.
- [Hostinger `.htaccess` guidance](https://www.hostinger.com/support/1583307-how-to-create-an-htaccess-file-at-hostinger/) confirms file-based hosting supports document-root `.htaccess`; Hostinger Horizons/Website Builder do not.
