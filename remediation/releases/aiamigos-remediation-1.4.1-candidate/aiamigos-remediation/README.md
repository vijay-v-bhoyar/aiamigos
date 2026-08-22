# AI Amigos Remediation WordPress plugin

Local candidate: **1.4.1 (not deployed)**. The retained staging crawl and staging changelog prove the earlier 1.4.0 bytes only. Version 1.4.1 removes an unattested sitewide editorial-responsibility statement; it must pass the full release gates and a new staging crawl before promotion.

This is a reversible, front-end-only remediation layer for the deployed AIAmigos WordPress site. It does **not** rewrite posts, fabricate author identities, delete factual content, edit theme files, buffer whole HTML documents, create database tables, or call external services.

## Install and activate

1. Copy the complete `aiamigos-remediation` directory to `wp-content/plugins/`.
2. Before activation, configure WordPress with the intended static front page at `/` and the native posts page at `/blog/`. The plugin deliberately does not rewrite those database options.
3. Back up the site and activate **AI Amigos Remediation** in a staging environment first.
4. Purge LiteSpeed/page/CDN caches.
5. Verify the acceptance checklist below before production activation.

Production `aiamigos.org` links are normalized to `https://www.aiamigos.org/`. On any non-production hostname, the plugin keeps that host and forces HTTPS. `aiamigos_remediation_canonical_base_url` can explicitly override this behavior.

## What it changes at runtime

- Permanent, GET/HEAD-only front-end redirects:
  - `/home/` → `/`
  - `/page/N/` for `N >= 2` → `/blog/page/N/`
- Rank Math/Yoast canonical and differentiated-title filters for the already configured native `/blog/` posts page and its pagination. The plugin does not create or replace the native route.
- Exact `410 Gone` for the eight known theme-demo records:
  - two `classes/recent-case-title-*` records;
  - three `testimonials/client-name-*` records;
  - `team/member-name-02` through `member-name-04`.
