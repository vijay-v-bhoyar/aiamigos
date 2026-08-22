# AIAmigos.org Hostile SEO and Content Review

**Audit date:** 2026-08-13  
**Verdict:** **FAIL — publicly crawlable, but not trustworthy, conversion-ready, or editorially defensible**  
**Recommended release posture:** **NO-GO for promotion, paid acquisition, partnership outreach, or authority claims until P0 items are resolved**

## Executive verdict

AIAmigos.org is technically crawlable, but the public experience looks like an unfinished WordPress theme populated with a mixture of real articles, generic AI copy, stale pages, and indexed demonstration records. The worst defects are not matters of taste:

- the domain root is a generic Blog archive while the actual brand homepage lives at `/home/`;
- archive pagination returns the first page repeatedly;
- eight indexed, sitemap-listed pages expose Latin demo copy as people, testimonials, and cases;
- the newsletter call to action renders raw MailPoet shortcode instead of a form;
- career and foundational AI articles contain claims that are false, retired, mislabeled, or unverifiable;
- all 71 posts are attributed to a blank domain-named author rather than an accountable person;
- the public server exposes PHP 8.1.34, an end-of-life branch;
- mobile page payloads reach approximately 12 MB on `/` and 34 MB on `/home/` in the observed browser run.

The site can be indexed. That is not the same as deserving to rank.

## Scope and evidence boundary

The audit inspected:

- both apex and `www` host variants;
- `robots.txt`, the sitemap index, and all seven child sitemaps;
- all **114 sitemap URLs**: 71 posts, 22 pages, four services, two classes, three testimonials, four team entries, and eight category archives;
- 172 unique internal destinations and sitewide navigation links;
- rendered desktop and 390×844 mobile behavior;
- public HTML, metadata, JSON-LD, WordPress REST data, first-party CSS/JavaScript, response headers, console errors, and resource timing;
- representative home, article, category, class, testimonial, team, contact, privacy, kids, career, and service pages.

This audit did **not** have Google Search Console, Bing Webmaster Tools, analytics, backlink-platform data, conversion data, a verified newsletter delivery test, private WordPress administration, database access, or a private source repository. Traffic, ranking loss, manual actions, backlink quality, legal compliance, and real subscriber conversion are therefore not asserted.

## Hostinger and source-code provenance

The public site identifies as **WordPress hosted on Hostinger hPanel/LiteSpeed**, not as a Hostinger Horizons or Website Builder deployment. Public signals include `platform: hostinger`, `panel: hpanel`, `Server: LiteSpeed`, `X-Powered-By: PHP/8.1.34`, WordPress REST links, and a `WordPress 6.4.10` generator tag. Those signals do not establish who is responsible for updates or the exact Hostinger product tier.

The authenticated Hostinger connector returned `website_not_found` when given `aiamigos.org`; this is non-diagnostic because the available operation expects a compatible Horizons website ID rather than an arbitrary WordPress domain. A time-bounded public GitHub/API search found no credible authoritative repository, and the supplied workspace initially contained no website source and was not a Git repository. A private or unindexed repository may still exist.

For Graphify, the audit therefore created a **deployed public snapshot**, not an authoritative code-repository clone. It contains generated HTML and same-origin captured CSS/JavaScript from WordPress core, theme, plugins, and vendor bundles, but it cannot contain the WordPress database, PHP templates that are not public assets, Customizer state, secrets, server configuration, or revision history. The graph maps captured output and its relationships; it is not proof of the site-owned source architecture. One of 36 same-origin asset responses was `404` and remains part of the manifest evidence.

## Scorecard

