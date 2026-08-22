# Production browser spot-check — 2026-08-21

Status: **live evidence of the deployed production bytes; remediation candidate is not deployed**.

This artifact records a Playwright browser session against `https://www.aiamigos.org/` on 2026-08-21. It is intentionally a spot-check, not a replacement for the full no-skip regression crawl.

## Host/runtime evidence

- Root response: `200`.
- Response headers: `Server: LiteSpeed`, `platform: hostinger`, `panel: hpanel`, `X-Powered-By: PHP/8.1.34`.
- CSP is only `upgrade-insecure-requests`.
- WordPress REST discovery links are present.
- Browser console: `ReferenceError: wp is not defined` at `/` line 868.

## Root `/`

- Title and H1 are `Blog`; canonical is `https://www.aiamigos.org/`.
- No meta description was present.
- Footer renders the literal `[mailpoet_form id=”3″]` shortcode.
- A sitewide HTTP YouTube link remains: `http://www.youtube.com/@AIamigos-sn8uf`.
- Footer still contains `24*7` and `@2023`.
- Pagination links `/page/2/` through `/page/8/`; `Next »` points to `/page/2/`.

## `/home/`

- Title: `AI Amigos - Simplifying AI for Everyone`.
- No H1.
- Self-canonical remains `/home/`.
- Footer still renders the MailPoet shortcode.
- Browser count: 47 images and 30 scripts.

## `/page/2/`

- Title: `Blog`; canonical remains the root `/`.
- The first ten post URLs are identical to the root archive.
- The visible pager still identifies page 2 but `Next »` points back to `/page/2/`.

## `/newsletter/`

- Literal shortcodes `[mailpoet_form id=”2″]` and `[mailpoet_form id=”3″]` are visible.
- No newsletter subscription form was observed; the only detected form was the site search form.
- Both `/newsletter/` and `/newsletter-2/` remain linked.

## `/ai-certifications/`

- The page remains public and claims the listed credentials are valued by employers.
- It still labels AWS Machine Learning Specialty as `AWS Certified Solutions Architect – Specialty in Machine Learning`.
- It still lists `OpenAI Gym Certified Reinforcement Learning Engineer` and links to a third-party article.
- It still labels NVIDIA DLI as a general learner certification and links Databricks to a Data Analyst credential.

## Boundary

The Playwright evidence proves the current production output still exhibits the audited defects. It does not authorize or perform a production mutation. WordPress `/wp-admin/` redirected to login, and the Hostinger hPanel browser session was unauthenticated; no deployment credential was available in the environment.
