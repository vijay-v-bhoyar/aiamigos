# Graph Report - remediation\wp-plugin\aiamigos-remediation  (2026-08-13)

## Corpus Check
- 13 files · ~22,182 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 257 nodes · 389 edges · 16 communities (12 shown, 4 thin omitted)
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- AIAmigos_Remediation_Plugin
- dom-accessibility-module-fixture.mjs
- aiamigos-accessibility-remediation.js
- FakeElement
- static-check.mjs
- AIAmigos_Remediation_Policy
- test-schema-author.php
- Isolated M2/M5 accessibility module
- wp_parse_url
- is_singular
- static-accessibility-module-check.mjs
- AI Amigos Remediation WordPress plugin
- wp_unslash

## God Nodes (most connected - your core abstractions)
1. `AIAmigos_Remediation_Plugin` - 84 edges
2. `AIAmigos_Remediation_Policy` - 28 edges
3. `FakeElement` - 25 edges
4. `setAttributeIfChanged()` - 11 edges
5. `wireSearchControls()` - 11 edges
6. `synchronizeCarousel()` - 11 edges
7. `wireMenuControls()` - 9 edges
8. `is_singular()` - 9 edges
9. `normalizedText()` - 7 edges
10. `setLabelIfMissing()` - 7 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (16 total, 4 thin omitted)

### Community 1 - "dom-accessibility-module-fixture.mjs"
Cohesion: 0.08
Nodes (9): buildCarouselFixture(), buildSlide(), failures, FakeClassList, FakeDocument, FakeEvent, MutationRegistry, testRoot (+1 more)

### Community 2 - "aiamigos-accessibility-remediation.js"
Cohesion: 0.22
Nodes (26): containsActiveFocus(), elementIsVisible(), focusSafely(), forwardExpandedPointerAreaToChild(), hasAccessibleName(), initialize(), labelStaticLinks(), makeEquivalentCustomButton() (+18 more)

### Community 3 - "FakeElement"
Cohesion: 0.15
Nodes (3): FakeElement, matchesSimple(), test()

### Community 4 - "static-check.mjs"
Cohesion: 0.08
Nodes (19): actualGonePaths, actualQuarantinedIds, all, bootstrapFile, callbackMatches, expectedGonePaths, expectedQuarantinedIds, methodNames (+11 more)

### Community 6 - "test-schema-author.php"
Cohesion: 0.13
Nodes (9): AIAmigos_Accessibility_Remediation, add_action(), add_filter(), aiamigos_schema_test_same(), aiamigos_schema_test_true(), is_admin(), remove_action(), wp_doing_ajax() (+1 more)

### Community 7 - "Isolated M2/M5 accessibility module"
Cohesion: 0.17
Nodes (11): Browser proof and remaining promotion gates, Deterministic behavior, Empty-source placeholders, Explicit non-goals, Files, Home carousel, Integration, Isolated M2/M5 accessibility module (+3 more)

### Community 8 - "wp_parse_url"
Cohesion: 0.24
Nodes (3): home_url(), set_url_scheme(), wp_parse_url()

### Community 10 - "static-accessibility-module-check.mjs"
Cohesion: 0.22
Nodes (7): failures, files, inventory, pluginRoot, remediationRoot, results, testRoot

### Community 11 - "AI Amigos Remediation WordPress plugin"
Cohesion: 0.25
Nodes (7): Acceptance checklist, AI Amigos Remediation WordPress plugin, Filters, Install and activate, Rollback and uninstall, Tests, What it changes at runtime

## Knowledge Gaps
- **44 isolated node(s):** `testRoot`, `tests`, `failures`, `testRoot`, `pluginRoot` (+39 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AIAmigos_Remediation_Plugin` connect `AIAmigos_Remediation_Plugin` to `AIAmigos_Remediation_Policy`, `test-schema-author.php`, `wp_parse_url`, `is_singular`, `wp_unslash`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **Why does `FakeElement` connect `FakeElement` to `dom-accessibility-module-fixture.mjs`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `synchronizeCarousel()` connect `aiamigos-accessibility-remediation.js` to `FakeElement`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `AIAmigos_Remediation_Policy` (e.g. with `.apply_route_policy()` and `.blog_base_path()`) actually correct?**
  _`AIAmigos_Remediation_Policy` has 19 INFERRED edges - model-reasoned connections that need verification._
- **What connects `testRoot`, `tests`, `failures` to the rest of the system?**
  _44 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AIAmigos_Remediation_Plugin` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `dom-accessibility-module-fixture.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.0812807881773399 - nodes in this community are weakly interconnected._