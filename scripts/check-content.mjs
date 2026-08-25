import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tools } from '../src/data/tools.mjs';
import { templates } from '../src/data/templates.mjs';
import { tracks } from '../src/data/tracks.mjs';
import { resourceGraph } from '../src/data/resource-graph.mjs';
import { methods, validateEvidencePlatform } from '../src/data/evidence-platform.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const articleDir = path.join(root, 'src', 'content', 'articles');
const files = fs.readdirSync(articleDir).filter((file) => file.endsWith('.md'));
const failures = []; const slugs = new Set(); let published = 0; let drafts = 0; let reviewed = 0;
const value = (body, key) => body.match(new RegExp(`^${key}:\\s*['"]?([^\\n'"]+)`, 'm'))?.[1]?.trim();
for (const file of files) {
  const body = fs.readFileSync(path.join(articleDir, file), 'utf8');
  const slug = value(body, 'routeSlug'); const status = value(body, 'status'); const reviewStatus = value(body, 'reviewStatus');
  if (!slug) failures.push(`${file}: missing routeSlug`);
  else if (slugs.has(slug)) failures.push(`${file}: duplicate routeSlug ${slug}`);
  else slugs.add(slug);
  if (!value(body, 'publishedAt')) failures.push(`${file}: missing original publishedAt`);
  if (!value(body, 'disposition')) failures.push(`${file}: missing machine-readable disposition`);
  if (status === 'published') published++; else if (status === 'draft') drafts++;
  if (reviewStatus === 'reviewed') {
    reviewed++;
    if (!value(body, 'reviewer') || !value(body, 'reviewedAt') || !value(body, 'nextReviewAt')) failures.push(`${file}: reviewed status requires reviewer and dates`);
    const sourceLines = body.match(/^\s*-\s+https?:\/\/(?!www\.aiamigos\.org)[^\s]+/gm) ?? [];
    if (sourceLines.length < 2) failures.push(`${file}: reviewed status requires two authoritative external sources`);
  }
  if (/\[(mailpoet|contact-form-7|wp_)/i.test(body)) failures.push(`${file}: raw WordPress shortcode`);
}
if (published !== 57) failures.push(`expected 57 published legacy routes, found ${published}`);
if (drafts !== 19) failures.push(`expected 19 governed drafts, found ${drafts}`);
if (tracks.length !== 4 || tools.length !== 5 || templates.length !== 20) failures.push('utility catalog count mismatch');
failures.push(...resourceGraph.findings.map((finding)=>`resource graph: ${finding}`));
failures.push(...validateEvidencePlatform().map((finding)=>`evidence platform: ${finding}`));
if (methods.length !== 3) failures.push(`expected 3 working evidence methods, found ${methods.length}`);
for (const tool of tools) if (tool.sources.length < 2 || !tool.limitations.length) failures.push(`${tool.slug}: incomplete evidence fields`);
if (failures.length) { console.error(`Content check failed with ${failures.length} finding(s):`); failures.forEach((item)=>console.error(`- ${item}`)); process.exit(1); }
console.log(`Content check passed: ${published} published legacy routes, ${drafts} governed drafts, ${reviewed} fully reviewed legacy guides, 4 tracks, 5 tools, 20 templates, and ${methods.length} author-controlled evidence methods. Legacy importer was not run.`);