- Exact `410 Gone` for the four retired custom-service records identified by the content plan: CP-011 IDs `26` (`ai-amigos-academy`), `28` (`ai-amigos-pro`), and `30` (`ai-by-job-role`), plus CP-014 ID `32` (`ai-for-kids`). Only their exact `/services/{slug}/` paths are affected.
- Exact reversible `410 Gone` tombstones for fourteen additional drafted records whose public claims cannot currently be supported: certifications, GPT/Grok/benchmark claims, two empty hubs, four unfulfilled technical-artifact promises, unverified Services/Courses hubs, and the child/affiliate review pages. Their exact IDs are `945, 441, 783, 1405, 552, 6, 1411, 1407, 1421, 926, 21, 22, 877, 149`.
- Retires both `/newsletter/` and `/newsletter-2/` with exact reversible `410 Gone` responses because no provider-backed subscribe, confirmation, delivery, unsubscribe, consent, or cadence workflow exists. Page IDs `157` and `1417` remain recoverable in admin. Editorial update requests remain available through `/contact/`; neither route is described as a subscription.
- Quarantines all 28 exact retired/demo record IDs from every non-admin front-end query, Rank Math XML sitemap entry, WordPress core post sitemap query, and Yoast sitemap exclusion list. Existing exclusions and explicit `post__in` allowlists are handled fail-closed. The genuine Vijay team record ID `38` is explicitly not quarantined, and all underlying records remain recoverable in the admin.
- Excludes the `category` taxonomy from Rank Math and WordPress core XML sitemap indexes through their public taxonomy hooks. Other taxonomies are preserved. Activation invalidates Rank Math sitemap storage when that API is available and flushes WordPress rewrite rules once.
- Excludes factual-risk IDs `945, 441, 783, 1405`, privacy-page ID `292`, unsupported Mission ID `24`, child-directed Academy ID `158`, and thin AI Career ID `941` from XML sitemaps whenever they carry the temporary noindex policy, preventing an index/noindex contradiction.
- `noindex,follow` for four filterable high-risk factual routes (`ai-certifications`, `gpt-models`, `grokai`, and the model-benchmark article), the pending-review privacy route, unapproved `/page/`, `/academy/`, and `/ai-career/` hubs, and archive/search surfaces. The three unapproved hubs are also unlinked in controlled menu/content output while visible text remains. Content remains recoverable. The canonical `/blog/` archive is excluded.
- Same-site nav-menu href normalization from HTTP, apex-host, and `/index.php/` URLs to the final HTTPS origin/path. External URLs are unchanged.
- Repairs the exact internal-link defects captured by the audit in menu, widget, theme-mod, and main editor-content output: `/index.php/blog/`, `/AI-app-development`, the former AI-evolution slug, the malformed academy YouTube path, and `/ai-career-path/` are rewritten to known destinations. The unavailable GrokAI, demystifying-AI, and AI-certifications targets are unlinked while their visible text is preserved. The `/index.php/blog/` defect generated two audit rows, so this covers nine observed rows across eight unique targets.
- Upgrades the exact known `http://` YouTube and Baidu URLs to HTTPS only in those safe output paths. It does not rewrite arbitrary external links.
- Corrects the exact public UI strings `Service Url` to `Service page` and `Linkden` to `LinkedIn` through the front-end `gettext` filter without mutating saved content.
- Repairs editor-authored headings only in the front-end main singular-content loop: blank headings are removed, image-only headings become neutral containers, embedded H1s become H2s, skipped levels are normalized, and headings longer than 60 words become paragraphs. Theme chrome, feeds, REST output, secondary loops, and stored post content are untouched.
- Supplies concise, factual title overrides of 60 characters or fewer for all 38 long-title slugs in the captured 114-URL production inventory and the six short hub titles found after quarantine. Quarantined mappings remain so a restored record cannot silently recover a known-bad title. Rank Math, Yoast, and the WordPress document title receive the same exact overrides. Meta descriptions longer than 160 characters are reduced to meaningful 120-160-character excerpts from existing content; Newsletter, About, Contact, Privacy and the real team page receive bounded exact descriptions, with duplicate-safe fallbacks where the SEO plugin omits empty-tag filters.
- Removes links to the four newly drafted page targets, disables the parent theme's unverified service-promotion section, and upgrades the five remaining observed product-name links to individually verified HTTPS destinations.
- Uses the current custom logo as a Rank Math Facebook/Twitter fallback only when no social image is already set, forcing the emitted URL to HTTPS.
- Filters Rank Math JSON-LD fail-closed on every public page: only structural WebSite, WebPage, BreadcrumbList, ListItem, and ImageObject nodes remain until accountable evidence approves authors, publishers, organizations, articles, products, or other real-world entity claims. Identity-bearing relationship properties, untyped inline identities, and references to omitted entity IDs are removed. HTTP URLs on the exact AI Amigos host aliases are upgraded to HTTPS; unrelated external hosts are unchanged.
- Replaces the prior About-page statement assigning sitewide review responsibility to a named person with an explicit non-claim while the 71-post authorship and reviewer ledger awaits accountable approval.
- Removes `async`/`defer` **only** from script tags whose exact handles are `wp-hooks` or `wp-i18n`; other scripts retain their loading strategy.
- Adds conservative public-response headers: six-month HSTS on HTTPS (no preload or subdomain assertion), `nosniff`, `SAMEORIGIN` frame protection, strict-origin referrer policy, a deny-by-default policy for camera, microphone, geolocation, payment, and USB, and a five-minute anonymous HTML cache policy. It also asks PHP to remove the `X-Powered-By` disclosure.
- Removes WordPress generator output.
- Replaces any residual MailPoet form IDs 2/3 in surviving output with an honest `mailto:contact@aiamigos.org` update-request link. Contact Form 7 scripts/styles are dequeued sitewide, and the retired Newsletter routes cannot release a collection form.
- Hard-closes public registration by forcing WordPress `users_can_register` to false on both direct option reads and cached option reads. The value can only be re-enabled through the explicit `aiamigos_remediation_users_can_register` filter.
- Suppresses the exact current Google Site Kit AdSense, Analytics, and Analytics 4 public `register_tag` callbacks plus known measurement script handles while privacy, cookie, and legal review remains open. This is front-end runtime suppression only: it neither changes Site Kit settings nor deletes data. The `aiamigos_remediation_disable_measurement_scripts` filter can release the suppression after approval. Because Site Kit can change internal callback classes in future versions, the post-upgrade crawl must confirm that no executable analytics/ad tag escaped; non-executable platform metadata may remain.
- Suppresses the exact `hostinger_chatbot` front-end script and paired styles while the chatbot has no approved product owner, data-flow notice, safety boundary or operating policy. The Hostinger AI Assistant plugin remains installed for recovery; `aiamigos_remediation_disable_unreviewed_chatbot` can release only this public suppression after approval.
- Replaces only the rendered About and Contact page bodies with bounded, observable copy. About makes no unsupported customer, course, community, outcome or reputation claim. Contact becomes an email-only path, removes the former phone/file-upload form from public output, warns against sensitive submissions and states that retention/response timing are not yet published. Stored revisions are untouched.
- Corrects the VW Sirat Pro theme-mod compatibility defect without changing saved Customizer data:
  - suppresses an email-like `vw_sirat_pro_header_section_call2` value so it is not emitted as `tel:`;
  - uses that valid email in `vw_sirat_pro_header_section_email` only when the dedicated email field is empty;
  - preserves genuine phone values.
