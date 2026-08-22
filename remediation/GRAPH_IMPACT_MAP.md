# Graph Impact Map for P0/P1 SEO Remediation

**Snapshot date:** 2026-08-13  
**Graph:** `graphify-out/graph.json`  
**Purpose:** Map the hostile-review P0/P1 surfaces to exact deployed-snapshot files, Graphify node IDs, and labeled communities before work begins in the authoritative WordPress source.

## How to read this map

This is an impact map, not a claim that the captured files are the editable production source. The workspace contains a deployed public snapshot. A WordPress change must be made in the actual theme, child theme, plugin configuration, database content, media library, or server configuration, then verified against a new public capture.

Graphify's existing-graph fast path was used without rebuilding. The required vocabulary-constrained query was:

```text
graphify query "home blog pagination placeholder newsletter biography navigation metadata performance error certifications grokai" --budget 5000
```

It traversed 205 nodes from such anchors as `Blog Pagination`, `AI Certifications`, `GrokAI Unveiled...`, `Newsletter Content Disclaimer and Terms of Use`, and `Recent Case Title 01 Placeholder`. The tables below resolve exact IDs directly against the same `graph.json`, avoiding ambiguity from the query's budget truncation.

### Scope aliases

- **HTML114** means the exact 114 unique `pages/*.html` source files represented by nodes in `graph.json`.
- **JS20** means the exact 20 unique `assets/*.js` source files represented by nodes in `graph.json`.
- The graph has 1,799 nodes, 3,042 links, 18 hyperedges, 119 labeled communities, and 135 node-producing source files: HTML114 + JS20 + `meta/robots.txt`.
- Two JSON files counted in the 137-file corpus produced no nodes. Sixteen captured CSS files are retained on disk but are outside this graph.

## Priority and graph cut-set summary

| Surface | Priority | Primary communities | Main graph cut point |
|---|---:|---|---|
| Root versus `/home/` | P0 | C2 `AI Content Indexes` | Both competing destinations are in one community, so routing, canonicals, navigation, and archive behavior must be changed together. |
| Blog pagination | P0 | C2 `AI Content Indexes` | `Blog Pagination` is anchored to the root snapshot only; `/page/2/` through `/page/8/` are outside the graph snapshot. |
| Demo records | P0 | C57-C59, C103, C105 | Eight demo URLs form five isolated placeholder communities suitable for removal as one release unit. |
| Newsletter shortcodes | P0 | C85 `Newsletter Subscription Form`; C41 `Newsletter Legal Terms`; C2 for branded-home footer | The functional and legal newsletter pages are split; footer shortcode text is sitewide but is not a semantic graph node. |
| Author trust | P0 | C56 `Vijay Bhoyar Profile` | The only named-person community is insufficiently connected to post authorship; all HTML graph nodes have null `author`. |
| Navigation and footer links | P0 then P1 | C67 `Custom Navigation Controls`; C51, C39, C2 | JavaScript controls are mapped, but shared template URLs are repeated HTML literals rather than a graph-level component. |
| Metadata and headings | P1 | C2, C19, C21, C41, C52, C85 and thin-hub communities | Page concepts are mapped; head tags and heading levels require the deterministic audit/HTML because Graphify did not create nodes for most of them. |
| Factual content | P0 quarantine; P1/P2 rewrite | C49, C9, C35, C10 | Each high-risk page has a distinct content community, enabling independent unpublish/rewrite decisions. |
| Performance assets | P1 | C0, C1, C24, C34, C67, C82, C114 and carousel satellites | The graph maps JavaScript structure, not image transfer weight, CSS cost, DOM cost, or field Core Web Vitals. |
| `wp is not defined` | P0 | C80 `WordPress Hooks Runtime`; C60 `WordPress Internationalization Runtime` | Exact assets are mapped, but their browser scheduling dependency is absent from the undirected graph. |

## 1. Root versus `/home/`

