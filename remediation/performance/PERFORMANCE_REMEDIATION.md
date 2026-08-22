# H3 mobile-payload remediation and staging evidence

Date: 2026-08-13

Status: **deployed and hash-verified on isolated staging; not approved for production**

## Evidence boundary

This package separates three evidence planes:

1. The saved public snapshot supplies deterministic HTML, asset ownership, and page context.
2. Read-only `HEAD` requests made on 2026-08-13 supply current content lengths and cache headers for the exact image URLs in that snapshot.
3. Query-busted and ordinary-cache staging gates record markup before and after the exact theme changes.

The public snapshot is not an authoritative theme repository. The two licensed Sirat Pro template preimages were therefore captured from staging and hash-gated. The exact patches are now present on `https://remediation.aiamigos.org/`; none has been promoted to production.

Sirat Pro still reports version 1.4. The observed staging and production theme provenance is identical, and vendor update/maintenance status is unproven. A prior claim that the theme had been successfully updated was not supported by the file evidence and is withdrawn.

## Hostile baseline

| Surface | Image tags | Raw originals without `srcset` | Unique direct image-source bytes |
|---|---:|---:|---:|
| Public `/` snapshot | 11 | 9 | 9,546,800 bytes (9.10 MiB) |
| Public `/home/` snapshot | 27 | 19 | 32,066,483 bytes (30.58 MiB) |
| Current staging `/` before patch | 20 affected carousel images | 20 affected images missing dimensions, sizes, decoding and lazy loading | 24.56 MiB across direct `src` values |
| Current staging `/blog/` before patch | 10 affected archive images | 10 affected images missing dimensions, sizes and decoding | 7.34 MiB across direct `src` values |

The public browser observation in the hostile audit measured about 11.21 MB of images on `/` and 34.48 MB total on `/home/`. The table above is deliberately different evidence: it sums each unique direct HTML `src` once using response `Content-Length`; it is not claimed as a browser transfer trace.

All 23 probed unique image responses use `Cache-Control: public, max-age=604800`, and the origin identifies as LiteSpeed. Cache policy is therefore not the primary failure. The templates select multi-megabyte originals in the first place.

### Largest exact direct sources

| Image context | Exact bytes | MiB |
|---|---:|---:|
| Gemini enterprise article image | 5,888,851 | 5.62 |
| Training data article image | 2,280,620 | 2.17 |
| Explainability article image | 2,203,712 | 2.10 |
| Future of generative AI image | 2,170,362 | 2.07 |
| AI Leader with No Code image | 2,130,615 | 2.03 |
| Limitations of generative AI image | 2,130,315 | 2.03 |
| Creative industries image | 2,022,378 | 1.93 |
| Generative versus traditional AI image | 1,757,988 | 1.68 |

The root cause is two Sirat Pro renderers:

- `template-parts/home/section-our-blog.php` calls `wp_get_attachment_url(get_post_thumbnail_id())` inside `.latest-blog-image`.
- `template-parts/post/post-content.php` calls `the_post_thumbnail_url('full')` in all three archive layout branches inside `.post_pic_inner`.

The existing remediation plugin's `post_thumbnail_size` filter cannot affect either raw-URL renderer. A Graphify query correctly mapped that filter, script dequeue policy, social-image filter, and service-section policy inside the plugin; the proprietary theme templates are outside that graph corpus. This is why the fix is an exact theme compatibility patch rather than another broad plugin filter.

## Script and ownership split

The saved target pages reference about 163–165 KiB of compressed first-party JavaScript. The baseline ownership split is:

| Owner | Files | Uncompressed body | Observed compressed length |
|---|---:|---:|---:|
| WordPress core | 8 | 242.3 KiB | 77.4 KiB |
| Sirat Pro | 8 | 243.3 KiB | 55.1 KiB |
| Google Site Kit | 1 | 71.3 KiB | 24.4 KiB |
| Contact Form 7 | 2 | 24.4 KiB | 7.0 KiB |
| WP Consent API | 1 | 1.8 KiB | 0.6 KiB |

Script bytes are material but secondary to images. The deployed version 1.4.0 remediation runtime suppresses unreviewed measurement/chatbot assets and removes Contact Form 7 assets by default. A collection form can be re-enabled only through an explicit approval filter and the exact canonical Newsletter invariant. This fail-closed policy also removed the earlier Newsletter runtime dependency error and reduced the tested script surface; it is not proof that a production mailing workflow exists.

## Deterministic changes deployed to staging

WordPress core's `wp_get_attachment_image()` outputs intrinsic dimensions and can generate `srcset` and `sizes` from attachment metadata. It also participates in WordPress loading-optimization logic. See the official [`wp_get_attachment_image()` reference](https://developer.wordpress.org/reference/functions/wp_get_attachment_image/) and [responsive-images handbook](https://developer.wordpress.org/apis/responsive-images/).

The patches replace four raw-original renderers with that core API:

