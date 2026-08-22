import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = path.resolve(import.meta.dirname, "..", "..");
const snapshotRoot = path.join(workspaceRoot, "public-site-snapshot");
const manifestPath = path.join(snapshotRoot, "snapshot-manifest.json");
const outputPath = path.join(import.meta.dirname, "performance-inventory.json");
const shouldProbe = process.argv.includes("--probe");
const mediaJsonFlag = process.argv.indexOf("--media-json");
const mediaJsonPath = mediaJsonFlag >= 0 ? process.argv[mediaJsonFlag + 1] : null;
if (mediaJsonFlag >= 0 && !mediaJsonPath) throw new Error("--media-json requires a path");

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function parseAttrs(tag = "") {
  const attrs = {};
  for (const match of String(tag).matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    attrs[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attrs;
}

function normalizeUrl(value, baseUrl) {
  if (!value) return null;
  try {
    const parsed = new URL(decodeHtml(value), baseUrl);
    parsed.hash = "";
    return parsed.href;
  } catch {
    return null;
  }
}

function srcsetCandidates(value, baseUrl) {
  return String(value ?? "")
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/, 2))
    .map(([url, descriptor]) => ({ url: normalizeUrl(url, baseUrl), descriptor: descriptor || null }))
    .filter((candidate) => candidate.url);
}