| Public route | Captured file | Exact graph nodes | Community |
|---|---|---|---|
| `/` | `pages/home-7df9c6845f.html` | `public_site_snapshot_pages_home_7df9c6845f_ai_amigos_blog_index` (`AI Amigos Blog Index`); `public_site_snapshot_pages_home_7df9c6845f_ai_blog_article_index` (`AI Blog Article Index`); `public_site_snapshot_pages_home_7df9c6845f_blog_pagination` (`Blog Pagination`) | C2 `AI Content Indexes` |
| `/home/` | `pages/home-d4c4647786.html` | `public_site_snapshot_pages_home_d4c4647786_ai_amigos_simplifying_ai_for_everyone` (`AI Amigos - Simplifying AI for Everyone`); `public_site_snapshot_pages_home_d4c4647786_simplifying_ai_for_everyone` (`Simplifying AI for Everyone`); `public_site_snapshot_pages_home_d4c4647786_ai_hub_for_beginners_and_enthusiasts` (`AI Hub for Beginners and Enthusiasts`) | C2 `AI Content Indexes` |

**Blast radius:** one route change affects the root archive, branded landing page, primary navigation, canonical/OG/Twitter/schema URLs, breadcrumbs, sitemap entries, internal links, and pagination. C2 correctly groups both page concepts, but the graph does not encode WordPress rewrite rules or database page assignments.

**Release boundary:** publish the branded experience at `/`, publish a complete archive at `/blog/`, 301 `/home/` to `/`, and update every template reference in one governed release. Verify status, redirect, canonical, sitemap, schema, and navigation behavior before requesting recrawl.

## 2. Blog pagination

| Captured file | Exact node | Community |
|---|---|---|
| `pages/home-7df9c6845f.html` | `public_site_snapshot_pages_home_7df9c6845f_blog_pagination` (`Blog Pagination`) | C2 `AI Content Indexes` |

The graph contains no separate source files or nodes for `/page/2/` through `/page/8/`. Their repeated-page-one behavior was live/deterministic audit evidence, not Graphify coverage. Therefore:

- do not infer seven working or broken pagination implementations from one graph node;
- repair the actual WordPress paged query and archive template;
- recapture `/blog/`, page 2, an intermediate page, and the final page;
- prove non-overlapping post sets, correct current-page state, self-canonicals, valid next/previous navigation, and crawlable access to all posts before consolidating legacy archives.

## 3. Demo placeholders

These are the eight P0 removal targets. `/team/member-name-01/` is not counted among the eight because it names Vijay Bhoyar, but its placeholder slug and thin trust content are addressed under author trust.

| Public route | Captured file | Exact graph node | Community |
|---|---|---|---|
| `/classes/recent-case-title-01/` | `pages/classes-recent-case-title-01-9b98cb91e2.html` | `public_site_snapshot_pages_classes_recent_case_title_01_9b98cb91e2_recent_case_title_01` | C105 `Placeholder Case Studies` |
| `/classes/recent-case-title-02/` | `pages/classes-recent-case-title-02-b111c94815.html` | `public_site_snapshot_pages_classes_recent_case_title_02_b111c94815_recent_case_title_02` | C105 `Placeholder Case Studies` |
| `/testimonials/client-name-01/` | `pages/testimonials-client-name-01-0bc8ffe278.html` | `public_site_snapshot_pages_testimonials_client_name_01_0bc8ffe278_client_name_01` | C103 `Placeholder Client Testimonials` |
| `/testimonials/client-name-02/` | `pages/testimonials-client-name-02-457cb3d884.html` | `public_site_snapshot_pages_testimonials_client_name_02_457cb3d884_client_name_02` | C103 `Placeholder Client Testimonials` |
| `/testimonials/client-name-03/` | `pages/testimonials-client-name-03-a6fcb03eba.html` | `public_site_snapshot_pages_testimonials_client_name_03_a6fcb03eba_client_name_03` | C103 `Placeholder Client Testimonials` |
| `/team/member-name-02/` | `pages/team-member-name-02-dde22a9cb2.html` | `public_site_snapshot_pages_team_member_name_02_dde22a9cb2_member_name_02`; `public_site_snapshot_pages_team_member_name_02_dde22a9cb2_latin_language_biographical_copy` | C57 `Placeholder Team Profile Two` |
| `/team/member-name-03/` | `pages/team-member-name-03-33f364e973.html` | `public_site_snapshot_pages_team_member_name_03_33f364e973_member_name_03`; `public_site_snapshot_pages_team_member_name_03_33f364e973_latin_language_biographical_copy` | C58 `Placeholder Team Profile Three` |
| `/team/member-name-04/` | `pages/team-member-name-04-fb23e4b2a8.html` | `public_site_snapshot_pages_team_member_name_04_fb23e4b2a8_member_name_04`; `public_site_snapshot_pages_team_member_name_04_fb23e4b2a8_latin_language_biographical_copy` | C59 `Placeholder Team Profile Four` |

