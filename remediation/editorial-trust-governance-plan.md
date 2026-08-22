# AI Amigos editorial trust and publication governance plan

Status: **control plan only; no live or staging change is authorized or claimed by this document**  
Prepared: 2026-08-13  
Applies to: `aiamigos.org`, its WordPress records, public forms, structured data, external recommendations, and any linked AI Amigos artifact  
Finding scope: `C5-C8`, `H7-H13`, `M2-M3`, and `M7-M11`

## Decision boundary

The hostile audit, deterministic registry, and staging content plan have completed useful automated work: they identify affected records, preserve the captured evidence, define rollback fields, propose bounded copy or quarantine actions, and specify testable assertions. That work is **complete as local planning evidence only**.

It does not prove that a page is accurate, a person is qualified, a product claim is current, a child-directed resource is safe, a commercial relationship is disclosed, a privacy notice is legally adequate, or an artifact is reproducible. Those questions require named people, operating facts, primary sources, and, where specified below, legal or domain review. No finding in this document is closed on production merely because an automated edit, route rule, schema change, or green crawl exists.

The source content plan remains `plan_only_not_applied`. Where a staging quarantine or mechanical repair is later observed, record it as **automated implementation complete on staging, human approval pending** until the required review packet and production evidence are attached.

## Status vocabulary

| State | Meaning | May be public and indexable? |
| --- | --- | --- |
| `AUTOMATION_COMPLETE` | Local inventory, proposed patch, or deterministic check is complete. It says nothing about truth or approval. | No, not by itself. |
| `QUARANTINED` | Record is recoverable in the CMS but excluded from public queries, sitemaps, navigation, related content, schema, and promotional links. | No. |
| `HUMAN_REVIEW_PENDING` | Named editor or domain reviewer has not signed the evidence packet. | No for the affected claim/page. |
| `LEGAL_REVIEW_PENDING` | Privacy, child-directed, affiliate, retention, or legal-operator language lacks the required approval. | No new collection or gated claim; the existing privacy route must remain accessible while collection is minimized. |
| `APPROVED_FOR_STAGING` | All required reviewers signed a versioned draft and its evidence matrix. | Staging only. |
| `PRODUCTION_PROVEN` | The exact approved version is live and the post-release assertions pass. | Yes, within the approved scope and review period. |
| `RETIRED` | The record is archived in the CMS, removed from discovery surfaces, and has an approved 410 or one-hop redirect disposition. | No. |

## Required roles and separation of duties

One person may fill more than one role only when the approval record says so. The accountable editor may not represent a legal or specialist review that did not occur.

| Role | Required responsibility |
| --- | --- |
| Executive/product owner | Approves the primary audience, promise, business model, brand/sub-brand vocabulary, and ownership of each journey. |
| Legal operator/publisher | Attests the operating entity or individual, publisher identity, contact method, institutional facts, and authority to publish. |
| Accountable editor | Owns retraction, sourcing, copy review, corrections, review dates, and the final publish decision. |
| AI/ML technical reviewer | Checks model history, product identity, capability, security, benchmark, test, and implementation claims against dated primary sources. |
| Credential/career reviewer | Checks issuer identity, exact credential name/code/status, prerequisites, fees, renewal, intended role, and career-language limitations. |
| Child-resource reviewer | A named parent, educator, or child-learning specialist who evaluates age band, supervision, learning objective, accessibility, and practical risk. |
| Privacy/legal reviewer | Reviews controller/operator, data flows, children, cookies, vendors, affiliate relationships, retention, rights, and collection-point notices. Counsel is used where the legal owner determines it is required. |
| Commercial-relationship owner | Attests whether every short link or recommendation is affiliate, referral, sponsored, tracked, or uncompensated and supplies the governing terms. |
| Accessibility reviewer | Classifies image purpose in rendered context and performs keyboard/screen-reader sampling. |
| Artifact maintainer and reproduction reviewer | Maintains promised files/repos and independently attempts the documented test, benchmark, or build from a clean environment. |
| Taxonomy/SEO owner | Owns the intent map, archive dispositions, redirects, sitemap consistency, and Search Console analysis without overstating causality. |
| Form/data owner | Justifies every collected field, names the recipient and response process, and proves retention/deletion and attachment handling. |

