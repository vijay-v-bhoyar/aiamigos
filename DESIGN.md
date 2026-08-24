# AI Amigos design system

AI Amigos is an evidence-driven practice network, not a generic AI blog. The visual system must make comparison, provenance, progress, and uncertainty easy to scan.

## Brand

- Name: **AI Amigos**
- Descriptor: **Practical AI, proven in use.**
- Symbol: branching experiment paths resolving into a check mark.
- Voice: calm, specific, candid about evidence and limits. Never use hype, urgency, or unsupported superlatives.

## Color

| Token | Value | Use |
|---|---|---|
| Canvas | `#FCFCFD` | Page background |
| Surface | `#F3F6F8` | Secondary panels and table headers |
| Ink | `#172033` | Primary text |
| Muted | `#5D6878` | Supporting copy |
| Cobalt | `#275EFE` | Primary actions and focus |
| Evidence teal | `#147D79` | Evidence, verification, active state |
| Success | `#1B6B50` | Passed gates |
| Warning | `#A35B16` | Limitations and pending review |
| Line | `#D8DEE7` | Dividers and boundaries |

Color is never the only status signal.

## Type and scale

- Interface: self-hosted IBM Plex Sans Variable, bundled into the release artifact with system fallbacks.
- Editorial headings: self-hosted Source Serif 4 Variable, bundled into the release artifact.
- Wordmark: 21–22px.
- Homepage H1: maximum 52px desktop and 36px mobile.
- Inner H1: maximum 44px desktop and 36px mobile.
- Body: 16–18px; editorial reading width 65–72 characters.
- Labels use sentence case. Avoid all-caps except small evidence eyebrows.

## Layout

- Header: 64px desktop, 56px mobile.
- Mobile navigation: one menu button and a single drawer; links never wrap in the header.
- Marketing/editorial pages use a 72rem shell.
- Workbench pages use split panes, tables, ledgers, steppers, timelines, and comparisons.
- Cards are reserved for independent objects such as a saved project or playbook.

## Components

- Primary action: cobalt fill, minimum 44px target.
- Secondary action: white surface with ink border.
- Evidence state: icon/text label, date, reviewer, and visible limitation.
- Benchmark: sample size, cohort, date window, median/IQR, method, and suppression status appear together.
- Tables scroll inside their own region on small screens; the page itself must not overflow.

## Required states

Every interactive screen defines these states in visible copy and behavior:

1. Loading — identify the record being loaded.
2. Empty — explain the first useful action.
3. Error — preserve work and show a retry or export path.
4. Offline — keep local work available and mark sync unavailable.
5. Success — state exactly what changed and where it is stored.
6. Conflict — compare local and remote versions before choosing.
7. Stale data — show last verified/tested date and the effect of staleness.
8. Permission — explain which role can perform the action.

## Evidence rules

- Never describe an editorial example as a community outcome.
- Benchmarks remain suppressed below 10 reviewed reports.
- Unreviewed legacy guides are `noindex,follow` and excluded from search, sitemap, recommendations, and homepage discovery.
- Public playbooks show reviewer scope, version, evidence lineage, limitations, and corrections.
- Private inputs never enter URLs, analytics, logs, metadata, or public records.
