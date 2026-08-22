import { writeFile } from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    baseUrl: "https://remediation.aiamigos.org/",
    output: null,
    timeoutMs: 20_000,
    cacheBust: true,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const take = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value`);
      index += 1;
      return value;
    };
    if (arg === "--base-url") args.baseUrl = take();
    else if (arg === "--output") args.output = take();
    else if (arg === "--timeout-ms") args.timeoutMs = Number.parseInt(take(), 10);
    else if (arg === "--no-cache-bust") args.cacheBust = false;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  const base = new URL(args.baseUrl);
  if (!/^https?:$/.test(base.protocol)) throw new Error("--base-url must use HTTP(S)");
  base.pathname = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
  args.baseUrl = base.href;
  return args;
}

function usage() {
  return `AI Amigos performance markup gate

Usage:
  node remediation/performance/performance-markup-gate.mjs [options]

Options:
  --base-url <url>       Target root (default: staging)
  --output <path|->      Save machine-readable JSON, or print only with -
  --timeout-ms <n>       Request timeout (default: 20000)
  --no-cache-bust        Inspect the bare cache key instead of fresh markup
`;
}

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

function classTokens(value = "") {
  return String(value).trim().split(/\s+/).filter(Boolean);
}

function normalizeUrl(value, baseUrl) {
  try {
    return new URL(decodeHtml(value), baseUrl).href;
  } catch {
    return null;
  }
}

function extractTargetImages(html, pageUrl) {
  const voidElements = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const stack = [];
  const images = [];
  for (const match of String(html).matchAll(/<\/?([a-z][a-z0-9:-]*)\b[^>]*>/gi)) {
    const raw = match[0];
    const name = match[1].toLowerCase();
    if (/^<\//.test(raw)) {
      const index = stack.map((entry) => entry.name).lastIndexOf(name);
      if (index >= 0) stack.splice(index);
      continue;
    }
    const attrs = parseAttrs(raw);
    if (name === "img") {
      const ancestorClasses = new Set(stack.flatMap((entry) => classTokens(entry.attrs.class)));
      images.push({
        attrs,
        src: normalizeUrl(attrs.src, pageUrl),
        ancestorClasses: [...ancestorClasses],
      });
      continue;
    }
    if (!voidElements.has(name) && !/\/>$/.test(raw)) stack.push({ name, attrs });
  }
  return images;
}

async function fetchWithTimeout(url, { method = "GET", timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      cache: "no-store",
      headers: { "user-agent": "AIAmigosPerformanceGate/1.0 (+https://aiamigos.org/)" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
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

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(usage());
  process.exit(0);
}

const routePolicies = [
  {
    path: "/",
    containerClass: "latest-blog-image",
    expectedImageClass: "aiamigos-home-blog-image",
    maxNonLazy: 0,
  },
  {
    path: "/blog/",
    containerClass: "post_pic_inner",
    expectedImageClass: "aiamigos-archive-card-image",
    maxNonLazy: 3,
  },
];

const failures = [];
const pages = [];
for (const policy of routePolicies) {
  const requested = new URL(policy.path.replace(/^\//, ""), args.baseUrl);
  if (args.cacheBust) requested.searchParams.set("aiamigos-performance-gate", String(Date.now()));
  const response = await fetchWithTimeout(requested, { timeoutMs: args.timeoutMs });
  const html = await response.text();
  const allImages = extractTargetImages(html, response.url);
  const targets = allImages.filter((image) => image.ancestorClasses.includes(policy.containerClass));
  if (response.status !== 200) failures.push({ route: policy.path, message: "Document did not return 200", actual: response.status });
  if (targets.length === 0) failures.push({ route: policy.path, message: `No images found inside .${policy.containerClass}` });

  const headResults = Object.fromEntries(
    await mapWithConcurrency(
      [...new Set(targets.map((image) => image.src).filter(Boolean))],
      6,
      async (url) => {
        try {
          const head = await fetchWithTimeout(url, { method: "HEAD", timeoutMs: args.timeoutMs });
          return [
            url,
            {
              status: head.status,
              contentLength: Number.parseInt(head.headers.get("content-length") ?? "", 10) || null,
              contentType: head.headers.get("content-type"),
            },
          ];
        } catch (error) {
          return [url, { error: String(error) }];
        }
      },
    ),
  );

  let nonLazy = 0;
  const imageRows = [];
  for (const [index, image] of targets.entries()) {
    const attrs = image.attrs;
    const classes = classTokens(attrs.class);
    const responseEvidence = image.src ? headResults[image.src] : null;
    const isSmallFallback = Boolean(responseEvidence?.contentLength && responseEvidence.contentLength <= 100 * 1024);
    const evidence = { route: policy.path, ordinal: index + 1, src: image.src };
    if (!image.src) failures.push({ ...evidence, message: "Target image has no source URL" });
    if (!classes.includes(policy.expectedImageClass)) failures.push({ ...evidence, message: `Missing .${policy.expectedImageClass}` });
    if (!(Number.parseInt(attrs.width ?? "", 10) > 0 && Number.parseInt(attrs.height ?? "", 10) > 0)) {
      failures.push({ ...evidence, message: "Intrinsic width/height are missing" });
    }
    if (!attrs.srcset && !isSmallFallback) failures.push({ ...evidence, message: "srcset is missing on an image larger than 100 KiB", bytes: responseEvidence?.contentLength ?? null });
    if (!attrs.sizes) failures.push({ ...evidence, message: "sizes is missing" });
    if (attrs.decoding !== "async") failures.push({ ...evidence, message: "decoding=async is missing", actual: attrs.decoding || null });
    if (attrs.loading !== "lazy") nonLazy += 1;
    if (responseEvidence?.status !== 200) failures.push({ ...evidence, message: "Direct image source did not return 200", response: responseEvidence });
    if (!/-\d+x\d+\.(?:avif|gif|jpe?g|png|webp)(?:$|\?)/i.test(image.src ?? "") && !isSmallFallback) {
      failures.push({ ...evidence, message: "Large original remains in the direct src attribute", bytes: responseEvidence?.contentLength ?? null });
    }
    imageRows.push({
      src: image.src,
      width: Number.parseInt(attrs.width ?? "", 10) || null,
      height: Number.parseInt(attrs.height ?? "", 10) || null,
      loading: attrs.loading || null,
      decoding: attrs.decoding || null,
      hasSrcset: Boolean(attrs.srcset),
      sizes: attrs.sizes || null,
      response: responseEvidence,
    });
  }
  if (nonLazy > policy.maxNonLazy) {
    failures.push({ route: policy.path, message: "Too many target images are not lazy-loaded", actual: nonLazy, maximum: policy.maxNonLazy });
  }
  pages.push({
    route: policy.path,
    requestedUrl: requested.href,
    finalUrl: response.url,
    status: response.status,
    targetImageCount: targets.length,
    nonLazyTargetImages: nonLazy,
    images: imageRows,
  });
}

const result = {
  generatedAt: new Date().toISOString(),
  baseUrl: args.baseUrl,
  cacheBust: args.cacheBust,
  pass: failures.length === 0,
  failures,
  pages,
};
const serialized = `${JSON.stringify(result, null, 2)}\n`;
if (args.output && args.output !== "-") await writeFile(path.resolve(args.output), serialized, "utf8");
if (args.output && args.output !== "-") {
  console.log(
    JSON.stringify(
      {
        output: path.resolve(args.output),
        pass: result.pass,
        failureCount: failures.length,
        pages: pages.map((page) => ({
          route: page.route,
          status: page.status,
          targetImageCount: page.targetImageCount,
          nonLazyTargetImages: page.nonLazyTargetImages,
        })),
      },
      null,
      2,
    ),
  );
} else {
  console.log(serialized.trimEnd());
}
if (failures.length) process.exitCode = 1;