Every approval record must contain reviewer name, role, date, reviewed version or content hash, decision, limitations, expiry/review date where relevant, and links to retained evidence.

## Fail-closed publication policy

1. **No evidence, no claim.** Missing primary sources, operating records, relationship terms, identity attestations, or reviewer approval result in quarantine or deletion of the unsupported claim. Plausible wording is not a substitute.
2. **No approval, no indexation.** A gated record stays draft or otherwise non-indexable and absent from navigation, XML sitemaps, archives, related-post modules, schema graphs, feeds, and internal promotional links.
3. **Metadata follows the body.** Titles, descriptions, schema, cards, and link labels may be published only after the approved body supports the same promise.
4. **Legal mismatch stops collection.** If the privacy inventory or collection-point notice is incomplete, disable optional collection and file upload. Do not rely on `noindex` to cure a privacy mismatch.
5. **Materially different claims require re-review.** A title, claim, cited product version, field set, vendor, affiliate relationship, age band, benchmark method, or legal text change invalidates the prior approval for that scope.
6. **Expiry is a withdrawal trigger.** When an approved review date expires, a primary source disappears, or a product/credential status changes, remove the affected claim or quarantine the record until re-review.
7. **One approved disposition per URL.** Each record is `publish`, `merge and redirect`, `noindex support`, or `retire`; it cannot remain indefinitely public under an ambiguous “to be reviewed” state.
8. **Rollback never republishes known-bad copy.** Restore data for recovery only. The captured audited version may not be made public as a rollback without a fresh approval.
9. **Production is a separate gate.** Staging approval does not authorize a whole-database promotion. Release only the exact approved records/fields, reconcile users/comments/registration, and repeat the crawl and rendered checks on production.

## Evidence packet required for any publication

Each publish request must include:

- exact WordPress ID, type, slug, revision/export, proposed final URL, and content hash;
- claim-to-source matrix using primary sources for material factual claims, with access and verification dates;
- named author, named reviewer, their relevant scope, and signed checklist;
- conflicts, compensation, sponsorship, affiliate, and AI-use disposition, including an owner-attested `none` when applicable;
- visible published/updated/reviewed dates and a material correction note when prior public claims were wrong;
- final title, description, schema entity map, image/alt decisions, taxonomy, and internal-link disposition;
- route, robots, sitemap, canonical, link, form, accessibility, and rendered-DOM evidence applicable to the page;
- rollback record and next review date.

## Finding actions

### C5 - High-stakes career guidance contains mislabeled, retired, or unsupported credentials

**Default disposition:** keep page `945`, `/ai-certifications/`, in recoverable quarantine. Remove its links from `/ai-career/`, navigation, recommendations, schema, archives, and sitemaps.

**Automatable work:** assert a non-indexable approved terminal state; inventory every credential row; require fields for issuer, issuer URL, exact name, code, status, verified-on date, prerequisites, fees, renewal, intended role, limitations, and selection method; reject third-party preparation pages mislabeled as issuer credentials.

**Human gate:** the credential/career reviewer checks each row against the current issuer page. The accountable editor checks that employer value, employability, salary, and career-advancement language is either removed or narrowly supported. Commercial/legal review is also required if the page is monetized or recommends paid preparation.

**Publish action:** rebuild from issuer primary sources, label retired credentials as retired, distinguish preparation from certification, expose methodology and verification date, and attach the signed field matrix. Republish only the approved rows.

**Retire action:** if ownership or a sustainable re-verification cadence is unavailable, retire the page with 410 or redirect it to a non-promotional career-source methodology page. Do not redirect to a page making the same unsupported promise.

**Required proof:** route/indexability report; signed credential matrix; zero label/target mismatches; visible author, reviewer, and reviewed-on date. Automated fact extraction cannot determine issuer equivalence, employer value, or whether a credential remains strategically useful.

