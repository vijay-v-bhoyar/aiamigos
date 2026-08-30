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
for (const required of ['index.html', 'app/index.html', 'endeavor/index.html', 'methods/index.html', 'methods/examples/index.html', 'participate/index.html', 'evidence/index.html', 'field-studies/index.html', 'adoption/index.html', 'outcomes/index.html', 'impact/index.html', 'research/index.html', 'reviews/index.html', 'reviews/kit/index.html', 'releases/v0.1.1/index.html', 'releases/v0.1.1/manifest.json', 'timeline/index.html', 'corrections/index.html', 'data-policy/index.html', 'about/vijay-bhoyar/index.html', 'playbooks/index.html', 'benchmarks/index.html', 'challenges/index.html', 'account/index.html', 'articles/index.html', 'topics/index.html', 'start-here/index.html', 'search/index.html', 'tools/index.html', 'templates/index.html', 'tracks/index.html', 'news/index.html', 'schemas/workflow-evidence-record.schema.json', 'schemas/public-evidence-record.schema.json', 'schemas/counsel-evidence-record.schema.json', 'schemas/benchmark-demonstration.schema.json', 'examples/workflow-evidence-protocol.synthetic.json', 'examples/proof-pack.synthetic.json', 'examples/benchmark-method.synthetic.json', 'pilot-kit/participant-checklist.md', 'pilot-kit/pilot-preregistration.template.json', 'pilot-kit/proof-pack-submission.template.json', 'reviewer-kit/external-review-checklist.md', 'reviewer-kit/external-review-record.template.json', 'rss.xml', 'sitemap.xml', 'robots.txt', '.htaccess', 'legacy-redirects.json', 'pagefind/pagefind-component-ui.js', 'pagefind/pagefind-component-ui.css']) exists(required);
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
for (const file of articlePages) {
  const html=fs.readFileSync(file,'utf8');
  if (!/<meta[^>]+name="robots"[^>]+content="noindex,follow"/i.test(html)) failures.push(`${path.relative(dist,file)}: unreviewed legacy guide lacks noindex,follow`);
  if (/data-pagefind-body/i.test(html)) failures.push(`${path.relative(dist,file)}: quarantined guide entered Pagefind`);
}
const playbookPages=filesUnder(path.join(dist,'playbooks')).filter((file)=>file.endsWith('index.html') && path.dirname(file)!==path.join(dist,'playbooks'));
if(playbookPages.length!==4) failures.push(`expected 4 reviewed protocol pages, found ${playbookPages.length}`);
for (const file of playbookPages) {
  const html=fs.readFileSync(file,'utf8');
  if (!html.includes('data-pagefind-body') || !html.includes('data-pagefind-filter="type:Playbook"') || !/data-pagefind-filter="track:(business|careers|teaching|builders)"/.test(html)) failures.push(`${path.relative(dist,file)}: playbook is missing Pagefind body, type, or track metadata`);
}
for (const library of ['tools','templates','playbooks','benchmarks','challenges']) {
  const html=fs.readFileSync(path.join(dist,library,'index.html'),'utf8');
  if (!html.includes('data-filter-root') || !html.includes('data-filter-reset') || !html.includes('data-filter-empty') || !html.includes('data-filter-item')) failures.push(`${library}/index.html: shared filter, reset, empty state, or filter items are missing`);
}
const searchPage=fs.readFileSync(path.join(dist,'search','index.html'),'utf8');
if (!/<pagefind-config[^>]+faceted(?:="true")?[^>]+preload(?:="true")?/i.test(searchPage) || !searchPage.includes('filter="type"') || !searchPage.includes('filter="track"')) failures.push('search/index.html: faceted type and track filters are missing');
for (const [directory,type,expected] of [['tools','Tool',5],['templates','Template',20],['tracks','Track',4]]) {
  const pages=filesUnder(path.join(dist,directory)).filter((file)=>file.endsWith('index.html') && path.dirname(file)!==path.join(dist,directory));
  if (pages.length!==expected) failures.push(`${directory}: expected ${expected} detail pages, found ${pages.length}`);
  for (const file of pages) if (!fs.readFileSync(file,'utf8').includes(`data-pagefind-filter="type:${type}"`)) failures.push(`${path.relative(dist,file)}: missing Pagefind type ${type}`);
}
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
if (/\/articles\/[^<]+<\/loc>/.test(sitemap)) failures.push('sitemap.xml contains quarantined legacy guides');
if (!/\/playbooks\/support-triage-controlled-pilot\//.test(sitemap)) failures.push('sitemap.xml lacks reviewed playbooks');
const home=fs.existsSync(path.join(dist,'index.html'))?fs.readFileSync(path.join(dist,'index.html'),'utf8'):'';
if(!home.includes('class="nav-toggle"')||!home.includes('Use AI for')) failures.push('responsive compact navigation is missing');
if(!home.includes('Practical AI, proven in use.')) failures.push('brand descriptor is missing');
if(!home.includes('verified adoptions') || !home.includes('reviewed outcomes') || !home.includes('external citations')) failures.push('homepage lacks explicit evidence-state counters');
const methodPages=filesUnder(path.join(dist,'methods')).filter((file)=>{
  const parts=path.relative(path.join(dist,'methods'),file).split(path.sep);
  return file.endsWith('index.html') && parts.length===2 && parts[0]!=='examples';
});
if(methodPages.length!==3) failures.push(`expected 3 method pages, found ${methodPages.length}`);
for (const file of methodPages) {
  const html=fs.readFileSync(file,'utf8');
  if(!html.includes('Author controlled') || !html.includes('0 verified') || !html.includes('Publication gate')) failures.push(`${path.relative(dist,file)}: method page hides evidence boundary or publication gate`);
}
const examplePages=filesUnder(path.join(dist,'methods','examples')).filter((file)=>file.endsWith('index.html') && path.relative(path.join(dist,'methods','examples'),file).split(path.sep).length===2);
if(examplePages.length!==3) failures.push(`expected 3 synthetic example pages, found ${examplePages.length}`);
for (const file of examplePages) {
  const html=fs.readFileSync(file,'utf8');
  if(!/synthetic/i.test(html) || !/not evidence|not an evidence record/i.test(html) || !/SHA-256/i.test(html)) failures.push(`${path.relative(dist,file)}: synthetic boundary or integrity metadata missing`);
}
const participation=fs.readFileSync(path.join(dist,'participate','index.html'),'utf8');
if((participation.match(/class="method-row"/g)??[]).length!==4 || !/private-only/i.test(participation) || !/Never submit/i.test(participation)) failures.push('participation page lacks four governed packages, consent choices, or forbidden-data controls');
const reviewerKit=fs.readFileSync(path.join(dist,'reviews','kit','index.html'),'utf8');
if(!/reviewer-controlled HTTPS verification URL/i.test(reviewerKit) || !/compensation/i.test(reviewerKit) || !/withdraw/i.test(reviewerKit)) failures.push('reviewer kit lacks independence, conflict, or withdrawal controls');
const releaseManifest=JSON.parse(fs.readFileSync(path.join(dist,'releases','v0.1.1','manifest.json'),'utf8'));
if(releaseManifest.releaseId!=='v0.1.1' || releaseManifest.artifactCount<10 || releaseManifest.files.some((file)=>!/^[a-f0-9]{64}$/.test(file.sha256))) failures.push('v0.1.1 release manifest is incomplete or has invalid checksums');
for (const registry of ['adoption','outcomes','reviews','field-studies']) {
  const html=fs.readFileSync(path.join(dist,registry,'index.html'),'utf8');
  if(!/0 (verified|reviewed|independent|publishable)/i.test(html)) failures.push(`${registry}/index.html: empty evidence registry is not explicit`);
}
if(filesUnder(dist).some((file)=>/private-evidence|counsel-exports/i.test(path.relative(dist,file)))) failures.push('private counsel artifact path entered dist');
if(htmlFiles.some((file)=>/criterion satisfied|prong satisfied|qualifies for EB-1A|qualifies for NIW/i.test(fs.readFileSync(file,'utf8')))) failures.push('public page renders an immigration eligibility verdict');
const htaccess = fs.existsSync(path.join(dist, '.htaccess')) ? fs.readFileSync(path.join(dist, '.htaccess'), 'utf8') : '';
if (!/RewriteEngine\s+On/i.test(htaccess)) failures.push('.htaccess missing RewriteEngine');
if (!/RewriteCond\s+%\{HTTPS\}\s+!=on\s+\[OR\]/i.test(htaccess) || !/RewriteCond\s+%\{HTTP_HOST\}\s+!\^www\\\.aiamigos\\\.org\$/i.test(htaccess) || !/https:\/\/www\.aiamigos\.org%\{REQUEST_URI\}/i.test(htaccess)) failures.push('.htaccess missing direct HTTPS www canonical redirect');
if (!/R=410/i.test(htaccess)) failures.push('.htaccess missing retirement rules');
if (!/\/articles\//.test(htaccess)) failures.push('.htaccess missing article redirects');

if (failures.length) {
  console.error(`Static verification failed with ${failures.length} finding(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Static verification passed: ${htmlFiles.length} HTML pages, metadata, redirects, sitemap, search, and WordPress-removal checks.`);
