# M1/M3 regression-gate evidence — 2026-08-13

Scope: `https://remediation.aiamigos.org/` staging plus the saved production snapshot. These are read-only probes. No WordPress/plugin/production state was changed.

## M1 — social images

Observed on the staging root:

- document response: `200`;
- `og:image`: `https://remediation.aiamigos.org/wp-content/uploads/2023/10/cropped-logo-5.png`;
- `twitter:image`: the same URL (a shared fallback is valid and is not itself a defect);
- fallback response: direct `200`, `image/png`, 14,450 bytes;
- intrinsic dimensions: `240x213`;
- SHA-256: `2B49146D879EA4F8066DF27F639FB5F09E877762EC81A0D872D3EC1919BE99DB`.

Expected current outcome: `pages.social_images` **fails**. The fallback is not the required exact `1200x630`, and the config deliberately remains `status: pending` with no approved SHA-256/approver/date/evidence ID. The gate allows page-specific images and a shared fallback; it does not require one unique image per page.

The retained v1.4.0 staging report still proves 75/75 healthy canonical pages had nonempty Open Graph/Twitter fields, but tag presence does not prove image delivery, dimensions, branding, or preview quality.

## M3 — JSON-LD semantics

Observed on staging `/adaptive-ai/`:

- document response: `200`;
- one JSON-LD block;
- zero JSON parse errors;
- emitted types include `BlogPosting`, `BreadcrumbList`, `EducationalOrganization`, `ImageObject`, `ListItem`, `Organization`, `Person`, `SiteNavigationElement`, `WebPage`, and `WebSite`;
- emitted governed relationships include `author`, `publisher`, and `worksFor`.

Expected current outcome: `pages.jsonld` can pass syntax/placeholder checks while `pages.jsonld_semantics` **fails**. The default approval packet list is empty, so the identity-bearing types and relationships above cannot be treated as substantiated. This is intentional separation between parseability and governed claim evidence.

The saved production snapshot executes end-to-end with the new checks and reports `pages.jsonld_semantics` failing with 740 findings on 105 pages, including 396 unapproved relationship findings. Those counts describe the historical snapshot, not current staging or production.

## Evidence boundary

- The attempted complete live staging crawl did not emit a report because an existing request reached the 20-second abort boundary. No result was inferred from that aborted run.
- Direct probes above establish only the named page/asset facts. The next release crawl must run every HTTP and browser gate with no skips and retained JSON.
- The harness does not replace Schema Markup Validator, Rich Results Test, platform social previews, human brand approval, identity attestation, or proof that a real-world assertion is true.
- A local candidate is not staging or production evidence until deployed and recrawled.
