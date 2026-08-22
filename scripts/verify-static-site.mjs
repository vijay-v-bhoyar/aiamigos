import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const failures = [];

function exists(relative) {
  const target = path.join(dist, relative);
  if (!fs.existsSync(target)) failures.push(`Missing ${relative}`);
  return target;
}

function filesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

if (!fs.existsSync(dist)) failures.push('dist/ does not exist; run npm run build first');
for (const required of ['index.html', 'articles/index.html', 'topics/index.html', 'start-here/index.html', 'search/index.html', 'tools/index.html', 'templates/index.html', 'tracks/index.html', 'news/index.html', 'rss.xml', 'sitemap.xml', 'robots.txt', '.htaccess', 'legacy-redirects.json', 'pagefind/pagefind-ui.js']) exists(required);
for (const slug of ['ai-task-workflow-planner','business-use-case-scorecard','career-roadmap-builder','teaching-training-planner','builder-evaluation-workbench']) exists(`tools/${slug}/index.html`);

const htmlFiles = filesUnder(dist).filter((file) => file.endsWith('.html'));
const forbidden = /wp-json|wp-admin|xmlrpc|mailpoet|\[mailpoet_form|wordpress\.com/i;
const existingPaths = new Set(filesUnder(dist).map((file)=>'/' + path.relative(dist,file).replaceAll(path.sep,'/')));
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const relative = path.relative(dist, file);
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  if (h1Count !== 1) failures.push(`${relative}: expected one H1, found ${h1Count}`);
  if (!/<meta[^>]+name=["']description["']/i.test(html)) failures.push(`${relative}: missing meta description`);
  if (!/<link[^>]+rel=["']canonical["']/i.test(html)) failures.push(`${relative}: missing canonical link`);
  if (forbidden.test(html)) failures.push(`${relative}: contains a WordPress/plugin marker`);
  if (/https?:\/\/aiamigos\.org\//i.test(html) && !/https?:\/\/www\.aiamigos\.org\//i.test(html)) failures.push(`${relative}: contains an unexpected legacy host link`);
  for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const href = match[1];
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    let pathname = href.split(/[?#]/)[0]; if (!pathname) continue;
    try { pathname = decodeURIComponent(pathname); } catch {}
    const expected = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    if (!existingPaths.has(expected) && !existingPaths.has(pathname)) failures.push(`${relative}: broken internal link ${href}`);
  }
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]); } catch (error) { failures.push(`${relative}: invalid JSON-LD (${error.message})`); }
  }
}

const templatePages = filesUnder(path.join(dist, 'templates')).filter((file)=>file.endsWith('index.html') && path.dirname(file) !== path.join(dist,'templates'));
if (templatePages.length !== 20) failures.push(`expected 20 template pages, found ${templatePages.length}`);
const trackPages = filesUnder(path.join(dist, 'tracks')).filter((file)=>file.endsWith('index.html') && path.dirname(file) !== path.join(dist,'tracks'));
if (trackPages.length !== 4) failures.push(`expected 4 track pages, found ${trackPages.length}`);
const articlePages = filesUnder(path.join(dist, 'articles')).filter((file)=>file.endsWith('index.html') && path.dirname(file) !== path.join(dist,'articles'));
if (articlePages.length !== 57) failures.push(`expected 57 published article routes, found ${articlePages.length}`);
for (const file of filesUnder(path.join(dist,'tools')).filter((file)=>file.endsWith('index.html'))) {
  const html=fs.readFileSync(file,'utf8');
  if (file !== path.join(dist,'tools','index.html') && (!html.includes('class="tool-runner"') || !html.includes('Share this tool') || !html.includes('Nothing is sent'))) failures.push(`${path.relative(dist,file)}: missing private tool controls`);
}
const toolAssets=filesUnder(path.join(dist,'assets')).filter((file)=>/ToolRunner.*\.js$/i.test(path.basename(file))).map((file)=>fs.readFileSync(file,'utf8')).join('\n');
if (!toolAssets.includes('localStorage') || !toolAssets.includes('clipboard') || !toolAssets.includes('aiamigos:tool:')) failures.push('tool runtime lacks local storage, copy, or versioned-state behavior');

try {
  const redirects = JSON.parse(fs.readFileSync(path.join(dist, 'legacy-redirects.json'), 'utf8'));
  if (!Array.isArray(redirects) || redirects.length < 100) failures.push(`legacy-redirects.json has only ${redirects?.length ?? 0} records`);
  if (redirects.some((item) => item.to === item.from)) failures.push('legacy redirect self-loop detected');
} catch (error) { failures.push(`legacy-redirects.json invalid: ${error.message}`); }

const sitemap = fs.existsSync(path.join(dist, 'sitemap.xml')) ? fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8') : '';
if (!sitemap.includes('https://www.aiamigos.org/')) failures.push('sitemap.xml lacks canonical site URL');
const htaccess = fs.existsSync(path.join(dist, '.htaccess')) ? fs.readFileSync(path.join(dist, '.htaccess'), 'utf8') : '';
if (!/RewriteEngine\s+On/i.test(htaccess)) failures.push('.htaccess missing RewriteEngine');
if (!/R=410/i.test(htaccess)) failures.push('.htaccess missing retirement rules');
if (!/\/articles\//.test(htaccess)) failures.push('.htaccess missing article redirects');

if (failures.length) {
  console.error(`Static verification failed with ${failures.length} finding(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Static verification passed: ${htmlFiles.length} HTML pages, metadata, redirects, sitemap, search, and WordPress-removal checks.`);