### C6 - Foundational AI explainers contain basic factual errors

**Default disposition:** keep post `441`, `/gpt-models/`, quarantined until a complete rewrite is approved.

**Automatable work:** flag the four audited errors and scan for model names, parameter counts, release dates, provenance, availability, and unqualified AGI language. Compare rendered claims with a structured source matrix.

**Human gate:** an AI/ML technical reviewer verifies the original GPT chronology, GPT-J as a 6B model, Microsoft-NVIDIA provenance for Megatron-Turing NLG, and precise capability/AGI limitations. The accountable editor reviews the entire article, not only the four known defects.

**Publish action:** replace the article with a versioned timeline that distinguishes research architecture, model family, product, release, parameter count, access state, provenance, capability, and limitation. Use dated primary research/project/vendor sources and add a material-correction note.

**Retire action:** if a maintainable, source-backed timeline cannot be produced, retire the page rather than patching isolated sentences.

**Required proof:** before/after excerpts; complete source matrix; technical-review signature; visible correction, reviewer, and reviewed-on date. Automation cannot adjudicate AGI terminology or guarantee that the rewritten explanation is pedagogically correct.

### C7 - The Grok article appears to invent or conflate a business platform

**Default disposition:** keep post `783`, `/grokai/`, quarantined and remove inbound promotional links, including the link from `custom-gpt-models`.

**Automatable work:** scan for unsupported integrations, analytics, encryption, support, pricing, customer, scalability, and setup-team claims; require a product/vendor identifier and a source for each material capability.

**Human gate:** the AI/ML technical reviewer and accountable editor establish what product the article is actually about. The legal/operator reviewer checks that the site does not imply a vendor relationship, customer proof, security assurance, or independent verification that does not exist.

**Publish action:** if the subject is xAI's Grok, rewrite from dated xAI primary product and policy material only, state version/scope, and distinguish direct evidence from commentary. If the subject is another vendor, require the vendor's legal identity and primary documentation before drafting.

**Retire action:** permanently retire the record if product identity cannot be established. Do not preserve invented or conflated claims through a generic rewrite.

**Required proof:** signed claim-to-source matrix, precise vendor/product label, zero unsupported capability claims, correction note, and route proof. Automation cannot infer which vendor was intended or validate enterprise/security capability.

### C8 - There is no accountable author behind 71 posts

**Default disposition:** do not treat changing the shared display name from a domain to a person as closure. Until authorship is attested page by page, high-risk posts remain quarantined and other posts remain in the `M11` review ledger.

**Automatable work:** produce a 71-post author/reviewer/date/profile/schema coverage report; reject a domain string as `Person`; ensure visible and JSON-LD identities agree; detect missing substantive bios and policy links.

**Human gate:** the legal operator attests authorship or editorial responsibility for each post. Each named person approves their bio, role, qualifications, work links, conflicts, and review scope. Privacy/legal review approves policy statements involving children, affiliate activity, retention, and legal identity.

**Publish action:** assign a real accountable individual; expose a substantive, evidence-backed profile; show published, materially updated, and reviewed dates correctly; add reviewed-by when a distinct qualified review occurred; publish editorial/sourcing, corrections, affiliate, AI-use, conflict, and legal-publisher practices only after they match operations. Team record `38` may become `/team/vijay-bhoyar/` only after identity and role attestation.

**Retire action:** retire or merge a post when no individual will accept responsibility for its accuracy and maintenance. Do not manufacture independent review by naming the publisher twice.

**Required proof:** 71/71 disposition and identity coverage; zero domain-as-Person schema; signed profile packets; sitewide policy-link matrix. Automation cannot establish who wrote, reviewed, or is qualified to own a claim.

### H7 - Brand and audience are incoherent

**Default disposition:** freeze new public sub-brand, course, service, child, and enterprise claims. Keep unverified service/course records `21`, `22`, `26`, `28`, and `30` quarantined. Do not let the proposed Home copy silently decide company strategy.