- Filters the footer to a dynamic `© YEAR AI Amigos.` notice, hides the VW Themes credit link, and disables the legacy footer-widget area while it advertises unsupported phone, location, 24/7 availability and update-processing claims. Saved theme mods and widget records are not changed.
- Injects a cautious, escaped front-page introduction through `vw_sirat_pro_after_section_slider`:
  - H1: `AI Amigos: practical artificial intelligence guides`
  - explanatory text reminding readers to check dates and sources.
- Injects one escaped `AI Amigos Blog` H1 at `loop_start` for the main `is_home()` posts loop, including paginated `/blog/` pages.
- Prepends a visible, escaped publication date to standard single posts and an updated date only when it differs by at least 24 hours. It deliberately emits no author or reviewer identity until the 71-post responsibility ledger is approved. Rank Math's paired slot-one Twitter author label/value are suppressed on standard single posts; page reading-time and archive-count uses remain available.
- Normalizes Sirat widget title wrappers from H3 to H2 on the public front end, while the update-request section uses its own accessible label.
- Requests the registered `large` featured-image size on archive/listing loops. WordPress core retains control of `loading`, `decoding`, and `fetchpriority`, avoiding an LCP regression. The plugin does not create missing image derivatives; regenerate thumbnails separately if required.
- Enqueues the exact Sirat accessibility module on public HTML only. It adds deterministic names and keyboard/focus behavior to the captured menu, search, social and Owl controls; stops carousel autoplay on focus or reduced-motion preference; keeps focused slides exposed; removes only source-less empty carousel placeholders; applies 44px adopted touch targets and high-contrast focus rings; and uses the repaired `h3.aiamigos-blog-card-title` as the card/dot naming source. It does not infer alt text or mutate content, options or media metadata.

Admin, AJAX, REST, XML-RPC, cron, and WP-CLI requests are excluded from redirects and presentation filters.

## Acceptance checklist

After activation and cache purge, verify:

