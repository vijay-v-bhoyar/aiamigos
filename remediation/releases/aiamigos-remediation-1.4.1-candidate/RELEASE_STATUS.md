# AI Amigos remediation 1.4.1 candidate

**Status:** `PREPARED_NOT_DEPLOY_READY`  
**Built:** 2026-08-13

This candidate contains eight runtime files copied byte-for-byte from the settled local v1.4.1 source. It is deliberately separate from the retained v1.4.0 directory and ZIP.

Local source gates passed:

- plugin static checks: 78/78;
- accessibility static checks: 63/63;
- accessibility DOM fixtures: 6/6;
- PHP 8.4.24 lint: 7/7 current source/test PHP files;
- policy fixture: 29/29;
- schema/author fixture: 36/36;
- Graphify: 257 nodes, 389 edges, zero missing/dangling/self-loop/duplicate/collapsed edges after the adversarial schema fixture was added.

This is not authorization to deploy. Current-candidate staging activation, cache purge, PHP/web-SAPI smoke, browser-required no-skip crawl, server logs, database-preservation evidence, exact 1200x630 brand approval, and outstanding human/legal/content/accessibility decisions have not passed. Production remains `NO-GO`.
