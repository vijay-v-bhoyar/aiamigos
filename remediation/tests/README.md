# AIAmigos SEO remediation regression harness

This read-only, zero-dependency Node harness turns the 2026 hostile audit findings into repeatable assertions. It can crawl the live site or replay the saved public snapshot without network access. It never changes the target website.

## Requirements

- Node.js 20 or newer (Node 22+ recommended).
- Live mode requires outbound HTTPS access.
- The optional browser probe uses an installed Chrome or Microsoft Edge executable through the Chrome DevTools Protocol. It does not require Playwright.

## Quick start

Offline/dry run against the saved snapshot:

```powershell
node .\remediation\tests\seo-regression.mjs --dry-run --browser off
```

Run the zero-dependency harness invariant tests:

```powershell
node --test .\remediation\tests\self-test.mjs
node --test .\remediation\tests\accessibility-self-test.mjs
```

Live regression crawl:

```powershell
node .\remediation\tests\seo-regression.mjs --base-url https://www.aiamigos.org/ --mode live --browser auto
```

Force every live HTTP request through a unique query-key cache bypass (the report records both the logical and network request URL):

```powershell
node .\remediation\tests\seo-regression.mjs --base-url https://www.aiamigos.org/ --mode live --cache-bypass query --browser required
```

`--cache-bypass headers` sends `Cache-Control: no-cache` and `Pragma: no-cache` without changing the URL. `--cache-bypass query` sends those headers and adds the reserved `_aiamigos_cache_bust` query parameter; comparisons and canonical assertions use the logical URL with only that reserved parameter removed. Feed quarantine always probes both a bare URL and a cache-busted URL, independent of the crawl-wide mode.

CI-style invocation with an explicit output path:

```powershell
node .\remediation\tests\seo-regression.mjs `
  --base-url https://staging.example.org/ `
  --config .\remediation\tests\regression.config.example.json `
  --output .\remediation\tests\results\staging.json `
  --browser required