**Automatable work:** inventory every use of AI Amigos, AI Amigo, AI Amigos Jr., AI Amigos Business/Pro, AI Amigos Academy, Byte-Sized Chaos, and `aieducationforkids.com`; map routes, menus, CTAs, and exits to audiences.

**Human gate:** the executive/product owner signs one primary audience, core promise, commercial model, approved brand names, sub-brand owners, and boundaries for children, career, technical, and enterprise content. The accountable editor translates the decision into editorial scopes.

**Publish action:** implement the approved naming and route-to-audience matrix in Home, About, navigation, hubs, footer, schema, and off-domain notices. Every materially distinct journey must name its owner, evidence standard, and next action.

**Retire action:** retire names and journeys with no approved owner or real offering; redirect only where intent genuinely matches. Clearly label and govern exits to `aieducationforkids.com` rather than implying it is the same controlled experience.

**Required proof:** versioned signed strategy, route-to-audience matrix, complete brand-string scan, navigation review, and cross-domain exit inventory. Audience selection and commercial promise cannot be auto-fixed.

### H8 - Children's content makes unsupported safety promises

**Default disposition:** keep page `877`, `/ai-tools-for-kids/`, and service `32`, `/services/ai-for-kids/`, in draft/non-indexable quarantine.

**Automatable work:** block absolute `safe`, `only safe`, guaranteed educational, or equivalent wording; require per-resource fields for tested version/date, age band, supervision, account/consent, data collection, ads/purchases, moderation/community, accessibility, learning objective, limitations, and off-domain notice.

**Human/legal gate:** a named parent/educator or child-learning reviewer performs the practical review; the accessibility reviewer checks use and access barriers; the privacy/legal reviewer approves child, consent, data, advertising, and external-platform language.

**Publish action:** publish only resources reviewed at the named version/date, with bounded risk language and all structured fields visible. Never describe a third-party site as universally safe. State what was and was not tested.

**Retire action:** remove a tool or retire the page if its current version cannot be tested, its age/consent posture is unclear, or no reviewer accepts ongoing ownership.

**Required proof:** 100% resource field coverage; claim-to-method matrix; dated legal and editorial approvals; accessibility sample; external-destination checks. No crawler can prove child safety or suitability.

### H9 - Affiliate-style book recommendations lack disclosure and method

**Default disposition:** keep page `149`, `/ai-books-for-kids/`, quarantined. Preserve the four captured `amzn.to` URLs only as evidence, not as public recommendations.

**Automatable work:** inventory commercial/short links; require author, exact title, edition/ISBN where available, age/reading band, selection criteria, strengths, limitations, verification date, relationship type, and disclosure placement; reject `best` without a comparison method.

**Human/legal gate:** the commercial-relationship owner attests whether each link is affiliate, referral, sponsored, tracked, or uncompensated. A parent/educator reviews suitability. The privacy/legal reviewer approves the exact disclosure and placement.

**Publish action:** use a descriptive title such as “Selected AI Books for Kids: A Parent Review Guide,” publish the method and relationship disclosure before or adjacent to the first commercial link, identify exact editions, and use descriptive destination links.

**Retire action:** remove any link whose relationship or destination cannot be verified. Retire the list if no real selection/review method exists.

**Required proof:** 4/4 book and relationship matrix; rendered disclosure-position evidence; legal approval; zero unsupported comparative claims. Automation must not infer the site's compensation terms from a short-link domain.

### H10 - About, mission, and service claims lack evidence

**Default disposition:** keep service/course records `21`, `22`, `26`, `28`, and `30` quarantined. Draft page `24`, `/page/`, for merge. Rewrite page `513`, `/about-us/`, only after operator attestation.

**Automatable work:** flag superlatives and claims about courses, community, tools, experience, customers, events, outcomes, scale, and reputation; require an evidence link or removal; detect inconsistent brand form and stray punctuation.

**Human/legal gate:** the legal operator attests publisher identity and contact details. The accountable editor verifies responsible people and methods. The executive/business owner supplies records for any real service, curriculum, price, terms, event, customer, case study, metric, or outcome.