- Home blog carousel: one renderer, `medium_large`, explicit accurate `sizes`, `decoding="async"`, and explicit lazy loading because the section is below the primary content.
- Archive cards: three layout branches, `medium_large`, branch-specific `sizes`, and `decoding="async"`; loading and fetch priority remain under WordPress core so the first visible archive image is not incorrectly forced lazy.
- No image preload or `fetchpriority="high"` is added. LCP priority should be added only after a browser trace proves the actual LCP resource; preload is a mandatory fetch and is unsafe to guess.

Public media metadata confirms all 18 raw home-carousel attachments have the theme's generated thumbnail and 15 have `medium_large`; the three without `medium_large` are only 16.1–75.2 KiB and fall back safely. This package does not claim AVIF/WebP conversion: the large PNG derivative library still needs a controlled format-conversion batch after backup and visual-diff validation.

## Exact staging deployment manifest

| Target | Required preimage SHA-256 | Deployed SHA-256 | Replacements |
|---|---|---|---:|
| `wp-content/themes/sirat-pro/template-parts/home/section-our-blog.php` responsive-image stage | `2dea4f7a2800034b9addc82be14e7da18002d155cc6d829f0f1fc15b2a84e815` | `8cc6a5771f0b7ae557c263a3cf422976751eb655079f0b611a19d02828206258` | 1 |
| `wp-content/themes/sirat-pro/template-parts/home/section-our-blog.php` accessible-title stage and current remote file | `8cc6a5771f0b7ae557c263a3cf422976751eb655079f0b611a19d02828206258` | `174c72bf0ca894cdddd60132a59d66937a0b7b86dc47b05bd8bf38872a35fd32` | 1 |
| `wp-content/themes/sirat-pro/template-parts/post/post-content.php` | `8b024f9215d35798fa220b9c827e712bfd0fb777016e66a52f31726911c7822c` | `f24051f220b6191122db539201a3aad582e474b8e402d917f3b9ae392272c070` | 3 |

The accessible-title stage preserves the home responsive-image renderer and changes the card heading to one visible `h3.aiamigos-blog-card-title`. The canonical remote home hash is therefore `174c72bf...`, not the intermediate `8cc6a577...` hash.

The companion remediation plugin was deployed to staging as version 1.4.0 in dependency-safe order: accessibility PHP/CSS/JavaScript first, runtime second, and the requiring bootstrap last. Exact remote hashes are:

| Remote plugin file | SHA-256 |
|---|---|
| `aiamigos-remediation.php` | `b9dd04514141c9654a7f6fcef6c697e8267dfd9218d285f52f23ca88ae58644b` |
| `includes/class-aiamigos-remediation-plugin.php` | `98afb3ce2b85f3d6517adabbc4959ce8f22f1aadb4edd2ae8bc814b5b30be208` |
| `includes/class-aiamigos-accessibility-remediation.php` | `d28292ad665cae246681b9bb0f363a1c5c544313fe6d47104630e9372ba8ce31` |
| `assets/css/aiamigos-accessibility-remediation.css` | `b2e3bb2005a14198d1616ad598a01ffcfefe9dd881d0a5342856dda389f8bd02` |
| `assets/js/aiamigos-accessibility-remediation.js` (`a11y2`) | `2d2c4c4742ac9cd85049e55eccc932b4ae6aa8d86ad65ae7fb17e4e8bfeffb76` |

WordPress activation completed without a fatal error, and public staging pages rendered. A later isolated gate verified the official PHP 8.4.24 NTS archive hash, linted all 16 plugin/release/theme PHP artifacts without error, and passed the 28-assertion policy suite. Remote Hostinger web-SAPI compatibility remains distinct from that local parser proof.

Prepared source files retained for reproducibility:

- `remediation/theme-patch/prepared/wp-content/themes/sirat-pro/template-parts/home/section-our-blog.php`
- `remediation/theme-patch/prepared/wp-content/themes/sirat-pro/template-parts/post/post-content.php`
- `remediation/theme-patch/prepared-accessibility/wp-content/themes/sirat-pro/template-parts/home/section-our-blog.php` (normalized local source; the manifest records the canonical CRLF remote hash)

Patch artifacts:

- `remediation/theme-patch/sirat-pro-home-blog-responsive-image.patch`
- `remediation/theme-patch/sirat-pro-archive-responsive-image.patch`
- `remediation/theme-patch/sirat-pro-home-blog-accessible-title.patch`
- `remediation/theme-patch/theme-accessibility-manifest.json`

The staging integration followed this fail-closed sequence:

1. Re-read both remote files and require the preimage hashes above.
2. Back up those exact remote bytes.
3. Replace only the two staging files with the prepared responsive-image files; then apply the one-file accessible-title stage to the home renderer.
4. Re-read each remote stage and require the exact deployed hashes in the manifest table above, including the canonical CRLF home hash.
5. Purge only the staging HTML/theme cache keys.
6. Run the markup and mobile-browser gates below.
7. Retain the captured preimages for rollback on any fatal response, visual regression, missing carousel/archive, budget failure, or future hash mismatch.