**Release boundary:** remove the underlying custom post records, sitemap entries, internal cards/links, structured data, and cached copies. Return `410` for records with no legitimate replacement; use a narrowly relevant `301` only where a genuine replacement exists. A release gate should reject `Client Name`, `Member Name`, `Recent Case Title`, Latin demo biography text, and similar seeded content.

## 4. Newsletter shortcodes and duplicate intent

| Surface | Captured file | Exact graph nodes | Community |
|---|---|---|---|
| Sitewide footer form ID 3 | HTML114; example `pages/home-d4c4647786.html` line 1166 | No shortcode node. Branded-home anchor: `public_site_snapshot_pages_home_d4c4647786_ai_amigos_simplifying_ai_for_everyone` | C2 `AI Content Indexes` |
| `/newsletter/` form ID 2 | `pages/newsletter-9f7cb4526c.html` lines 27, 35, 668; footer repeat at 683 | `public_site_snapshot_pages_newsletter_9f7cb4526c_mailpoet_form_id_2`; `public_site_snapshot_pages_newsletter_9f7cb4526c_mailpoet_newsletter_subscription_form`; `public_site_snapshot_pages_newsletter_9f7cb4526c_newsletter_subscription_page` | C85 `Newsletter Subscription Form` |
| `/newsletter-2/` legal/brand duplicate | `pages/newsletter-2-9ec1b062c9.html`; unresolved company token at line 682 | `public_site_snapshot_pages_newsletter_2_9ec1b062c9_byte_sized_chaos_newsletter`; `public_site_snapshot_pages_newsletter_2_9ec1b062c9_newsletter_content_disclaimer_and_terms_of_use`; `public_site_snapshot_pages_newsletter_2_9ec1b062c9_acceptance_of_terms_by_subscription` | C41 `Newsletter Legal Terms` |

The malformed footer shortcode occurs in all 114 captured HTML files. That repetition is an HTML/template fact, not 114 graph nodes. Fix the one authoritative widget/block/template source, consolidate the two routes, and end-to-end test form rendering, validation, consent, double opt-in if used, confirmation, delivery, unsubscribe, suppression, and privacy disclosure.

## 5. Author trust

Graphify has no post-author node and every one of the 1,521 HTML-derived graph nodes has `author: null`. The deterministic audit also found `hasVisibleAuthorSignal: false` on all 114 pages. The graph can map the only named team profile, but it cannot establish authorship of the 71 posts.

| Captured file | Exact graph nodes | Community |
|---|---|---|
| `pages/team-member-name-01-95b84657c8.html` | `public_site_snapshot_pages_team_member_name_01_95b84657c8_vijay_bhoyar`; `public_site_snapshot_pages_team_member_name_01_95b84657c8_vijay_bhoyar_team_profile`; `public_site_snapshot_pages_team_member_name_01_95b84657c8_ai_research_analyst`; `public_site_snapshot_pages_team_member_name_01_95b84657c8_content_generator` | C56 `Vijay Bhoyar Profile` |