**Publish action:** publish a factual About page with scope, operator, named maintainers, sourcing/correction method, and contact. Merge only an owner-approved unique mission statement, then redirect `/page/` once to `/about-us/#mission`. Publish a service only when its owner, audience, deliverable, price/no-charge status, prerequisites, delivery/support boundary, terms, privacy, cancellation/refund rules, and claim evidence are complete.

**Retire action:** omit unsupported adjectives and claims. Retire unverified offers; if useful informational content exists, move it into the approved Academy or Career hub before redirecting.

**Required proof:** signed institutional claim matrix, operator approval, approved page/service checklist, and clean route/text report. Legal identity, customer history, outcomes, and expertise cannot be auto-generated.

### H11 - Privacy copy does not match site activities

**Default disposition:** keep the privacy route accessible and linked, but mark its revision `LEGAL_REVIEW_PENDING` and noindex it until approved. Do not add new collection. Minimize or disable fields and file upload not covered by an approved data-flow record.

**Automatable work:** inventory actual forms, fields, attachments, newsletter/update handling, analytics, cookies/storage, embeds, social links, short/affiliate links, child-directed pages, vendors, recipients, and observed retention configuration; compare collection points with the notice.

**Human/legal gate:** the legal operator and privacy/legal reviewer approve controller/operator identity, effective date, purposes, data categories, vendors, lawful bases where applicable, retention, rights/contact, children, cookies, affiliate activity, and cross-domain processing.

**Publish action:** replace generic WordPress text with the approved activity-specific notice; link a context-specific summary before every submission; align consent behavior with the notice. Publish no placeholder, assumed entity, invented retention period, or unverified right.

**Retire/suspend action:** the privacy route itself must not disappear while the site collects data. If an activity cannot be documented and approved, suspend that activity or vendor integration rather than writing speculative policy text.

**Required proof:** signed data-flow/vendor inventory; versioned legal checklist; collection-point coverage; fresh-profile consent-state storage/network trace. Automation cannot make a legal conclusion or choose the operator's lawful commitments.

### H12 - Content and archive clusters overlap without an intent map

**Default disposition:** noindex redundant archives while analysis is open. Keep `/newsletter-2/` drafted and consolidate to page `157`; merge mission page `24` into About after approval. Do not mass-merge posts from string similarity alone.

**Automatable work:** reconcile every indexable URL to an intent ledger; cluster duplicate titles/content and overlapping About, Newsletter, AI-introduction, career, prompting, and Generative AI routes; test routes/canonicals/sitemaps after an approved disposition.

**Human gate:** the executive/product owner approves audience journeys; the accountable editor assigns a unique job-to-be-done and canonical owner; the taxonomy/SEO owner chooses merge, distinct support, noindex, or retire. Search Console query/page data is required before calling an overlap actual search cannibalization.

**Publish action:** retain one canonical owner per intent and make surviving support pages answer distinct questions. Merge exact duplicates with one-hop redirects and update every internal link, sitemap, canonical, schema, and archive reference.

**Retire action:** retire a cluster member with no distinct user task or maintainable value. Preserve recovery exports; do not redirect unrelated intent merely to eliminate a URL.

**Required proof:** 100% indexable URL intent map; signed dispositions; HTTP/canonical/robots/sitemap report; dated Search Console report or an explicit `unavailable - no cannibalization claim` state. Automation can find overlap but cannot choose user intent or infer query competition.

### H13 - Roadmap, test, and benchmark headlines do not deliver reproducible artifacts

**Default disposition:** keep posts `1411` (LangGraph), `1407` (RAG testing), `1421` (Agentic AI SaaS), and `1405` (benchmark) draft until an overview or artifact track passes. Review post `926` (custom models) under the same promise/source rule.

**Automatable work:** block placeholder instructions, unsupported latency targets, qualitative benchmark labels, and titles promising roadmap, test, implementation, comprehensive guide, or benchmark without required artifact fields.

