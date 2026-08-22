# Isolated M2/M5 accessibility module

Status: integrated in plugin v1.4.0 and deployed on staging; not promoted to production  
Evidence: `remediation/media-accessibility-inventory.json`  
Scope: deterministic controls and source-less carousel placeholders only

## Files

- `includes/class-aiamigos-accessibility-remediation.php`
- `assets/css/aiamigos-accessibility-remediation.css`
- `assets/js/aiamigos-accessibility-remediation.js`
- `tests/static-accessibility-module-check.mjs`
- `tests/dom-accessibility-module-fixture.mjs`

The module does not edit posts, media records, alt fields, options, users, comments, or the database. It does not buffer or rewrite a full HTML response.

## Integration

The local v1.4.0 bootstrap includes these two lines immediately after the existing class `require_once` statements and before the existing main-class `boot()` call:

```php
require_once AIAMIGOS_REMEDIATION_DIR . 'includes/class-aiamigos-accessibility-remediation.php';
AIAmigos_Accessibility_Remediation::boot();
```

No activation hook or schema migration is required. Removing those two lines is the code rollback. The module can also be disabled without a file change:

```php
add_filter( 'aiamigos_accessibility_remediation_enabled', '__return_false' );
```

Staging must receive the PHP, CSS and JavaScript files before this bootstrap is uploaded. That dependency-safe order prevents a fatal include during deployment.

The 2026-08-13 staging deployment followed that order and byte-verified every remote file before activation. The final cache-bypassed, browser-required regression run passed 16/16 checks with no skips; its machine-readable result is `remediation/tests/results/seo-regression-staging-v1.4.0-a11y2-browser.json`. Direct 390 by 844 testing additionally proved 20/20 named 44-by-44 carousel dots, one current original with clones hidden, keyboard-operated menu and search controls, `Escape` close with focus return, a focus-safe carousel state beyond the five-second autoplay interval, compact card-heading typography, and zero horizontal overflow. This is staging evidence only.

## Deterministic behavior

### Shared theme controls

The JavaScript uses exact Sirat Pro selectors observed in the snapshot:

- Empty `.bradcrumbs > a[href]` links whose parsed destination is an AI Amigos root receive the name `Home`.
- Unnamed `#site_top .socialbox` and footer `.custom_linkedin` links receive a platform name derived from their existing class or destination host.
- `#open_nav.hamburger` and `#close_nav.close-sidebar` receive equivalent custom-button semantics, keyboard activation, names, `aria-controls`, and an observed `aria-expanded` state. The sidebar's `class`, `hidden`, `open`, and inline `style` attributes drive synchronized `aria-expanded`/`aria-hidden` values.
- `.header-search .search-icon` and the exact `.header-search .serach_outer .closepop > i` icon receive equivalent custom-button semantics, keyboard activation, deterministic action names, and state synchronized from the existing `.serach_outer` panel. Targeting the child icon preserves Sirat's full-width, right-aligned close wrapper.
- Expanded pointer-area clicks on the search wrappers are forwarded only when the wrapper itself was the event target. The existing icon child's handler remains the action authority; recursion and duplicate wrapper activation are guarded.
- Opening navigation transfers focus to its close control; opening search transfers focus into its existing input/control. `Escape` closes either disclosure only while focus is inside, and close returns focus to the corresponding opener.

Existing accessible names are never replaced.

### Target size and focus

The CSS gives the evidenced social, navigation-toggle, search, mobile-menu, and carousel controls a 44 by 44 CSS-pixel design target where applicable. Focus uses a white inner outline plus a dark outer ring so it remains visible on light and dark surfaces; forced-colors mode delegates the outline to the system `Highlight` color. The 44-pixel target is a design policy, not a claim that it is the WCAG 2.2 AA minimum.

The exact selector `#our-blogs .our-blogs-content h3.aiamigos-blog-card-title` receives compact, responsive title typography. No `h5` fallback is used, so a changed theme structure fails closed instead of styling or naming an unrelated heading.

### Home carousel

The script waits for Owl Carousel's generated `.owl-item` structure. It then:

- derives each original slide name only from its existing `.our-blogs-content h3.aiamigos-blog-card-title` text after excluding `.screen-reader-text`, `[hidden]`, and `aria-hidden="true"` filler;
- names a picker with that visible title only when the picker-to-slide count is one-to-one;
- ignores hidden filler when deciding whether an Owl picker already has an accessible name;
- otherwise uses a nonsemantic ordinal page label rather than guessing a title association;
- associates one-to-one pickers with their original slide via `aria-controls`;
- exposes current picker and current original-slide state from Owl's existing `active` classes;
- names generated previous and next buttons if they are otherwise unnamed;
- keeps unfocused cloned slides out of the accessibility tree and tab order, but never applies `aria-hidden="true"` to a slide containing DOM focus;
- exposes active and focused original slides, with an active-picker and first-slide fallback if Owl temporarily reports no active original;
- asks the existing Owl instance to stop autoplay whenever focus enters the carousel or the user requests reduced motion.

