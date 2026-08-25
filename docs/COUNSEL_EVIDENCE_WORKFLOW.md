# Private counsel evidence workflow

The public site is an evidence platform, not a legal adjudicator. Petition strategy, attorney work product, confidential records, and completed criterion or prong mappings must not enter `src/`, `public/`, `dist/`, analytics, URLs, or the deployed Hostinger document root.

## Local workflow

1. Create `private-evidence/records.json`. The directory is gitignored.
2. Follow `public/schemas/counsel-evidence-record.schema.json`.
3. Record exact facts, dates, source issuers, hashes, independence, strengths, weaknesses, contradictory evidence, and counsel status.
4. Run `npm run evidence:export:counsel`.
5. Give counsel the generated file from `counsel-exports/` through a secure channel.
6. Counsel determines legal relevance and sufficiency. The exporter never renders a verdict such as “criterion satisfied.”

Both local directories are gitignored. The build and deployment verifiers fail if a private counsel path or petition-strategy marker enters `dist/`.