| Area | Rating | Hostile assessment |
|---|---:|---|
| Crawlability | 7/10 | Robots, sitemap, status codes, language, and canonicals are broadly healthy. |
| Information architecture | 2/10 | Root/home split, broken pagination, duplicate archives, thin hubs, and redirect-heavy navigation. |
| On-page SEO | 3/10 | Metadata length/coverage problems, generic titles, heading defects, and incomplete social cards. |
| Content quality | 2/10 | Broad but shallow; factual failures and unfulfilled headline promises are material. |
| E-E-A-T / trust | 1/10 | Demo people/testimonials, blank author identity, unsupported institutional claims, and weak sourcing. |
| Conversion | 1/10 | Primary newsletter mechanism is visibly broken; several landing pages are empty or dead ends. |
| Accessibility | 4/10 | No basic mobile overflow, but unlabeled controls, small targets, blank alt queue, and structural defects remain. |
| Performance | 2/10 | Multi-megabyte originals, duplicate images, script-heavy pages, and large DOMs. |
| Security/maintenance hygiene | 2/10 | EOL PHP, missing hardening headers, version disclosure, and a JavaScript exception. |

# Critical findings

## C1. The root and real homepage are split across two indexable URLs

**Confirmed**

- [`https://www.aiamigos.org/`](https://www.aiamigos.org/) is a generic archive with title and H1 `Blog`, no meta description, no Open Graph description/image, and no Twitter description.
- [`https://www.aiamigos.org/home/`](https://www.aiamigos.org/home/) is the branded marketing page titled `AI Amigos - Simplifying AI for Everyone`, but is separately indexable and self-canonical and has no H1.
- The main Home link uses the apex host and redirects to the generic Blog root.
- Current brand search surfaces `/home/`, confirming that search engines see it as a separate branded destination.

**Impact:** brand relevance, internal authority, user expectation, and conversion signals are split. The strongest branded page is not the domain root.

**Remediation:** make the branded page `/`; move the archive to `/blog/`; 301 `/home/` to `/`; align menus, sitemaps, canonical/OG URLs, schema, breadcrumbs, and internal links.

## C2. Blog pagination is broken and repeats page one

**Confirmed**

- `/`, `/page/2/` through `/page/8/` return `200` and remain indexable.
- Every page displays the same ten post headings, identifies current page `1`, uses title `Blog`, lacks a description, and canonicalizes to the root.
- No `rel=prev` or `rel=next` was present.
- The visible archive cannot expose the older portion of the 71-post sitemap inventory.

**Impact:** duplicate URLs, wasted crawl, and a misleading root pager. Older posts remain reachable through separate category/author archives, but not through the root pager users are shown.

**Remediation:** repair the WordPress paged query and self-canonicalize real page sets with differentiated titles. Do not retire `/page/2/`–`/page/8/` until `/blog/` or another primary archive provides complete crawlable pagination; only then consolidate redundant archive variants.

## C3. Eight demo records are indexed as real people, testimonials, and cases

**Confirmed, sitemap-listed, indexable, and self-canonical**

- [`/classes/recent-case-title-01/`](https://www.aiamigos.org/classes/recent-case-title-01/)
- [`/classes/recent-case-title-02/`](https://www.aiamigos.org/classes/recent-case-title-02/)
- [`/testimonials/client-name-01/`](https://www.aiamigos.org/testimonials/client-name-01/) through `client-name-03`
- [`/team/member-name-02/`](https://www.aiamigos.org/team/member-name-02/) through `member-name-04`

These pages reuse Latin-like template text beginning `Te obtinuit ut adepto satis somno...`. Testimonial identities are `Client Name 01`–`03`; team identities are `Member Name 02`–`04`; social labels include the misspelling `Linkden`. `/team/member-name-01/` contains Vijay Bhoyar but retains a placeholder slug and has no meta description.

**Impact:** this is an immediate credibility failure. A reasonable visitor can interpret theme-demo text as manufactured proof.

**Remediation:** unpublish and return `410` where appropriate; remove from sitemaps and internal links; publish only permissioned, substantiated identities/cases with dates, scope, methods, outcomes, and disclosure.

## C4. The newsletter conversion system is visibly broken

**Confirmed**

- The sitewide footer visibly renders `[mailpoet_form id=”3″]`.
- [`/newsletter/`](https://www.aiamigos.org/newsletter/) renders `[mailpoet_form id=”2″]` and no functional subscription form.
- [`/newsletter-2/`](https://www.aiamigos.org/newsletter-2/) is a second indexable newsletter page branded `Byte-Sized Chaos` and contains `[Your Company Name/AIAmigos.org]` in its legal language.

**Impact:** the primary retention CTA cannot convert; the raw shortcode and unresolved legal token advertise lack of quality control.

**Remediation:** fix shortcode quotes/plugin configuration, test a real signup through confirmation and delivery, consolidate both routes, and state promise, cadence, consent, privacy, and unsubscribe expectations.

## C5. High-stakes career guidance contains mislabeled, retired, or unsupported credentials

[`AI Certifications`](https://www.aiamigos.org/ai-certifications/) says its recommendations are valued by employers and advance careers, but:

- `Google AI Certification` links to a Coursera preparation program instead of naming the official [Professional Machine Learning Engineer](https://cloud.google.com/learn/certification/machine-learning-engineer) credential.
- `AWS Certified Solutions Architect – Specialty in Machine Learning` is not the credential’s correct name; [AWS retired Machine Learning – Specialty on March 31, 2026](https://aws.amazon.com/certification/certified-machine-learning-specialty/).
- `Databricks Certified Associate Data Scientist` links to a Data Analyst credential.
- `OpenAI Gym Certified Reinforcement Learning Engineer` has no official issuer page; the link is a third-party article.
- NVIDIA’s DLI Certified Instructor is an instructor program, not an ordinary learner certification.

The page lacks verification date, exam code, status, cost, prerequisites, intended role, renewal, and selection method.

**Impact:** readers can waste time and money. This is a material E-E-A-T failure, not a copy-editing issue.

**Remediation:** temporarily remove the page; rebuild it only from issuer sources with `verified on`, exact credential name/code, current/retired state, prerequisites, fees, renewal, intended role, and methodology.

## C6. Foundational AI explainers contain basic factual errors

[`GPT Models`](https://www.aiamigos.org/gpt-models/) states or implies that:

- GPT-3 was the original GPT model, although the original GPT work preceded it;
- GPT-J has 178 billion parameters, while the project documents [GPT-J as a 6-billion-parameter model](https://github.com/kingoflolz/mesh-transformer-jax#pretrained-models);
- Megatron-Turing NLG came from Google AI, although it was a [Microsoft–NVIDIA research collaboration](https://www.microsoft.com/en-us/research/blog/using-deepspeed-and-megatron-to-train-megatron-turing-nlg-530b-the-worlds-largest-and-most-powerful-generative-language-model/);
- GPT-family systems can be described as artificial general intelligence without qualification.

**Impact:** an AI education site fails at the subject it claims to explain.

**Remediation:** replace with a versioned, source-backed timeline distinguishing architecture families, products, release dates, parameter counts, availability, and limitations.

## C7. The Grok article appears to invent or conflate a business platform

[`GrokAI`](https://www.aiamigos.org/grokai/) describes a custom-model business platform with integrations, predictive analytics, encryption, scalable support, and a setup team, but supplies no vendor identity, product documentation, pricing, security evidence, or customer proof. Its cited material does not establish those claims.

**Inference:** it appears to conflate xAI’s Grok with an unidentified or nonexistent custom-AI vendor. This is not proof of deliberate fabrication.

**Remediation:** remove pending verification. If the subject is xAI, rewrite entirely from dated primary product material and never infer enterprise/security capabilities.

## C8. There is no accountable author behind 71 posts

**Confirmed**

- All 71 posts use one account named `aiamigos.org`.
- The biography is empty, the avatar is generic, and Article schema describes a `Person` whose name is the domain.
- The organization claims `EducationalOrganization`, but the site does not expose accreditation, curriculum standards, editorial standards, or institutional proof.
- Vijay Bhoyar’s team page supplies a role but no sufficient biography, qualifications, published work, or review responsibility.

**Impact:** readers cannot identify who researched, wrote, reviewed, corrected, or accepts responsibility for career, child-safety, technical, or enterprise claims.

**Remediation:** publish real individual bylines and qualification-specific bios; add reviewed-by, dates, source standard, correction history, editorial/AI-use policy, conflicts, affiliate disclosures, and the legal publisher.

# High-severity findings

## H1. Public runtime is obsolete and version details are exposed

Responses expose `PHP/8.1.34`. PHP lists the 8.1 branch as [end of life](https://www.php.net/eol.php), meaning it no longer receives upstream support. Generator tags and asset query strings also advertise WordPress/plugin version strings. Those advertised strings may be altered or stale, so they are not an authenticated package inventory; this audit does not claim a specific exploitable WordPress vulnerability from them alone.

**Remediation:** back up and test, move to a supported PHP release, update WordPress/theme/plugins in staging, remove unused extensions, enable managed security updates, and suppress unnecessary version disclosure.

## H2. Internal links contain two 404s and sitewide redirect waste

**Confirmed**

- `/latest-blog-title-01/` links to a missing `demystifying-artificial-intelligence...` page.
- `/academy/` creates a malformed internal URL ending `/academy/www.youtube.com/@Aieducation4kids`.
- 36 unique internal destinations redirect.
- Apex/index.php Blog, Home, and Contact links appear approximately 228–229 times each across the 114-page corpus before redirecting.

**Remediation:** replace every template/menu link with its final `https://www.aiamigos.org/...` URL; fix both 404s; remove `/index.php/` links and apex-host variants.

## H3. Mobile payloads are excessive

Observed at 390×844:

- `/`: 63 resources, approximately **11.95 MB transferred**, including **11.21 MB images**.
- A 5.89 MB, 2816×1536 image was rendered around 366×200; a second 1.66 MB variant of the visual also loaded.
- `/home/`: 76 resources, approximately **34.48 MB**, 27 image requests, and 24 scripts; several images were 1.7–2.3 MB each.
- Observed load events were roughly 1.46 s and 2.19 s on the audit connection; these are lab observations, not field Core Web Vitals.

**Remediation:** generate responsive AVIF/WebP; set `srcset`/`sizes`; never serve originals as cards; preload only the real LCP resource; lazy-load below-fold media; eliminate duplicate carousel assets; reduce scripts/DOM; validate with mobile Lighthouse and Search Console field data.

## H4. Metadata control is poor across the entire indexable inventory

Across the 114 sitemap URLs (not the complete indexable inventory):

- 12 meta descriptions missing;
- 38 titles over 60 characters;
- 38 titles under 20 characters in the local deterministic audit (the broader under-30 queue is 44);
- 50 descriptions over 160 characters;
- 13 descriptions under 70 characters;
- duplicate titles: `/` + `/category/blog/`, and `/newsletter/` + `/newsletter-2/`;
- extreme descriptions: `/ai-in-finance/` 1,084 characters; `/open-source-generative-ai-projects/` 905;
- extreme titles: Fine-Tuning article 98 characters; Vector Database article 93.

Length thresholds are snippet heuristics, not direct ranking penalties.

**Remediation:** write intent-specific titles/descriptions, replace keyword dumps and article-length descriptions, consolidate duplicate routes, and make archive templates unique.

## H5. Headings and thin hubs fail page intent

- `/home/` has no H1.
- Three articles have multiple/blank H1s; `Introduction` is incorrectly H1 on two.
- About Us wraps almost its entire body in one giant H2.
- 29 sitemap pages contained fewer than 300 main-content words in the deterministic snapshot audit.
- Near-empty examples include `/others/`, `/shop/`, `/newsletter/`, `/academy/`, `/classes/`, and `/ai-career/`.
- `/services/` exposes visible `Service Url` CTA text.

**Remediation:** one descriptive H1; coherent H2/H3 hierarchy; remove empty headings; enrich pages that serve a real task and redirect/noindex pages that do not.

## H6. Front-end errors and broken components occur sitewide

Rendered pages repeatedly logged:

`ReferenceError: wp is not defined`

The primary content remains server-rendered, so this is not presently a total JS-indexing failure. Other confirmed defects include raw MailPoet shortcode, `tel:contact@aiamigos.org` instead of `mailto:`, an HTTP YouTube link, stale `@2023` copyright, and misleading theme attribution (`AI Amigos Team` linking to VW Themes).

**Remediation:** fix/enqueue the required WordPress dependency or remove the orphaned call; then repair shortcode, schemes, attribution, and dynamic copyright.

## H7. Brand and audience are incoherent

The site simultaneously targets K–8 children, parents, young adults, career switchers, engineers, regulated enterprise buyers, consultants, course learners, shoppers, and newsletter readers. Names include AI Amigos, AI Amigo, AI Amigos Jr., AI Amigos Business/Pro, AI Amigos Academy, Byte-Sized Chaos, and a separate `aieducationforkids.com` property.

**Impact:** neither users nor search engines can identify one primary promise or topical authority.

**Remediation:** select one primary audience and commercial promise. Segment materially different kid, career, technical, and enterprise propositions with named owners, evidence, journeys, and editorial standards.

## H8. Children’s content makes unsupported safety promises

[`AI Tools for Kids`](https://www.aiamigos.org/ai-tools-for-kids/) and [`AI for Kids`](https://www.aiamigos.org/services/ai-for-kids/) omit meaningful age bands, parental-consent/account requirements, data/privacy review, moderation/community risk, ads, accessibility, learning objective, and last-reviewed date. Absolute wording such as “only websites that are safe and educational” is not supportable without a documented method.

**Remediation:** add educator/parent review, age and supervision bands, privacy and advertising checks, known risks, accessibility, learning goals, test dates, and clear disclosure when leaving the domain. Obtain child/privacy legal review.

## H9. Affiliate-style book recommendations lack disclosure and method

[`AI Books for Kids`](https://www.aiamigos.org/ai-books-for-kids/) calls four books the “best” in about 147 words, links through `amzn.to`, and omits author/edition/ISBN, age method, selection criteria, evidence of testing, limitations, price context, and affiliate disclosure.

**Remediation:** disclose relationships prominently; explain method; identify exact editions and age/reading level; add strengths/weaknesses and descriptive direct links; drop “best” absent comparison evidence.

## H10. About, mission, and service claims lack evidence

- About Us claims courses, use cases, newsletters, tools, hands-on experience, and community without named owners, outcomes, curriculum, customers, or methods.
- `/page/` uses a meaningless slug, switches to singular `AI Amigo`, calls itself a “premier destination,” “thriving community,” and “renowned,” and claims international events without an event record.
- The mission page ends with a stray quotation mark.

**Remediation:** replace adjectives with evidence: founding/legal operator, named editors/instructors, qualifications, methodology, verified metrics, event records, case studies, correction process, and contact details.

## H11. Privacy copy does not match site activities

The privacy page is largely default WordPress language and does not adequately explain the controller/legal operator, effective date, MailPoet/newsletter processing, form attachments, analytics/social embeds, short affiliate links, child-directed content, vendors, or realistic retention periods.

**Boundary:** this is a trust/content mismatch, not a legal conclusion.

**Remediation:** obtain legal review and publish activity-specific privacy, child-safety, cookies, affiliate, vendor, and retention disclosures.

## H12. Content and archive clusters overlap without an intent map

Confirmed archive duplication includes **14 additional self-canonical, indexable URLs outside the sitemap**: seven Blog-category archive pages and eight author-archive pages, with one root category URL already represented in the overlap count. The Blog category pages share the generic title `Blog`; author pages share `aiamigos.org`. Content-topic overlap also includes About + Mission, two Newsletter URLs, multiple AI-introduction articles, six career pages, three prompting pages, and a dense Generative AI batch. Actual query cannibalization still requires Search Console evidence.

**Remediation:** assign one canonical page per intent; merge and redirect variants; turn surviving support pages into distinct questions/jobs-to-be-done.

## H13. “Roadmap,” “test,” and “benchmark” headlines do not deliver reproducible artifacts

- `Building Agentic AI SaaS` is mainly a curated reading/video sequence and supplies no architecture, repo, data/security/evaluation plan, costs, deployment steps, or worked result.
- The LangGraph article contains the unfinished instruction `Sample Code Repository: Link a public GitHub repo...` while claiming the reader has everything needed.
- The RAG testing article offers generic checks and an arbitrary sub-500 ms target without fixtures, data, acceptance thresholds, code, or results.
- The AI benchmark article assigns qualitative labels without model snapshots, datasets, prompts, sample size, scoring, judge method, raw outputs, or confidence intervals.

**Remediation:** either soften each title to an editorial overview or provide the promised executable/reproducible artifact.

# Medium-severity findings

## M1. Social cards are incomplete

Twenty-five sitemap pages lacked an OG image in the deterministic crawl; the broader rendered audit found 26 URLs missing at least one core Open Graph field and 27 missing at least one Twitter field. Root lacks description and image; `/home/` has an OG image but no Twitter image.

**Remediation:** enforce a 1200×630 default and complete title/description/url/image fields on every indexable template.

## M2. Image alt text requires a human relevance review

The static corpus contained 974 image elements. None lacked the `alt` attribute, but **184 had empty alt across 77 pages**. Empty alt is correct for decorative images, so this is an audit queue rather than 184 proven failures.

**Remediation:** retain empty alt only for decoration; add concise functional alt to linked/article/service imagery; remove redundant linked copies.

## M3. Schema is syntactically healthy but semantically uneven

All sitemap pages exposed parseable JSON-LD with no JSON errors. However, demo class/testimonial/team pages expose little beyond breadcrumbs; the generic root archive is modeled with entities such as Article/Person; the author is a domain string; and the EducationalOrganization claim lacks visible support.

**Remediation:** validate template semantics in Schema Markup Validator and Rich Results Test. Model only real Organization, Person, Article, and CollectionPage entities; never add Review markup to unverifiable testimonials.

## M4. Mixed-scheme references remain

The sitewide YouTube link uses HTTP; **all 114 sitemap pages** contained at least one HTTP link because that footer link is global, and eight unique HTTP link targets were observed. `upgrade-insecure-requests` masks rather than removes the debt.

**Remediation:** update every TLS-capable destination/resource to explicit HTTPS.

## M5. Mobile has no basic horizontal overflow, but controls are weak

At 390×844, `/` and `/home/` did not overflow horizontally and the menu opened. However, social targets were roughly 17 px high, menu rows around 39 px, and 20 carousel controls on `/home/` lacked accessible names. `/home/` rendered about 1,062 DOM elements and repeated carousel content in the accessibility tree.

**Remediation:** target approximately 44×44 CSS pixels, label every control, hide cloned slides from assistive tech, and reduce DOM/carousel duplication.

## M6. Response hardening and caching headers are weak

Across audited HTML responses: no HSTS, `nosniff`, frame protection, Referrer-Policy, Permissions-Policy, or explicit HTML Cache-Control was observed. CSP was only `upgrade-insecure-requests`; server/runtime versions are disclosed.

These are primarily security/performance hygiene issues, not direct ranking factors.

## M7. Formulaic “AI content” language weakens authority

Across 71 posts, exact phrase counts included `Introduction` 53, `powerful` 37, `unleash` 20, `dive into` 18, `revolutionizing` 10, `comprehensive guide` 6, and `game-changer` 6. Headlines such as “5 Stunning Secrets” and “13 Breakthrough Moments” favor hype over precision.

**Inference:** publication bursts, repeated templates, generic conclusions, and phrase reuse resemble mass-produced content. They do not prove AI authorship or a search penalty.

**Remediation:** lead with the reader’s problem, scope, test/evidence, and result; remove stock enthusiasm.

## M8. Grammar and production defects are recurrent

Examples include `showing up everywhere!,`, `24*7`, `Linkden`, `High School or Collage`, `Service Url`, empty bullets/headings, broken model-list numbering, and stray punctuation.

**Remediation:** require a human pre-publication checklist for grammar, headings, links, placeholders, factual sources, brand form, and headline fulfillment.

## M9. Taxonomy has no visible editorial strategy

Sixty-one of 71 posts sit in generic Blog; its description is `Your blog category`. Several other indexable categories contain one to five posts, and a public taxonomy label misspells College.

**Remediation:** reduce taxonomy to user journeys; merge micro-categories; add useful archive introductions; noindex archives until they independently satisfy intent.

## M10. Contact conversion asks for data without explaining the exchange

The Contact page says `Sign up today`, requests phone, permits file upload, and does not clearly state why these fields are needed, attachment rules, recipient, retention, response time, or local privacy context.

**Remediation:** name the actual action, minimize fields, state response time and attachment rules, and place the relevant privacy notice next to submission.

## M11. Publication freshness is weak for a fast-moving AI site

Of 71 posts, 58 are from 2023, 11 from 2024, two from 2025, and none from 2026 as of the audit. Twelve posts appeared on one day in October 2023 and nine on one day in December 2023. Twenty-eight posts have no external references, 22 are under 600 content words, and 12 have no content headings.

**Remediation:** audit or retire stale articles; add visible `reviewed on`; prioritize fewer, tested, source-rich updates over bulk publishing.

# Low-severity and baseline findings

- `robots.txt` is healthy: only `/wp-admin/` is disallowed, admin AJAX is allowed, and the sitemap index is declared.
- Seven child sitemaps expose 114 URLs; every audited sitemap URL returned `200`, remained indexable, and had a matching self-canonical.
- A random unknown URL correctly returned `404` with `noindex,follow`.
- All audited HTML declared `lang="en-US"` and a viewport meta tag.
- No hreflang was present. That is correct if the site is genuinely English-only.
- HTTP apex takes two redirects to the canonical `www` HTTPS host; reduce this to one.
- JSON-LD was parseable, but parseability is only a baseline.

# Prioritized remediation backlog

## P0: first 72 hours

1. Unpublish/`410` the eight demo records and purge them from sitemaps/internal links.
2. Make the branded page `/`; move Blog to `/blog/`; redirect `/home/`; repair complete pagination before consolidating redundant category/author archives.
3. Fix and end-to-end test MailPoet; consolidate Newsletter pages.
4. Remove or retract the certification, GPT, Grok, and unsupported benchmark pages pending sourced rewrites.
5. Fix the two 404 links, all apex/index.php template links, the email link, and the JavaScript exception.
6. Upgrade away from PHP 8.1 after staging/backup verification.
7. Remove empty Shop/Others and other dead surfaces from the index or redirect them.
8. Replace the domain-as-person author with accountable humans.

## P1: weeks 1–2

1. Define the primary audience, business model, and one-sentence promise.
2. Publish editorial, corrections, sourcing, review, AI-use, affiliate, and conflict policies.
3. Rewrite About with legal operator, named people, qualifications, methods, and evidence.
4. Commission privacy/child-content legal review.
5. Consolidate duplicate intents and redesign navigation around user journeys.
6. Complete metadata, H1, social-card, and schema templates.
7. Compress and responsively serve the image library; reduce script/carousel/DOM duplication.

## P2: days 15–60

1. Rewrite priority content from primary sources with verification dates and named reviewers.
2. Publish real artifacts: repositories, evaluation fixtures, methods, outputs, cases, and correction histories.
3. Build safe children’s review criteria with age/supervision/privacy/ad/accessibility fields.
4. Rebuild category hubs only where they serve an independent search/user task.
5. Run mobile Lighthouse, axe/accessibility testing, Rich Results, broken-link CI, and Search Console validation.

## Ongoing governance

- quarterly content factual review;
- monthly broken-link, indexation, sitemap, and metadata checks;
- release gate preventing placeholder names/Latin text/raw shortcodes;
- performance budgets for HTML, JS, image, DOM, and LCP assets;
- authorship and source requirements before publication;
- no “benchmark,” “best,” “certification,” “safe,” or “roadmap” claim without a documented method.

# Graphify and local evidence artifacts

Graphify processed **137 supported files** from the deployed snapshot: 114 HTML, one TXT, 20 JavaScript, and two JSON files. Captured CSS was retained as audit evidence but is not represented in this graph. The final graph contains **1,799 nodes, 3,042 undirected edges, and 119 labeled communities**.

The pre-build extraction contained 3,138 raw edges. The health check found **no missing endpoints, dangling endpoints, or self-loops**, but it did find **96 same-endpoint collapses**, including 73 exact duplicate edges, when building the undirected graph. The graph remains useful for navigation but is not lossless. `EXTRACTED` means a relationship was explicit in captured content; it does **not** mean the underlying claim is factually verified. Semantic token usage was not captured from the collaborating extraction agents, so the `0/0` fields in intermediate data are placeholders rather than a measured cost.

- `public-site-snapshot/` — 114 deployed HTML pages plus captured same-origin asset responses and sitemap evidence; **not an authoritative repository**
- `public-site-snapshot/snapshot-manifest.json` — status, final URL, headers, byte sizes, and provenance
- `output/seo-audit.json` — deterministic per-page metadata/content audit
- `output/playwright/mobile-menu.png` — rendered mobile navigation evidence
- `output/playwright/placeholder-team.png` — rendered demo team-page evidence
- `graphify-out/graph.json` — GraphRAG-ready graph
- `graphify-out/graph.html` — interactive graph
- `graphify-out/GRAPH_REPORT.md` — Graphify report

### Graph community highlights

**God Nodes**

1. `RAG Architecture Types with Implementation Details and Use Cases` — 81 edges
2. `Owl()` — 56 edges
3. `Quantum AI: 13 Breakthrough Moments Where Physics Fuels Smart Innovation!` — 56 edges
4. `Self-Aware AI: The Next Evolutionary Leap in Artificial Intelligence` — 45 edges
5. `LangGraph: 5 Stunning Secrets for Building a Generative AI Application` — 43 edges

**Surprising Connections**

- `Ethical AI` is inferred as semantically similar to `AI Ethics for Everyday Folks`.
- `Clinical Systems Integration` is inferred as semantically similar to `AI-Enhanced EHR Integration`.
- Several `AI Evolution` reference edges are marked **AMBIGUOUS** and should not be treated as verified relationships.

**Suggested Questions**

- What is the exact relationship between `AI's Recipe: Mixing Data Types and Models` and `AI Evolution: 13 Breakthrough Stages from Rule-Based Systems to Quantum Wonders`?
- Why does `AI Evolution: 13 Breakthrough Stages from Rule-Based Systems to Quantum Wonders` bridge AI evolution, finance, adaptive systems, manufacturing, data/models, healthcare, and interoperability communities?
- What connects `AI Amigos Sitemap Index`, `MONAI Official Website`, and `Project MONAI GitHub Organization` to the rest of the snapshot?
