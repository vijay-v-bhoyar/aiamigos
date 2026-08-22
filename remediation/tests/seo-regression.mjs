#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { analyzeHtml, comparableUrl, headingLevelSkips, normalizeUrl, sameSiteHost, xmlLocations } from "./lib/html.mjs";
import {
  canonicalEvidenceDisposition,
  feedQuarantineEvidence,
  pagerProbeUpperBound,
  partitionStaticPerformanceRows,
  permanentRedirectViolations,
  quarantinedRouteViolations,
  unpublishedRouteViolations,
} from "./lib/invariants.mjs";
import { CACHE_BYPASS_MODES, CACHE_BYPASS_PARAM, LiveSource, SnapshotSource, logicalProbeUrl, mapLimit } from "./lib/sources.mjs";
import { probeBrowserPages } from "./lib/browser-probe.mjs";
import { accessibilityEvidenceViolations } from "./lib/accessibility-evidence.mjs";
import { contactExchangeViolations, productionContentDefects } from "./lib/content-gates.mjs";
import {
  approvedFallbackViolations,
  resolvedSocialImage,
  schemaSemanticViolations,
  socialImageResponseEvidence,
  socialImageResponseViolations,
} from "./lib/social-schema.mjs";

const DEFAULTS = {
  routes: { root: "/", oldHome: "/home/", blog: "/blog/", legacyPageTwo: "/page/2/", contact: "/contact/" },
  routePolicies: {
    gonePaths: [
      "/classes/recent-case-title-01/",
      "/classes/recent-case-title-02/",
      "/testimonials/client-name-01/",
      "/testimonials/client-name-02/",
      "/testimonials/client-name-03/",
      "/team/member-name-02/",
      "/team/member-name-03/",
      "/team/member-name-04/",
      "/services/ai-amigos-academy/",
      "/services/ai-amigos-pro/",
      "/services/ai-by-job-role/",
      "/services/ai-for-kids/",
      "/ai-certifications/",
      "/gpt-models/",
      "/grokai/",
      "/ai-model-benchmarks-a-comprehensive-guide/",
      "/others/",
      "/shop/",
      "/langgraph-5-stunning-secrets-for-building-a-generative-ai-application/",
      "/ways-to-test-a-rag-architecture-based-generative-ai-application/",
      "/building-agentic-ai-saas-a-strategic-roadmap-using-google-gemini-enterprise/",
      "/custom-gpt-models/",
      "/services/",
      "/classes/",
      "/ai-tools-for-kids/",
      "/ai-books-for-kids/",
      "/newsletter/",
      "/newsletter-2/",
    ],
    quarantinedPaths: [
      "/privacy-policy-2/",
      "/page/",
      "/academy/",
      "/ai-career/",
    ],
    unpublishedPaths: [],
    permanentRedirects: {},
    preservedPaths: ["/team/member-name-01/"],
    registrationPath: "/wp-login.php?action=register",
  },
  feedPaths: [
    "/feed/",
    "/?feed=rss2&post_type=services",
    "/?feed=rss2&post_type=classes",
    "/?feed=rss2&post_type=testimonials",
    "/?feed=rss2&post_type=team",
  ],
  concurrency: 10,
  timeoutMs: 20_000,
  maxSitemaps: 50,
  maxSitemapUrls: 1_000,
  maxInternalTargets: 500,
  internalProbeSeedLimit: 30,
  maxPagerPages: 50,
  detailLimit: 50,
  expectedBrandPattern: "AI\\s*Amigos",
  genericRootTitlePattern: "^(?:blog|home|welcome)$",
  metadata: { titleMin: 10, titleMax: 60, descriptionMin: 50, descriptionMax: 160, requireSocialImages: true },
  socialImages: {
    allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
    maxBytes: 5_000_000,
    fallbackApproval: {
      status: "pending",
      url: "/wp-content/uploads/2023/10/cropped-logo-5.png",
      width: 1200,
      height: 630,
      sha256: null,
      approvedBy: null,
      approvedAt: null,
      evidenceId: null,
    },
  },
  schemaGovernance: {
    allowedTypes: [
      "Article",
      "BlogPosting",
      "BreadcrumbList",
      "CollectionPage",
      "EducationalOrganization",
      "ImageObject",
      "ListItem",
      "Organization",
      "Person",
      "Review",
      "SearchAction",
      "SiteNavigationElement",
      "WebPage",
      "WebSite",
    ],
    approvalRequiredTypes: ["Person", "Organization", "EducationalOrganization", "Review"],
    claimAllowlist: [],
    collectionPagePathPatterns: ["^/blog/?$"],
    articleDeniedPathPatterns: ["^/$", "^/blog/?$"],
    articleBodyClassPatterns: ["\\bsingle-post\\b"],
  },
  headings: { maxHeadingWords: 60, disallowLevelSkips: true },
  performance: {
    htmlBytes: 250_000,
    totalTransferBytes: 3_000_000,
    imageTransferBytes: 1_500_000,
    scriptTransferBytes: 750_000,
    resourceCount: 80,
    scriptCount: 20,
    domNodes: 1_500,
    horizontalOverflowPx: 0,
  },
  browser: {
    settleMs: 2_000,
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
    maxPages: 4,
    paths: ["/", "/blog/", "/contact/", "/team/member-name-01/"],
    accessibility: {
      enabled: true,
      rootPath: "/",
      expectedCarouselDots: 20,
      minTargetPx: 44,
      autoplayObservationMs: 6_250,
      minAutoplayObservationMs: 6_000,
      interactionSettleMs: 650,
    },
  },
  requiredHeaders: ["strict-transport-security", "x-content-type-options", "referrer-policy", "permissions-policy"],
  requireFrameProtection: true,
  requireHtmlCachePolicy: true,
  forbidPoweredBy: true,
  disallowedIndexablePathPatterns: ["^/author/", "^/page/[2-9][0-9]*/?$", "^/category/"],
  placeholderPatterns: [
    { id: "raw_mailpoet_shortcode", pattern: "\\[mailpoet_form\\b[^\\]]*\\]", flags: "i", scope: "body" },
    { id: "theme_latin_demo_copy", pattern: "Te obtinuit ut adepto satis somno", flags: "i" },
    { id: "placeholder_client_name", pattern: "\\bClient Name \\d{1,2}\\b", flags: "i", scope: "body" },
    { id: "placeholder_member_name", pattern: "\\bMember Name \\d{1,2}\\b", flags: "i", scope: "body" },
    { id: "placeholder_case_title", pattern: "\\bRecent Case Title \\d{1,2}\\b", flags: "i", scope: "body" },
    { id: "placeholder_company_token", pattern: "\\[Your Company Name(?:/AIAmigos\\.org)?\\]", flags: "i" },
    { id: "placeholder_service_url", pattern: "\\bService Url\\b", flags: "i" },
    { id: "misspelled_linkedin", pattern: "\\bLinkden\\b", flags: "i" },
  ],
};

function usage() {
  return `AIAmigos SEO remediation regression harness

Usage:
  node remediation/tests/seo-regression.mjs [options]

Options:
  --base-url <url>          Site root (default: https://www.aiamigos.org/)
  --mode <live|snapshot>    Network crawl or saved snapshot replay (default: live)
  --dry-run                 Alias for --mode snapshot; performs no network requests
  --snapshot <path>         Snapshot root (default: public-site-snapshot)
  --config <json>           Override thresholds/routes using JSON
  --output <path|->         Machine JSON path, or - for stdout only
  --browser <auto|off|required>  Runtime/console and transfer probe (default: auto in live)
  --browser-path <path>     Explicit Chrome/Edge executable
  --cache-bypass <off|headers|query>  Live-request cache bypass (default: off)
  --concurrency <n>         Concurrent HTTP reads
  --timeout-ms <n>          Per-request/browser timeout
  --allow-failures          Exit 0 even when remediation assertions fail
  --help                    Show this help
`;
}