**Required source change:** replace the domain-named account presentation with accountable individual bylines; publish qualification-specific author and reviewer bios, legal publisher identity, editorial/sourcing/corrections/AI-use/conflict policies, and visible reviewed/updated dates. Connect each claim-sensitive article to the person who wrote and reviewed it. The current graph's absence of an author relationship must not be read as proof that no private WordPress author record exists; it proves that accountable authorship was not captured in the public output.

## 6. Navigation and footer links

### Graph-mapped control and page anchors

| Captured file | Exact graph nodes | Community | Relevance |
|---|---|---|---|
| `assets/custom-657fd4ab0e.js` | `assets_custom_657fd4ab0e`; `assets_custom_657fd4ab0e_myscrollnav`; `assets_custom_657fd4ab0e_open`; `assets_custom_657fd4ab0e_close` | C67 `Custom Navigation Controls` | Menu/scroll behavior; not the menu URL data source. |
| `pages/latest-blog-title-01-e452e4138f.html` | `public_site_snapshot_pages_latest_blog_title_01_e452e4138f_demystifying_artificial_intelligence_how_does_it_shape_our_world`; `public_site_snapshot_pages_latest_blog_title_01_e452e4138f_demystifying_ai_alternate_article` | C51 `AI Demystification Examples` | Page containing the missing demystifying-article link. The graph records a `references` edge between these concepts but not the target HTTP status. |
| `pages/academy-6e3a34d9ea.html` | `public_site_snapshot_pages_academy_6e3a34d9ea_ai_amigos_academy`; `public_site_snapshot_pages_academy_6e3a34d9ea_ai_learning_academy` | C39 `Kids AI Learning Books` | Page containing the malformed `/academy/www.youtube.com/...` target; that URL is not a graph node. |
| Root and branded home files from section 1 | Root/home nodes listed above | C2 `AI Content Indexes` | Primary Home/Blog destination split. |

The malformed `tel:contact@aiamigos.org`, HTTP YouTube target, stale `@2023`, and malformed MailPoet footer text occur in all 114 captured HTML files. They have no dedicated semantic nodes. Fix the shared footer/menu source once, remove `/index.php/` and apex redirect hops, point every internal navigation link at its final HTTPS URL, and then redesign P1 navigation around the chosen audience journeys.

**Verification:** crawl every internal destination, fail on non-200 terminal destinations except intentional redirects, assert no `http://` internal/social targets, assert `mailto:contact@aiamigos.org`, and browser-test keyboard/mobile menu behavior. Graph C67 can guide JavaScript inspection but cannot validate URL correctness.

## 7. Metadata, headings, and thin hubs

Graphify extracted page concepts, not a normalized DOM/head model. Use `output/seo-audit.json` and the exact HTML to verify title, description, canonical, Open Graph, Twitter, schema, and H1-H3 rules. The graph anchors the affected page communities:

