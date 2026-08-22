# AI Amigos media and control accessibility remediation

Date: 2026-08-13  
Scope: hostile-audit findings M2 and M5  
Execution state: inventory complete; 2 deterministic structural-remove decisions recorded; 182 human image decisions and production release proof remain open

## Outcome

The snapshot now has a reproducible, instance-level accessibility ledger. It does not manufacture alt text from filenames or page topics.

The original aggregate M2 result is confirmed: 974 captured `<img>` elements, no omitted `alt` attributes, and 184 null-alt instances across 77 pages. The instance review separates those 184 records into:

| Triage class | Instances | Affected pages | Safe to automate now? | Required disposition |
|---|---:|---:|---|---|
| Repeated author avatar | 71 | 71 | No | Render the author block. Keep null alt if the portrait is redundant to adjacent identity text; otherwise owner-approve concise identity text. |
| Other nonempty content image | 107 | 73 | No | Inspect the actual pixels and adjacent copy; classify decorative, informative, functional, or remove. |
| Image-only unnamed link | 4 | 2 | No | Review the image and destination together; name the link purpose without duplicate announcements or remove the link. |
| Empty-source carousel placeholder | 2 | 1 | Yes, structurally | Remove or suppress the source-less element. Do not invent alt text for an image that does not exist. |

The exact 184 records, including URL, snapshot file, line, image ordinal, `src`, `srcset`, WordPress media ID when exposed, ancestor path, link context, and machine triage are in `media-accessibility-inventory.json`. Its `unique_empty_alt_sources` section groups all 97 exact source values without treating a filename as visual evidence.

The content patch plan contains no M2 or M5 patch group. This artifact supplies that missing execution boundary while leaving content claims and visual judgments to accountable reviewers.

## Exact high-confidence M2 cases

### Remove or suppress two source-less elements

Both are on `https://www.aiamigos.org/home/` inside `#our-blogs .owl-carousel`:

| Queue ID | Snapshot line | Source | Context |
|---|---:|---|---|
| `ALT-162` | 725 | `src=""`, no lazy source | `.owl-carousel > .our-blogs-content > .our-blogs-box > .latest-blog-image > img` |
| `ALT-163` | 749 | `src=""`, no lazy source | `.owl-carousel > .our-blogs-content > .our-blogs-box > .latest-blog-image > img` |

These are structural defects. Removing the empty element is safer than guessing an image or alt value.

### Review four image-only links

| Queue ID | Page | Snapshot line | WP media ID | Destination |
|---|---|---:|---:|---|
| `ALT-160` | `/ai-books-for-kids/` | 725 | 1323 | `https://amzn.to/3UgHmoS` |
| `ALT-161` | `/ai-books-for-kids/` | 741 | 1324 | `https://amzn.to/3JAbiqO` |
| `ALT-180` | `/ai-career/` | 697 | 967 | `/ai-certifications/` |
| `ALT-181` | `/ai-career/` | 758 | 966 | `/ai-career-faq/` |

The two shortened Amazon destinations also depend on the affiliate-governance track. Do not write product names, endorsements, or relationship claims until the destination and disclosure are approved. The two career images need a purpose-oriented accessible name only if the links remain.

### Review the repeated avatar once as a template, then verify all 71 instances

The same Gravatar source occurs 71 times:

`https://secure.gravatar.com/avatar/526a383b8aa9ba73d70c4d1e23ca5ef8?s=90&d=mm&r=g`

The repeated class is `avatar avatar-90 photo`. A template decision may be applied consistently only after a rendered author-block review proves that all instances have the same relationship to adjacent author text. The ledger still requires 71/71 instance reconciliation so template exceptions cannot hide outliers.

### Page concentration

The largest queues are `/home/` (18), `/ai-in-healthcare/` (7), `/blog-2/` (4), and nine pages with three each. The remaining affected pages have one or two instances. The complete 77-page/count mapping is under `pages` in the JSON inventory; there is no sampling.

## Exact M5 control inventory

### Sitewide static defects

The static corpus contains 259 anchors with no captured accessible name across all 114 pages:

| Pattern | Instances | Pages | Safe action |
|---|---:|---:|---|
| Empty home breadcrumb link | 113 | 113 | Add visible `Home` text or an equivalent programmatic name. `/home/` has no such breadcrumb instance. |
| Icon-only footer LinkedIn link | 114 | 114 | Add a destination-oriented name such as `LinkedIn`; keep the visible icon hidden from duplicate announcement. |
| Truly zero-content editor link | 28 | 4 | Remove after confirming no rendered CSS background or scripted behavior. |
| Image-only unnamed link | 4 | 2 | Resolve with the four M2 records above. |

The 28 zero-content editor links occur on `/ai-books-for-kids/` (5), `/ai-certifications/` (10), `/career-in-ai/` (4), and `/ai-tools-for-kids/` (9). Every exact destination and snapshot line is in `static_control_inventory.unnamed_anchors`.

The shared theme also emits on every captured page:

