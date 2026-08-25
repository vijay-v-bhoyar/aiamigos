import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const snapshotRoot = path.join(root, 'public-site-snapshot');
const pagesRoot = path.join(snapshotRoot, 'pages');
const contentRoot = path.join(root, 'src', 'content', 'articles');
const dataRoot = path.join(root, 'src', 'data');
const publicRoot = path.join(root, 'public');
const reviewPlanPath = path.join(root, 'remediation', 'content-patch-plan.json');

const specialRoutes = new Set([
  '', 'home', 'blog-2', 'blog-4', 'newsletter', 'newsletter-2', 'contact', 'about-us',
  'services', 'shop', 'privacy-policy-2', 'page', 'others', 'academy', 'ai-certifications', 'hello-world', 'latest-blog-title-01'
]);

const specialPrefixes = ['category-', 'team-member-', 'testimonials-', 'classes-', 'services-', 'category/', 'team/', 'testimonials/', 'classes/', 'services/'];
const specialRedirects = new Map([
  ['about-us', '/about/'],
  ['page', '/about/'],
  ['privacy-policy-2', '/privacy/'],
  ['newsletter-2', '/newsletter/']
]);
const servedSpecialRoutes = new Set(['contact', 'newsletter']);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function decodeHtml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function meta(html, key, attribute = 'name') {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<meta[^>]+${attribute}=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i');
  const reverse = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attribute}=["']${escaped}["'][^>]*>`, 'i');
  return decodeHtml((html.match(re)?.[1] ?? html.match(reverse)?.[1] ?? '').trim());
}

function titleFromHtml(html) {
  return decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? 'AI Amigos').replace(/\s+/g, ' ').trim();
}

function balancedDiv(html, start) {
  const tagRe = /<\/?div\b[^>]*>/gi;
  tagRe.lastIndex = start;
  let depth = 0;
  let first = true;
  let match;
  while ((match = tagRe.exec(html))) {
    if (match[0][1] === '/') {
      depth -= 1;
      if (depth === 0) return html.slice(start + html.slice(start).indexOf('>') + 1, match.index);
    } else if (first) {
      depth = 1;
      first = false;
    } else {
      depth += 1;
    }
  }
  return html.slice(start + html.slice(start).indexOf('>') + 1);
}

function sanitizeBody(html, title) {
  let body = html;
  body = body.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  body = body.replace(/<style\b[\s\S]*?<\/style>/gi, '');
  body = body.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, '');
  body = body.replace(/<form\b[\s\S]*?<\/form>/gi, '');
  body = body.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi, '');
  body = body.replace(/<div[^>]*wp-block-rank-math-toc-block[^>]*>[\s\S]*?<\/div>/gi, '');
  body = body.replace(/<img\b[^>]*>/gi, `<div class="media-note" role="img" aria-label="Illustration pending media migration">Illustration for “${title.replace(/"/g, '&quot;')}” will be reattached from the authenticated media export.</div>`);
  body = body.replace(/\s+on[a-z-]+="[^"]*"/gi, '');
  body = body.replace(/\s+on[a-z-]+='[^']*'/gi, '');
  body = body.replace(/\s+style="[^"]*"/gi, '');
  body = body.replace(/\s+class="[^"]*"/gi, '');
  body = body.replace(/https?:\/\/www?\.aiamigos\.org/gi, '');
  body = body.replace(/https?:\/\/aiamigos\.org/gi, '');
  body = body.replace(/href=["'][^"']*(?:wp-json|wp-admin|xmlrpc|feed|comments\/feed)[^"']*["']/gi, 'href="#"');
  body = body.replace(/href=["']\/([^"'#?]+)\/?(["'])/gi, (match, legacyPath, quote) => {
    const normalized = legacyPath.replace(/^\/+|\/+$/g, '');
    if (!normalized || isSpecial(normalized) || normalized.startsWith('articles/')) return match;
    return `href="/articles/${normalized}/${quote}`;
  });
  body = body.replace(/<p>\s*<\/p>/gi, '');
  return body.trim();
}