This is a parent-theme patch and a future theme update can overwrite it. Reapply only after reviewing the new vendor source; never force it past a preimage-hash mismatch.

## Verification

Static package gate:

```powershell
node remediation\performance\performance-static-check.mjs
```

Current local result: **40/40 checks pass**. Node syntax checks also pass. Official PHP 8.4.24 CLI validation now records **16/16** linted artifacts and **28/28** policy assertions passing; the exact evidence and boundary are in `remediation/runtime-evidence/PHP_8_4_24_VALIDATION_2026-08-13.md`.

Fresh markup gate after upload and cache purge:

```powershell
node remediation\performance\performance-markup-gate.mjs --base-url https://remediation.aiamigos.org/ --output remediation\tests\results\performance-markup-staging-postpatch.json
```

The prepatch run is intentionally red and proves the gate detects the defect: 174 failures across 20 home-carousel and 10 archive images. Failure categories include 30 missing dimensions, 30 missing `sizes`, 30 missing async decoding, 26 large originals without `srcset`, and 26 large originals remaining in direct `src`.

Both postpatch markup gates pass with zero failures:

- query-busted staging HTML: 20 responsive/lazy home cards and 10 responsive archive cards, with intrinsic dimensions, `sizes`, decoding behavior, and `srcset` where required;
- ordinary staging cache key: the same zero-failure result, proving the bare cache does not retain the old raw-original markup;
- WordPress keeps the first three archive candidates eager and the remaining archive images lazy; all home-carousel images are lazy.

Full cache-disabled 390×844 browser budget gate:

```powershell
node remediation\tests\seo-regression.mjs --mode live --base-url https://remediation.aiamigos.org/ --config remediation\tests\regression.config.example.json --browser required --output remediation\tests\results\seo-regression-staging-performance.json
```

Required results for `/`, `/home/` redirect, and `/blog/`:

- no runtime exception or console error;
- no horizontal overflow;
- total transfer at or below 3,000,000 bytes;
- image transfer at or below 1,500,000 bytes;
- no more than 80 resources, 20 scripts, or 1,500 DOM nodes;
- the direct `src` of each affected large image is a generated derivative;
- every affected image has intrinsic dimensions and `sizes`;
- every affected image larger than 100 KiB has `srcset`;
- home carousel images are lazy; archive loading/fetch priority is governed by WordPress, with no more than three eager images.

The cache-bypassed HTTP regression crawl recorded **14 pass, 0 fail, 2 skip** across 16 checks. The skipped checks were rendered runtime and rendered performance; 75 sitemap URLs and 99 unique internal targets were clean in the HTTP evidence plane.

The first browser-required run recorded **15 pass, 1 fail, 0 skip**. Its only failure was the runtime check after transient external-resource `net::ERR_QUIC_PROTOCOL_ERROR` responses; the configured performance budget passed. A clean rerun recorded **16 pass, 0 fail, 0 skip**, including runtime and performance, with the same 75 sitemap URLs.

After the final `a11y2` JavaScript revision was deployed, direct rendered-browser checks recorded:

- 20/20 carousel dots with deterministic accessible names;
- adopted controls at least 44 by 44 CSS pixels;
- keyboard activation for menu and search, `Escape` close behavior, focus transfer on open, and focus return on close;
- no carousel autoplay movement during a greater-than-six-second observation.

The complete cache-bypassed, browser-required post-`a11y2` crawl recorded **16 pass, 0 fail, 0 skip** in 153,085 ms. It checked 75 clean sitemap URLs and 99 unique internal targets. Across the four rendered pages it captured zero exceptions, console/log errors, network failures, WAF blocks, or horizontal overflow. All configured HTML, transfer, image, script, resource, DOM-node, and overflow budgets passed. The exact evidence is `remediation/tests/results/seo-regression-staging-v1.4.0-a11y2-browser.json`.

## Remaining H3 closure gates

The raw-original template-renderer defect is closed on staging by exact hash and zero-failure markup gates. The full H3 finding and any production release remain open until all of these are also true:

- controlled AVIF/WebP derivatives exist for the high-byte PNG library, with originals retained for rollback;
- desktop and mobile visual diffs show no material crop, blur, aspect-ratio, or carousel regression;
- mobile Lighthouse is recorded on staging after cache warm-up and with a cold cache;
- the actual LCP element is identified before any preload/fetch-priority change;
- field Search Console/CrUX data is observed after production release; lab load-event timing is not presented as field Core Web Vitals.

Production is **NO-GO**. Production remains untouched except for disabled public registration. PHP remains 8.1.34 even though local PHP 8.4.24 syntax/policy validation passes, and Sirat Pro vendor update/maintenance status is unproven. Editorial truth review, credential verification, child-safety review, affiliate/legal approval, privacy/retention approval, and manual media/alt-text decisions remain human-owned release gates.