| Selector/identity | Instances | Captured problem | Deterministic structural fix |
|---|---:|---|---|
| `#open_nav[role="button"]` | 114 | No accessible name | Give the existing custom control equivalent button semantics, name it `Open navigation menu`, bind it to `#sidebar1`, and manage `aria-expanded` accurately. A native-button source refactor remains a separate theme change. |
| `.search-icon` | 114 | Click-like span with no role, keyboard focus, or name | Give the existing custom control equivalent button semantics and the name `Open search`; preserve and safely invoke its existing child action handler. |
| `.closepop` | 114 | Click-like div with no role, keyboard focus, or name | Give the existing custom control equivalent button semantics and the name `Close search`; preserve and safely invoke its existing child action handler. |

These counts are static source findings. Keyboard behavior and computed names must still be proven in a rendered browser.

### Root and branded-home mobile controls

At the hostile audit viewport of 390 by 844 CSS pixels, `/` and `/home/` each expose five header social links and 18 mobile-menu links. The inventory records every exact name and destination for both routes.

The rendered evidence reported social targets at about 17 CSS pixels high and menu rows at about 39 CSS pixels. The distinction matters:

- WCAG 2.2 Success Criterion 2.5.8 uses a 24 by 24 CSS-pixel minimum with defined spacing and other exceptions.
- The remediation adopts approximately 44 by 44 CSS pixels as a stronger design target where feasible; 44 pixels must not be reported as the WCAG 2.2 AA minimum.
- The 17-pixel social controls need a per-control size-and-spacing result. The 39-pixel menu rows clear the 24-pixel size threshold on height but still miss the adopted 44-pixel design target; width and spacing remain to be measured.

### Twenty-item `/home/` carousel

The static page contains one `#our-blogs .owl-carousel` with exactly 20 authored article items. The hostile rendered audit reported 20 generated picker controls without accessible names. `m5_rendered_route_inventory.home_carousel.items` maps picker positions 1 through 20 to their exact article title, destination, image source, and current image alt.

Required implementation behavior:

- Use Owl's existing generated button elements when present; otherwise require equivalent custom-button semantics or a conforming tab pattern.
- Give every picker a unique name identifying the slide by article name or number and expose the current state.
- Provide named previous, next, and rotation controls if those controls exist after rendering.
- Keep inactive and cloned `.owl-item.cloned` content out of the accessibility tree and sequential keyboard order.
- Avoid duplicate accessible names from visible headings plus repeated screen-reader-only copies.

The snapshot cannot prove the generated clone count or post-JavaScript accessibility tree. Those fields are deliberately `null`/open rather than guessed.

## Human review protocol for M2

For every `ALT-*` queue ID, record one decision in `media-accessibility-decisions.json`. `ALT-162` and `ALT-163` are the only machine-safe exceptions: they have no source, lazy source, source set, link, or pixels whose meaning could be inferred, so their recorded disposition is structural removal. The other 182 decisions remain human-owned:

1. Render the page at desktop and mobile widths and inspect the actual image, adjacent heading/caption/body text, and any link action.
2. Choose exactly one disposition: `decorative`, `informative`, `functional`, or `remove`.
3. For `decorative`, retain `alt=""` only if the image contributes no information or action and has no conflicting `title`.
4. For `informative`, write concise text that communicates the image's purpose in this page context. Do not copy filenames, generated-image prompts, generic `image` wording, or unsupported claims.
5. For `functional`, make the control/link purpose available through one nonredundant accessible name.
6. For `remove`, delete the element at the source record or template, not merely with CSS.
7. Record reviewer, review time, rendered evidence, and approved accessible text when applicable.

No bulk alt-text generation is authorized. Similar-looking filenames do not establish similar meaning.

## Release verification

Run the snapshot consistency gate:

```powershell
node remediation/tests/media-accessibility-inventory.mjs . --verify
```

The gate regenerates the inventory in memory and checks the hostile report, SEO audit, manifest, and registry against exact counts and URL sets. It also validates decision IDs and allowed dispositions.

After source changes, recapture the candidate environment and require:

- 184/184 prior queue IDs have an approved disposition or a documented source removal.
- No informative or functional image has a null or filename-like alternative.
- Decorative images have null alt and no conflicting title; removed images are absent.
- All links, buttons, menu toggles, search controls, and carousel controls have computed names and keyboard operation.
- At 390 by 844 and every approved breakpoint, every visible target has a saved bounding box and a 24-pixel size/spacing evaluation; the 44-pixel design target is reported separately.
- Inactive or cloned carousel slides are absent from the accessibility tree and tab order.
- DOM element and clone counts are recorded after JavaScript settlement; the previous `/home/` observation of roughly 1,062 elements is a baseline, not a passing budget.
- A screen-reader sample covers at least one article avatar, one informative article image, one retained decorative image, one linked image, global header/footer controls, and the home carousel.

## Evidence boundary and standards

This is a public deployed-output snapshot, not the authoritative WordPress database or Sirat Pro source. It supports deterministic targeting, not production-complete proof.

The decision rules follow W3C guidance: [WCAG 2.2 Non-text Content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html), [null-alt technique H67](https://www.w3.org/WAI/WCAG22/Techniques/html/H67.html), [WCAG 2.2 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), and the [WAI-ARIA carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/).

Files:

- `remediation/media-accessibility-inventory.json` — immutable evidence inventory and exact queues.
- `remediation/media-accessibility-decisions.json` — separate decision overlay; currently 2 deterministic structural-removal decisions and 182 human decisions outstanding.
- `remediation/tests/media-accessibility-inventory.mjs` — dependency-free generator and verification gate.