| Defect group | Captured files and exact anchor nodes | Communities |
|---|---|---|
| Root generic metadata and branded home with no H1 | `pages/home-7df9c6845f.html` -> `public_site_snapshot_pages_home_7df9c6845f_ai_amigos_blog_index`; `pages/home-d4c4647786.html` -> `public_site_snapshot_pages_home_d4c4647786_ai_amigos_simplifying_ai_for_everyone` | C2 `AI Content Indexes` |
| Multiple/blank H1s | `pages/python-deployment-best-practices-a-comprehensive-guide-5d8c8ff810.html` -> `public_site_snapshot_pages_python_deployment_best_practices_a_comprehensive_guide_5d8c8ff810_python_deployment_best_practices_a_comprehensive_guide`; `pages/a-comprehensive-guide-to-nvidia-monai-unlocking-ai-in-medical-imaging-d4306e85d4.html` -> `public_site_snapshot_pages_a_comprehensive_guide_to_nvidia_monai_unlocking_ai_in_medical_imaging_d4306e85d4_a_comprehensive_guide_to_nvidia_monai_unlocking_ai_in_medical_imaging`; `pages/langgraph-5-stunning-secrets-for-building-a-generative-ai-application-641802efc2.html` -> `public_site_snapshot_pages_langgraph_5_stunning_secrets_for_building_a_generative_ai_application_641802efc2_langgraph_5_stunning_secrets_for_building_a_generative_ai_application` | C21 `Python Deployment Practices`; C19 `NVIDIA MONAI Medical Imaging`; C2 `AI Content Indexes` |
| About heading/trust structure | `pages/about-us-7b24d71848.html` -> `public_site_snapshot_pages_about_us_7b24d71848_about_us` | C52 `AI Amigos About Page` |
| Duplicate newsletter titles/intents | Newsletter files and nodes from section 4 | C85 and C41 |
| Thin/dead hubs | `pages/others-2df65989d4.html` -> `public_site_snapshot_pages_others_2df65989d4_other_ai_resources_hub`; `pages/shop-d1aa1283a6.html` -> `public_site_snapshot_pages_shop_d1aa1283a6_ai_amigos_shop_page`; `pages/classes-14c49e5e53.html` -> `public_site_snapshot_pages_classes_14c49e5e53_ai_courses_for_kids`; `pages/ai-career-018e268ffa.html` -> `public_site_snapshot_pages_ai_career_018e268ffa_ai_career`; `pages/services-7f2795f6d3.html` -> `public_site_snapshot_pages_services_7f2795f6d3_ai_amigos_services_page`; `pages/academy-6e3a34d9ea.html` -> `public_site_snapshot_pages_academy_6e3a34d9ea_ai_learning_academy` | C106, C118, C117, C83, C4, C39 |

The current audit queue spans all 114 pages: 12 missing descriptions, 38 titles over 60 characters, 38 under 20, 50 descriptions over 160, 13 under 70, plus duplicate root/category and newsletter titles. Length thresholds are heuristics; intent uniqueness and accuracy govern the rewrite. Establish one template contract per content type and validate generated output, not only editor fields.

## 8. Factual content quarantine and rewrite

`EXTRACTED` means a claim or relationship appeared explicitly in captured content. It does **not** mean the claim is true. These graph communities locate the P0 quarantine targets and the exact claims that need primary-source verification.

| Public route / file | Exact graph nodes requiring review | Community |
|---|---|---|
| `/ai-certifications/` -> `pages/ai-certifications-22e68e8ff1.html` | `public_site_snapshot_pages_ai_certifications_22e68e8ff1_employer_valued_ai_credentials`; `public_site_snapshot_pages_ai_certifications_22e68e8ff1_google_ai_certification`; `public_site_snapshot_pages_ai_certifications_22e68e8ff1_aws_certified_machine_learning_specialty`; `public_site_snapshot_pages_ai_certifications_22e68e8ff1_databricks_certified_associate_data_scientist`; `public_site_snapshot_pages_ai_certifications_22e68e8ff1_openai_gym_reinforcement_learning_engineer`; `public_site_snapshot_pages_ai_certifications_22e68e8ff1_nvidia_deep_learning_institute_certified_instructor` | C49 `AI Professional Certifications` |
| `/gpt-models/` -> `pages/gpt-models-08a9c96f9d.html` | `public_site_snapshot_pages_gpt_models_08a9c96f9d_gpt_models_7_groundbreaking_applications_transforming_the_text_generation_landscape`; `public_site_snapshot_pages_gpt_models_08a9c96f9d_gpt_3`; `public_site_snapshot_pages_gpt_models_08a9c96f9d_gpt_j`; `public_site_snapshot_pages_gpt_models_08a9c96f9d_megatron_turing_nlg`; `public_site_snapshot_pages_gpt_models_08a9c96f9d_google_ai` | C9 `GPT Applications and Limitations` |
| `/grokai/` -> `pages/grokai-9e6b515015.html` | `public_site_snapshot_pages_grokai_9e6b515015_grokai_custom_ai_platform`; `public_site_snapshot_pages_grokai_9e6b515015_grokai_business_system_integration`; `public_site_snapshot_pages_grokai_9e6b515015_grokai_data_security`; `public_site_snapshot_pages_grokai_9e6b515015_grokai_scalability`; `public_site_snapshot_pages_grokai_9e6b515015_scalable_customer_support` | C35 `Custom Business GrokAI` |
| `/ai-model-benchmarks-a-comprehensive-guide/` -> `pages/ai-model-benchmarks-a-comprehensive-guide-83f128c39f.html` | `public_site_snapshot_pages_ai_model_benchmarks_a_comprehensive_guide_83f128c39f_article`; `public_site_snapshot_pages_ai_model_benchmarks_a_comprehensive_guide_83f128c39f_benchmark_dimensions`; `public_site_snapshot_pages_ai_model_benchmarks_a_comprehensive_guide_83f128c39f_model_comparison`; `public_site_snapshot_pages_ai_model_benchmarks_a_comprehensive_guide_83f128c39f_named_benchmark_suites` | C10 `AI Leadership and Strategy` |