function extractBody(html, title) {
  const single = html.search(/<div[^>]*class=["'][^"']*single-post-content[^"']*["'][^>]*>/i);
  const main = html.search(/<main\b[^>]*>/i);
  const start = single >= 0 ? single : main;
  if (start < 0) return `<p>${title}</p>`;
  return sanitizeBody(balancedDiv(html, start), title);
}

function textFromHtml(html) {
  return decodeHtml(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function firstParagraph(body) {
  const match = body.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  return textFromHtml(match?.[1] ?? body).slice(0, 180).trim();
}

function routeSlug(url) {
  const pathname = new URL(url).pathname.replace(/^\/+|\/+$/g, '');
  return pathname || 'home';
}

function isSpecial(slug) {
  return specialRoutes.has(slug) || specialPrefixes.some((prefix) => slug.startsWith(prefix));
}

function categoryFor(slug, section, title) {
  const value = `${slug} ${section} ${title}`.toLowerCase();
  if (/career|job|certif/.test(value)) return 'careers';
  if (/prompt|rag|langgraph|python|deployment|agentic|app-development|software-engineering|vector/.test(value)) return 'ai-engineering';
  if (/tool|model|gpt|llm|open-source|nvidia|tesseract|ocr|local-llm/.test(value)) return 'tools-and-models';
  if (/ethic|responsib|privacy|safety|explainab|fair/.test(value)) return 'responsible-ai';
  if (/health|finance|retail|farm|manufactur|transport|entertain|robot|industry/.test(value)) return 'industry-applications';
  return 'foundations';
}

function requiresNamedReview(slug, title) {
  return /health|medical|monai|finance|benchmark|certif|credential|safety|kids|career|job/.test(`${slug} ${title}`.toLowerCase());
}

function buildDispositionMap(plan) {
  const map = new Map();
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value.targets) && (value.proposed?.status || value.action)) {
      const action = String(value.action ?? '').toLowerCase();
      let disposition = value.proposed?.status;
      if (typeof disposition === 'string' && disposition.startsWith('draft')) disposition = 'draft';
      if (!disposition && action.includes('quarantine')) disposition = 'draft';
      if (!disposition && action.includes('merge')) disposition = 'merge';
      for (const target of value.targets) {
        if (typeof target?.slug === 'string' && disposition) map.set(target.slug.replace(/^\/+|\/+$/g, ''), disposition);
      }
    }
    if (typeof value.slug === 'string') {
      const proposed = value.proposed?.status;
      const action = String(value.action ?? '').toLowerCase();
      let disposition = proposed;
      if (typeof disposition === 'string' && disposition.startsWith('draft')) disposition = 'draft';
      if (!disposition && action.includes('quarantine')) disposition = 'draft';
      if (!disposition && action.includes('merge')) disposition = 'merge';
      if (disposition) map.set(value.slug.replace(/^\/+|\/+$/g, ''), disposition);
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(plan);
  return map;
}

function yamlString(value) {
  return JSON.stringify(String(value ?? ''));
}

function frontmatter(record) {
  const lines = [
    '---',
    `title: ${yamlString(record.title)}`,
    `description: ${yamlString(record.description)}`,
    `routeSlug: ${yamlString(record.slug)}`,
    `canonical: ${yamlString(record.canonical)}`,
    `publishedAt: ${yamlString(record.publishedAt)}`,
    `category: ${yamlString(record.category)}`,
    `audience: ${yamlString(record.audience)}`,
    `author: ${yamlString(record.author)}`,
    `status: ${yamlString(record.status)}`,
    `disposition: ${yamlString(record.disposition)}`,
    `originalUrl: ${yamlString(record.originalUrl)}`,
    `sources: ${JSON.stringify(record.sources)}`,
    `limitations: ${JSON.stringify(record.limitations ?? [])}`,
    `tags: ${JSON.stringify(record.tags)}`,
    '---',
    ''
  ];
  return lines.join('\n');
}

function redirectsFor(records) {
  const lines = [
    'RewriteEngine On',
    'RewriteCond %{HTTP_HOST} ^aiamigos\\.org$ [NC]',
    'RewriteRule ^ https://www.aiamigos.org%{REQUEST_URI} [R=301,L,NE]',
    'RewriteRule ^wp-admin(?:/|$) - [R=410,L]',
    'RewriteRule ^wp-json(?:/|$) - [R=410,L]',
    'RewriteRule ^xmlrpc\\.php$ - [R=410,L]',
    'RewriteRule ^(?:feed|comments/feed)(?:/|$) - [R=410,L]',
    'RewriteRule ^home/?$ / [R=301,L]'
  ];
  for (const record of records) {
    if (record.slug === 'home') continue;
    if (servedSpecialRoutes.has(record.slug)) continue;
    if (record.redirectTo) {
      lines.push(`RewriteRule ^${record.slug.replace(/\//g, '\\/')}/?$ ${record.redirectTo} [R=301,L]`);
    } else if (record.status === 'retire' || record.status === 'draft') {
      lines.push(`RewriteRule ^${record.slug}/?$ - [R=410,L]`);
    }
  }
  return `${lines.join('\n')}\n`;
}

const manifest = JSON.parse(fs.readFileSync(path.join(snapshotRoot, 'snapshot-manifest.json'), 'utf8'));
const plan = fs.existsSync(reviewPlanPath) ? JSON.parse(fs.readFileSync(reviewPlanPath, 'utf8')) : {};
const dispositions = buildDispositionMap(plan);
const records = [];

ensureDir(contentRoot);
ensureDir(dataRoot);
ensureDir(publicRoot);
for (const file of fs.readdirSync(contentRoot)) {
  if (file.endsWith('.md')) fs.rmSync(path.join(contentRoot, file));
}

for (const page of manifest.pages) {
  const slug = routeSlug(page.requestedUrl);
  const htmlPath = path.join(snapshotRoot, page.file);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const title = titleFromHtml(html).replace(/\s*\|\s*AI Amigos.*$/i, '').trim();
  const description = meta(html, 'description') || firstParagraph(extractBody(html, title)) || 'Practical AI guidance from the AI Amigos editorial desk.';
  const publishedAt = meta(html, 'article:published_time', 'property').slice(0, 10) || '2023-01-01';
  const section = meta(html, 'article:section', 'property') || '';
  const canonical = meta(html, 'canonical', 'rel') || page.finalUrl;
  const originalDisposition = dispositions.get(slug);
  let disposition = ['retain', 'update', 'merge', 'retire', 'draft'].includes(originalDisposition) ? originalDisposition : (isSpecial(slug) ? 'retire' : 'retain');
  if (requiresNamedReview(slug, title) && ['retain', 'update'].includes(disposition)) disposition = 'draft';
  const status = disposition === 'retire' || disposition === 'draft' ? disposition : 'published';
  const articleLike = !isSpecial(slug) && slug !== 'home';
  const record = {
    id: page.file.replace(/\.html$/, ''),
    slug,
    title,
    description: description.replace(/\s+/g, ' ').slice(0, 220),
    canonical: canonical.startsWith('http') ? canonical : new URL(canonical, 'https://www.aiamigos.org').toString(),
    originalUrl: page.requestedUrl,
    publishedAt,
    category: categoryFor(slug, section, title),
    audience: 'professional',
    author: 'AI Amigos Editorial Desk',
    status,
    disposition,
    redirectTo: articleLike && status === 'published' ? `/articles/${slug}/` : (specialRedirects.get(slug) ?? null),
    sources: [page.requestedUrl],
    limitations: [requiresNamedReview(slug, title) ? 'Quarantined until a named subject-matter reviewer, dated primary sources, scope, and limitations are recorded.' : 'Imported from a public snapshot; claims require editorial verification before substantive update.'],
    tags: section.split(',').map((tag) => tag.trim()).filter(Boolean),
    articleLike,
    wordCount: textFromHtml(extractBody(html, title)).split(/\s+/).filter(Boolean).length,
    importedFrom: page.file
  };
  records.push(record);
  if (!articleLike) continue;

  const body = extractBody(html, title);
  const outputName = `${slug.replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '') || 'article'}.md`;
  fs.writeFileSync(path.join(contentRoot, outputName), `${frontmatter(record)}${body}\n\n<div class="evidence"><strong>Editorial provenance.</strong> Imported from the public snapshot. Original publication date: ${publishedAt}. This article remains subject to source, authorship, and factual review before its next substantive update.</div>\n`, 'utf8');
}

const published = records.filter((record) => record.articleLike && record.status === 'published');
const searchIndex = published.map(({ title, description, slug, category, publishedAt }) => ({ title, description, slug, category, publishedAt }));
const redirects = records.filter((record) => record.slug !== 'home').map((record) => ({ from: `/${record.slug}/`, status: record.status, disposition: record.disposition, to: record.redirectTo ?? null }));
fs.writeFileSync(path.join(dataRoot, 'source-records.json'), `${JSON.stringify(records, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(dataRoot, 'search-index.json'), `${JSON.stringify(searchIndex, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(dataRoot, 'redirects.json'), `${JSON.stringify(redirects, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(publicRoot, 'search-index.json'), `${JSON.stringify(searchIndex)}\n`, 'utf8');
fs.writeFileSync(path.join(publicRoot, 'legacy-redirects.json'), `${JSON.stringify(redirects, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(publicRoot, '.htaccess'), redirectsFor(records), 'utf8');

const summary = { imported: records.length, articleLike: records.filter((r) => r.articleLike).length, published: published.length, draft: records.filter((r) => r.status === 'draft').length, retired: records.filter((r) => r.status === 'retire').length };
if (process.argv.includes('--check')) {
  if (summary.imported !== 114) throw new Error(`Expected 114 snapshot records, found ${summary.imported}`);
  if (!published.length) throw new Error('No published articles were imported');
  if (records.some((record) => !record.publishedAt || !record.originalUrl)) throw new Error('A source record is missing date or provenance');
}
console.log(`Snapshot import: ${summary.imported} records · ${summary.published} published articles · ${summary.draft} draft · ${summary.retired} retired`);
