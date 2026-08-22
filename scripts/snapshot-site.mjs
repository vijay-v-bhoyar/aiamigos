import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = new URL(process.argv[2] ?? "https://www.aiamigos.org/");
const outputRoot = path.resolve(process.argv[3] ?? "public-site-snapshot");
const maxPages = Number.parseInt(process.argv[4] ?? "250", 10);
const allowedHosts = new Set([baseUrl.hostname, baseUrl.hostname.replace(/^www\./, ""), `www.${baseUrl.hostname.replace(/^www\./, "")}`]);
const userAgent = "Mozilla/5.0 (compatible; AIAmigosSEOAudit/1.0; +https://aiamigos.org/)";

await mkdir(path.join(outputRoot, "pages"), { recursive: true });
await mkdir(path.join(outputRoot, "assets"), { recursive: true });
await mkdir(path.join(outputRoot, "meta"), { recursive: true });

const manifest = {
  generatedAt: new Date().toISOString(),
  requestedBaseUrl: baseUrl.href,
  provenance: "Public deployed-site snapshot; not an authoritative source repository.",
  pages: [],
  assets: [],
  sitemaps: [],
  errors: [],
};

function shortHash(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 10);
}

function safeStem(url) {
  const parsed = new URL(url);
  const raw = parsed.pathname === "/" ? "home" : parsed.pathname.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `${raw.slice(0, 100) || "page"}-${shortHash(parsed.href)}`;
}

function headerObject(headers) {
  return Object.fromEntries([...headers.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": userAgent, accept: "text/html,application/xhtml+xml,application/xml,text/css,application/javascript,*/*;q=0.8" },
      signal: controller.signal,
    });
    return {
      body: await response.text(),
      finalUrl: response.url,
      headers: headerObject(response.headers),
      status: response.status,
    };
  } finally {
    clearTimeout(timer);
  }
}

function xmlLocations(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].replaceAll("&amp;", "&").trim());
}

function discoverAssets(html, pageUrl) {
  const urls = new Set();
  for (const match of html.matchAll(/<(?:script|link)\b[^>]+?(?:src|href)=["']([^"']+)["'][^>]*>/gi)) {
    try {
      const resolved = new URL(match[1], pageUrl);
      if (allowedHosts.has(resolved.hostname) && /\.(?:css|js)(?:$|\?)/i.test(resolved.href)) {
        resolved.hash = "";
        urls.add(resolved.href);
      }
    } catch {
      // Ignore malformed markup URLs while preserving the page itself.
    }
  }
  return urls;
}

const robotsUrl = new URL("/robots.txt", baseUrl).href;
let robots = "";
try {
  const result = await fetchText(robotsUrl);
  robots = result.body;
  await writeFile(path.join(outputRoot, "meta", "robots.txt"), robots, "utf8");
  manifest.robots = { url: robotsUrl, status: result.status, finalUrl: result.finalUrl, headers: result.headers };
} catch (error) {
  manifest.errors.push({ url: robotsUrl, stage: "robots", error: String(error) });
}

const sitemapQueue = [];
for (const match of robots.matchAll(/^\s*Sitemap:\s*(\S+)/gim)) sitemapQueue.push(match[1]);
if (sitemapQueue.length === 0) {
  sitemapQueue.push(new URL("/wp-sitemap.xml", baseUrl).href, new URL("/sitemap_index.xml", baseUrl).href, new URL("/sitemap.xml", baseUrl).href);
}

const seenSitemaps = new Set();
const pageUrls = new Set([baseUrl.href]);
while (sitemapQueue.length > 0 && seenSitemaps.size < 100) {
  const sitemapUrl = sitemapQueue.shift();
  if (seenSitemaps.has(sitemapUrl)) continue;
  seenSitemaps.add(sitemapUrl);
  try {
    const result = await fetchText(sitemapUrl);
    if (result.status >= 400 || !/(?:xml|text\/plain)/i.test(result.headers["content-type"] ?? "")) continue;
    const file = `${safeStem(sitemapUrl)}.xml`;
    await writeFile(path.join(outputRoot, "meta", file), result.body, "utf8");
    manifest.sitemaps.push({ url: sitemapUrl, status: result.status, finalUrl: result.finalUrl, file: `meta/${file}`, headers: result.headers });
    for (const location of xmlLocations(result.body)) {
      let parsed;
      try {
        parsed = new URL(location);
      } catch {
        continue;
      }
      if (!allowedHosts.has(parsed.hostname)) continue;
      if (/\.xml(?:$|\?)/i.test(parsed.href) || /sitemap/i.test(parsed.pathname)) sitemapQueue.push(parsed.href);
      else if (pageUrls.size < maxPages) pageUrls.add(parsed.href);
    }
  } catch (error) {
    manifest.errors.push({ url: sitemapUrl, stage: "sitemap", error: String(error) });
  }
}

const assetUrls = new Set();
for (const url of [...pageUrls].slice(0, maxPages)) {
  try {
    const result = await fetchText(url);
    const file = `${safeStem(url)}.html`;
    await writeFile(path.join(outputRoot, "pages", file), result.body, "utf8");
    manifest.pages.push({ requestedUrl: url, status: result.status, finalUrl: result.finalUrl, file: `pages/${file}`, bytes: Buffer.byteLength(result.body), headers: result.headers });
    for (const assetUrl of discoverAssets(result.body, result.finalUrl || url)) assetUrls.add(assetUrl);
  } catch (error) {
    manifest.errors.push({ url, stage: "page", error: String(error) });
  }
}

for (const url of assetUrls) {
  try {
    const result = await fetchText(url);
    const parsed = new URL(url);
    const extension = /\.css(?:$|\?)/i.test(url) ? ".css" : ".js";
    const rawName = path.basename(parsed.pathname, path.extname(parsed.pathname)).replace(/[^a-zA-Z0-9._-]+/g, "-") || "asset";
    const file = `${rawName.slice(0, 80)}-${shortHash(url)}${extension}`;
    await writeFile(path.join(outputRoot, "assets", file), result.body, "utf8");
    manifest.assets.push({ requestedUrl: url, status: result.status, finalUrl: result.finalUrl, file: `assets/${file}`, bytes: Buffer.byteLength(result.body), headers: result.headers });
  } catch (error) {
    manifest.errors.push({ url, stage: "asset", error: String(error) });
  }
}

try {
  const restUrl = new URL("/wp-json/", baseUrl).href;
  const result = await fetchText(restUrl);
  await writeFile(path.join(outputRoot, "meta", "wp-rest-index.json"), result.body, "utf8");
  manifest.wordpressRest = { url: restUrl, status: result.status, finalUrl: result.finalUrl, headers: result.headers };
} catch (error) {
  manifest.errors.push({ url: new URL("/wp-json/", baseUrl).href, stage: "wp-rest", error: String(error) });
}

await writeFile(path.join(outputRoot, "snapshot-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputRoot, pages: manifest.pages.length, assets: manifest.assets.length, sitemaps: manifest.sitemaps.length, errors: manifest.errors.length }, null, 2));