function imageSource(url) {
  if (!url) return "empty";
  if (/\/wp-content\/uploads\//i.test(url)) return "wordpress-media";
  if (/\/wp-content\/themes\//i.test(url)) return "theme";
  if (/\/wp-content\/plugins\//i.test(url)) return "plugin";
  return "other";
}

function isGeneratedVariant(url) {
  return /-\d+x\d+\.(?:avif|gif|jpe?g|png|webp)(?:$|\?)/i.test(url ?? "");
}

function ancestorContext(stack) {
  return stack
    .slice()
    .reverse()
    .filter((entry) => entry.attrs.id || entry.attrs.class)
    .slice(0, 4)
    .map((entry) => ({ tag: entry.name, id: entry.attrs.id || null, class: entry.attrs.class || null }));
}

function extractImages(html, pageUrl) {
  const stack = [];
  const images = [];
  let ordinal = 0;

  for (const match of String(html).matchAll(/<\/?([a-z][a-z0-9:-]*)\b[^>]*>/gi)) {
    const raw = match[0];
    const name = match[1].toLowerCase();
    const isClosing = /^<\//.test(raw);
    if (isClosing) {
      const index = stack.map((entry) => entry.name).lastIndexOf(name);
      if (index >= 0) stack.splice(index);
      continue;
    }

    const attrs = parseAttrs(raw);
    if (name === "img") {
      ordinal += 1;
      const src = normalizeUrl(attrs.src, pageUrl);
      images.push({
        ordinal,
        src,
        source: imageSource(src),
        alt: Object.hasOwn(attrs, "alt") ? attrs.alt : null,
        width: attrs.width ? Number.parseInt(attrs.width, 10) || null : null,
        height: attrs.height ? Number.parseInt(attrs.height, 10) || null : null,
        loading: attrs.loading || null,
        decoding: attrs.decoding || null,
        fetchpriority: attrs.fetchpriority || null,
        classes: attrs.class || null,
        hasDimensions: Boolean(attrs.width && attrs.height),
        hasSrcset: Boolean(attrs.srcset),
        sizes: attrs.sizes || null,
        srcset: srcsetCandidates(attrs.srcset, pageUrl),
        originalUploadInSrc: imageSource(src) === "wordpress-media" && !isGeneratedVariant(src),
        ancestorContext: ancestorContext(stack),
      });
      continue;
    }

    if (!VOID_ELEMENTS.has(name) && !/\/>$/.test(raw)) stack.push({ name, attrs });
  }
  return images;
}

function extractScripts(html, pageUrl) {
  return [...String(html).matchAll(/<script\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi)]
    .map((match) => normalizeUrl(match[1] ?? match[2] ?? match[3], pageUrl))
    .filter(Boolean);
}

function assetSource(url) {
  const parsed = new URL(url);
  const pathName = parsed.pathname;
  const pluginMatch = pathName.match(/\/wp-content\/plugins\/([^/]+)\//i);
  if (pluginMatch) return { owner: "plugin", package: pluginMatch[1] };
  const themeMatch = pathName.match(/\/wp-content\/themes\/([^/]+)\//i);
  if (themeMatch) return { owner: "theme", package: themeMatch[1] };
  if (/\/wp-includes\//i.test(pathName)) return { owner: "wordpress-core", package: "wordpress" };
  return { owner: "other", package: parsed.hostname };
}

async function probeUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: { "user-agent": "AIAmigosPerformanceInventory/1.0 (+https://aiamigos.org/)" },
      signal: controller.signal,
    });
    return {
      status: response.status,
      finalUrl: response.url,
      contentLength: Number.parseInt(response.headers.get("content-length") ?? "", 10) || null,
      contentType: response.headers.get("content-type"),
      cacheControl: response.headers.get("cache-control"),
      lastModified: response.headers.get("last-modified"),
      etag: response.headers.get("etag"),
    };
  } catch (error) {
    return { error: String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

async function mapWithConcurrency(values, limit, mapper) {
  const output = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()));
  return output;
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const mediaRecords = mediaJsonPath ? JSON.parse(await readFile(path.resolve(mediaJsonPath), "utf8")) : [];
if (mediaJsonPath && !Array.isArray(mediaRecords)) throw new Error("Media metadata must be a WordPress REST collection array");
const mediaBySource = new Map(
  mediaRecords
    .map((record) => [normalizeUrl(record.source_url, manifest.requestedBaseUrl), record])
    .filter(([url]) => url),
);
const targetPages = ["https://www.aiamigos.org/", "https://www.aiamigos.org/home/"];
const pages = [];

for (const requestedUrl of targetPages) {
  const entry = manifest.pages.find((page) => page.requestedUrl === requestedUrl);
  if (!entry) throw new Error(`Snapshot page is missing: ${requestedUrl}`);
  const html = await readFile(path.join(snapshotRoot, entry.file), "utf8");
  const images = extractImages(html, entry.finalUrl || entry.requestedUrl);
  const scripts = extractScripts(html, entry.finalUrl || entry.requestedUrl);
  const counts = new Map();
  for (const image of images) {
    if (image.src) counts.set(image.src, (counts.get(image.src) ?? 0) + 1);
  }
  for (const image of images) image.sameSrcOccurrencesOnPage = image.src ? counts.get(image.src) : 0;
  pages.push({
    requestedUrl,
    snapshotFile: entry.file,
    htmlBytes: entry.bytes,
    imageCount: images.length,
    uniqueNonEmptyImageSources: counts.size,
    originalUploadTags: images.filter((image) => image.originalUploadInSrc).length,
    rawOriginalTagsWithoutSrcset: images.filter((image) => image.originalUploadInSrc && !image.hasSrcset).length,
    rawOriginalTagsWithoutDimensions: images.filter((image) => image.originalUploadInSrc && !image.hasDimensions).length,
    rawOriginalTagsWithoutLazyLoading: images.filter((image) => image.originalUploadInSrc && image.loading !== "lazy").length,
    images,
    scripts,
  });
}

const uniqueUrls = [...new Set(pages.flatMap((page) => page.images.map((image) => image.src)).filter(Boolean))].sort();
const probes = shouldProbe ? await mapWithConcurrency(uniqueUrls, 6, async (url) => [url, await probeUrl(url)]) : [];
const probeMap = Object.fromEntries(probes);
for (const page of pages) {
  for (const image of page.images) image.response = image.src ? probeMap[image.src] ?? null : null;
  page.directSourceBytes = page.images.reduce((total, image) => total + (image.response?.contentLength ?? 0), 0);
  page.uniqueDirectSourceBytes = [...new Set(page.images.map((image) => image.src).filter(Boolean))].reduce(
    (total, url) => total + (probeMap[url]?.contentLength ?? 0),
    0,
  );
}

const heavyImages = uniqueUrls
  .map((url) => {
    const occurrences = pages.flatMap((page) =>
      page.images
        .filter((image) => image.src === url)
        .map((image) => ({ page: page.requestedUrl, ordinal: image.ordinal, context: image.ancestorContext, hasSrcset: image.hasSrcset })),
    );
    const media = mediaBySource.get(url);
    return {
      url,
      response: probeMap[url] ?? null,
      occurrences,
      media: media
        ? {
            id: media.id,
            width: media.media_details?.width ?? null,
            height: media.media_details?.height ?? null,
            sizes: Object.fromEntries(
              Object.entries(media.media_details?.sizes ?? {}).map(([name, size]) => [
                name,
                {
                  width: size.width ?? null,
                  height: size.height ?? null,
                  sourceUrl: normalizeUrl(size.source_url, manifest.requestedBaseUrl),
                },
              ]),
            ),
          }
        : null,
    };
  })
  .filter((item) => item.response?.contentLength)
  .sort((a, b) => b.response.contentLength - a.response.contentLength);

const recommendedCandidateUrls = [
  ...new Set(
    heavyImages
      .map((item) => item.media?.sizes?.medium_large?.sourceUrl ?? item.media?.sizes?.medium?.sourceUrl ?? item.url)
      .filter(Boolean),
  ),
];
const candidateProbes = shouldProbe
  ? await mapWithConcurrency(recommendedCandidateUrls, 6, async (url) => [url, await probeUrl(url)])
  : [];
const candidateProbeMap = Object.fromEntries(candidateProbes);
for (const item of heavyImages) {
  const mediumLarge = item.media?.sizes?.medium_large?.sourceUrl;
  const medium = item.media?.sizes?.medium?.sourceUrl;
  const url = mediumLarge ?? medium ?? item.url;
  item.recommendedCandidate = {
    size: mediumLarge ? "medium_large" : medium ? "medium" : "original-fallback",
    url,
    response: candidateProbeMap[url] ?? null,
  };
}

const scriptPages = new Map();
for (const page of pages) {
  for (const url of page.scripts) {
    const key = url.replace(/#.*$/, "");
    if (!scriptPages.has(key)) scriptPages.set(key, []);
    scriptPages.get(key).push(page.requestedUrl);
  }
}
const scripts = manifest.assets
  .filter((asset) => /(?:javascript|ecmascript)/i.test(asset.headers?.["content-type"] ?? "") || /\.js(?:$|\?)/i.test(asset.requestedUrl))
  .map((asset) => ({
    url: asset.requestedUrl,
    source: assetSource(asset.requestedUrl),
    status: asset.status,
    snapshotBodyBytes: asset.bytes,
    observedContentLength: Number.parseInt(asset.headers?.["content-length"] ?? "", 10) || null,
    contentEncoding: asset.headers?.["content-encoding"] ?? null,
    cacheControl: asset.headers?.["cache-control"] ?? null,
    referencedByTargetPages: [...new Set(scriptPages.get(asset.requestedUrl) ?? [])],
  }))
  .sort((a, b) => b.snapshotBodyBytes - a.snapshotBodyBytes);

const result = {
  generatedAt: new Date().toISOString(),
  evidenceBoundary: "HTML and attributes come from the 2026-08-13 public snapshot. Response metadata is present only when generated with --probe and is a read-only live HEAD observation. Optional derivative metadata comes from a caller-supplied public WordPress REST media collection.",
  probeEnabled: shouldProbe,
  mediaMetadataInput: mediaJsonPath ? path.resolve(mediaJsonPath) : null,
  mediaMetadataRecordCount: mediaRecords.length,
  pages,
  heavyImages,
  scripts,
};

await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      outputPath,
      probeEnabled: shouldProbe,
      pages: pages.map((page) => ({
        url: page.requestedUrl,
        images: page.imageCount,
        rawOriginalsWithoutSrcset: page.rawOriginalTagsWithoutSrcset,
        uniqueDirectSourceBytes: page.uniqueDirectSourceBytes,
      })),
      largest: heavyImages.slice(0, 10).map((item) => ({ url: item.url, bytes: item.response.contentLength })),
      derivativeCoverage: {
        matchedMediaRecords: heavyImages.filter((item) => item.media).length,
        mediumLarge: heavyImages.filter((item) => item.media?.sizes?.medium_large?.sourceUrl).length,
        largestRecommendedCandidateBytes: Math.max(
          0,
          ...heavyImages.map((item) => item.recommendedCandidate?.response?.contentLength ?? 0),
        ),
      },
      largestScripts: scripts.slice(0, 10).map((item) => ({
        url: item.url,
        owner: item.source,
        snapshotBodyBytes: item.snapshotBodyBytes,
        observedContentLength: item.observedContentLength,
      })),
    },
    null,
    2,
  ),
);