**Human gate:** the accountable editor chooses `overview` or `artifact` for each page. An AI/ML reviewer checks technical scope. For the artifact track, a maintainer supplies versioned assets and a different reviewer attempts reproduction from a clean environment.

**Publish action - overview track:** soften title and metadata to the delivered editorial scope, remove completeness/result language, add dated primary sources and limitations, and label the page as an overview/checklist/resource guide.

**Publish action - artifact track:** supply accessible versioned repo/files, environment and dependency versions, architecture/method, fixtures/data rights, security/privacy boundaries, prompts/configuration, acceptance criteria, costs where material, raw outputs/results, scoring/judge method, uncertainty, limitations, and correction history.

**Retire action:** retire a page when neither track is complete. A dead or private artifact link fails the page back to quarantine.

**Required proof:** 4/4 signed dispositions; zero placeholder/unsupported-label scan; artifact link crawl; independent reproduction report. Automation cannot make a guide reproducible or certify benchmark validity.

### M2 - Image alt text requires a human relevance review

**Default disposition:** treat the 184 empty-alt image instances across 77 pages as an unresolved review queue, not 184 automatic defects.

**Automatable work:** generate an instance ledger containing page URL, image source/media ID, rendered context, link destination, neighboring text, current alt, and duplicate use; run accessible-name and duplicate-image checks after edits.

**Human gate:** the accessibility/content reviewer classifies every instance as decorative, informative, or functional in its rendered context. The page editor approves concise wording; linked images require destination/purpose review and screen-reader sampling.

**Publish action:** keep `alt=""` only for genuinely decorative images; add contextual, nonredundant alt for informative images; give functional/linked images an accessible name describing their action or destination; remove redundant linked copies.

**Retire action:** remove an image when it adds no information, creates duplicate announcements, or lacks rights/provenance needed for publication.

**Required proof:** 184/184 classification ledger, zero unresolved instances, automated accessibility result, and documented keyboard/screen-reader sample. Alt relevance cannot be safely generated from filename or computer vision alone.

### M3 - Schema is syntactically healthy but semantically uneven

**Default disposition:** preserve parseable JSON-LD but remove or suppress unsupported entities. Demo IDs `34`, `36`, `40`, `42`, `44`, `46`, `48`, and `50` must not appear. Do not model the domain as a `Person`, and do not use `Review` for unverifiable testimonials.

**Automatable work:** parse all JSON-LD; compare entity names, URLs, authors, dates, and page types with visible content and approved profiles; run Schema Markup Validator and applicable Rich Results checks by template.

**Human gate:** the accountable editor approves page/entity meaning and real identities. The legal operator substantiates organization name/type; absent evidence for `EducationalOrganization`, use only the narrower truthful organization type. The author/profile owner approves Person data.

**Publish action:** model real Organization, Person, Article, and CollectionPage entities only when visible content and approval packets support them. Keep dates and identities synchronized with the page.

**Retire action:** delete unsupported entity nodes instead of padding schema. Removing schema is preferable to publishing false semantics.

**Required proof:** saved validator outputs by template; zero DOM/JSON-LD identity mismatch; zero demo/domain-as-Person matches; reviewer sign-off. A green JSON parser proves syntax, not real-world truth.

### M7 - Formulaic AI-content language weakens authority

**Default disposition:** do not mass-replace stock phrases. Put each priority article through substantive editorial triage under `M11`; quarantine content whose unique value or evidence cannot be identified.

**Automatable work:** compare stock phrase, superlative, repeated-template, generic conclusion, and headline-pattern counts with the captured baseline; flag likely passages and metadata for review.

**Human gate:** the accountable editor confirms a reader problem, scope, evidence or test, result, limitations, and precise headline fulfillment. The domain reviewer checks that reducing hype did not leave incorrect technical claims.

**Publish action:** rewrite around specific user questions and evidence; use measured language; retain a phrase only when it is the clearest accurate choice. Never assert AI authorship or a search penalty from stylistic similarity.

**Retire action:** merge or retire an article that remains generic, duplicated, or unsupported after review.