function parseArgs(argv) {
  const args = {
    baseUrl: "https://www.aiamigos.org/",
    mode: "live",
    snapshot: "public-site-snapshot",
    output: null,
    config: null,
    browser: "auto",
    browserPath: null,
    cacheBypass: "off",
    allowFailures: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const take = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value`);
      index += 1;
      return value;
    };
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--base-url") args.baseUrl = take();
    else if (arg === "--mode") args.mode = take();
    else if (arg === "--dry-run") args.mode = "snapshot";
    else if (arg === "--snapshot") args.snapshot = take();
    else if (arg === "--config") args.config = take();
    else if (arg === "--output") args.output = take();
    else if (arg === "--browser") args.browser = take();
    else if (arg === "--browser-path") args.browserPath = take();
    else if (arg === "--cache-bypass") args.cacheBypass = take();
    else if (arg === "--concurrency") args.concurrency = Number.parseInt(take(), 10);
    else if (arg === "--timeout-ms") args.timeoutMs = Number.parseInt(take(), 10);
    else if (arg === "--allow-failures") args.allowFailures = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (!new Set(["live", "snapshot"]).has(args.mode)) throw new Error(`Unsupported mode: ${args.mode}`);
  if (!new Set(["auto", "off", "required"]).has(args.browser)) throw new Error(`Unsupported browser mode: ${args.browser}`);
  if (!CACHE_BYPASS_MODES.has(args.cacheBypass)) throw new Error(`Unsupported cache bypass mode: ${args.cacheBypass}`);
  args.baseUrl = normalizeUrl(args.baseUrl);
  if (!args.baseUrl) throw new Error("--base-url must be an absolute HTTP(S) URL");
  return args;
}

function merge(base, override) {
  if (!override || typeof override !== "object" || Array.isArray(override)) return override ?? base;
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    result[key] = value && typeof value === "object" && !Array.isArray(value) ? merge(base?.[key] ?? {}, value) : value;
  }
  return result;
}

function createCheck(id, title, severity = "high") {
  return { id, title, severity, status: "pass", summary: "", metrics: {}, failures: [], notes: [] };
}

function fail(check, message, evidence = {}) {
  check.status = "fail";
  check.failures.push({ message, ...evidence });
}

function skip(check, reason) {
  if (check.status !== "fail") check.status = "skip";
  check.notes.push(reason);
}

function truncate(check, limit) {
  const omitted = Math.max(0, check.failures.length - limit);
  if (omitted) {
    check.failures = check.failures.slice(0, limit);
    check.notes.push(`${omitted} additional failure detail(s) omitted; see metrics for totals.`);
  }
  return check;
}

function requireCanonicalEvidence(check, rows) {
  const disposition = canonicalEvidenceDisposition(rows, check.severity);
  if (disposition === "evaluate") return true;
  const message = "Zero healthy, indexable canonical HTML pages were available; this check cannot establish compliance.";
  if (disposition === "fail") fail(check, message, { healthyCanonicalPages: 0 });
  else skip(check, message);
  return false;
}

function route(baseUrl, pathname) {
  return normalizeUrl(pathname, baseUrl);
}

function pathOf(value) {
  try {
    return new URL(value).pathname;
  } catch {
    return "";
  }
}

function isHtml(response) {
  return /text\/html|application\/xhtml\+xml/i.test(response.headers?.["content-type"] ?? "") || /^\s*<!doctype html|^\s*<html/i.test(response.body ?? "");
}

function isFeed(response) {
  return /(?:application|text)\/(?:rss\+xml|atom\+xml|xml)/i.test(response.headers?.["content-type"] ?? "") || /^\s*<\?xml[\s\S]*?<(?:rss|feed)\b/i.test(response.body ?? "");
}

function pagerNumber(value, blogUrl) {
  try {
    const pathname = new URL(value).pathname.replace(/\/+$/, "/");
    const blogPath = new URL(blogUrl).pathname.replace(/\/+$/, "/");
    if (pathname === blogPath) return 1;
    const escapedBlog = blogPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = pathname.match(new RegExp(`^${escapedBlog}page\/(\\d+)\/$`, "i"));
    return match ? Number.parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

async function discoverSitemapInventory(source, baseUrl, config) {
  const robotsUrl = route(baseUrl, "/robots.txt");
  const robots = await source.request(robotsUrl);
  const seeds = [...robots.body.matchAll(/^\s*Sitemap:\s*(\S+)/gim)].map((match) => normalizeUrl(match[1], baseUrl)).filter(Boolean);
  if (!seeds.length) seeds.push(route(baseUrl, "/sitemap_index.xml"), route(baseUrl, "/sitemap.xml"), route(baseUrl, "/wp-sitemap.xml"));
  if (source.mode === "snapshot" && source.manifest?.sitemaps?.length) {
    for (const item of source.manifest.sitemaps) seeds.push(normalizeUrl(item.requestedUrl ?? item.finalUrl));
  }
  const queue = [...new Set(seeds)];
  const seen = new Set();
  const sitemaps = [];
  const pageMap = new Map();
  const errors = [];
  while (queue.length && seen.size < config.maxSitemaps) {
    const sitemapUrl = queue.shift();
    const key = comparableUrl(sitemapUrl);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    let response;
    try {
      response = await source.request(sitemapUrl);
    } catch (error) {
      errors.push({ url: sitemapUrl, error: String(error) });
      continue;
    }
    if (!response.observed || response.status !== 200 || !response.body) continue;
    const locations = xmlLocations(response.body);
    if (!locations.length) {
      errors.push({ url: sitemapUrl, error: "Sitemap returned no <loc> entries" });
      continue;
    }
    const childLocations = locations.filter((location) => /(?:\.xml(?:$|\?)|sitemap)/i.test(new URL(location, baseUrl).pathname));
    const isIndex = /<sitemapindex\b/i.test(response.body) || childLocations.length === locations.length;
    sitemaps.push({ url: sitemapUrl, status: response.status, locationCount: locations.length, kind: isIndex ? "index" : "urlset" });
    if (isIndex) {
      for (const location of locations) queue.push(normalizeUrl(location, baseUrl));
      continue;
    }
    for (const location of locations) {
      const normalized = normalizeUrl(location, baseUrl);
      if (!normalized || !sameSiteHost(new URL(normalized).hostname, new URL(baseUrl).hostname)) continue;
      const existing = pageMap.get(comparableUrl(normalized));
      if (existing) existing.sitemaps.push(sitemapUrl);
      else pageMap.set(comparableUrl(normalized), { url: normalized, sitemaps: [sitemapUrl], sitemapName: pathOf(sitemapUrl).split("/").pop() });
      if (pageMap.size >= config.maxSitemapUrls) break;
    }
  }
  return { robots, sitemaps, pages: [...pageMap.values()], errors };
}

async function fetchAnalyzed(source, url) {
  const logicalUrl = logicalProbeUrl(url) ?? url;
  const response = await source.request(logicalUrl);
  const analysis = response.observed && response.body && isHtml(response) ? analyzeHtml(response.body, response.finalUrl || logicalUrl) : null;
  return { url: logicalUrl, response, analysis };
}

function uniqueGroups(rows, selector) {
  const map = new Map();
  for (const row of rows) {
    const value = selector(row);
    if (!value) continue;
    const key = String(value).trim().toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row.url);
  }
  return [...map.entries()].filter(([, urls]) => urls.length > 1).map(([value, urls]) => ({ value, urls }));
}

function primaryResponse(row) {
  return row?.response ?? { observed: false, missing: true, status: null, headers: {}, body: "", chain: [] };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  let config = structuredClone(DEFAULTS);
  if (args.config) config = merge(config, JSON.parse(await readFile(path.resolve(args.config), "utf8")));
  if (Number.isFinite(args.concurrency)) config.concurrency = args.concurrency;
  if (Number.isFinite(args.timeoutMs)) config.timeoutMs = args.timeoutMs;
  const source = args.mode === "snapshot"
    ? await SnapshotSource.create(path.resolve(args.snapshot))
    : new LiveSource({ timeoutMs: config.timeoutMs, cacheBypass: args.cacheBypass });
  const outputPath = args.output === "-" ? null : path.resolve(args.output ?? `remediation/tests/results/seo-regression-${args.mode}.json`);
  const checks = [];
  const startedAt = performance.now();

  const routeUrls = Object.fromEntries(Object.entries(config.routes).map(([key, value]) => [key, route(args.baseUrl, value)]));
  const specialRowsArray = await mapLimit(Object.entries(routeUrls), Math.min(config.concurrency, 4), async ([key, url]) => ({ key, ...(await fetchAnalyzed(source, url)) }));
  const specialRows = Object.fromEntries(specialRowsArray.filter((row) => !row.__error).map((row) => [row.key, row]));

  const routing = createCheck("routing.root_home_blog", "Root, legacy home, and blog routing", "critical");
  const root = specialRows.root;
  if (!root?.response.observed) fail(routing, "Root response was not present in the selected evidence source.", { url: routeUrls.root });
  else {
    if (root.response.status !== 200) fail(routing, `Root returned ${root.response.status}, expected 200.`, { url: routeUrls.root });
    if (comparableUrl(root.response.finalUrl) !== comparableUrl(routeUrls.root)) fail(routing, "Root did not resolve to the configured root URL.", { url: routeUrls.root, finalUrl: root.response.finalUrl });
    if (new RegExp(config.genericRootTitlePattern, "i").test(root.analysis?.title ?? "")) fail(routing, `Root still uses generic title '${root.analysis?.title}'.`, { url: routeUrls.root });
    if (!new RegExp(config.expectedBrandPattern, "i").test(`${root.analysis?.title ?? ""} ${root.analysis?.h1.map((entry) => entry.text).join(" ") ?? ""}`)) {
      fail(routing, "Root metadata/headings do not expose the configured brand pattern.", { url: routeUrls.root });
    }
  }
  const oldHome = specialRows.oldHome;
  if (!oldHome?.response.observed) skip(routing, "Legacy /home/ redirect is not observable in this snapshot.");
  else {
    for (const violation of permanentRedirectViolations(oldHome.response, routeUrls.root)) {
      fail(routing, `Legacy home redirect failed: ${violation.message}`, {
        url: routeUrls.oldHome,
        expectedFinal: routeUrls.root,
        finalUrl: oldHome.response.finalUrl,
        finalStatus: oldHome.response.status,
        chain: oldHome.response.chain,
        code: violation.code,
      });
    }
  }
  const blog = specialRows.blog;
  if (!blog?.response.observed || blog.response.status !== 200) fail(routing, "Configured /blog/ archive is missing or not 200.", { url: routeUrls.blog, status: blog?.response.status ?? null });
  else {
    if (comparableUrl(blog.response.finalUrl) !== comparableUrl(routeUrls.blog)) fail(routing, "Blog does not resolve to the configured /blog/ URL.", { url: routeUrls.blog, finalUrl: blog.response.finalUrl });
    if (comparableUrl(blog.analysis?.canonical, blog.response.finalUrl) !== comparableUrl(blog.response.finalUrl)) fail(routing, "Blog canonical is missing or not self-referential.", { url: routeUrls.blog, canonical: blog.analysis?.canonical ?? null });
    if (!blog.analysis?.indexable) fail(routing, "Primary blog archive is noindex.", { url: routeUrls.blog });
  }
  routing.metrics = { rootStatus: root?.response.status ?? null, oldHomeInitialStatus: oldHome?.response.chain?.[0]?.status ?? null, oldHomeFinalStatus: oldHome?.response.status ?? null, blogStatus: blog?.response.status ?? null };
  routing.summary = routing.status === "pass" ? "Primary routes are consolidated." : "Primary route consolidation is incomplete.";
  checks.push(truncate(routing, config.detailLimit));

  const routePolicy = createCheck("routing.quarantine", "Quarantine, redirect, and preserved-route policy", "critical");
  const policyRequests = [
    ...config.routePolicies.gonePaths.map((pathname) => ({ kind: "gone", pathname })),
    ...config.routePolicies.quarantinedPaths.map((pathname) => ({ kind: "quarantined", pathname })),
    ...(config.routePolicies.unpublishedPaths ?? []).map((pathname) => ({ kind: "unpublished", pathname })),
    ...Object.entries(config.routePolicies.permanentRedirects ?? {}).map(([pathname, targetPath]) => ({ kind: "permanentRedirect", pathname, targetPath })),
    ...config.routePolicies.preservedPaths.map((pathname) => ({ kind: "preserved", pathname })),
  ];
  const policyRows = await mapLimit(policyRequests, Math.min(config.concurrency, 8), async (entry) => ({
    ...entry,
    url: route(args.baseUrl, entry.pathname),
    response: await source.request(route(args.baseUrl, entry.pathname)),
  }));
  const observedPolicyRows = policyRows.filter((row) => !row.__error && row.response.observed);
  if (!observedPolicyRows.length) {
    skip(routePolicy, "Exact quarantine routes are not present in the selected snapshot.");
  } else {
    for (const row of policyRows) {
      if (row.__error) {
        fail(routePolicy, "Exact policy route could not be fetched.", { pathname: row.input?.pathname ?? null, error: row.__error });
        continue;
      }
      if (!row.response.observed) {
        if (source.mode === "live") fail(routePolicy, "Configured policy route was not observed.", { url: row.url, kind: row.kind });
        continue;
      }
      const redirectCount = Number.isFinite(Number(row.response.redirectCount)) ? Number(row.response.redirectCount) : Math.max(0, (row.response.chain?.length ?? 1) - 1);
      if (row.kind === "gone" && (row.response.status !== 410 || redirectCount !== 0 || comparableUrl(row.response.requestedUrl) !== comparableUrl(row.response.finalUrl))) {
        fail(routePolicy, "Known gone route must return a direct 410 without redirecting.", { url: row.url, status: row.response.status, finalUrl: row.response.finalUrl, redirectCount });
      }
      if (row.kind === "quarantined") {
        const analysis = isHtml(row.response) ? analyzeHtml(row.response.body, row.response.finalUrl || row.url) : null;
        for (const violation of quarantinedRouteViolations(row.response, { indexable: analysis?.indexable ?? null })) {
          fail(routePolicy, violation.message, {
            url: row.url,
            status: row.response.status,
            finalUrl: row.response.finalUrl,
            robots: analysis?.robots ?? null,
            code: violation.code,
          });
        }
      }
      if (row.kind === "unpublished") {
        for (const violation of unpublishedRouteViolations(row.response)) {
          fail(routePolicy, violation.message, {
            url: row.url,
            status: row.response.status,
            finalUrl: row.response.finalUrl,
            code: violation.code,
          });
        }
      }
      if (row.kind === "permanentRedirect") {
        const expectedFinal = route(args.baseUrl, row.targetPath);
        for (const violation of permanentRedirectViolations(row.response, expectedFinal)) {
          fail(routePolicy, `Required permanent redirect failed: ${violation.message}`, {
            url: row.url,
            expectedFinal,
            finalUrl: row.response.finalUrl,
            finalStatus: row.response.status,
            chain: row.response.chain,
            code: violation.code,
          });
        }
      }
      if (row.kind === "preserved" && (row.response.status !== 200 || redirectCount !== 0 || comparableUrl(row.response.requestedUrl) !== comparableUrl(row.response.finalUrl))) {
        fail(routePolicy, "Genuine preserved route must remain directly available at its exact URL.", { url: row.url, status: row.response.status, finalUrl: row.response.finalUrl, redirectCount });
      }
    }
  }
  routePolicy.metrics = {
    configuredGone: config.routePolicies.gonePaths.length,
    configuredQuarantined: config.routePolicies.quarantinedPaths.length,
    configuredUnpublished: (config.routePolicies.unpublishedPaths ?? []).length,
    configuredPermanentRedirects: Object.keys(config.routePolicies.permanentRedirects ?? {}).length,
    configuredPreserved: config.routePolicies.preservedPaths.length,
    observed: observedPolicyRows.length,
    gone410: observedPolicyRows.filter((row) => row.kind === "gone" && row.response.status === 410).length,
    unpublished404Or410: observedPolicyRows.filter((row) => row.kind === "unpublished" && [404, 410].includes(row.response.status)).length,
    healthyPermanentRedirects: observedPolicyRows.filter((row) => row.kind === "permanentRedirect" && permanentRedirectViolations(row.response, route(args.baseUrl, row.targetPath)).length === 0).length,
  };
  routePolicy.summary = routePolicy.status === "pass" ? "Exact gone, quarantine, unpublished, redirect, and preservation policy passes." : routePolicy.status === "skip" ? "Exact policy routes were not observable." : "Exact gone, quarantine, unpublished, redirect, or preservation rules failed.";
  checks.push(truncate(routePolicy, config.detailLimit));

  const feedCheck = createCheck("feeds.quarantine", "Bare and cache-busted feed quarantine", "critical");
  const configuredFeedPaths = Array.isArray(config.feedPaths) ? config.feedPaths : [];
  const feedRows = [];
  if (source.mode !== "live") {
    skip(feedCheck, "Feed variants require live responses and are not inferred from an HTML snapshot.");
  } else if (!configuredFeedPaths.length) {
    fail(feedCheck, "No feed paths are configured; quarantine cannot be proven.");
  } else {
    const requests = configuredFeedPaths.flatMap((pathname) => [
      { pathname, variant: "bare", cacheBypass: "off" },
      { pathname, variant: "cache-busted", cacheBypass: "query" },
    ]);
    const observedFeeds = await mapLimit(requests, Math.min(config.concurrency, 6), async (entry) => ({
      ...entry,
      url: route(args.baseUrl, entry.pathname),
      response: await source.request(route(args.baseUrl, entry.pathname), { cacheBypass: entry.cacheBypass }),
    }));
    for (const row of observedFeeds) {
      if (row.__error) {
        fail(feedCheck, "Feed variant could not be fetched.", { pathname: row.input?.pathname ?? null, variant: row.input?.variant ?? null, error: row.__error });
        continue;
      }
      const { response } = row;
      const evidence = feedQuarantineEvidence(response.body, config.routePolicies.gonePaths);
      const networkUrl = response.networkRequestedUrl ?? response.requestedUrl;
      let hasCacheBuster = false;
      try {
        hasCacheBuster = new URL(networkUrl).searchParams.has(CACHE_BYPASS_PARAM);
      } catch {
        // The status assertion below still fails malformed/unobserved responses.
      }
      if (!response.observed || response.status !== 200) fail(feedCheck, "Feed variant did not return 200.", { pathname: row.pathname, variant: row.variant, status: response.status, finalUrl: response.finalUrl });
      if (response.status === 200 && !isFeed(response)) fail(feedCheck, "Feed variant returned a non-feed document.", { pathname: row.pathname, variant: row.variant, contentType: response.headers?.["content-type"] ?? null });
      if (row.variant === "cache-busted" && !hasCacheBuster) fail(feedCheck, "Cache-busted feed request did not carry the reserved probe parameter.", { pathname: row.pathname, networkUrl });
      if (row.variant === "bare" && hasCacheBuster) fail(feedCheck, "Bare feed request unexpectedly carried the cache-bust parameter.", { pathname: row.pathname, networkUrl });
      if (evidence.forbiddenHits.length) fail(feedCheck, "Quarantined record appears in a public feed.", { pathname: row.pathname, variant: row.variant, forbiddenHits: evidence.forbiddenHits });
      feedRows.push({
        pathname: row.pathname,
        variant: row.variant,
        status: response.status,
        finalUrl: response.finalUrl,
        networkRequestedUrl: networkUrl,
        itemCount: evidence.itemCount,
        forbiddenHits: evidence.forbiddenHits,
      });
    }
  }
  feedCheck.metrics = {
    configuredFeeds: configuredFeedPaths.length,
    expectedVariants: configuredFeedPaths.length * 2,
    observedVariants: feedRows.length,
    bareVariants: feedRows.filter((row) => row.variant === "bare").length,
    cacheBustedVariants: feedRows.filter((row) => row.variant === "cache-busted").length,
    forbiddenHits: feedRows.reduce((sum, row) => sum + row.forbiddenHits.length, 0),
    feeds: feedRows,
  };
  feedCheck.summary = feedCheck.status === "pass" ? "Bare and cache-busted feeds exclude all quarantined records." : feedCheck.status === "skip" ? "Feed quarantine was not observable in this evidence source." : "Feed quarantine evidence failed.";
  checks.push(truncate(feedCheck, config.detailLimit));

  const registrationCheck = createCheck("security.registration_closed", "Public account registration is closed", "critical");
  const registrationUrl = route(args.baseUrl, config.routePolicies.registrationPath);
  const registrationResponse = await source.request(registrationUrl);
  if (!registrationResponse.observed) {
    skip(registrationCheck, "The registration endpoint is not present in the selected snapshot.");
  } else {
    const disabledUrl = /[?&]registration=disabled(?:&|$)/i.test(registrationResponse.finalUrl ?? "");
    const disabledMessage = /user registration is currently not allowed|registration is disabled/i.test(registrationResponse.body ?? "");
    if (!disabledUrl || !disabledMessage) {
      fail(registrationCheck, "Anonymous registration is still available or the closed-registration response could not be proven.", {
        url: registrationUrl,
        finalUrl: registrationResponse.finalUrl,
        status: registrationResponse.status,
      });
    }
  }
  registrationCheck.metrics = { observed: registrationResponse.observed, status: registrationResponse.status, finalUrl: registrationResponse.finalUrl };
  registrationCheck.summary = registrationCheck.status === "pass" ? "Anonymous registration is closed." : registrationCheck.status === "skip" ? "Registration was not observable." : "Anonymous registration remains open or ambiguous.";
  checks.push(truncate(registrationCheck, config.detailLimit));

  const inventory = await discoverSitemapInventory(source, args.baseUrl, config);
  const sitemapRowsRaw = await mapLimit(inventory.pages, config.concurrency, async (entry) => ({ entry, ...(await fetchAnalyzed(source, entry.url)) }));
  const sitemapFetchErrors = sitemapRowsRaw.filter((row) => row.__error);
  const sitemapRows = sitemapRowsRaw.filter((row) => !row.__error);
  const sitemapCheck = createCheck("inventory.sitemaps", "Sitemap and indexable inventory", "critical");
  if (!inventory.robots.observed || inventory.robots.status !== 200) fail(sitemapCheck, "robots.txt was missing or non-200.", { url: route(args.baseUrl, "/robots.txt"), status: inventory.robots.status });
  if (!inventory.sitemaps.length) fail(sitemapCheck, "No valid sitemap was discovered.");
  if (inventory.errors.length) for (const error of inventory.errors) fail(sitemapCheck, "Sitemap discovery error.", error);
  for (const error of sitemapFetchErrors) fail(sitemapCheck, "Sitemap URL could not be fetched.", { url: error.input?.url ?? null, error: error.__error });
  const sitemapKeys = new Set(inventory.pages.map((entry) => comparableUrl(entry.url)));
  for (const row of sitemapRows) {
    const { response, analysis, url } = row;
    if (!response.observed) {
      fail(sitemapCheck, "Sitemap URL is absent from the offline snapshot.", { url });
      continue;
    }
    if (response.status !== 200) fail(sitemapCheck, `Sitemap URL returned ${response.status}.`, { url, finalUrl: response.finalUrl });
    if (comparableUrl(url) !== comparableUrl(response.finalUrl)) fail(sitemapCheck, "Sitemap URL redirects instead of naming the final URL.", { url, finalUrl: response.finalUrl, chain: response.chain });
    if (!analysis) continue;
    if (!analysis.indexable) fail(sitemapCheck, "Sitemap URL is noindex.", { url, robots: analysis.robots });
    if (comparableUrl(analysis.canonical, response.finalUrl) !== comparableUrl(response.finalUrl)) fail(sitemapCheck, "Sitemap URL is not self-canonical.", { url, canonical: analysis.canonical });
  }
  sitemapCheck.metrics = {
    sitemapFiles: inventory.sitemaps.length,
    sitemapUrls: inventory.pages.length,
    observedPages: sitemapRows.filter((row) => row.response.observed).length,
    non200: sitemapRows.filter((row) => row.response.observed && row.response.status !== 200).length,
    redirects: sitemapRows.filter((row) => row.response.observed && comparableUrl(row.url) !== comparableUrl(row.response.finalUrl)).length,
    noindex: sitemapRows.filter((row) => row.analysis && !row.analysis.indexable).length,
    canonicalMismatch: sitemapRows.filter((row) => row.analysis && comparableUrl(row.analysis.canonical, row.response.finalUrl) !== comparableUrl(row.response.finalUrl)).length,
  };
  sitemapCheck.summary = sitemapCheck.status === "pass" ? `${inventory.pages.length} sitemap URLs are clean.` : "Sitemap/indexability invariants failed.";
  checks.push(truncate(sitemapCheck, config.detailLimit));

  const analyzedByUrl = new Map();
  for (const row of [...sitemapRows, ...Object.values(specialRows)]) {
    if (row?.analysis) analyzedByUrl.set(comparableUrl(row.response.finalUrl), row);
  }

  const pagerCheck = createCheck("archives.pagination", "Blog pager uniqueness and completeness", "critical");
  const postUrls = new Set(inventory.pages.filter((entry) => /(?:^|\/)post-sitemap/i.test(entry.sitemapName ?? "")).map((entry) => comparableUrl(entry.url)));
  const pagerQueue = [routeUrls.blog];
  const pagerSeen = new Set();
  const pagerRows = [];
  while (pagerQueue.length && pagerSeen.size < config.maxPagerPages) {
    const pageUrl = pagerQueue.shift();
    const logicalPageUrl = logicalProbeUrl(pageUrl) ?? pageUrl;
    const key = comparableUrl(logicalPageUrl);
    if (!key || pagerSeen.has(key)) continue;
    pagerSeen.add(key);
    const row = key === comparableUrl(routeUrls.blog) && blog ? blog : await fetchAnalyzed(source, logicalPageUrl);
    if (!row.response.observed || row.response.status !== 200 || !row.analysis) {
      if (key === comparableUrl(routeUrls.blog) && !(source.mode === "snapshot" && !row.response.observed)) fail(pagerCheck, "Primary blog archive cannot be crawled.", { url: pageUrl, status: row.response.status });
      continue;
    }
    const itemUrls = [...new Set(row.analysis.anchors.map((anchor) => comparableUrl(logicalProbeUrl(anchor.resolved))).filter((url) => postUrls.has(url)))];
    pagerRows.push({ ...row, itemUrls });
    for (const anchor of row.analysis.anchors) {
      if (!anchor.resolved || !sameSiteHost(new URL(anchor.resolved).hostname, new URL(args.baseUrl).hostname)) continue;
      const pathname = pathOf(anchor.resolved);
      const escapedBlog = pathOf(routeUrls.blog).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`^${escapedBlog}page/\\d+/?$`, "i").test(pathname)) pagerQueue.push(logicalProbeUrl(anchor.resolved));
    }
  }
  if (pagerRows.length) {
    const titleGroups = uniqueGroups(pagerRows, (row) => row.analysis.title);
    const contentGroups = uniqueGroups(pagerRows, (row) => row.itemUrls.length ? row.itemUrls.sort().join("|") : row.analysis.contentHash);
    for (const group of titleGroups) fail(pagerCheck, "Paginated archive titles are duplicated.", group);
    for (const group of contentGroups) fail(pagerCheck, "Paginated archive content repeats.", group);
    for (const row of pagerRows) {
      if (comparableUrl(row.analysis.canonical, row.response.finalUrl) !== comparableUrl(row.response.finalUrl)) fail(pagerCheck, "Pager URL is not self-canonical.", { url: row.response.finalUrl, canonical: row.analysis.canonical });
    }
    if (postUrls.size) {
      const exposed = new Set(pagerRows.flatMap((row) => row.itemUrls));
      const missing = [...postUrls].filter((url) => !exposed.has(url));
      if (missing.length) fail(pagerCheck, `${missing.length} post-sitemap URL(s) are not exposed by the primary blog archive.`, { urls: missing.slice(0, config.detailLimit) });
      pagerCheck.metrics.postsExposed = exposed.size;
      pagerCheck.metrics.postsMissing = missing.length;
    } else skip(pagerCheck, "No post-specific sitemap was identified, so pager completeness could not be proven.");
  }
  if (!pagerRows.length) {
    if (source.mode === "snapshot" && !blog?.response.observed) skip(pagerCheck, "The configured /blog/ route and its pager were not captured in this pre-remediation snapshot; pager uniqueness/completeness is unproven offline.");
    else fail(pagerCheck, "No valid primary blog pager page was found.", { url: routeUrls.blog });
  }
  const firstPageSize = pagerRows[0]?.itemUrls.length ?? 0;
  const expectedPagerPages = postUrls.size && firstPageSize ? Math.max(1, Math.ceil(postUrls.size / firstPageSize)) : 2;
  const discoveredPagerNumbers = pagerRows.map((row) => pagerNumber(row.response.finalUrl, routeUrls.blog)).filter(Number.isInteger);
  const legacyPagerProbeThrough = pagerProbeUpperBound(expectedPagerPages, discoveredPagerNumbers);
  const discoveredPagerSet = new Set(discoveredPagerNumbers);
  const missingDiscoveredPagerPages = [];
  for (let pageNumber = 1; pageNumber <= Math.max(1, ...discoveredPagerNumbers); pageNumber += 1) {
    if (!discoveredPagerSet.has(pageNumber)) missingDiscoveredPagerPages.push(pageNumber);
  }
  if (missingDiscoveredPagerPages.length) fail(pagerCheck, "Discovered blog pager has a numeric gap.", { missingPages: missingDiscoveredPagerPages });
  let legacyPagerObserved = 0;
  for (let pageNumber = 2; pageNumber <= legacyPagerProbeThrough; pageNumber += 1) {
    const legacyUrl = pageNumber === 2 ? routeUrls.legacyPageTwo : route(args.baseUrl, `/page/${pageNumber}/`);
    const row = pageNumber === 2 && specialRows.legacyPageTwo ? specialRows.legacyPageTwo : await fetchAnalyzed(source, legacyUrl);
    if (!row.response.observed) continue;
    legacyPagerObserved += 1;
    if (row.analysis) analyzedByUrl.set(comparableUrl(row.response.finalUrl), row);
    const expectedFinal = normalizeUrl(`page/${pageNumber}/`, routeUrls.blog);
    for (const violation of permanentRedirectViolations(row.response, expectedFinal)) {
      fail(pagerCheck, `Legacy root /page/${pageNumber}/ redirect failed: ${violation.message}`, {
        url: legacyUrl,
        expectedFinal,
        finalUrl: row.response.finalUrl,
        finalStatus: row.response.status,
        chain: row.response.chain,
        code: violation.code,
      });
    }
  }
  if (!legacyPagerObserved) skip(pagerCheck, "Legacy root pager behavior is not present in the offline snapshot.");
  pagerCheck.metrics = {
    ...pagerCheck.metrics,
    pagerPages: pagerRows.length,
    discoveredPagerNumbers,
    postSitemapUrls: postUrls.size,
    expectedPagerPages,
    legacyPagerProbeThrough,
    legacyPagerUrlsObserved: legacyPagerObserved,
  };
  pagerCheck.summary = pagerCheck.status === "pass" ? "Pager content is unique and complete." : pagerCheck.status === "skip" ? "Pager behavior was not observable in this evidence source." : "Pager routing, uniqueness, or completeness failed.";
  checks.push(truncate(pagerCheck, config.detailLimit));

  const linkSources = [...new Map([...sitemapRows, ...Object.values(specialRows)].filter((row) => row?.analysis).map((row) => [comparableUrl(row.response.finalUrl), row])).values()];
  const internalLinkMap = new Map();
  const baseHostname = new URL(args.baseUrl).hostname;
  for (const row of linkSources) {
    for (const anchor of row.analysis.anchors) {
      if (!anchor.resolved || !/^https?:/i.test(anchor.resolved)) continue;
      const parsed = new URL(anchor.resolved);
      if (!sameSiteHost(parsed.hostname, baseHostname)) continue;
      const logicalTarget = logicalProbeUrl(anchor.resolved);
      const key = comparableUrl(logicalTarget);
      if (!internalLinkMap.has(key)) internalLinkMap.set(key, { url: logicalTarget, occurrences: [], rawHrefs: new Set() });
      const record = internalLinkMap.get(key);
      if (record.occurrences.length < 10 && !record.occurrences.includes(row.response.finalUrl)) record.occurrences.push(row.response.finalUrl);
      if (anchor.href) record.rawHrefs.add(anchor.href);
    }
    for (const person of row.analysis.schema.people) {
      const resolved = logicalProbeUrl(person.url, row.response.finalUrl);
      if (!resolved || !/^https?:/i.test(resolved) || !sameSiteHost(new URL(resolved).hostname, baseHostname)) continue;
      const key = comparableUrl(resolved);
      if (!internalLinkMap.has(key)) internalLinkMap.set(key, { url: resolved, occurrences: [], rawHrefs: new Set(), sourceKinds: new Set() });
      const record = internalLinkMap.get(key);
      if (record.occurrences.length < 10 && !record.occurrences.includes(row.response.finalUrl)) record.occurrences.push(row.response.finalUrl);
      record.rawHrefs.add(person.url);
      if (!record.sourceKinds) record.sourceKinds = new Set();
      record.sourceKinds.add("jsonld-person");
    }
  }
  const internalTargets = [...internalLinkMap.values()].slice(0, config.maxInternalTargets);
  const initialTargetResultsRaw = await mapLimit(internalTargets, config.concurrency, async (target) => ({ target, response: await source.request(target.url) }));
  const initialTargetResults = initialTargetResultsRaw.filter((entry) => !entry.__error);
  const targetFetchErrors = initialTargetResultsRaw.filter((entry) => entry.__error);
  const discoveredProbeTargets = [];
  const targetResultMap = new Map(initialTargetResults.map((result) => [comparableUrl(result.target.url), result]));
  if (source.mode === "live") {
    const archiveQueue = [];
    const archiveQueued = new Set();
    const archiveVisited = new Set();
    const knownRows = new Map(linkSources.map((row) => [comparableUrl(row.response.finalUrl), row]));
    const enqueueArchive = (url, occurrence) => {
      const normalized = logicalProbeUrl(url, args.baseUrl);
      if (!normalized || !/^\/(?:author|category)\//i.test(pathOf(normalized))) return;
      const key = comparableUrl(normalized);
      if (!key || archiveQueued.has(key) || archiveVisited.has(key)) return;
      archiveQueued.add(key);
      archiveQueue.push({ url: normalized, occurrence });
    };
    for (const row of linkSources) enqueueArchive(row.response.finalUrl, row.response.finalUrl);
    for (const result of initialTargetResults) enqueueArchive(result.response.finalUrl || result.target.url, result.target.occurrences?.[0]);
    while (archiveQueue.length && archiveVisited.size < config.internalProbeSeedLimit) {
      const seed = archiveQueue.shift();
      const key = comparableUrl(seed.url);
      archiveQueued.delete(key);
      if (archiveVisited.has(key)) continue;
      archiveVisited.add(key);
      let row = knownRows.get(key);
      let result = targetResultMap.get(key);
      if (!row && !result) {
        const target = { url: seed.url, occurrences: [seed.occurrence].filter(Boolean), rawHrefs: new Set(), sourceKinds: new Set(["archive-pager"] ) };
        try {
          result = { target, response: await source.request(target.url) };
          targetResultMap.set(key, result);
          discoveredProbeTargets.push(target);
        } catch (error) {
          targetFetchErrors.push({ __error: String(error?.stack ?? error), input: target });
          continue;
        }
      }
      const response = row?.response ?? result?.response;
      if (!response?.observed || response.status !== 200 || !isHtml(response)) continue;
      const analysis = row?.analysis ?? analyzeHtml(response.body, response.finalUrl);
      for (const anchor of analysis.anchors) {
        if (!anchor.resolved || !sameSiteHost(new URL(anchor.resolved).hostname, baseHostname)) continue;
        const targetPath = pathOf(anchor.resolved);
        if (!/\/(?:author|category)\/.*\/page\/\d+\/?$/i.test(targetPath)) continue;
        enqueueArchive(logicalProbeUrl(anchor.resolved), response.finalUrl);
      }
    }
  }
  const targetResults = [...targetResultMap.values()];
  const linkCheck = createCheck("links.internal_integrity", "Internal broken links and redirect waste", "critical");
  let brokenCount = 0;
  let redirectCount = 0;
  let unobservedCount = 0;
  const noncanonicalDirect = [];
  for (const target of internalTargets) {
    const parsed = new URL(target.url);
    if (parsed.protocol !== new URL(args.baseUrl).protocol || parsed.hostname !== baseHostname || /\/index\.php(?:\/|$)/i.test(parsed.pathname)) noncanonicalDirect.push(target);
  }
  for (const target of noncanonicalDirect) {
    fail(linkCheck, "Internal link points at a noncanonical scheme, host, or /index.php/ route.", { url: target.url, sourcePages: target.occurrences, rawHrefs: [...target.rawHrefs] });
  }
  for (const error of targetFetchErrors) fail(linkCheck, "Internal target request failed.", { url: error.input?.url ?? null, error: error.__error });
  for (const result of targetResults) {
    const { target, response } = result;
    if (!response.observed) {
      unobservedCount += 1;
      continue;
    }
    if (response.status >= 400 || response.status === 0) {
      brokenCount += 1;
      fail(linkCheck, `Internal destination returned ${response.status}.`, { url: target.url, sourcePages: target.occurrences });
    }
    if (response.redirectCount > 0 || comparableUrl(target.url) !== comparableUrl(response.finalUrl)) {
      redirectCount += 1;
      fail(linkCheck, "Internal destination redirects; templates should link to its final URL.", { url: target.url, finalUrl: response.finalUrl, chain: response.chain, sourcePages: target.occurrences });
    }
    if (response.status === 200 && isHtml(response)) {
      const key = comparableUrl(response.finalUrl);
      if (!analyzedByUrl.has(key)) analyzedByUrl.set(key, { url: target.url, response, analysis: analyzeHtml(response.body, response.finalUrl) });
    }
  }
  if (unobservedCount) skip(linkCheck, `${unobservedCount} internal destination(s) were not captured in the offline snapshot; their status/redirect behavior remains unproven.`);
  if (internalLinkMap.size > config.maxInternalTargets) fail(linkCheck, `Internal target safety cap (${config.maxInternalTargets}) was exceeded; audit scope was truncated.`);
  linkCheck.metrics = { sourcePages: linkSources.length, uniqueInternalTargets: internalLinkMap.size, discoveredArchivePagerTargets: discoveredProbeTargets.length, testedTargets: targetResults.length - unobservedCount, unobservedTargets: unobservedCount, requestErrors: targetFetchErrors.length, brokenTargets: brokenCount, redirectingTargets: redirectCount, directNoncanonicalTargets: noncanonicalDirect.length };
  linkCheck.summary = linkCheck.status === "pass" ? "No broken or redirecting internal targets were found." : "Broken links or redirect waste remain.";
  checks.push(truncate(linkCheck, config.detailLimit));

  const discoveredRows = [...analyzedByUrl.values()];
  const indexabilityCheck = createCheck("inventory.discovered_indexables", "Discovered indexable routes outside canonical inventory", "high");
  const disallowedPatterns = config.disallowedIndexablePathPatterns.map((pattern) => new RegExp(pattern, "i"));
  const outsideSitemap = discoveredRows.filter((row) => row.analysis?.indexable && row.response.status === 200 && !sitemapKeys.has(comparableUrl(row.response.finalUrl)));
  const disallowed = discoveredRows.filter((row) => row.analysis?.indexable && disallowedPatterns.some((pattern) => pattern.test(pathOf(row.response.finalUrl))));
  for (const row of disallowed) fail(indexabilityCheck, "Disallowed archive/legacy path is indexable.", { url: row.response.finalUrl, canonical: row.analysis.canonical, robots: row.analysis.robots });
  indexabilityCheck.metrics = { discoveredHtmlPages: discoveredRows.length, indexableOutsideSitemap: outsideSitemap.length, disallowedIndexables: disallowed.length };
  indexabilityCheck.notes.push("Indexable pagination may legitimately sit outside XML sitemaps; only configured disallowed path classes fail this check.");
  indexabilityCheck.summary = indexabilityCheck.status === "pass" ? "No configured legacy/archive indexability leak was found." : "Legacy or redundant archives remain indexable.";
  checks.push(truncate(indexabilityCheck, config.detailLimit));

  const canonicalRows = [...new Map([...sitemapRows, ...(blog?.analysis ? [blog] : []), ...(root?.analysis ? [root] : [])].filter((row) => row?.analysis && row.response.status === 200 && row.analysis.indexable).map((row) => [comparableUrl(row.response.finalUrl), row])).values()];
  const metadataCheck = createCheck("pages.metadata", "Metadata, canonicals, and social cards", "high");
  requireCanonicalEvidence(metadataCheck, canonicalRows);
  for (const row of canonicalRows) {
    const page = row.analysis;
    const url = row.response.finalUrl;
    if (!page.title) fail(metadataCheck, "Missing title.", { url });
    else {
      if (page.titleLength < config.metadata.titleMin) fail(metadataCheck, `Title is shorter than ${config.metadata.titleMin} characters.`, { url, title: page.title, length: page.titleLength });
      if (page.titleLength > config.metadata.titleMax) fail(metadataCheck, `Title exceeds ${config.metadata.titleMax} characters.`, { url, title: page.title, length: page.titleLength });
    }
    if (!page.description) fail(metadataCheck, "Missing meta description.", { url });
    else {
      if (page.descriptionLength < config.metadata.descriptionMin) fail(metadataCheck, `Meta description is shorter than ${config.metadata.descriptionMin} characters.`, { url, length: page.descriptionLength });
      if (page.descriptionLength > config.metadata.descriptionMax) fail(metadataCheck, `Meta description exceeds ${config.metadata.descriptionMax} characters.`, { url, length: page.descriptionLength });
    }
    if (page.metadataTagCounts.description !== 1) fail(metadataCheck, `Expected exactly one meta description tag; found ${page.metadataTagCounts.description}.`, { url, count: page.metadataTagCounts.description });
    if (page.metadataTagCounts.ogDescription !== 1) fail(metadataCheck, `Expected exactly one Open Graph description tag; found ${page.metadataTagCounts.ogDescription}.`, { url, count: page.metadataTagCounts.ogDescription });
    if (page.metadataTagCounts.twitterDescription !== 1) fail(metadataCheck, `Expected exactly one Twitter description tag; found ${page.metadataTagCounts.twitterDescription}.`, { url, count: page.metadataTagCounts.twitterDescription });
    if (!page.og.title || !page.og.description || !page.og.url || (config.metadata.requireSocialImages && !page.og.image)) fail(metadataCheck, "Core Open Graph fields are incomplete.", { url, og: page.og });
    if (!page.twitter.title || !page.twitter.description || (config.metadata.requireSocialImages && !page.twitter.image)) fail(metadataCheck, "Core Twitter card fields are incomplete.", { url, twitter: page.twitter });
  }
  for (const group of uniqueGroups(canonicalRows, (row) => row.analysis.title)) fail(metadataCheck, "Duplicate title across indexable pages.", group);
  for (const group of uniqueGroups(canonicalRows, (row) => row.analysis.description)) fail(metadataCheck, "Duplicate meta description across indexable pages.", group);
  metadataCheck.metrics = {
    pages: canonicalRows.length,
    missingTitles: canonicalRows.filter((row) => !row.analysis.title).length,
    missingDescriptions: canonicalRows.filter((row) => !row.analysis.description).length,
    invalidDescriptionTagCounts: canonicalRows.filter((row) => row.analysis.metadataTagCounts.description !== 1).length,
    invalidOpenGraphDescriptionTagCounts: canonicalRows.filter((row) => row.analysis.metadataTagCounts.ogDescription !== 1).length,
    invalidTwitterDescriptionTagCounts: canonicalRows.filter((row) => row.analysis.metadataTagCounts.twitterDescription !== 1).length,
    longTitles: canonicalRows.filter((row) => row.analysis.titleLength > config.metadata.titleMax).length,
    longDescriptions: canonicalRows.filter((row) => row.analysis.descriptionLength > config.metadata.descriptionMax).length,
    incompleteOpenGraph: canonicalRows.filter((row) => !row.analysis.og.title || !row.analysis.og.description || !row.analysis.og.url || (config.metadata.requireSocialImages && !row.analysis.og.image)).length,
    incompleteTwitter: canonicalRows.filter((row) => !row.analysis.twitter.title || !row.analysis.twitter.description || (config.metadata.requireSocialImages && !row.analysis.twitter.image)).length,
  };
  metadataCheck.summary = metadataCheck.status === "pass" ? "Indexable pages meet metadata invariants." : metadataCheck.status === "skip" ? "Metadata could not be evaluated without healthy canonical pages." : "Metadata remediation remains incomplete.";
  checks.push(truncate(metadataCheck, config.detailLimit));

  const socialImageCheck = createCheck("pages.social_images", "Social image resources and approved 1200x630 fallback", "high");
  requireCanonicalEvidence(socialImageCheck, canonicalRows);
  const socialReferences = new Map();
  const invalidSocialReferences = [];
  for (const row of canonicalRows) {
    for (const [kind, value] of [["og:image", row.analysis.og.image], ["twitter:image", row.analysis.twitter.image]]) {
      if (!value) continue;
      const resolved = resolvedSocialImage(value, row.response.finalUrl);
      if (!resolved) {
        invalidSocialReferences.push({ pageUrl: row.response.finalUrl, kind, value });
        fail(socialImageCheck, "Social image is not a valid HTTPS URL.", { pageUrl: row.response.finalUrl, kind, value });
        continue;
      }
      const key = comparableUrl(resolved);
      if (!socialReferences.has(key)) socialReferences.set(key, { url: resolved, occurrences: [] });
      socialReferences.get(key).occurrences.push({ pageUrl: row.response.finalUrl, kind });
    }
  }
  const fallbackApproval = config.socialImages?.fallbackApproval ?? {};
  const fallbackUrl = resolvedSocialImage(fallbackApproval.url, args.baseUrl);
  if (fallbackApproval.url && !fallbackUrl) fail(socialImageCheck, "Configured fallback approval URL is not a valid HTTPS URL.", { value: fallbackApproval.url });
  const socialRequestEntries = [...socialReferences.values()];
  if (fallbackUrl && !socialReferences.has(comparableUrl(fallbackUrl))) socialRequestEntries.push({ url: fallbackUrl, occurrences: [{ pageUrl: null, kind: "configured-fallback" }] });
  const socialImageRows = [];
  if (source.mode !== "live") {
    skip(socialImageCheck, "Social image status, Content-Type, bytes, hash, and intrinsic dimensions require live binary responses and are not inferred from HTML snapshots.");
  } else {
    const fetchedSocialImages = await mapLimit(socialRequestEntries, Math.min(config.concurrency, 8), async (entry) => ({
      ...entry,
      response: await source.requestBytes(entry.url),
    }));
    for (const row of fetchedSocialImages) {
      if (row.__error) {
        fail(socialImageCheck, "Social image request failed.", { url: row.input?.url ?? null, error: row.__error });
        continue;
      }
      const evidence = socialImageResponseEvidence(row.response);
      for (const violation of socialImageResponseViolations(row.response, {
        requestedUrl: row.url,
        allowedContentTypes: config.socialImages.allowedContentTypes,
        maxBytes: config.socialImages.maxBytes,
      })) fail(socialImageCheck, violation.message, { url: row.url, code: violation.code, evidence, occurrences: row.occurrences });
      socialImageRows.push({ url: row.url, occurrences: row.occurrences, ...evidence });
    }
  }
  const fallbackRow = fallbackUrl ? socialImageRows.find((row) => comparableUrl(row.url) === comparableUrl(fallbackUrl)) : null;
  for (const violation of approvedFallbackViolations(fallbackApproval, null)) {
    fail(socialImageCheck, violation.message, { url: fallbackUrl, code: violation.code, actual: violation.actual ?? null, expected: violation.expected ?? null });
  }
  if (fallbackRow) {
    if (fallbackRow.width !== 1200 || fallbackRow.height !== 630) fail(socialImageCheck, "Fetched fallback social card is not exactly 1200x630.", { url: fallbackUrl, code: "asset_dimensions", actual: { width: fallbackRow.width, height: fallbackRow.height } });
    if (fallbackApproval.sha256 && fallbackRow.sha256 !== String(fallbackApproval.sha256).trim().toUpperCase()) fail(socialImageCheck, "Fetched fallback bytes do not match the approved SHA-256.", { url: fallbackUrl, code: "hash_mismatch", actual: fallbackRow.sha256, expected: String(fallbackApproval.sha256).trim().toUpperCase() });
  }
  socialImageCheck.metrics = {
    pages: canonicalRows.length,
    references: [...socialReferences.values()].reduce((sum, entry) => sum + entry.occurrences.length, 0),
    uniqueReferencedImages: socialReferences.size,
    invalidHttpsReferences: invalidSocialReferences.length,
    fetchedImages: socialImageRows.length,
    sharedAcrossPages: [...socialReferences.values()].filter((entry) => new Set(entry.occurrences.map((item) => item.pageUrl)).size > 1).length,
    fallback: fallbackRow ? { url: fallbackRow.url, status: fallbackRow.status, contentType: fallbackRow.contentType, width: fallbackRow.width, height: fallbackRow.height, sha256: fallbackRow.sha256, referenceCount: socialReferences.get(comparableUrl(fallbackRow.url))?.occurrences.length ?? 0, approvalStatus: fallbackApproval.status ?? null } : { url: fallbackUrl, observed: false, approvalStatus: fallbackApproval.status ?? null },
    images: socialImageRows,
  };
  socialImageCheck.notes.push("A single approved fallback may be shared by many pages; this gate does not require page-specific or unique imagery.");
  socialImageCheck.notes.push("Approval requires an exact 1200x630 asset, pinned SHA-256, named approver, date, and evidence ID; HTTP success alone is not brand approval or platform-preview proof.");
  socialImageCheck.summary = socialImageCheck.status === "pass" ? "All referenced social images are directly fetchable and the exact 1200x630 fallback is approval-pinned." : socialImageCheck.status === "skip" ? "Social image binary evidence was not observable." : "Social image delivery or fallback approval remains incomplete.";
  checks.push(truncate(socialImageCheck, config.detailLimit));

  const headingCheck = createCheck("pages.headings", "Heading structure", "high");
  requireCanonicalEvidence(headingCheck, canonicalRows);
  for (const row of canonicalRows) {
    const page = row.analysis;
    const url = row.response.finalUrl;
    if (page.h1.length !== 1 || !page.h1[0]?.text) fail(headingCheck, `Expected exactly one nonempty H1; found ${page.h1.length}.`, { url, h1: page.h1 });
    if (page.blankHeadings.length) fail(headingCheck, "Blank heading elements remain.", { url, count: page.blankHeadings.length });
    if (page.headingWordMaximum > config.headings.maxHeadingWords) fail(headingCheck, `A heading exceeds ${config.headings.maxHeadingWords} words.`, { url, maximumWords: page.headingWordMaximum });
    const skips = headingLevelSkips(page.headings);
    if (config.headings.disallowLevelSkips && skips.length) fail(headingCheck, "Heading levels skip hierarchy.", { url, skips });
  }
  headingCheck.metrics = { pages: canonicalRows.length, missingOrMultipleH1: canonicalRows.filter((row) => row.analysis.h1.length !== 1 || !row.analysis.h1[0]?.text).length, pagesWithBlankHeadings: canonicalRows.filter((row) => row.analysis.blankHeadings.length).length, pagesWithLevelSkips: canonicalRows.filter((row) => headingLevelSkips(row.analysis.headings).length).length };
  headingCheck.summary = headingCheck.status === "pass" ? "Heading structure passes." : headingCheck.status === "skip" ? "Headings could not be evaluated without healthy canonical pages." : "Heading defects remain.";
  checks.push(truncate(headingCheck, config.detailLimit));

  const schemaCheck = createCheck("pages.jsonld", "JSON-LD syntax and identity hygiene", "high");
  requireCanonicalEvidence(schemaCheck, canonicalRows);
  for (const row of canonicalRows) {
    const { schema } = row.analysis;
    const url = row.response.finalUrl;
    if (!schema.blockCount) fail(schemaCheck, "Indexable page has no JSON-LD.", { url });
    if (schema.errors.length) fail(schemaCheck, "JSON-LD cannot be parsed.", { url, errors: schema.errors });
    const badPeople = schema.people.filter((person) => !person.name || /(?:^|\.)aiamigos\.org$/i.test(person.name) || /^(?:client|member) name/i.test(person.name));
    if (badPeople.length) fail(schemaCheck, "Person schema uses a blank, domain, or placeholder identity.", { url, people: badPeople });
  }
  schemaCheck.metrics = { pages: canonicalRows.length, missingJsonLd: canonicalRows.filter((row) => !row.analysis.schema.blockCount).length, parseErrorPages: canonicalRows.filter((row) => row.analysis.schema.errors.length).length, placeholderPersonPages: canonicalRows.filter((row) => row.analysis.schema.people.some((person) => !person.name || /(?:^|\.)aiamigos\.org$/i.test(person.name) || /^(?:client|member) name/i.test(person.name))).length };
  schemaCheck.summary = schemaCheck.status === "pass" ? "JSON-LD is parseable and avoids placeholder people." : schemaCheck.status === "skip" ? "JSON-LD could not be evaluated without healthy canonical pages." : "JSON-LD syntax or identity semantics failed.";
  checks.push(truncate(schemaCheck, config.detailLimit));

  const schemaSemanticsCheck = createCheck("pages.jsonld_semantics", "JSON-LD claim allowlist and DOM/template consistency", "high");
  requireCanonicalEvidence(schemaSemanticsCheck, canonicalRows);
  const schemaSemanticFailures = [];
  for (const row of canonicalRows) {
    for (const violation of schemaSemanticViolations(row.analysis, row.response.finalUrl, config.schemaGovernance)) {
      const evidence = { ...violation, claimUrl: violation.url ?? null, url: row.response.finalUrl };
      schemaSemanticFailures.push(evidence);
      fail(schemaSemanticsCheck, violation.message, evidence);
    }
  }
  schemaSemanticsCheck.metrics = {
    pages: canonicalRows.length,
    configuredAllowedTypes: config.schemaGovernance.allowedTypes,
    approvalPackets: config.schemaGovernance.claimAllowlist.length,
    failures: schemaSemanticFailures.length,
    failuresByCode: Object.fromEntries([...new Set(schemaSemanticFailures.map((entry) => entry.code))].sort().map((code) => [code, schemaSemanticFailures.filter((entry) => entry.code === code).length])),
    affectedPages: new Set(schemaSemanticFailures.map((entry) => entry.url)).size,
  };
  schemaSemanticsCheck.notes.push("Parseability is reported separately. This check rejects unreviewed types, identity/review claims without complete approval packets, and configured DOM/template mismatches.");
  schemaSemanticsCheck.notes.push("A green result records configured evidence consistency; it does not replace Schema Markup Validator/Rich Results output or establish that a real-world claim is true.");
  schemaSemanticsCheck.summary = schemaSemanticsCheck.status === "pass" ? "JSON-LD types and governed claims match the configured DOM/template evidence." : schemaSemanticsCheck.status === "skip" ? "JSON-LD semantic evidence could not be evaluated without healthy canonical pages." : "Unapproved or DOM/template-inconsistent JSON-LD claims remain.";
  checks.push(truncate(schemaSemanticsCheck, config.detailLimit));

  const contentCheck = createCheck("content.leaks", "Shortcode, demo-copy, and placeholder leaks", "critical");
  requireCanonicalEvidence(contentCheck, canonicalRows);
  const compiledPlaceholders = config.placeholderPatterns.map((entry) => ({ ...entry, regex: new RegExp(entry.pattern, entry.flags ?? "i") }));
  const placeholderHits = [];
  for (const row of canonicalRows) {
    for (const pattern of compiledPlaceholders) {
      const searchText = pattern.scope === "body" ? row.analysis.bodyText : row.analysis.mainText;
      const match = searchText.match(pattern.regex);
      if (!match) continue;
      placeholderHits.push({ url: row.response.finalUrl, id: pattern.id, sample: match[0] });
      fail(contentCheck, `Visible content matches '${pattern.id}'.`, { url: row.response.finalUrl, sample: match[0] });
    }
  }
  const knownDemoPaths = canonicalRows.filter((row) => /\/(?:classes\/recent-case-title-|testimonials\/client-name-|team\/member-name-(?:0[2-9]|[1-9][0-9]))/i.test(pathOf(row.response.finalUrl)));
  for (const row of knownDemoPaths) fail(contentCheck, "Known demo-record path remains indexable.", { url: row.response.finalUrl });
  contentCheck.metrics = { pages: canonicalRows.length, hits: placeholderHits.length, affectedPages: new Set(placeholderHits.map((hit) => hit.url)).size, knownDemoPaths: knownDemoPaths.length, pagesWithoutMainLandmark: canonicalRows.filter((row) => row.analysis.mainScope !== "main").length, countsByPattern: Object.fromEntries(compiledPlaceholders.map((pattern) => [pattern.id, placeholderHits.filter((hit) => hit.id === pattern.id).length])) };
  contentCheck.summary = contentCheck.status === "pass" ? "No configured content leak was found." : "Public placeholder or shortcode leakage remains.";
  checks.push(truncate(contentCheck, config.detailLimit));

  const productionDefectCheck = createCheck("content.production_defects", "Known grammar and production defects", "high");
  const policyContentRows = policyRows
    .filter((row) => !row.__error && row.response?.observed && row.response.status === 200 && isHtml(row.response))
    .map((row) => ({ url: row.url, response: row.response, analysis: analyzeHtml(row.response.body, row.response.finalUrl || row.url) }));
  const productionRows = [...new Map(
    [...sitemapRows, ...discoveredRows, ...Object.values(specialRows), ...policyContentRows]
      .filter((row) => row?.response?.observed && row.response.status === 200 && row.analysis)
      .map((row) => [comparableUrl(row.response.finalUrl), row]),
  ).values()];
  if (!productionRows.length) skip(productionDefectCheck, "No observed public HTML was available for production-defect scanning.");
  const productionDefectHits = [];
  for (const row of productionRows) {
    for (const defect of productionContentDefects(row.response.body)) {
      const hit = { url: row.response.finalUrl, ...defect };
      productionDefectHits.push(hit);
      fail(productionDefectCheck, `Visible content matches deterministic production defect '${defect.id}'.`, hit);
    }
  }
  const productionDefectIds = [...new Set(productionDefectHits.map((hit) => hit.id))].sort();
  productionDefectCheck.metrics = {
    pages: productionRows.length,
    hits: productionDefectHits.length,
    affectedPages: new Set(productionDefectHits.map((hit) => hit.url)).size,
    countsByDefect: Object.fromEntries(productionDefectIds.map((id) => [id, productionDefectHits.filter((hit) => hit.id === id).length])),
  };
  productionDefectCheck.notes.push("Empty list items and explicit numbering sequences are checked only in main content and only for deterministic structural shapes.");
  productionDefectCheck.summary = productionDefectCheck.status === "pass" ? "No configured deterministic grammar or production defect was found." : productionDefectCheck.status === "skip" ? "Production defects could not be evaluated without public HTML." : "Known grammar or production defects remain visible.";
  checks.push(truncate(productionDefectCheck, config.detailLimit));

  const contactExchangeCheck = createCheck("content.contact_exchange", "Contact exchange privacy and response expectation", "high");
  const contact = specialRows.contact;
  let contactExchangeEvidence = { exchangeCount: 0, adjacentPrivacyContext: false, explicitResponseExpectation: false, complete: false };
  if (!contact?.response.observed) {
    if (source.mode === "live") fail(contactExchangeCheck, "The configured Contact page was not observed.", { url: routeUrls.contact });
    else skip(contactExchangeCheck, "The configured Contact page is absent from this offline snapshot.");
  } else if (contact.response.status !== 200 || !isHtml(contact.response)) {
    fail(contactExchangeCheck, "The configured Contact page is not a healthy HTML response.", { url: routeUrls.contact, status: contact.response.status, finalUrl: contact.response.finalUrl });
  } else {
    const evaluated = contactExchangeViolations(contact.response.body);
    contactExchangeEvidence = evaluated.evidence;
    for (const violation of evaluated.violations) {
      fail(contactExchangeCheck, violation.message, { url: contact.response.finalUrl, code: violation.code });
    }
  }
  contactExchangeCheck.metrics = {
    status: contact?.response.status ?? null,
    exchangeCount: contactExchangeEvidence.exchangeCount,
    adjacentPrivacyContext: contactExchangeEvidence.adjacentPrivacyContext,
    explicitResponseExpectation: contactExchangeEvidence.explicitResponseExpectation,
    completeExchangeContext: contactExchangeEvidence.complete,
  };
  contactExchangeCheck.notes.push("A statement that response timing is unpublished is honest interim copy, but it is not a time-bounded response expectation and cannot close M10.");
  contactExchangeCheck.summary = contactExchangeCheck.status === "pass" ? "The Contact exchange places privacy context and an explicit response expectation beside the same action." : contactExchangeCheck.status === "skip" ? "The Contact exchange was not observable." : "The Contact exchange remains incomplete for M10.";
  checks.push(truncate(contactExchangeCheck, config.detailLimit));

  const httpCheck = createCheck("resources.http_references", "Explicit HTTP references", "medium");
  requireCanonicalEvidence(httpCheck, canonicalRows);
  const httpHits = canonicalRows.flatMap((row) => row.analysis.httpReferences.map((reference) => ({ url: row.response.finalUrl, reference })));
  for (const hit of httpHits) fail(httpCheck, "Explicit HTTP reference remains in HTML.", hit);
  httpCheck.metrics = { pages: canonicalRows.length, affectedPages: new Set(httpHits.map((hit) => hit.url)).size, references: httpHits.length, uniqueReferences: new Set(httpHits.map((hit) => hit.reference)).size };
  httpCheck.summary = httpCheck.status === "pass" ? "All captured references use HTTPS or relative URLs." : httpCheck.status === "skip" ? "HTTP references could not be evaluated without healthy canonical pages." : "Mixed-scheme references remain.";
  checks.push(truncate(httpCheck, config.detailLimit));

  const headerCheck = createCheck("responses.headers", "Response security and cache headers", "medium");
  const headerRows = canonicalRows.filter((row) => row.response.observed);
  requireCanonicalEvidence(headerCheck, headerRows);
  for (const header of config.requiredHeaders) {
    const missing = headerRows.filter((row) => !row.response.headers[header]);
    if (missing.length) fail(headerCheck, `${header} is missing on ${missing.length}/${headerRows.length} HTML responses.`, { header, sampleUrls: missing.slice(0, 10).map((row) => row.response.finalUrl) });
  }
  if (config.requireFrameProtection) {
    const missing = headerRows.filter((row) => !row.response.headers["x-frame-options"] && !/frame-ancestors/i.test(row.response.headers["content-security-policy"] ?? ""));
    if (missing.length) fail(headerCheck, `Frame protection is missing on ${missing.length}/${headerRows.length} HTML responses.`, { sampleUrls: missing.slice(0, 10).map((row) => row.response.finalUrl) });
  }
  if (config.requireHtmlCachePolicy) {
    const missing = headerRows.filter((row) => !row.response.headers["cache-control"]);
    if (missing.length) fail(headerCheck, `Explicit HTML Cache-Control is missing on ${missing.length}/${headerRows.length} responses.`, { sampleUrls: missing.slice(0, 10).map((row) => row.response.finalUrl) });
  }
  if (config.forbidPoweredBy) {
    const exposed = headerRows.filter((row) => row.response.headers["x-powered-by"]);
    if (exposed.length) fail(headerCheck, `X-Powered-By is exposed on ${exposed.length}/${headerRows.length} responses.`, { values: [...new Set(exposed.map((row) => row.response.headers["x-powered-by"]))], sampleUrls: exposed.slice(0, 10).map((row) => row.response.finalUrl) });
  }
  headerCheck.metrics = { pages: headerRows.length, missingByHeader: Object.fromEntries(config.requiredHeaders.map((header) => [header, headerRows.filter((row) => !row.response.headers[header]).length])), missingFrameProtection: headerRows.filter((row) => !row.response.headers["x-frame-options"] && !/frame-ancestors/i.test(row.response.headers["content-security-policy"] ?? "")).length, missingCacheControl: headerRows.filter((row) => !row.response.headers["cache-control"]).length, poweredByExposed: headerRows.filter((row) => row.response.headers["x-powered-by"]).length };
  headerCheck.summary = headerCheck.status === "pass" ? "Configured response-header baseline passes." : headerCheck.status === "skip" ? "Response headers could not be evaluated without healthy canonical pages." : "Response hardening/caching headers remain incomplete.";
  checks.push(truncate(headerCheck, config.detailLimit));

  let browserResult = { skipped: true, reason: args.mode === "snapshot" ? "Browser probing is disabled in offline snapshot mode." : "Browser probing disabled by CLI.", pages: [] };
  const configuredBrowserPaths = Array.isArray(config.browser.paths) && config.browser.paths.length ? config.browser.paths : [config.routes.root, config.routes.blog];
  const browserUrls = [...new Set(configuredBrowserPaths.map((pathname) => route(args.baseUrl, pathname)))].slice(0, config.browser.maxPages);
  if (args.mode === "live" && args.browser !== "off") {
    browserResult = await probeBrowserPages(browserUrls, {
      executablePath: args.browserPath,
      timeoutMs: config.timeoutMs,
      settleMs: config.browser.settleMs,
      viewport: { width: config.browser.width, height: config.browser.height, deviceScaleFactor: config.browser.deviceScaleFactor, mobile: config.browser.mobile },
      accessibility: {
        ...config.browser.accessibility,
        rootUrl: route(args.baseUrl, config.browser.accessibility?.rootPath ?? config.routes.root),
      },
    });
  }
  const runtimeCheck = createCheck("browser.runtime", "Rendered console and runtime health", "high");
  if (browserResult.skipped) {
    if (args.browser === "required" && args.mode === "live") fail(runtimeCheck, browserResult.reason);
    else skip(runtimeCheck, browserResult.reason);
  } else {
    for (const page of browserResult.pages) {
      if (page.documentStatus === 403) fail(runtimeCheck, "Browser document was blocked with 403; rendered runtime is unproven (possible WAF/bot protection).", { url: page.finalUrl, status: page.documentStatus, code: "browser_waf_403" });
      else if (page.documentStatus !== null && page.documentStatus !== 200) fail(runtimeCheck, "Browser document returned a non-200 response.", { url: page.finalUrl, status: page.documentStatus });
      for (const error of page.exceptions) fail(runtimeCheck, "Uncaught browser exception.", { url: page.finalUrl, error });
      for (const error of page.consoleErrors) fail(runtimeCheck, "Console error.", { url: page.finalUrl, error });
      for (const entry of page.logEntries.filter((entry) => entry.level === "error")) fail(runtimeCheck, "Browser log error.", { url: page.finalUrl, entry });
      for (const failure of page.networkFailures) fail(runtimeCheck, "Browser resource load failed.", { url: page.finalUrl, failure });
    }
  }
  runtimeCheck.metrics = { pages: browserResult.pages.length, wafBlocked403: browserResult.pages.filter((page) => page.documentStatus === 403).length, exceptions: browserResult.pages.reduce((sum, page) => sum + page.exceptions.length, 0), consoleErrors: browserResult.pages.reduce((sum, page) => sum + page.consoleErrors.length, 0), logErrors: browserResult.pages.reduce((sum, page) => sum + page.logEntries.filter((entry) => entry.level === "error").length, 0), networkFailures: browserResult.pages.reduce((sum, page) => sum + page.networkFailures.length, 0) };
  runtimeCheck.summary = runtimeCheck.status === "pass" ? "Rendered pages emitted no captured runtime errors." : runtimeCheck.status === "skip" ? "Rendered runtime was not observed." : "Rendered runtime errors remain.";
  checks.push(truncate(runtimeCheck, config.detailLimit));

  const accessibilityCheck = createCheck("browser.accessibility", "Structured mobile control accessibility evidence", "high");
  const configuredAccessibility = config.browser.accessibility ?? {};
  const accessibilityRootUrl = route(args.baseUrl, configuredAccessibility.rootPath ?? config.routes.root);
  const accessibilityPage = browserResult.pages.find((page) => page.accessibility !== null && page.accessibility !== undefined) ?? null;
  let accessibilityViolations = [];
  if (configuredAccessibility.enabled === false) {
    skip(accessibilityCheck, "Structured accessibility probing is disabled by configuration.");
  } else if (browserResult.skipped) {
    if (args.browser === "required" && args.mode === "live") fail(accessibilityCheck, browserResult.reason, { code: "browser_unavailable" });
    else skip(accessibilityCheck, "Rendered DOM, bounding boxes, focus, keyboard handlers, and autoplay state were not observed.");
  } else if (!accessibilityPage) {
    fail(accessibilityCheck, "The configured root page did not produce structured accessibility evidence.", { code: "accessibility_root_unobserved", url: accessibilityRootUrl });
  } else if (accessibilityPage.documentStatus !== 200) {
    fail(accessibilityCheck, "Structured accessibility evidence came from a non-200 root document and is invalid.", { code: "accessibility_root_non_200", url: accessibilityPage.finalUrl, status: accessibilityPage.documentStatus });
  } else {
    accessibilityViolations = accessibilityEvidenceViolations(accessibilityPage.accessibility, configuredAccessibility);
    for (const violation of accessibilityViolations) {
      const { message, ...evidence } = violation;
      fail(accessibilityCheck, message, evidence);
    }
  }
  accessibilityCheck.metrics = {
    configuredRootUrl: accessibilityRootUrl,
    observedPageUrl: accessibilityPage?.finalUrl ?? null,
    violationCount: accessibilityViolations.length,
    violationCodes: accessibilityViolations.map((violation) => violation.code),
    evidence: accessibilityPage?.accessibility ?? null,
  };
  accessibilityCheck.summary = accessibilityCheck.status === "pass"
    ? "Exact mobile root controls satisfy the bounded rendered DOM and synthetic-keyboard contract."
    : accessibilityCheck.status === "skip"
      ? "Structured rendered accessibility evidence was not collected."
      : "One or more exact mobile control accessibility assertions failed.";
  checks.push(truncate(accessibilityCheck, config.detailLimit));

  const performanceCheck = createCheck("performance.budgets", "HTML and rendered transfer budgets", "high");
  const staticCandidates = [...new Map(Object.values(specialRows).filter((row) => row?.analysis).map((row) => [comparableUrl(row.response.finalUrl), row])).values()];
  const { healthy: performanceRows, unhealthy: unhealthyPerformanceRows } = partitionStaticPerformanceRows(staticCandidates);
  for (const row of unhealthyPerformanceRows) {
    fail(performanceCheck, "Static performance HTML came from a non-200 response and is invalid budget evidence.", {
      url: row.response.finalUrl,
      status: row.response.status,
      requestedUrl: row.response.requestedUrl,
    });
  }
  if (!performanceRows.length && !unhealthyPerformanceRows.length) skip(performanceCheck, "No observed 200 HTML route was available for static performance checks.");
  for (const row of performanceRows) {
    if (row.analysis.htmlBytes > config.performance.htmlBytes) fail(performanceCheck, "HTML exceeds byte budget.", { url: row.response.finalUrl, actual: row.analysis.htmlBytes, budget: config.performance.htmlBytes });
    if (row.analysis.scriptCount > config.performance.scriptCount) fail(performanceCheck, "Static script count exceeds budget.", { url: row.response.finalUrl, actual: row.analysis.scriptCount, budget: config.performance.scriptCount });
    if (row.analysis.elementCount > config.performance.domNodes) fail(performanceCheck, "Static element count exceeds DOM budget.", { url: row.response.finalUrl, actual: row.analysis.elementCount, budget: config.performance.domNodes });
  }
  if (browserResult.skipped) skip(performanceCheck, "Transfer-byte and rendered-DOM budgets require live browser observation; static HTML checks still ran.");
  for (const page of browserResult.pages) {
    if (page.documentStatus !== null && page.documentStatus !== 200) fail(performanceCheck, "Rendered performance metrics came from a non-200 document and are invalid budget evidence.", { url: page.finalUrl, status: page.documentStatus });
    for (const metric of ["totalTransferBytes", "imageTransferBytes", "scriptTransferBytes", "resourceCount", "scriptCount", "domNodes", "horizontalOverflowPx"]) {
      const actual = page.metrics[metric];
      const budget = config.performance[metric];
      if (actual !== null && budget !== undefined && actual > budget) fail(performanceCheck, `${metric} exceeds budget.`, { url: page.finalUrl, metric, actual, budget });
    }
  }
  performanceCheck.metrics = { staticPages: performanceRows.map((row) => ({ url: row.response.finalUrl, status: row.response.status, htmlBytes: row.analysis.htmlBytes, scripts: row.analysis.scriptCount, elements: row.analysis.elementCount })), rejectedStaticPages: unhealthyPerformanceRows.map((row) => ({ url: row.response.finalUrl, status: row.response.status, requestedUrl: row.response.requestedUrl })), browserPages: browserResult.pages.map((page) => ({ url: page.finalUrl, documentStatus: page.documentStatus, ...page.metrics })), budgets: config.performance };
  performanceCheck.summary = performanceCheck.status === "pass" ? "Configured performance budgets pass." : performanceCheck.status === "skip" ? "Only static performance budgets were observable." : "One or more performance budgets failed.";
  checks.push(truncate(performanceCheck, config.detailLimit));

  const statusCounts = Object.fromEntries(["pass", "fail", "skip"].map((status) => [status, checks.filter((check) => check.status === status).length]));
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: args.mode,
    baseUrl: args.baseUrl,
    cacheBypass: args.mode === "live" ? args.cacheBypass : "not-applicable",
    snapshotRoot: args.mode === "snapshot" ? path.resolve(args.snapshot) : null,
    durationMs: Math.round(performance.now() - startedAt),
    result: statusCounts.fail ? "fail" : "pass",
    summary: { checks: checks.length, ...statusCounts, sitemapUrls: inventory.pages.length, uniqueInternalTargets: internalLinkMap.size },
    checks,
    evidence: {
      robots: { url: inventory.robots.requestedUrl, status: inventory.robots.status, observed: inventory.robots.observed },
      sitemaps: inventory.sitemaps,
      browser: browserResult.skipped ? { skipped: true, failed: Boolean(browserResult.failed), reason: browserResult.reason, pagesCompleted: browserResult.pages.length } : { skipped: false, executablePath: browserResult.executablePath, userAgent: browserResult.userAgent, pages: browserResult.pages },
      cacheBypass: args.mode === "live" ? { mode: args.cacheBypass, reservedQueryParameter: CACHE_BYPASS_PARAM } : { mode: "not-applicable" },
      limitations: args.mode === "snapshot"
        ? ["No network requests were made.", "Redirect chains, uncaptured routes, external destinations, console events, and transfer bytes cannot be proven from this snapshot."]
        : [
          "This is a deterministic lab crawl, not Search Console, field Core Web Vitals, analytics, or legal validation.",
          "The structured accessibility probe observes rendered DOM attributes, CSS-pixel boxes, focus, and synthetic keyboard events; it is not a platform accessibility-tree snapshot, human keyboard session, screen-reader test, or certification.",
        ],
    },
    config,
  };
  if (outputPath) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  for (const check of checks) {
    const marker = check.status === "pass" ? "PASS" : check.status === "skip" ? "SKIP" : "FAIL";
    console.log(`${marker.padEnd(4)}  ${check.id.padEnd(34)} ${check.summary}`);
  }
  console.log(`\nResult: ${report.result.toUpperCase()} (${statusCounts.pass} pass, ${statusCounts.fail} fail, ${statusCounts.skip} skip)`);
  if (outputPath) console.log(`JSON: ${outputPath}`);
  else console.log(JSON.stringify(report));
  if (report.result === "fail" && !args.allowFailures) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Harness error: ${error?.stack ?? error}`);
  process.exitCode = 2;
});
