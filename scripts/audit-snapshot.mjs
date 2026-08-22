import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const snapshotRoot = path.resolve(process.argv[2] ?? "public-site-snapshot");
const outputPath = path.resolve(process.argv[3] ?? "output/seo-audit.json");
const manifest = JSON.parse(await readFile(path.join(snapshotRoot, "snapshot-manifest.json"), "utf8"));

function decode(value = "") {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function text(value = "") {
  return decode(value.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function attrs(tag = "") {
  const result = {};
  for (const match of tag.matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((match) => ({ raw: match[0], attrs: attrs(match[0]) }));
}

function enclosed(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "gi"))].map((match) => text(match[1]));
}

function metaValue(metaTags, key, value) {
  return metaTags.find((tag) => tag.attrs[key]?.toLowerCase() === value.toLowerCase())?.attrs.content ?? null;
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.href;
  } catch {
    return value;
  }
}

const pages = [];
for (const item of manifest.pages) {
  const html = await readFile(path.join(snapshotRoot, item.file), "utf8");
  const metaTags = tags(html, "meta");
  const linkTags = tags(html, "link");
  const imageTags = tags(html, "img");
  const anchorMatches = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  const anchors = anchorMatches.map((match) => ({
    attrs: attrs(`<a ${match[1]}>`),
    text: text(match[2]),
    namedImage: tags(match[2], "img").some((tag) => Boolean(tag.attrs.alt?.trim())),
  }));
  const title = enclosed(html, "title")[0] ?? null;
  const h1 = enclosed(html, "h1");
  const h2 = enclosed(html, "h2");
  const canonical = linkTags.find((tag) => (tag.attrs.rel ?? "").toLowerCase().split(/\s+/).includes("canonical"))?.attrs.href ?? null;
  const description = metaValue(metaTags, "name", "description");
  const robots = metaValue(metaTags, "name", "robots");
  const ogTitle = metaValue(metaTags, "property", "og:title");
  const ogDescription = metaValue(metaTags, "property", "og:description");
  const ogImage = metaValue(metaTags, "property", "og:image");
  const twitterTitle = metaValue(metaTags, "name", "twitter:title");
  const twitterDescription = metaValue(metaTags, "name", "twitter:description");
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? "";
  const mainHtml = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const visibleText = text(mainHtml);
  const words = visibleText.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
  const jsonLdBlocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1].trim());
  const schemaTypes = [];
  const schemaErrors = [];
  for (const block of jsonLdBlocks) {
    try {
      const parsed = JSON.parse(block);
      const visit = (value) => {
        if (Array.isArray(value)) return value.forEach(visit);
        if (!value || typeof value !== "object") return;
        if (value["@type"]) {
          const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
          schemaTypes.push(...types);
        }
        Object.values(value).forEach(visit);
      };
      visit(parsed);
    } catch (error) {
      schemaErrors.push(String(error));
    }
  }
  const rawShortcodes = [...new Set([...visibleText.matchAll(/\[[a-z][a-z0-9_-]+(?:\s+[^\]]*)?\]/gi)].map((match) => match[0]))];
  const insecureUrls = [...new Set([...html.matchAll(/(?:href|src|url|content)=["'](http:\/\/[^"']+)/gi)].map((match) => match[1]))];
  const mojibake = [...new Set(visibleText.match(/(?:â.|ðŸ.|�)/g) ?? [])];
  const finalUrl = item.finalUrl || item.requestedUrl;
  const pageHost = new URL(finalUrl).hostname.replace(/^www\./, "");
  const internalAnchors = anchors.filter((anchor) => {
    try {
      return new URL(anchor.attrs.href, finalUrl).hostname.replace(/^www\./, "") === pageHost;
    } catch {
      return false;
    }
  });
  pages.push({
    requestedUrl: item.requestedUrl,
    finalUrl,
    status: item.status,
    contentType: item.headers["content-type"] ?? null,
    title,
    titleLength: title?.length ?? 0,
    description,
    descriptionLength: description?.length ?? 0,
    robots,
    canonical,
    canonicalMatchesFinal: canonical ? normalizeUrl(canonical) === normalizeUrl(finalUrl) : false,
    lang: attrs(htmlTag).lang ?? null,
    h1,
    h2,
    wordCount: words.length,
    contentHash: hash(visibleText.toLowerCase()),
    og: { title: ogTitle, description: ogDescription, image: ogImage },
    twitter: { title: twitterTitle, description: twitterDescription },
    schema: { blockCount: jsonLdBlocks.length, types: [...new Set(schemaTypes)].sort(), errors: schemaErrors },
    images: {
      total: imageTags.length,
      missingAlt: imageTags.filter((tag) => !("alt" in tag.attrs)).length,
      emptyAlt: imageTags.filter((tag) => "alt" in tag.attrs && !tag.attrs.alt.trim()).length,
    },
    links: {
      total: anchors.length,
      internal: internalAnchors.length,
      emptyText: anchors.filter((anchor) => !anchor.text && !anchor.attrs["aria-label"] && !anchor.attrs.title && !anchor.namedImage).length,
      http: anchors.filter((anchor) => /^http:\/\//i.test(anchor.attrs.href ?? "")).map((anchor) => anchor.attrs.href),
      emailAsTelephone: anchors.filter((anchor) => /^tel:/i.test(anchor.attrs.href ?? "") && /@/.test(anchor.attrs.href ?? "")).map((anchor) => anchor.attrs.href),
    },
    rawShortcodes,
    insecureUrls,
    mojibake,
    hasVisibleAuthorSignal: /\b(?:author|written by|posted by|reviewed by)\b/i.test(visibleText),
    hasVisibleDateSignal: /\b(?:published|updated|posted on)\b/i.test(visibleText) || /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+20\d{2}\b/i.test(visibleText),
  });
}

function duplicateGroups(field) {
  const groups = new Map();
  for (const page of pages) {
    const value = page[field];
    if (!value) continue;
    const key = typeof value === "string" ? value.trim().toLowerCase() : JSON.stringify(value);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(page.finalUrl);
  }
  return [...groups.entries()].filter(([, urls]) => urls.length > 1).map(([value, urls]) => ({ value, urls }));
}

const summary = {
  pageCount: pages.length,
  non200: pages.filter((page) => page.status !== 200).map((page) => ({ url: page.requestedUrl, finalUrl: page.finalUrl, status: page.status })),
  missingTitle: pages.filter((page) => !page.title).map((page) => page.finalUrl),
  genericTitle: pages.filter((page) => /^(blog|home|academy|others|newsletter)$/i.test(page.title ?? "")).map((page) => ({ url: page.finalUrl, title: page.title })),
  titlesTooLong: pages.filter((page) => page.titleLength > 60).map((page) => ({ url: page.finalUrl, title: page.title, length: page.titleLength })),
  titlesTooShort: pages.filter((page) => page.titleLength > 0 && page.titleLength < 20).map((page) => ({ url: page.finalUrl, title: page.title, length: page.titleLength })),
  duplicateTitles: duplicateGroups("title"),
  missingDescriptions: pages.filter((page) => !page.description).map((page) => page.finalUrl),
  descriptionsTooLong: pages.filter((page) => page.descriptionLength > 160).map((page) => ({ url: page.finalUrl, length: page.descriptionLength })),
  descriptionsTooShort: pages.filter((page) => page.descriptionLength > 0 && page.descriptionLength < 70).map((page) => ({ url: page.finalUrl, length: page.descriptionLength })),
  duplicateDescriptions: duplicateGroups("description"),
  missingCanonical: pages.filter((page) => !page.canonical).map((page) => page.finalUrl),
  canonicalMismatch: pages.filter((page) => page.canonical && !page.canonicalMatchesFinal).map((page) => ({ url: page.finalUrl, canonical: page.canonical })),
  noindex: pages.filter((page) => /noindex/i.test(page.robots ?? "")).map((page) => page.finalUrl),
  h1Missing: pages.filter((page) => page.h1.length === 0).map((page) => page.finalUrl),
  h1Multiple: pages.filter((page) => page.h1.length > 1).map((page) => ({ url: page.finalUrl, h1: page.h1 })),
  thinPagesUnder300Words: pages.filter((page) => page.wordCount < 300).map((page) => ({ url: page.finalUrl, words: page.wordCount, title: page.title })),
  duplicateContent: duplicateGroups("contentHash"),
  missingOgImage: pages.filter((page) => !page.og.image).map((page) => page.finalUrl),
  missingTwitterDescription: pages.filter((page) => !page.twitter.description).map((page) => page.finalUrl),
  schemaErrors: pages.filter((page) => page.schema.errors.length).map((page) => ({ url: page.finalUrl, errors: page.schema.errors })),
  missingImageAlt: pages.filter((page) => page.images.missingAlt > 0).map((page) => ({ url: page.finalUrl, count: page.images.missingAlt })),
  emptyImageAlt: pages.filter((page) => page.images.emptyAlt > 0).map((page) => ({ url: page.finalUrl, count: page.images.emptyAlt })),
  emptyLinks: pages.filter((page) => page.links.emptyText > 0).map((page) => ({ url: page.finalUrl, count: page.links.emptyText })),
  insecureHttpLinks: pages.filter((page) => page.links.http.length > 0).map((page) => ({ url: page.finalUrl, links: page.links.http })),
  insecureEmbeddedUrls: pages.filter((page) => page.insecureUrls.length > 0).map((page) => ({ url: page.finalUrl, urls: page.insecureUrls })),
  emailAsTelephone: pages.filter((page) => page.links.emailAsTelephone.length > 0).map((page) => ({ url: page.finalUrl, links: page.links.emailAsTelephone })),
  rawShortcodes: pages.filter((page) => page.rawShortcodes.length > 0).map((page) => ({ url: page.finalUrl, shortcodes: page.rawShortcodes })),
  mojibake: pages.filter((page) => page.mojibake.length > 0).map((page) => ({ url: page.finalUrl, samples: page.mojibake })),
  missingVisibleAuthorSignal: pages.filter((page) => !page.hasVisibleAuthorSignal).map((page) => page.finalUrl),
  missingVisibleDateSignal: pages.filter((page) => !page.hasVisibleDateSignal).map((page) => page.finalUrl),
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), snapshot: manifest.provenance, summary, pages }, null, 2)}\n`, "utf8");
console.log(JSON.stringify(Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, Array.isArray(value) ? value.length : value])), null, 2));
