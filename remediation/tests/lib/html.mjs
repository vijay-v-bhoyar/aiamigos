import { createHash } from "node:crypto";

export function decodeHtml(value = "") {
  return String(value)
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

export function stripMarkup(value = "") {
  return decodeHtml(
    String(value)
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<template\b[\s\S]*?<\/template>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function parseAttrs(tag = "") {
  const result = {};
  for (const match of String(tag).matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    result[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

function openingTags(html, name) {
  return [...String(html).matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((match) => ({
    raw: match[0],
    attrs: parseAttrs(match[0]),
  }));
}

function enclosed(html, name) {
  return [...String(html).matchAll(new RegExp(`<${name}\\b([^>]*)>([\\s\\S]*?)<\\/${name}>`, "gi"))].map((match) => ({
    attrs: parseAttrs(`<${name} ${match[1]}>`),
    raw: match[2],
    text: stripMarkup(match[2]),
  }));
}

function metaValues(metaTags, key, expected) {
  return metaTags
    .filter((tag) => tag.attrs[key]?.toLowerCase() === expected.toLowerCase())
    .map((tag) => tag.attrs.content?.trim() || null);
}

function metaValue(metaTags, key, expected) {
  return metaValues(metaTags, key, expected)[0] || null;
}

export function normalizeUrl(value, base) {
  try {
    const url = new URL(value, base);
    url.hash = "";
    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "/");
    return url.href;
  } catch {
    return null;
  }
}

export function comparableUrl(value, base) {
  const normalized = normalizeUrl(value, base);
  if (!normalized) return null;
  const url = new URL(normalized);
  url.searchParams.sort();
  return url.href;
}

export function sameSiteHost(hostname, baseHostname) {
  return hostname.replace(/^www\./i, "").toLowerCase() === baseHostname.replace(/^www\./i, "").toLowerCase();
}

export function xmlLocations(xml = "") {
  return [...String(xml).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => decodeHtml(match[1]).trim());
}

function schemaDetails(blocks) {
  const errors = [];
  const types = [];
  const people = [];
  const entities = [];
  const relationships = [];
  const httpReferences = [];
  const nodesById = new Map();

  function visit(value) {
    if (typeof value === "string") {
      for (const match of value.matchAll(/\bhttp:\/\/[^\s"'<>\u0000-\u001f]+/gi)) httpReferences.push(decodeHtml(match[0]).trim());
      return;
    }
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    const rawTypes = value["@type"] ? (Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]]) : [];
    const entity = {
      types: rawTypes.map(String),
      name: String(value.name ?? "").trim(),
      headline: String(value.headline ?? "").trim(),
      url: String(value.url ?? "").trim(),
      id: String(value["@id"] ?? "").trim(),
    };
    for (const type of rawTypes) types.push(String(type));
    if (rawTypes.some((type) => String(type).toLowerCase() === "person")) {
      people.push({ name: String(value.name ?? "").trim(), url: String(value.url ?? "").trim() });
    }
    if (rawTypes.length || value.name) entities.push(entity);
    if (entity.id) nodesById.set(entity.id, entity);
    for (const relation of ["author", "publisher", "reviewedBy", "worksFor"]) {
      const targets = value[relation] === undefined ? [] : (Array.isArray(value[relation]) ? value[relation] : [value[relation]]);
      for (const targetValue of targets) {
        if (typeof targetValue === "string") {
          relationships.push({ relation, owner: entity, target: { types: [], name: "", url: targetValue, id: targetValue } });
        } else if (targetValue && typeof targetValue === "object") {
          const targetTypes = targetValue["@type"] ? (Array.isArray(targetValue["@type"]) ? targetValue["@type"] : [targetValue["@type"]]) : [];
          relationships.push({
            relation,
            owner: entity,
            target: {
              types: targetTypes.map(String),
              name: String(targetValue.name ?? "").trim(),
              url: String(targetValue.url ?? "").trim(),
              id: String(targetValue["@id"] ?? "").trim(),
            },
          });
        }
      }
    }
    Object.values(value).forEach(visit);
  }

  for (const block of blocks) {
    try {
      visit(JSON.parse(block));
    } catch (error) {
      errors.push(String(error));
    }
  }
  for (const relationship of relationships) {
    const resolved = relationship.target.id ? nodesById.get(relationship.target.id) : null;
    if (resolved) relationship.target = {
      types: relationship.target.types.length ? relationship.target.types : resolved.types,
      name: relationship.target.name || resolved.name,
      url: relationship.target.url || resolved.url,
      id: relationship.target.id || resolved.id,
    };
  }
  return {
    blockCount: blocks.length,
    errors,
    types: [...new Set(types)].sort(),
    people,
    entities,
    relationships,
    httpReferences: [...new Set(httpReferences)].sort(),
  };
}

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function analyzeHtml(html, pageUrl) {
  const input = String(html ?? "");
  const metaTags = openingTags(input, "meta");
  const linkTags = openingTags(input, "link");
  const imageTags = openingTags(input, "img");
  const scriptTags = enclosed(input, "script");
  const title = enclosed(input, "title")[0]?.text || null;
  const headings = [];
  for (let level = 1; level <= 6; level += 1) {
    for (const heading of enclosed(input, `h${level}`)) headings.push({ level, text: heading.text });
  }
  const htmlAttrs = parseAttrs(input.match(/<html\b[^>]*>/i)?.[0] ?? "");
  const mainMatch = input.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const bodyMatch = input.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const bodyAttrs = parseAttrs(input.match(/<body\b[^>]*>/i)?.[0] ?? "");
  const mainHtml = mainMatch?.[1] ?? bodyMatch?.[1] ?? input;
  const visibleText = stripMarkup(mainHtml);
  const bodyText = stripMarkup(bodyMatch?.[1] ?? input);
  const anchors = [];
  for (const match of input.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = parseAttrs(`<a ${match[1]}>`);
    const resolved = attrs.href ? normalizeUrl(attrs.href, pageUrl) : null;
    anchors.push({
      href: attrs.href || null,
      resolved,
      rel: attrs.rel || "",
      text: stripMarkup(match[2]),
      ariaLabel: attrs["aria-label"] || null,
      title: attrs.title || null,
    });
  }

  const canonical = linkTags.find((tag) => (tag.attrs.rel ?? "").toLowerCase().split(/\s+/).includes("canonical"))?.attrs.href?.trim() || null;
  const jsonLdBlocks = scriptTags
    .filter((tag) => tag.attrs.type?.toLowerCase() === "application/ld+json")
    .map((tag) => tag.raw.trim())
    .filter(Boolean);
  const resourceUrls = new Set();
  for (const tagName of ["img", "script", "source", "video", "audio", "iframe", "link"]) {
    for (const tag of openingTags(input, tagName)) {
      const candidate = tag.attrs.src || tag.attrs.href || tag.attrs.poster;
      if (!candidate) continue;
      const resolved = normalizeUrl(candidate, pageUrl);
      if (resolved) resourceUrls.add(resolved);
    }
  }
  const httpReferences = new Set();
  for (const match of input.matchAll(/(?:href|src|poster|content|action)\s*=\s*["'](http:\/\/[^"']+)/gi)) {
    httpReferences.add(decodeHtml(match[1]).trim());
  }
  for (const match of input.matchAll(/url\(\s*["']?(http:\/\/[^)'"\s]+)/gi)) httpReferences.add(decodeHtml(match[1]).trim());

  const h1 = headings.filter((heading) => heading.level === 1);
  const description = metaValue(metaTags, "name", "description");
  const descriptionValues = metaValues(metaTags, "name", "description");
  const ogDescriptionValues = metaValues(metaTags, "property", "og:description");
  const twitterDescriptionValues = metaValues(metaTags, "name", "twitter:description");
  const robots = metaValue(metaTags, "name", "robots");
  const schema = schemaDetails(jsonLdBlocks);
  for (const reference of schema.httpReferences) httpReferences.add(reference);
  const words = visibleText.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
  const elementCount = (input.match(/<[a-z][^!/?][^>]*>/gi) ?? []).length;

  return {
    pageUrl,
    title,
    titleLength: title?.length ?? 0,
    description,
    descriptionLength: description?.length ?? 0,
    metadataTagCounts: {
      description: descriptionValues.length,
      ogDescription: ogDescriptionValues.length,
      twitterDescription: twitterDescriptionValues.length,
    },
    canonical,
    robots,
    indexable: !/noindex/i.test(robots ?? ""),
    lang: htmlAttrs.lang || null,
    viewport: metaValue(metaTags, "name", "viewport"),
    headings,
    h1,
    blankHeadings: headings.filter((heading) => !heading.text),
    headingWordMaximum: Math.max(0, ...headings.map((heading) => (heading.text.match(/\S+/g) ?? []).length)),
    mainScope: mainMatch ? "main" : bodyMatch ? "body" : "document",
    mainText: visibleText,
    visibleText,
    bodyText,
    bodyClasses: String(bodyAttrs.class ?? "").split(/\s+/).filter(Boolean),
    wordCount: words.length,
    contentHash: hash(visibleText.toLowerCase()),
    anchors,
    images: {
      total: imageTags.length,
      missingAlt: imageTags.filter((tag) => !("alt" in tag.attrs)).length,
      emptyAlt: imageTags.filter((tag) => "alt" in tag.attrs && !tag.attrs.alt.trim()).length,
    },
    semanticElements: {
      articleCount: openingTags(input, "article").length,
      mainCount: openingTags(input, "main").length,
      navCount: openingTags(input, "nav").length,
    },
    og: {
      title: metaValue(metaTags, "property", "og:title"),
      description: metaValue(metaTags, "property", "og:description"),
      image: metaValue(metaTags, "property", "og:image"),
      url: metaValue(metaTags, "property", "og:url"),
    },
    twitter: {
      title: metaValue(metaTags, "name", "twitter:title"),
      description: metaValue(metaTags, "name", "twitter:description"),
      image: metaValue(metaTags, "name", "twitter:image"),
      card: metaValue(metaTags, "name", "twitter:card"),
    },
    schema,
    httpReferences: [...httpReferences].sort(),
    resourceUrls: [...resourceUrls],
    scriptCount: openingTags(input, "script").length,
    elementCount,
    htmlBytes: Buffer.byteLength(input),
  };
}

export function headingLevelSkips(headings = []) {
  const skips = [];
  let previous = 0;
  for (const heading of headings) {
    if (!heading.text) continue;
    if (previous > 0 && heading.level > previous + 1) skips.push({ from: previous, to: heading.level, text: heading.text });
    previous = heading.level;
  }
  return skips;
}