A mutation observer is scoped to the one `#our-blogs .owl-carousel` subtree and listens only for child changes and `class` changes. Accessibility-attribute writes are outside its attribute filter, preventing a self-triggering mutation loop. It does not observe or serialize the whole document.

The duplicate screen-reader title copy is also removed at its source by the separate, hash-locked theme patch `remediation/theme-patch/sirat-pro-home-blog-accessible-title.patch`. That patch is not integrated or deployed by this module and must pass its exact preimage gate before staging use.

### Empty-source placeholders

Only this exact structure is eligible for removal:

```css
#our-blogs .owl-carousel .latest-blog-image > img[alt]
```

Removal occurs only when all of these are true:

- literal `src=""`;
- literal `alt=""`;
- empty/missing `srcset`;
- empty/missing `data-src`;
- empty/missing `data-lazy-src`.

This matches the two source-less records `ALT-162` and `ALT-163`. A real or lazy-loaded image is left untouched.

## Explicit non-goals

- Do not assign, generate, or infer semantic alt text for any of the 184 M2 review records.
- Do not alter the 71 author avatars without the rendered human decision ledger.
- Do not name the four image-only links from filenames or destination guesses.
- Do not remove the 28 content-editor empty anchors in this module; those belong to source-record review.
- Do not claim rendered carousel clone/accessibility-tree success from static or fixture tests.
- Do not broaden selectors to generic `img`, `a`, `button`, `.owl-carousel`, or other themes.

## Tests

Run:

```powershell
node --check remediation/wp-plugin/aiamigos-remediation/assets/js/aiamigos-accessibility-remediation.js
node remediation/wp-plugin/aiamigos-remediation/tests/static-accessibility-module-check.mjs
node remediation/wp-plugin/aiamigos-remediation/tests/dom-accessibility-module-fixture.mjs
node remediation/theme-patch/validate-accessibility-patch.mjs
node remediation/tests/media-accessibility-inventory.mjs . --verify
```

All four JavaScript gates are package-independent. The static module test verifies the asset/hook contract, exact selectors, absence of output buffering and persistence/network calls, absence of alt assignment, fail-safe source-less removal, carousel title/state/clone logic, CSS size/focus rules, and the inventory counts that authorize these changes. The deterministic DOM fixture executes the real browser script against local fixtures for hidden Owl filler, existing child handlers, style-driven sidebar state, exact H3 selection, focus/autoplay behavior, and observer-loop convergence. It is implementation evidence, not rendered-browser proof.

The exact accessibility class and all other local plugin/release/theme PHP artifacts passed `php -l` under the hash-verified official PHP 8.4.24 NTS CLI on 2026-08-13. Re-run the focused command after any edit:

```powershell
php -l remediation/wp-plugin/aiamigos-remediation/includes/class-aiamigos-accessibility-remediation.php
```

## Browser proof and remaining promotion gates

1. Keep the integration staging-only and purge relevant page/cache layers after each revision. This was done for `a11y2`.
2. At 390 by 844 and approved breakpoints, record bounding boxes and spacing for five header social controls, 18 mobile-menu controls, search open/close, navigation open/close, and all visible carousel controls.
3. Keyboard-test opening/closing navigation and search, every menu link, carousel pickers, previous/next controls, focus transfer, `Escape`, and focus return. Pointer-test the full 44-pixel search wrappers and confirm each existing child handler fires exactly once.
4. Record computed accessible names; ensure existing good names were not overwritten.
5. Confirm exactly two source-less image elements disappeared and no nonempty/lazy image was removed.
6. Confirm 20 picker names map to the 20 existing visible titles on the captured home configuration.
7. Inspect the accessibility tree and tab order: unfocused clones and inactive originals must not duplicate article content, and no element containing focus may have an `aria-hidden="true"` ancestor.
8. Exercise carousel wraparound and mutation churn. At every settled state at least one original slide must remain exposed, current states must match Owl, autoplay must stop on focus/reduced motion, and synchronization must not loop.
9. Confirm no new console errors and no regression in `/`, `/home/` redirect behavior, `/blog/`, or the global performance budget. The final `a11y2` run passed this bounded gate.
10. Re-run the complete repository and staging regression gates before any production decision. The 2026-08-13 run is green, but a later code, plugin, theme, content, or cache change invalidates it and requires another run.

Items 2 through 8 remain the production-promotion checklist wherever the direct mobile proof above does not cover every approved breakpoint, control, wraparound state, or human accessibility-tree review.