**Required proof:** signed page rubric; before/after corpus report; zero unsupported AI-authorship or penalty claim. Automation can prioritize passages but cannot establish originality, usefulness, or authoring method.

### M8 - Grammar and production defects are recurrent

**Default disposition:** block release of any edited record until both deterministic lint and a named human copy review pass.

**Automatable work:** fail on known defects and patterns such as `showing up everywhere!,`, `24*7`, `Linkden`, `High School or Collage`, `Service Url`, raw shortcodes, placeholder identities, malformed links, blank headings/bullets, skipped headings, broken numbering, and stray punctuation. Seed both failing and passing fixtures.

**Human gate:** the accountable editor checks grammar in context, brand form, technical names, claim/source agreement, links, headings, and headline fulfillment. A domain reviewer approves changes that can alter technical meaning.

**Publish action:** correct only the verified occurrence in its exact record, retain a before/after excerpt, and complete the release checklist.

**Retire action:** quarantine a record when corrupted structure, unclear meaning, or absent source makes safe correction impossible.

**Required proof:** full rendered-text zero-match report or documented literal exceptions; completed editor checklist for every changed page; tests demonstrating fail-closed release behavior. Automated grammar rewriting cannot be credited as editorial approval.

### M9 - Taxonomy has no visible editorial strategy

**Default disposition:** noindex all category archives until `H7` audience strategy and the post-assignment export are approved. Do not hide posts from the primary Blog inventory.

**Automatable work:** export term IDs, taxonomy, parent, name, slug, description, SEO fields, assigned post IDs, inbound links, and sitemap state. The current queue includes terms `1` Blog, `25` Professional, `40` Video, `42` Everyone, `44` Technology, `48` AI Algorithms, `55` Artificial Intelligence, and `60` AI Tools. Locate the exact term behind `High School or Collage` before editing it.

**Human gate:** the executive/editorial owner defines user journeys; the taxonomy/SEO owner assigns each retained term an audience, intent, owner, minimum reviewed inventory, introduction, and indexability/canonical decision.

**Publish action:** retain only terms that independently serve a user task, have unique approved copy and enough reviewed posts, and match the intent map. Merge micro-categories with explicit one-hop redirects and update assignments and links.

**Retire action:** retire generic Blog-category duplication, format-only or vague categories, and unsupported tool categories unless the approved inventory justifies them. Rename the misspelled term only after its exact ID/slug/assignments are known, adding a redirect if the slug changes.

**Required proof:** 100% term governance matrix; zero generic/misspelled labels; assignment/redirect/sitemap consistency report; rollback export. URL counts alone cannot determine taxonomy.

### M10 - Contact conversion asks for data without explaining the exchange

**Default disposition:** on page `25`, `/contact/`, keep only fields with a documented purpose. Disable phone and file upload unless the form/data owner and privacy reviewer approve necessity and controls. Page `157`, `/newsletter/`, must remain an honest manual update request unless a real subscription workflow is proven.

**Automatable work:** extract each field, required state, validation, recipient, attachment constraints, notice placement, and submission path; block vague CTA text such as `Sign up today`; verify notice links and run a redacted test fixture.

**Human/legal gate:** the business/form owner states the actual action, recipient, supportable response expectation, and field purpose. The privacy/legal reviewer approves data minimization, attachment rules, retention/deletion, and adjacent notice. A security owner is required before enabling attachments.

**Publish action:** name the action; mark fields required/optional; explain purpose before submit; state only supportable response timing; show allowed file types/size and prohibited content if upload is approved; link the reviewed privacy notice. For update requests, do not promise automated subscription, cadence, confirmation, or delivery unless independently tested.

**Retire/suspend action:** remove an unnecessary field or disable the form when recipient, retention, deletion, malware handling, or notice cannot be proven.

**Required proof:** signed field-purpose matrix; rendered pre-submit checklist; timestamped end-to-end delivery and redacted cleanup evidence; attachment-control result when applicable. Automation cannot decide business necessity or legal retention.

### M11 - Publication freshness is weak for a fast-moving AI site