Quarantine or retract first. Re-publish only with dated primary sources, a named reviewer, a verification date, a reproducible method where benchmarking is claimed, and a correction history.

## 9. Performance assets

### JavaScript nodes captured by Graphify

| Captured asset | Bytes on disk | Exact base node | Community |
|---|---:|---|---|
| `assets/wp-polyfill.min-201bf9189c.js` | 115,127 | `assets_wp_polyfill_min_201bf9189c` | C34 `WordPress Polyfill Runtime` |
| `assets/owl.carousel-78e514b265.js` | 89,990 | `assets_owl_carousel_78e514b265` | C1 `Owl Carousel Framework`; satellite communities C78 and C109-C113 |
| `assets/jquery.min-01a0307c4b.js` | 87,553 | `assets_jquery_min_01a0307c4b` | C0 `Core Frontend Runtime` |
| `assets/bootstrap.min-b5eee535c3.js` | 58,072 | `assets_bootstrap_min_b5eee535c3` | C0 `Core Frontend Runtime` |
| `assets/tether-87037ead7a.js` | 55,635 | `assets_tether_87037ead7a` | C24 `Tether Positioning Library` |
| `assets/SmoothScroll-1f4c4cea2c.js` | 23,210 | `assets_smoothscroll_1f4c4cea2c` | C114 `Smooth Scrolling Library` |
| `assets/custom-657fd4ab0e.js` | 9,666 | `assets_custom_657fd4ab0e` | C67 `Custom Navigation Controls` |
| `assets/wow.min-8a798896bc.js` | 8,415 | `assets_wow_min_8a798896bc` | C82 `Scroll Animation Library` |

This table is an inventory, not proof that a bundle is unused or blocking. C1's 92 nodes and carousel satellites show complexity, but only browser coverage and dependency testing can justify removal.

The dominant observed mobile payload was image transfer: approximately 11.95 MB on `/` and 34.48 MB on `/home/`. Images are URL references inside captured HTML, not captured files or graph nodes. The 16 CSS files are also outside the graph. Consequently, no Graphify community can honestly represent the 5.89 MB image, responsive-image defects, duplicate image downloads, rendered dimensions, DOM size, or LCP. Use network traces/Lighthouse plus the media library to identify and replace originals with responsive AVIF/WebP, remove duplicate carousel requests, and set explicit performance budgets.

## 10. Sitewide JavaScript exception

All 114 captured HTML files contain this ordering pattern:

1. deferred `wp-hooks-js`;
2. deferred `wp-i18n-js`;
3. an immediately executed inline `wp.i18n.setLocaleData(...)` block.