```

Exit codes:

- `0`: all observed remediation assertions passed, or `--allow-failures` was supplied.
- `1`: at least one remediation assertion failed.
- `2`: the harness itself could not run (invalid CLI/config, malformed snapshot, etc.).

`skip` means the selected evidence source could not observe that assertion. A skipped browser or redirect check is never reported as a pass.

## Coverage

The harness asserts:

- root, legacy `/home/`, canonical `/blog/`, and legacy root-pager routing;
- exact direct `410 Gone` behavior for 28 retired routes (eight demo records, four unsupported service pages, fourteen factual/empty/child-risk/affiliate/artifact routes, and both newsletter routes), four separately readable/noindex hubs, no unpublished-route or newsletter-redirect exception, and preservation of the genuine team route;
- bare and cache-busted main/custom-post-type feeds remaining free of every one of the 28 retired routes;
- anonymous WordPress registration remaining closed;
- `robots.txt`, sitemap discovery, sitemap URL status/indexability/self-canonical behavior;
- blog pagination uniqueness and coverage of post-sitemap URLs, with legacy root-pager probes extending through the highest page discovered by the canonical pager;
- broken internal destinations, redirecting destinations, apex/HTTP/`index.php` link waste;
- indexable legacy author/root-pager surfaces discovered through internal links;
- title, meta-description, canonical, Open Graph, and Twitter-card invariants, including exactly one description, `og:description`, and `twitter:description` tag per indexable page;
- in live mode, every unique referenced social image as a direct HTTPS `200` with an approved image MIME type and inspectable intrinsic dimensions; a shared fallback is allowed, but its separate approval record must pin an exact `1200x630` asset by SHA-256, named approver, date, and evidence ID;
- one nonempty H1, blank headings, hierarchy skips, and pathological heading length;
- parseable JSON-LD and non-placeholder `Person` identity, reported separately from a fail-closed project type allowlist, approval packets for identity/review claims, and Article/CollectionPage DOM/template consistency;
- visible MailPoet shortcode, Latin demo copy, placeholder records/tokens, and known demo paths;
- explicit HTTP references in HTML attributes, CSS URLs, and recursively parsed JSON-LD string values;
- response security/cache headers and runtime-version disclosure;
- static HTML/script/DOM budgets;
- when a browser is available: console exceptions, failed resource loads, transfer bytes, rendered DOM/scripts, and horizontal overflow;
- on the configured mobile root page: structured carousel-dot names/current state/slide associations, adopted 44-by-44 CSS-pixel targets, clone hiding and tab suppression, compact `h3` card styling, menu/search Enter activation and focus transfer, Escape close/focus return, and a greater-than-six-second focused-carousel autoplay observation.

A browser launch or mid-session CDP failure is normalized into report evidence: it fails when `--browser required` is selected and otherwise skips. It no longer escapes as an unstructured harness exception.

The browser probe is deliberately a lab signal. Its accessibility evidence uses rendered DOM attributes, `getBoundingClientRect()`, focus state, and synthetic DOM keyboard events. The JSON explicitly records that it is not a platform accessibility-tree snapshot, operating-system keyboard session, human screen-reader test, accessibility certification, field Core Web Vitals, Search Console, analytics, or legal validation.

## Machine-readable output

JSON is written by default to:

- `remediation/tests/results/seo-regression-live.json`, or
- `remediation/tests/results/seo-regression-snapshot.json`.

The stable top-level keys are:

```json
{
  "schemaVersion": 1,
  "result": "pass|fail",
  "summary": { "pass": 0, "fail": 0, "skip": 0 },
  "checks": [
    {
      "id": "routing.root_home_blog",
      "severity": "critical|high|medium",
      "status": "pass|fail|skip",
      "metrics": {},
      "failures": [],
      "notes": []
    }
  ],
  "evidence": {},
  "config": {}
}
```

The `browser.accessibility` check persists its complete versioned evidence object in `checks[].metrics.evidence`. The same object is retained with its source page under `evidence.browser.pages[].accessibility`, so dot, target, clone, heading, disclosure, focus, and autoplay observations remain machine-auditable rather than being reduced to a prose pass/fail statement.

Use `--output -` to print the complete JSON to stdout instead of writing a file. Human-readable check lines precede it; for strict JSON piping, use the normal file output.

## Configuration

Pass a JSON file with only the values to override. Objects are deep-merged with defaults; arrays replace defaults. Start from [`regression.config.example.json`](./regression.config.example.json).

`socialImages.fallbackApproval` intentionally defaults to `pending`. Changing it to `approved` is valid only after the referenced live bytes are exactly `1200x630`, the configured SHA-256 matches those bytes, and `approvedBy`, `approvedAt`, and `evidenceId` point to retained human review evidence. Page-specific images are permitted but are not required: the harness checks every referenced resource and does not demand a unique image per page.

`schemaGovernance.allowedTypes` is a reviewed project allowlist, not a list of every valid Schema.org type. `Person`, `Organization`, `EducationalOrganization`, and `Review` require a matching complete record in `schemaGovernance.claimAllowlist`; an empty allowlist therefore fails such claims. Article/BlogPosting and CollectionPage types must also match the configured route and captured DOM evidence. These checks distinguish parseability from governed consistency, but they do not replace official validator output or prove real-world truth.

The dated staging observations and expected current M1/M3 outcomes are retained in [`M1_M3_GATE_EVIDENCE_2026-08-13.md`](./M1_M3_GATE_EVIDENCE_2026-08-13.md); they are not a substitute for a complete post-deployment crawl.

Important route assumption: after remediation, the branded homepage is `/`, the article archive is `/blog/`, `/home/` permanently redirects to `/`, and `/page/2/` permanently redirects to `/blog/page/2/`. Override `routes` if the deployment intentionally uses another contract.

The v1.4.1 route-policy defaults require 28 exact direct `410` responses. `/privacy-policy-2/`, `/page/`, `/academy/`, and `/ai-career/` remain readable `200` hubs with `noindex`; `unpublishedPaths` and `permanentRedirects` are intentionally empty. The mobile browser set uses `/contact/` because `/newsletter/` and `/newsletter-2/` are retired.

All required permanent redirects are checked end to end: the initial response must be `301` or `308`, the final URL must match the policy target, and that destination must return `200`. A redirect into an error page fails even when its `Location` is correct. Quarantined routes also fail on any final `5xx` response.

Checks that depend on healthy canonical pages cannot pass on an empty evidence set. Critical checks fail closed; noncritical downstream checks are explicitly skipped so an upstream outage is not misreported as SEO compliance.

Performance defaults are budgets, not current-site baselines:

- HTML: 250 KB per probed route
- total transfer: 3 MB
- images: 1.5 MB
- JavaScript: 750 KB
- resources: 80
- scripts: 20
- rendered DOM: 1,500 nodes
- horizontal overflow: 0 px

Tune these consciously in config; do not silently raise budgets to make a regression green.

## Offline evidence boundary

`--dry-run` aliases `--mode snapshot` and reads:

- `public-site-snapshot/snapshot-manifest.json`
- captured page HTML
- captured robots and sitemap XML

It performs no network requests. The snapshot proves captured sitemap page content and headers. It cannot prove uncaptured redirects, `/blog/` after it is created, live link destinations outside the capture, social-image response bytes/status/MIME/dimensions, runtime console state, or transfer bytes; those checks explicitly skip or report unobserved targets. Local approval fields still fail closed when incomplete even though binary delivery evidence is skipped.