1. `/` is the intended home content and contains exactly one visible cautious H1.
2. `/home/` returns one permanent redirect to `/`.
3. `/blog/` and `/blog/page/2/` return unique `200` archives, self-canonicalize, expose one `AI Amigos Blog` H1, and together paginate the post inventory.
4. `/page/2/` returns one permanent redirect to `/blog/page/2/`.
5. `/newsletter/` and `/newsletter-2/` each return direct `410`; neither appears in sitemaps, feeds, queries, navigation, or body links, and no public page carries CF7 scripts/styles.
6. All 28 exact retired/demo routes return direct `410` and their record IDs are absent from public listings, search, feeds, sitemaps, and links. Team ID `38` and `/team/member-name-01/` remain available.
7. Category URLs are absent from both Rank Math and WordPress core sitemap indexes while other required taxonomies remain unchanged.
8. High-risk and unapproved pages remain readable but emit `noindex,follow`; `/page/`, `/academy/`, and `/ai-career/` are absent from XML sitemaps and controlled links, while `/blog/` remains indexable.
9. The eight exact defective link targets no longer occur; rewritten links reach their intended HTTPS destinations, and unlinked references retain visible text.
10. Main editor content has no blank headings, embedded H1s, skipped levels, or headings over 60 words. Theme and secondary-loop headings are unchanged.
11. All 44 mapped long-title/short-hub slugs emit the exact concise titles if publicly reachable; all normalized or exact descriptions are meaningful and bounded; an existing page-specific social image wins over the HTTPS custom-logo fallback.
12. Home and blog each emit no more than 20 script tags after caches are purged. Network and source inspection show no Google Analytics, Google Tag Manager, or AdSense executable requests/tags. Treat this as an activation gate, not a static-code guarantee.
13. Browser console no longer reports `wp is not defined` and only `wp-hooks`/`wp-i18n` lost loading-strategy attributes.
14. The top bar renders the email as an email link, not `tel:contact@aiamigos.org`; genuine phone data remains.
15. Footer year is current and the misleading theme-credit link is absent.
16. Single posts expose a publication date and an updated date only where warranted, without an unattested author or reviewer identity.
17. Archive image requests resolve to generated `large`/responsive files; the first visible image retains WordPress core's LCP loading/fetch-priority decision.
18. Homepage JSON-LD contains no Article, Person, Organization, or EducationalOrganization assertion, and no JSON-LD string contains an `http://` AI Amigos URL.

Run the separate read-only regression harness in `remediation/tests/` for crawl-wide evidence.

## Rollback and uninstall

Deactivate the plugin and purge caches. Deactivation immediately removes all filters/actions: redirects, 410s, query/sitemap quarantine, noindex, headers, menu normalization, shortcode replacement, H1s, image policy, phone/email compatibility, and footer changes disappear. The original routes, saved posts, and theme mods were never modified.

Deletion is safe: `uninstall.php` is intentionally a no-op because the plugin stores no options, posts, metadata, users, tables, or secrets.

## Filters

Route/policy controls are deliberately filterable:

- `aiamigos_remediation_canonical_base_url`
- `aiamigos_remediation_blog_base_path`
- `aiamigos_remediation_redirect_paths`
- `aiamigos_remediation_redirect_status`
- `aiamigos_remediation_preserve_redirect_query`
- `aiamigos_remediation_gone_paths`
- `aiamigos_remediation_quarantined_post_ids`
- `aiamigos_remediation_high_risk_post_ids`
- `aiamigos_remediation_high_risk_noindex_paths`
- `aiamigos_remediation_noindex_archive_surfaces`
- `aiamigos_remediation_should_noindex`
- `aiamigos_remediation_security_headers`
- `aiamigos_remediation_blocking_wp_dependency_handles`
- `aiamigos_remediation_disable_measurement_scripts`
- `aiamigos_remediation_disable_unreviewed_chatbot`
- `aiamigos_remediation_users_can_register`
- `aiamigos_remediation_mailpoet_form_ids`
- `aiamigos_remediation_contact_email`
- `aiamigos_remediation_footer_copy`
- `aiamigos_remediation_listing_thumbnail_size`

The blog-base filter changes policy recognition only; native WordPress routing must already serve the selected posts-page path.

## Tests

The pure policy suite has no WordPress dependency:

```sh
php tests/test-policy.php
```

The zero-dependency static package checks run anywhere Node is available:

```sh
node tests/static-check.mjs
```

Lint every PHP file before packaging:

```sh
find . -name '*.php' -exec php -l {} \;
```

On 2026-08-13, after the final v1.4.1 schema/author edits, a hash-verified official PHP 8.4.24 NTS CLI passed `php -l` for all seven current plugin PHP source/test files. `tests/test-policy.php` passed 29/29 assertions and `tests/test-schema-author.php` passed 36/36 adversarial assertions. Re-run all three gates on packaged bytes and again in staging/CI; local CLI proof does not establish Hostinger web-SAPI compatibility.