Examples are `pages/home-7df9c6845f.html` lines 864-868 and `pages/home-d4c4647786.html` lines 1285-1289. The inline call can execute before the deferred scripts establish `wp`, matching the observed `ReferenceError: wp is not defined`.

| Captured asset | Exact graph nodes | Community |
|---|---|---|
| `assets/hooks.min-e459880fa2.js` | `assets_hooks_min_e459880fa2`; `assets_hooks_min_e459880fa2_d`; `assets_hooks_min_e459880fa2_d_constructor` | C80 `WordPress Hooks Runtime` |
| `assets/i18n.min-9fecd1f3b8.js` | `assets_i18n_min_9fecd1f3b8`; `assets_i18n_min_9fecd1f3b8_plural_forms`; `assets_i18n_min_9fecd1f3b8_d`; `assets_i18n_min_9fecd1f3b8_n` | C60 `WordPress Internationalization Runtime` |

Graphify contains only intra-file `contains` edges for these base nodes. It contains no hooks-to-i18n edge and no HTML-inline-to-asset scheduling edge. Treat the load-order explanation as HTML/browser evidence, not as a relationship proven by the graph. Fix the WordPress enqueue/dependency/defer policy or remove the orphaned inline localization call, then assert zero uncaught exceptions across a representative page matrix.

## Snapshot and graph limits

1. **Deployed output, not authoritative source.** The snapshot omits PHP templates, database records, WordPress admin settings, Customizer state, server rewrite rules, plugin runtime state, secrets, revisions, and deployment history.
2. **Point-in-time evidence.** `snapshot-manifest.json` was generated on 2026-08-13. It does not prove the current live state after that timestamp.
3. **Graph coverage is asymmetric.** Semantic HTML concepts and JavaScript AST symbols are represented. Most head tags, heading levels, literal footer/menu URLs, inline script scheduling, CSS rules, media bytes, HTTP statuses of linked targets, and browser resource timing are not first-class nodes.
4. **No pagination-page graph coverage.** `/page/2/` through `/page/8/` were not separate graph inputs.
5. **No authorship relationship.** All HTML-derived graph nodes have `author: null`; C56 is a team-profile community, not proof of post authorship.
6. **Extraction is not verification.** `EXTRACTED` records what the public page said; factual claims still require primary-source validation.
7. **Semantic locations are often absent.** Many HTML concept nodes have `source_location: null`; exact HTML line references in this document come from the captured file, not Graphify's node metadata.

## Graphify edge-collapse caveat

The pre-build extraction had 3,138 raw edges. The exported graph is an undirected, non-multigraph with 3,042 links. Its health check found no missing endpoints, dangling endpoints, or self-loops, but found 96 same-endpoint collapses, including 73 exact duplicate edges.

Practical consequences:

- edge direction cannot be used to prove caller/callee, source/target, canonical/alternate, or dependency order;
- multiple relations between the same two endpoints may have collapsed into one exported link;
- repeated sitewide template occurrences can collapse or disappear as separate relationships;
- the graph is reliable for locating concepts/files/communities, but it is not a lossless execution, DOM, or URL-routing model.

Use graph edges to choose where to inspect. Use the authoritative WordPress source, deterministic HTML/HTTP checks, and browser tests to prove the remediation.

## Post-change graph verification

After the authoritative source is changed and the new public deployment passes route, content, link, runtime, and performance checks:

1. recapture the deployed site with the same route inventory plus `/blog/` pagination samples;
2. run Graphify incrementally against that new snapshot;
3. confirm the eight placeholder communities/nodes are gone by intended removal, not extraction failure;
4. confirm `/` holds the branded-home concepts and `/blog/` holds the archive/pagination concepts;
5. confirm newsletter concepts consolidate into one intentional community/page;
6. confirm author/reviewer entities and their article relationships become visible in public output;
7. rerun the graph health check and compare node/edge/community deltas without forcing past shrink protection blindly;
8. keep graph proof separate from live HTTP, browser, Search Console, and conversion evidence.