**Default disposition:** create a 71/71 ledger with exactly one action: `keep after review`, `update`, `merge`, `noindex`, or `retire`. A changed WordPress modified date is not a substantive review.

**Automatable work:** inventory publication/modified dates, external references, broken sources, word/heading structure, product/version mentions, and prior correction notes; prioritize fast-changing product, credential, career, security, benchmark, child, and commercial content.

**Human gate:** the accountable editor assigns owner, action, due date, risk class, and next review date. The applicable domain reviewer signs current claims. The legal/privacy reviewer rechecks pages whose data, child, affiliate, or legal context changed.

**Publish action:** retained time-sensitive posts receive current primary sources, named author/reviewer, visible reviewed-on date, limitations, and a material correction/change note where appropriate. The editor approves a risk-based review cadence and an expiry action for each class.

**Retire action:** merge, noindex, or retire stale records that cannot be supported or maintained. Do not update timestamps merely to appear fresh.

**Required proof:** 71/71 disposition ledger; retained-post source/reviewer/date coverage; change-log sample distinguishing metadata edits from substantive review; no overdue published record under the approved cadence. Automation can detect age and source gaps but cannot certify factual freshness.

## Release sequence and closure accounting

1. Export the exact record/term/form configuration and retain revision plus rollback evidence.
2. Apply mechanical quarantine first; verify absence from public queries, sitemaps, navigation, schema, feeds, and recommendations.
3. Build the evidence packet and draft. Do not publish metadata or schema ahead of the body.
4. Obtain all finding-specific approvals against the same content hash.
5. Publish to staging; run route, indexability, link, metadata, heading, content-leak, schema, accessibility, form, and browser checks applicable to the record.
6. Record `APPROVED_FOR_STAGING`; do not call the finding closed.
7. Release only exact approved fields to production through a scoped manifest.
8. Repeat production HTTP/crawl/rendered tests and attach evidence. Only then record `PRODUCTION_PROVEN` for the assertion actually demonstrated.

A finding with mixed outcomes must remain open. Example: `C8` is not closed because a byline renders if policy approval, 71/71 ownership, or schema consistency is missing. `H11` is not closed because a notice exists if form behavior or consent traces disagree. `H13` is not closed because a repository link exists if independent reproduction fails.

## Automated versus human proof register

| Work item | Current credit allowed | Still required before closure |
| --- | --- | --- |
| Audit extraction, exact IDs, deterministic queues, rollback fields, candidate copy, and validation assertions | `AUTOMATION_COMPLETE` as local evidence | Reconcile with current CMS state and obtain approvals. |
| Draft/noindex/410/redirect implementation | Credit only per environment after route, sitemap, navigation, schema, and link proof | Editorial disposition and production release proof. |
| Source/claim/field completeness checks | Credit as completeness, not accuracy | Named domain reviewer verifies meaning and source fitness. |
| JSON-LD parsing and validator results | Credit as syntax/validator evidence | Human identity/entity substantiation and visible-content match. |
| Phrase, grammar, link, date, and alt queues | Credit as review prioritization | Contextual editor/accessibility decisions. |
| Policy templates and proposed legal copy | No trust/legal credit | Actual operations, legal-operator attestation, and privacy/legal approval. |
| Child, affiliate, credential, security, benchmark, or institutional claims | No substantive credit from automation | Required specialist, relationship, operator, and legal evidence. |
| Green staging crawl | Staging implementation evidence only | Exact production release plus live crawl/rendered and human evidence packet. |

## Finding coverage

This plan contains an explicit action section for every required report finding:

`C5`, `C6`, `C7`, `C8`, `H7`, `H8`, `H9`, `H10`, `H11`, `H12`, `H13`, `M2`, `M3`, `M7`, `M8`, `M9`, `M10`, `M11`.

Related local artifacts: `AIAMIGOS_HOSTILE_SEO_CONTENT_REVIEW_2026-08-13.md`, `remediation/content-patch-plan.json`, `remediation/content-patch-plan.README.md`, and `remediation/remediation-registry.json`.
