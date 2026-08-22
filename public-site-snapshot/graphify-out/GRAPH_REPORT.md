# Graph Report - public-site-snapshot  (2026-08-13)

## Corpus Check
- 22 files · ~833,184 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 274 nodes · 585 edges · 27 communities (24 shown, 3 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 84 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Owl
- jquery.min-01a0307c4b.js
- tether-87037ead7a.js
- y
- regenerator-runtime.min-ff50f4e9f0.js
- jquery-migrate.min-ddf92e775e.js
- bootstrap.min-b5eee535c3.js
- comment-reply.min-9ed675ce47.js
- i18n.min-9fecd1f3b8.js
- wp-polyfill-inert.min-c7a56991a9.js
- index-488296b410.js
- wp-consent-api.min-29676f10ff.js
- owl.carousel-78e514b265.js
- d

## God Nodes (most connected - your core abstractions)
1. `Owl()` - 56 edges
2. `243()` - 23 edges
3. `y()` - 19 edges
4. `o()` - 13 edges
5. `i()` - 12 edges
6. `re()` - 11 edges
7. `n()` - 11 edges
8. `m()` - 11 edges
9. `I()` - 9 edges
10. `F()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `243()` --indirect_call--> `k()`  [INFERRED]
  public-site-snapshot/assets/googlesitekit-consent-mode-86cb52dcb9f2b27ed244-313fe6f64e.js → public-site-snapshot/assets/regenerator-runtime.min-ff50f4e9f0.js
- `L()` --indirect_call--> `w()`  [INFERRED]
  public-site-snapshot/assets/jquery.min-01a0307c4b.js → public-site-snapshot/assets/index-488296b410.js
- `r()` --indirect_call--> `ot()`  [INFERRED]
  public-site-snapshot/assets/bootstrap.min-b5eee535c3.js → public-site-snapshot/assets/jquery.min-01a0307c4b.js
- `o()` --indirect_call--> `fe()`  [INFERRED]
  public-site-snapshot/assets/bootstrap.min-b5eee535c3.js → public-site-snapshot/assets/jquery.min-01a0307c4b.js
- `243()` --indirect_call--> `A()`  [INFERRED]
  public-site-snapshot/assets/googlesitekit-consent-mode-86cb52dcb9f2b27ed244-313fe6f64e.js → public-site-snapshot/assets/jquery.min-01a0307c4b.js

## Import Cycles
- None detected.

## Communities (27 total, 3 thin omitted)

### Community 1 - "jquery.min-01a0307c4b.js"
Cohesion: 0.08
Nodes (46): o(), r(), 243(), r(), t(), A(), Ae(), B() (+38 more)

### Community 2 - "tether-87037ead7a.js"
Cohesion: 0.13
Nodes (14): addClass(), _classCallCheck(), Evented(), extend(), getActualBoundingClientRect(), getBoundingRect(), getBounds(), getClassName() (+6 more)

### Community 3 - "y"
Cohesion: 0.48
Nodes (18): a(), d(), e(), f(), g(), h(), i(), l() (+10 more)

### Community 5 - "regenerator-runtime.min-ff50f4e9f0.js"
Cohesion: 0.22
Nodes (9): J(), E(), h(), j(), k(), l(), O(), u() (+1 more)

### Community 6 - "jquery-migrate.min-ddf92e775e.js"
Cohesion: 0.36
Nodes (7): a(), c(), e(), i(), r(), T(), u()

### Community 7 - "bootstrap.min-b5eee535c3.js"
Cohesion: 0.39
Nodes (5): i(), l(), n(), s(), Se()

### Community 8 - "comment-reply.min-9ed675ce47.js"
Cohesion: 0.57
Nodes (7): a(), d(), g(), l(), m(), o(), t()

### Community 9 - "i18n.min-9fecd1f3b8.js"
Cohesion: 0.43
Nodes (4): a(), n(), o(), p()

### Community 10 - "wp-polyfill-inert.min-c7a56991a9.js"
Cohesion: 0.43
Nodes (4): d(), h(), l(), u()

### Community 13 - "wp-consent-api.min-29676f10ff.js"
Cohesion: 0.70
Nodes (4): consent_api_get_cookie(), consent_api_set_cookie(), wp_has_consent(), wp_set_consent()

### Community 14 - "owl.carousel-78e514b265.js"
Cohesion: 0.67
Nodes (3): prefixed(), TODO: Should be computed from number of min width items in stage, test()

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `243()` connect `jquery.min-01a0307c4b.js` to `Owl`, `y`, `regenerator-runtime.min-ff50f4e9f0.js`?**
  _High betweenness centrality (0.255) - this node is a cross-community bridge._
- **Why does `Owl()` connect `Owl` to `.off`, `owl.carousel-78e514b265.js`?**
  _High betweenness centrality (0.250) - this node is a cross-community bridge._
- **Why does `y()` connect `y` to `jquery.min-01a0307c4b.js`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Are the 20 inferred relationships involving `243()` (e.g. with `A()` and `Ae()`) actually correct?**
  _`243()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `y()` (e.g. with `243()` and `ee()`) actually correct?**
  _`y()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `o()` (e.g. with `e()` and `n()`) actually correct?**
  _`o()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `i()` (e.g. with `a()` and `f()`) actually correct?**
  _`i()` has 6 INFERRED edges - model-reasoned connections that need verification._