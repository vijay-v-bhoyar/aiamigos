#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const INVENTORY_PATH = "remediation/content-governance/content-intent-freshness-inventory.json";
const REVIEW_PATH = "remediation/content-governance/CONTENT_INTENT_FRESHNESS_REVIEW.md";
const AUDIT_PATH = "output/seo-audit.json";
const MANIFEST_PATH = "public-site-snapshot/snapshot-manifest.json";
const POST_SITEMAP_PATH = "public-site-snapshot/meta/post-sitemap.xml-50976532d3.xml";
const STAGING_GATE_PATH = "remediation/tests/results/seo-regression-staging-v1.4.0-a11y2-browser.json";
const STAGING_CHANGELOG_PATH = "remediation/STAGING_CHANGELOG_2026-08-13.md";
const STAGING_QUARANTINE_MANIFEST_PATH = "remediation/staging-backups/quarantine-2026-08-13T17-25-51-990Z/manifest.json";
const AS_OF = "2026-08-13T00:00:00.000Z";

const ALLOWED_ACTIONS = new Set(["retain", "update", "merge", "retire", "review"]);
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "behind", "best", "by", "for", "from", "guide", "how",
  "in", "into", "is", "it", "its", "main", "of", "on", "or", "our", "the", "their", "to", "tool",
  "tools", "using", "with", "your"
]);

const TOPIC_CLUSTERS = [
  { id: "foundations", label: "AI foundations and taxonomy", purpose: "Explain established AI concepts without collapsing distinct technical questions.", memberPostIds: [1, 17, 18, 19, 52, 296, 394, 397, 400, 1097] },
  { id: "future-emerging", label: "Future and emerging AI", purpose: "Separate observed capabilities from speculative or research-stage concepts.", memberPostIds: [403, 406, 412, 415, 418, 421, 424, 427, 433, 446] },
  { id: "responsible-work", label: "Responsible AI, work and leadership", purpose: "Address work, ethics and leadership with bounded evidence and accountable review.", memberPostIds: [188, 192, 430, 1249] },
  { id: "industry-applications", label: "Industry and workflow applications", purpose: "Explain domain-specific use cases, constraints and evidence without generic revolution claims.", memberPostIds: [198, 206, 217, 227, 232, 237, 241, 280, 1069, 1190, 1196, 1333, 1361] },
  { id: "genai-concepts", label: "Generative AI concepts", purpose: "Cover data, model classes, capabilities and limitations as distinct reader questions.", memberPostIds: [570, 578, 581, 1180, 1215, 1217, 1219, 1220, 1221, 1223, 1224] },
  { id: "tools-models-landscape", label: "AI tools, models and market landscape", purpose: "Maintain dated, tested and disclosure-aware product or model coverage.", memberPostIds: [441, 535, 721, 783, 791, 918, 1160, 1210, 1222, 1262, 1356] },
  { id: "ai-engineering", label: "AI application engineering", purpose: "Deliver versioned technical guidance whose headline matches its reproducible depth.", memberPostIds: [16, 481, 823, 926, 1311, 1375, 1388, 1395, 1405, 1407, 1411, 1421] }
];

const INTENT_DEFS = [
  ["ai-introduction", "Understand what AI is and where it is used.", "Reader needs one grounded introduction to AI, its scope and limits.", 18, [1, 18, 19, 52]],
  ["deep-learning-overview", "Understand deep learning and how it differs from broader machine learning.", "Reader needs a technically bounded deep-learning overview.", 400, [17, 400]],
  ["ai-evolution", "Trace major AI system paradigms over time.", "Reader needs a sourced chronology rather than a maturity prophecy.", 296, [296]],
  ["rule-based-ai", "Understand rule-based AI systems.", "Reader needs mechanics, appropriate uses and limitations of rule systems.", 394, [394]],
  ["machine-learning-overview", "Understand machine learning foundations.", "Reader needs a distinct ML overview with examples and limits.", 397, [397]],
  ["ai-algorithm-guide", "Compare major AI algorithm families.", "Reader needs a classification guide with precise examples.", 1097, [1097]],
  ["general-ai-agi", "Understand the AGI concept and uncertainty.", "Reader needs definitions, current limits and research context.", 403, [403]],
  ["superintelligence", "Understand superintelligence as a hypothetical concept.", "Reader needs speculation clearly separated from current capability.", 406, [406]],
  ["adaptive-ai", "Understand adaptive AI systems.", "Reader needs mechanisms, examples and operational limits.", 412, [412]],
  ["emotional-ai", "Understand affective computing and emotion inference limits.", "Reader needs the field distinguished from claims that machines feel.", 415, [415]],
  ["creative-ai-concept", "Understand AI-assisted creativity.", "Reader needs a concept overview distinct from an industry survey.", 418, [418]],
  ["self-aware-ai", "Understand claims about machine self-awareness.", "Reader needs current evidence separated from philosophical speculation.", 421, [421]],
  ["human-ai-coevolution", "Explore human-AI collaboration scenarios.", "Reader needs scenarios, assumptions and uncertainty labels.", 424, [424]],
  ["decentralized-ai", "Understand decentralized AI architectures.", "Reader needs architecture, tradeoffs and privacy limits.", 427, [427]],
  ["quantum-ai", "Understand intersections of quantum computing and AI.", "Reader needs current demonstrations separated from future claims.", 433, [433]],
  ["ai-digital-transformation", "Understand organizational use of AI.", "Reader needs concrete use cases and change constraints, not generic transformation claims.", 446, [446]],
  ["ai-jobs-impact", "Understand how AI may affect jobs.", "Reader needs dated labor evidence, role-specific impacts and uncertainty.", 188, [188]],
  ["ai-ethics", "Understand fairness, privacy and accountability in AI.", "Reader needs one evidence-based ethics foundation.", 430, [192, 430]],
  ["ai-leadership-no-code", "Evaluate no-code AI leadership claims.", "Reader needs role expectations, limitations and verifiable learning paths.", 1249, [1249]],
  ["healthcare-ai-overview", "Understand AI use cases and risks in healthcare.", "Reader needs a non-medical-advice overview with domain review.", 198, [198]],
  ["finance-ai-overview", "Understand AI use cases and risks in finance.", "Reader needs a non-financial-advice overview with dated evidence.", 206, [206]],
  ["retail-ai", "Understand AI use cases in retail.", "Reader needs concrete retail workflows and consumer-impact limits.", 217, [217]],
  ["agriculture-ai", "Understand AI use cases in agriculture.", "Reader needs concrete farming workflows and deployment constraints.", 227, [227]],
  ["manufacturing-ai", "Understand AI and robotics in manufacturing.", "Reader needs one maintainable manufacturing pillar rather than two generic futures.", 1069, [232, 1069]],
  ["editorial-publishing", "Use a publication quality checklist.", "Reader needs a maintained editorial checklist only if this remains within site scope.", 237, [237]],
  ["entertainment-ai", "Understand AI use cases in entertainment.", "Reader needs rights-aware examples and current limitations.", 241, [241]],
  ["transportation-ai", "Understand AI use cases in transportation.", "Reader needs safety-bounded, current transportation examples.", 280, [280]],
  ["ai-assisted-software", "Use AI in software feature development.", "Reader needs one practical workflow with measured limits.", 1196, [1190, 1196]],
  ["healthcare-interoperability", "Understand AI's role in healthcare interoperability.", "Reader needs standards-aware interoperability uses and limits.", 1333, [1333]],
  ["monai-medical-imaging", "Use NVIDIA MONAI for medical-imaging workflows.", "Reader needs versioned MONAI guidance with medical-domain review.", 1361, [1361]],
  ["ai-data-foundations", "Understand data types and training data for AI.", "Reader needs one coherent data-quality and training-data foundation.", 1224, [570, 578, 1224]],
  ["genai-solutions", "Plan a generative-AI solution responsibly.", "Reader needs a scoped solution process with evaluation and risk controls.", 581, [581]],
  ["generative-discriminative-models", "Compare generative and discriminative models.", "Reader needs a technically precise model-class comparison.", 1180, [1180]],
  ["genai-applications", "Understand generative-AI application categories.", "Reader needs current examples paired with limitations.", 1215, [1215]],
  ["genai-limitations", "Understand generative-AI limitations.", "Reader needs an evergreen risk and limitation reference.", 1217, [1217]],
  ["genai-future", "Evaluate possible directions for generative AI.", "Reader needs dated scenarios and uncertainty, not prediction as fact.", 1219, [1219]],
  ["genai-vs-traditional", "Compare generative AI with traditional AI.", "Reader needs a precise task-and-model comparison.", 1220, [1220]],
  ["genai-explainability", "Understand explainability for generative models.", "Reader needs methods, limitations and decision context.", 1221, [1221]],
  ["genai-creative-industries", "Understand generative AI in creative industries.", "Reader needs rights, labor and workflow analysis distinct from a creativity concept page.", 1223, [1223]],
  ["gpt-model-history", "Understand GPT-family model history and uses.", "Reader needs a dated, source-correct model timeline.", 441, [441]],
  ["text-to-video-tools", "Compare text-to-video tools.", "Reader needs a dated, tested comparison with disclosure.", 535, [535]],
  ["llm-overview", "Understand large language models.", "Reader needs a model overview with capability and limitation boundaries.", 721, [721]],
  ["grok-product", "Understand the specific Grok product and vendor.", "Reader needs unambiguous product identity and primary-source facts.", 783, [783]],
  ["ai-company-landscape", "Survey AI companies and products.", "Reader needs a maintainable, dated selection method rather than an unbounded top list.", 791, [791]],
  ["ai-pin-device", "Understand the AI Pin device and its status.", "Reader needs a dated product-status account.", 918, [918]],
  ["local-llm", "Run a local language model on a personal computer.", "Reader needs one versioned local-LLM workflow; product-specific variants should support it.", 1160, [1160, 1262]],
  ["genai-tools", "Compare generative-AI tools for creative work.", "Reader needs dated testing criteria and affiliate disclosure.", 1210, [1210]],
  ["open-source-genai", "Evaluate open-source generative-AI projects.", "Reader needs version, license, activity and tested-use criteria.", 1222, [1222]],
  ["ocr-tesseract", "Use Tesseract OCR with spreadsheet image workflows.", "Reader needs a reproducible, versioned OCR workflow.", 1356, [1356]],
  ["ai-app-development", "Understand the steps in AI application development.", "Reader needs a bounded engineering lifecycle, not metaphorical prompts.", 16, [16]],
  ["prompt-engineering", "Design and evaluate prompts.", "Reader needs one precise prompt-engineering foundation.", 481, [481, 823]],
  ["custom-gpt", "Build a custom GPT-style assistant.", "Reader needs a versioned vendor-specific workflow or a clearly bounded overview.", 926, [926]],
  ["python-deployment", "Deploy a Python application safely.", "Reader needs a reproducible, version-specific deployment guide.", 1311, [1311]],
  ["vector-database-caching", "Choose vector storage and caching for a GenAI application.", "Reader needs measured selection criteria and architecture tradeoffs.", 1375, [1375]],
  ["genai-fine-tuning", "Configure and evaluate generative-AI fine-tuning.", "Reader needs versioned parameters, fixtures and evaluation criteria.", 1388, [1388]],
  ["rag-architecture-testing", "Design and test a RAG system.", "Reader needs a pillar plus reproducible test evidence; generic test promises remain gated.", 1395, [1395, 1407]],
  ["ai-benchmarks", "Understand or reproduce AI model benchmarks.", "Reader needs method, fixtures, raw results and uncertainty.", 1405, [1405]],
  ["langgraph-application", "Build a LangGraph application.", "Reader needs versioned code, environment and reproducible behavior.", 1411, [1411]],
  ["agentic-saas-roadmap", "Plan an agentic-AI SaaS implementation.", "Reader needs architecture, security, evaluation, cost and deployment evidence.", 1421, [1421]]
].map(([id, intent, audienceJob, recommendedPrimaryPostId, memberPostIds]) => ({
  id, intent, audienceJob, recommendedPrimaryPostId, memberPostIds,
  status: "machine_draft_requires_editorial_and_search_data_approval"
}));

const MERGE_IDS = new Set([1, 17, 19, 52, 192, 232, 570, 578, 823, 1190, 1262]);
const RETAIN_IDS = new Set([394, 397, 400, 1097, 1180, 1217, 1220, 1221]);
const RETIRE_IDS = new Set([237]);
const REVIEW_IDS = new Set([198, 206, 441, 783, 926, 1249, 1333, 1361, 1405, 1407, 1411, 1421]);
const KNOWN_STAGING_DRAFTS = new Map([
  [441, STAGING_CHANGELOG_PATH], [783, STAGING_CHANGELOG_PATH], [1405, STAGING_CHANGELOG_PATH],
  [926, STAGING_QUARANTINE_MANIFEST_PATH], [1407, STAGING_QUARANTINE_MANIFEST_PATH],
  [1411, STAGING_QUARANTINE_MANIFEST_PATH], [1421, STAGING_QUARANTINE_MANIFEST_PATH]
]);
const HIGH_STAKES = new Map([
  [198, "healthcare"], [206, "finance"], [1249, "career"], [1333, "healthcare"], [1361, "medical_imaging"]
]);
const ARTIFACT_PROMISE_IDS = new Set([926, 1405, 1407, 1411, 1421]);
const PRODUCT_VENDOR_IDS = new Set([441, 535, 721, 783, 791, 918, 926, 1160, 1210, 1222, 1262, 1311, 1356, 1361, 1375, 1388, 1395, 1405, 1407, 1411, 1421]);
const FORMULA_PHRASES = ["introduction", "powerful", "unleash", "dive into", "revolutionizing", "comprehensive guide", "game-changer"];

function readText(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(join(ROOT, path))).digest("hex");
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'");
}

function parsePostSitemap(xml) {
  const entries = [];
  for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const loc = block[1].match(/<loc>([\s\S]*?)<\/loc>/i)?.[1];
    const lastmod = block[1].match(/<lastmod>([\s\S]*?)<\/lastmod>/i)?.[1];
    if (loc && lastmod) entries.push({ url: decodeXml(loc.trim()), lastmod: decodeXml(lastmod.trim()) });
  }
  return entries;
}

function metaContent(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1]
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"))?.[1]
    ?? null;
}

function extractDate(html, key) {
  const metaKey = key === "published" ? "article:published_time" : "og:updated_time";
  const schemaKey = key === "published" ? "datePublished" : "dateModified";
  return metaContent(html, metaKey)
    ?? html.match(new RegExp(`"${schemaKey}"\\s*:\\s*"([^"]+)"`, "i"))?.[1]
    ?? null;
}

function extractPostBody(html) {
  const start = html.search(/<div\s+class=["'][^"']*single-post-content[^"']*["'][^>]*>/i);
  if (start < 0) return "";
  const openingEnd = html.indexOf(">", start) + 1;
  const shareStart = html.search(/<div\s+class=["'][^"']*share_icon[^"']*["']/i, openingEnd);
  return html.slice(openingEnd, shareStart > openingEnd ? shareStart : html.length);
}

function visibleText(html) {
  return decodeXml(html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#\d+;|&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function bodyExternalLinks(body) {
  const links = new Set();
  for (const match of body.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
    try {
      const url = new URL(decodeXml(match[1]), "https://www.aiamigos.org/");
      if (url.protocol.startsWith("http") && !/(^|\.)aiamigos\.org$/i.test(url.hostname)) {
        url.hash = "";
        links.add(url.href);
      }
    } catch {
      // Malformed links are already covered by the deterministic SEO audit.
    }
  }
  return [...links].sort();
}

function countPhrase(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...text.matchAll(new RegExp(`\\b${escaped}\\b`, "gi"))].length;
}

function titleTokens(title) {
  return new Set((title.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token)));
}

function jaccard(left, right) {
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

function dateOnly(value) {
  return value?.slice(0, 10) ?? null;
}

function ageDays(value) {
  return Math.floor((Date.parse(AS_OF) - Date.parse(value)) / 86_400_000);
}

function addSignal(signals, code, detail, source) {
  signals.push({ code, detail, source });
}

function actionFor(postId) {
  if (REVIEW_IDS.has(postId)) return "review";
  if (MERGE_IDS.has(postId)) return "merge";
  if (RETIRE_IDS.has(postId)) return "retire";
  if (RETAIN_IDS.has(postId)) return "retain";
  return "update";
}

function dueFor(priority) {
  return ({ critical: "2026-08-20", high: "2026-09-12", medium: "2026-11-11", low: "2027-02-09" })[priority];
}

function priorityFor(post, action) {
  const codes = new Set(post.currentRiskSignals.map((signal) => signal.code));
  if (codes.has("known_staging_draft") || codes.has("high_stakes_domain") || codes.has("unfulfilled_artifact_promise")) return "critical";
  if (action === "merge" || action === "retire" || codes.has("product_or_vendor_specific") || codes.has("formulaic_title_language")) return "high";
  if (codes.has("stale_over_365_days") || codes.has("probable_intent_overlap")) return "medium";
  return "low";
}

function buildModel() {
  const audit = readJson(AUDIT_PATH);
  const manifest = readJson(MANIFEST_PATH);
  const sitemap = parsePostSitemap(readText(POST_SITEMAP_PATH));
  const stagingGate = readJson(STAGING_GATE_PATH);
  const quarantineManifest = readJson(STAGING_QUARANTINE_MANIFEST_PATH);
  const auditByUrl = new Map(audit.pages.map((page) => [page.requestedUrl, page]));
  const manifestByUrl = new Map(manifest.pages.map((page) => [page.requestedUrl, page]));
  const topicByPostId = new Map(TOPIC_CLUSTERS.flatMap((cluster) => cluster.memberPostIds.map((id) => [id, cluster])));
  const intentByPostId = new Map(INTENT_DEFS.flatMap((intent) => intent.memberPostIds.map((id) => [id, intent])));
  const burstCounts = sitemap.reduce((counts, entry) => counts.set(dateOnly(entry.lastmod), (counts.get(dateOnly(entry.lastmod)) ?? 0) + 1), new Map());
  const stagingPostSitemap = stagingGate.evidence.sitemaps.find((entry) => /\/post-sitemap\.xml$/i.test(entry.url));

  const basePosts = sitemap.map((sitemapEntry) => {
    const auditPage = auditByUrl.get(sitemapEntry.url);
    const manifestPage = manifestByUrl.get(sitemapEntry.url);
    if (!auditPage || !manifestPage) throw new Error(`Missing audit or manifest page for ${sitemapEntry.url}`);
    const idMatch = manifestPage.headers?.link?.match(/\/wp-json\/wp\/v2\/posts\/(\d+)/);
    if (!idMatch) throw new Error(`Missing WordPress post ID evidence for ${sitemapEntry.url}`);
    const postId = Number(idMatch[1]);
    const snapshotPath = `public-site-snapshot/${manifestPage.file}`;
    const html = readText(snapshotPath);
    const body = extractPostBody(html);
    const text = visibleText(body);
    const formulaMatches = Object.fromEntries(FORMULA_PHRASES
      .map((phrase) => [phrase, countPhrase(text, phrase)])
      .filter(([, count]) => count > 0));
    const externalLinks = bodyExternalLinks(body);
    const published = extractDate(html, "published");
    const modified = extractDate(html, "modified") ?? sitemapEntry.lastmod;
    const effective = new Date(Math.max(Date.parse(modified), Date.parse(sitemapEntry.lastmod))).toISOString();
    const topic = topicByPostId.get(postId);
    const intent = intentByPostId.get(postId);
    if (!topic || !intent) throw new Error(`Missing topic or intent assignment for post ${postId}`);
    const signals = [];
    const source = snapshotPath;
    const age = ageDays(effective);
    if (age > 365) addSignal(signals, "stale_over_365_days", `Effective captured modification date is ${age} days before the audit as-of date.`, POST_SITEMAP_PATH);
    else if (PRODUCT_VENDOR_IDS.has(postId) && age > 180) addSignal(signals, "time_sensitive_over_180_days", `Product/technical coverage is ${age} days old.`, POST_SITEMAP_PATH);
    if (!auditPage.hasVisibleAuthorSignal) addSignal(signals, "missing_visible_author_signal", "The deterministic crawl did not detect a visible accountable author signal.", AUDIT_PATH);
    if (!auditPage.hasVisibleDateSignal) addSignal(signals, "missing_visible_date_signal", "The deterministic crawl did not detect a visible publication or review date signal.", AUDIT_PATH);
    if (externalLinks.length === 0) addSignal(signals, "no_body_external_reference", "No external HTTP(S) reference was detected inside the captured post body.", source);
    if (Object.keys(formulaMatches).length) addSignal(signals, "formulaic_body_language", `Captured phrase counts: ${Object.entries(formulaMatches).map(([phrase, count]) => `${phrase}=${count}`).join(", ")}.`, source);
    const titleFormula = [...new Set(auditPage.title.toLowerCase().match(/(?:\b(?:stunning|astonishing|breakthrough|revolutionary|revolutionizing|powerful|secrets?|magic|wonders?|unleash|unlocking)\b|\btop\s+\d+|\b\d+\s+(?:essential|groundbreaking|key|main|revolutionary|breakthrough))/gi) ?? [])];
    if (titleFormula.length) addSignal(signals, "formulaic_title_language", `Title match(es): ${titleFormula.join(", ")}.`, AUDIT_PATH);
    if (auditPage.descriptionLength === 0) addSignal(signals, "missing_meta_description", "Captured meta description is absent.", AUDIT_PATH);
    else if (auditPage.descriptionLength > 160) addSignal(signals, "overlong_meta_description", `Captured description length is ${auditPage.descriptionLength} characters.`, AUDIT_PATH);
    else if (auditPage.descriptionLength < 50) addSignal(signals, "short_meta_description", `Captured description length is ${auditPage.descriptionLength} characters.`, AUDIT_PATH);
    if (auditPage.h1.length !== 1) addSignal(signals, "heading_structure", `Captured H1 count is ${auditPage.h1.length}.`, AUDIT_PATH);
    if (auditPage.h2.length === 0) addSignal(signals, "no_content_h2", "The deterministic crawl found no H2 heading.", AUDIT_PATH);
    if (auditPage.wordCount < 600) addSignal(signals, "under_600_words", `Captured content word count is ${auditPage.wordCount}.`, AUDIT_PATH);
    if ((auditPage.mojibake ?? []).length) addSignal(signals, "mojibake", `Captured encoding defects: ${auditPage.mojibake.join(", ")}.`, AUDIT_PATH);
    if ((auditPage.rawShortcodes ?? []).length) addSignal(signals, "raw_shortcode", `Rendered shortcode(s): ${auditPage.rawShortcodes.join(", ")}.`, AUDIT_PATH);
    if ((auditPage.insecureUrls ?? []).length) addSignal(signals, "insecure_url", `${auditPage.insecureUrls.length} HTTP reference(s) were captured.`, AUDIT_PATH);
    if ((auditPage.images?.emptyAlt ?? 0) > 0) addSignal(signals, "empty_alt_review", `${auditPage.images.emptyAlt} image(s) have empty alt and require contextual review.`, AUDIT_PATH);
    if ((burstCounts.get(dateOnly(sitemapEntry.lastmod)) ?? 0) >= 5) addSignal(signals, "publication_burst", `${burstCounts.get(dateOnly(sitemapEntry.lastmod))} audited posts share captured lastmod date ${dateOnly(sitemapEntry.lastmod)}.`, POST_SITEMAP_PATH);
    if (HIGH_STAKES.has(postId)) addSignal(signals, "high_stakes_domain", `Domain review required: ${HIGH_STAKES.get(postId)}.`, source);
    if (ARTIFACT_PROMISE_IDS.has(postId)) addSignal(signals, "unfulfilled_artifact_promise", "Captured headline/content requires overview-or-artifact review before publication.", source);
    if (PRODUCT_VENDOR_IDS.has(postId)) addSignal(signals, "product_or_vendor_specific", "Product, vendor or version claims require primary-source verification.", source);
    if (KNOWN_STAGING_DRAFTS.has(postId)) addSignal(signals, "known_staging_draft", "Local staging evidence records this post as draft/quarantined.", KNOWN_STAGING_DRAFTS.get(postId));
    if (intent.memberPostIds.length > 1) addSignal(signals, "probable_intent_overlap", `Machine draft intent ${intent.id} contains ${intent.memberPostIds.length} audited posts; this is not proof of query cannibalization.`, POST_SITEMAP_PATH);
    if (postId === 237) addSignal(signals, "scope_fit_review", "Editorial-publishing guidance is outside the site's otherwise AI-focused corpus and needs an explicit scope decision.", source);

    const evidencePaths = [AUDIT_PATH, MANIFEST_PATH, POST_SITEMAP_PATH, snapshotPath];
    if (KNOWN_STAGING_DRAFTS.has(postId)) evidencePaths.push(KNOWN_STAGING_DRAFTS.get(postId));
    return {
      postId,
      url: sitemapEntry.url,
      title: auditPage.title,
      date: {
        published,
        modified,
        sitemapLastmod: sitemapEntry.lastmod,
        effectiveFreshnessDate: effective,
        ageDaysAsOfAudit: age
      },
      wordCount: auditPage.wordCount,
      structure: { h1Count: auditPage.h1.length, h2Count: auditPage.h2.length },
      bodyExternalReferences: { count: externalLinks.length, urls: externalLinks },
      topicCluster: { id: topic.id, label: topic.label },
      canonicalIntentId: intent.id,
      overlapCandidates: [],
      currentRiskSignals: signals,
      machineRecommendation: {
        action: actionFor(postId),
        status: "machine_recommendation_not_human_approval",
        confidence: actionFor(postId) === "retain" || actionFor(postId) === "retire" ? "low" : "medium",
        rationaleCodes: [...new Set(signals.map((signal) => signal.code))].sort()
      },
      stagingEvidence: {
        status: KNOWN_STAGING_DRAFTS.has(postId) ? "draft_verified_from_retained_local_evidence" : "not_individually_reconciled_in_retained_final_gate",
        finalPublishedPostSitemapAggregate: stagingPostSitemap.locationCount
      },
      snapshotPath,
      evidencePaths: [...new Set(evidencePaths)]
    };
  });

  const byId = new Map(basePosts.map((post) => [post.postId, post]));
  for (const post of basePosts) {
    const intent = intentByPostId.get(post.postId);
    const candidates = [];
    for (const memberId of intent.memberPostIds) {
      if (memberId === post.postId) continue;
      const candidate = byId.get(memberId);
      candidates.push({
        postId: memberId,
        url: candidate.url,
        relationship: "same_machine_draft_canonical_intent",
        titleTokenJaccard: Number(jaccard(titleTokens(post.title), titleTokens(candidate.title)).toFixed(3))
      });
    }
    const lexical = basePosts
      .filter((candidate) => candidate.postId !== post.postId && candidate.topicCluster.id === post.topicCluster.id && !intent.memberPostIds.includes(candidate.postId))
      .map((candidate) => ({ candidate, score: jaccard(titleTokens(post.title), titleTokens(candidate.title)) }))
      .filter(({ score }) => score >= 0.25)
      .sort((left, right) => right.score - left.score || left.candidate.postId - right.candidate.postId)
      .slice(0, Math.max(0, 3 - candidates.length))
      .map(({ candidate, score }) => ({
        postId: candidate.postId,
        url: candidate.url,
        relationship: "lexical_overlap_candidate_same_topic_cluster",
        titleTokenJaccard: Number(score.toFixed(3))
      }));
    post.overlapCandidates = [...candidates, ...lexical]
      .sort((left, right) => right.titleTokenJaccard - left.titleTokenJaccard || left.postId - right.postId)
      .slice(0, 3);
  }

  const freshnessReviewQueue = basePosts.map((post) => {
    const action = post.machineRecommendation.action;
    const priority = priorityFor(post, action);
    return {
      postId: post.postId,
      url: post.url,
      priority,
      dueByMachineDraft: dueFor(priority),
      status: "awaiting_named_human_owner_and_editorial_disposition",
      machineRecommendation: action,
      basisCodes: post.machineRecommendation.rationaleCodes
    };
  }).sort((left, right) => ({ critical: 0, high: 1, medium: 2, low: 3 })[left.priority] - ({ critical: 0, high: 1, medium: 2, low: 3 })[right.priority] || left.postId - right.postId);

  const countBy = (values) => Object.fromEntries([...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map())].sort(([a], [b]) => String(a).localeCompare(String(b))));
  const riskCounts = countBy(basePosts.flatMap((post) => post.currentRiskSignals.map((signal) => signal.code)));
  const formulaBaseline = Object.fromEntries(FORMULA_PHRASES.map((phrase) => {
    const postCounts = basePosts.map((post) => {
      const signal = post.currentRiskSignals.find((item) => item.code === "formulaic_body_language");
      const match = signal?.detail.match(new RegExp(`${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([0-9]+)`, "i"));
      return Number(match?.[1] ?? 0);
    });
    return [phrase, { postsWithMatch: postCounts.filter(Boolean).length, totalOccurrences: postCounts.reduce((sum, count) => sum + count, 0) }];
  }));
  const knownDraftIds = [...KNOWN_STAGING_DRAFTS.keys()].sort((a, b) => a - b);

  const model = {
    schemaVersion: "1.0.0",
    inventoryId: "aiamigos-content-intent-freshness-2026-08-13",
    generatedAt: AS_OF,
    evidenceAsOf: "2026-08-13",
    authority: "machine_generated_review_queue_not_human_approval",
    scope: {
      auditedProductionPostCount: sitemap.length,
      finalStagingPostSitemapAggregate: stagingPostSitemap.locationCount,
      individuallyVerifiedStagingDraftPostIds: knownDraftIds,
      individuallyReconciledNonDraftStagingPostIds: [],
      reconciliationBoundary: "The retained final staging gate proves the aggregate 65 count but does not retain its 65 URLs. Seven audited IDs have exact local draft evidence. Therefore individual final staging status is not inferred for the other audited records.",
      arithmeticUnreconciledDelta: stagingPostSitemap.locationCount - (sitemap.length - knownDraftIds.length)
    },
    interpretationRules: {
      canonicalIntent: "A machine-draft job-to-be-done grouping. It is not a canonical tag, redirect instruction, proof of cannibalization, or approval to merge.",
      retain: "Preserve the distinct URL as a machine proposal, while still completing its freshness queue and human review.",
      update: "Perform a substantive source-backed review or rewrite before treating the page as current.",
      merge: "Evaluate consolidation into the recommended primary; only a human-approved content and search-data review may authorize merge and redirect.",
      retire: "Evaluate removal because maintainable site-scope value is unclear; this is not deletion authority.",
      review: "Keep fail-closed or escalate to the named specialist until the factual/artifact gate is resolved.",
      freshness: "A timestamp change alone does not satisfy review. The due date is a machine scheduling proposal, not an owner commitment."
    },
    sourceEvidence: [AUDIT_PATH, MANIFEST_PATH, POST_SITEMAP_PATH, STAGING_GATE_PATH, STAGING_CHANGELOG_PATH, STAGING_QUARANTINE_MANIFEST_PATH]
      .map((path) => ({ path, sha256: sha256(path) })),
    counts: {
      posts: basePosts.length,
      topicClusters: TOPIC_CLUSTERS.length,
      canonicalIntents: INTENT_DEFS.length,
      recommendations: countBy(basePosts.map((post) => post.machineRecommendation.action)),
      freshnessPriorities: countBy(freshnessReviewQueue.map((entry) => entry.priority)),
      capturedPublishedYear: countBy(basePosts.map((post) => dateOnly(post.date.published).slice(0, 4))),
      capturedLastmodYear: countBy(basePosts.map((post) => dateOnly(post.date.sitemapLastmod).slice(0, 4))),
      riskSignalOccurrences: riskCounts,
      formulaicBodyPhraseBaseline: formulaBaseline
    },
    stagingReconciliation: {
      auditedProductionPosts: sitemap.length,
      finalStagingPostSitemapCount: stagingPostSitemap.locationCount,
      exactKnownDraftCount: knownDraftIds.length,
      auditedPostsMinusKnownDrafts: sitemap.length - knownDraftIds.length,
      unexplainedAggregateDelta: stagingPostSitemap.locationCount - (sitemap.length - knownDraftIds.length),
      conclusion: "The final staging set cannot be claimed as a pure 65-item subset of the frozen 71-item production sitemap from retained local evidence. Obtain and save the final staging sitemap URL list before production disposition reconciliation."
    },
    topicClusters: TOPIC_CLUSTERS.map((cluster) => ({ ...cluster, status: "machine_draft" })),
    canonicalIntentMap: INTENT_DEFS,
    freshnessPolicyDraft: {
      status: "machine_draft_requires_named_owner_approval",
      priorityDueDates: { critical: "2026-08-20", high: "2026-09-12", medium: "2026-11-11", low: "2027-02-09" },
      proposedMaximumReviewCadenceDays: { highStakesOrQuarantined: 90, productVendorOrTool: 180, evergreenTechnicalFoundation: 365 },
      completionEvidence: ["named owner", "human disposition", "current primary sources where material", "domain review where applicable", "visible reviewed-on date", "material change note", "next review date"]
    },
    freshnessReviewQueue,
    posts: basePosts.sort((left, right) => left.postId - right.postId)
  };

  // Ensure the retained quarantine manifest itself agrees with the four exact CP-004 post IDs.
  const retainedManifestPostIds = quarantineManifest.targets.filter((target) => target.apiType === "posts").map((target) => target.id).sort((a, b) => a - b);
  if (JSON.stringify(retainedManifestPostIds) !== JSON.stringify([926, 1407, 1411, 1421])) {
    throw new Error(`Unexpected retained staging quarantine post IDs: ${retainedManifestPostIds.join(", ")}`);
  }
  return model;
}

function escapeTable(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function renderMarkdown(model) {
  const byId = new Map(model.posts.map((post) => [post.postId, post]));
  const lines = [
    "# AI Amigos content intent and freshness review",
    "",
    `Evidence as of **${model.evidenceAsOf}**. This review inventories all **${model.counts.posts}** posts in the frozen production post sitemap. Every disposition and due date below is a **machine recommendation, not human approval**. It does not authorize a merge, redirect, retirement, publication, timestamp change, or production edit.`,
    "",
    "## Evidence boundary",
    "",
    "The frozen production sitemap and deterministic audit provide exact audited URL, WordPress ID, captured title, dates, word count and snapshot path. The final staging gate proves an aggregate of 65 post-sitemap URLs, but its retained JSON contains the count rather than the URL list. Seven audited post IDs have exact retained draft evidence. Consequently, the other audited records are deliberately labeled `not_individually_reconciled_in_retained_final_gate`.",
    "",
    "| Reconciliation measure | Count |",
    "| --- | ---: |",
    `| Frozen audited production posts | ${model.stagingReconciliation.auditedProductionPosts} |`,
    `| Final staging post-sitemap aggregate | ${model.stagingReconciliation.finalStagingPostSitemapCount} |`,
    `| Audited IDs with exact local staging-draft evidence | ${model.stagingReconciliation.exactKnownDraftCount} |`,
    `| Audited posts minus those known drafts | ${model.stagingReconciliation.auditedPostsMinusKnownDrafts} |`,
    `| Unreconciled aggregate delta | ${model.stagingReconciliation.unexplainedAggregateDelta} |`,
    "",
    `**Required reconciliation:** ${model.stagingReconciliation.conclusion}`,
    "",
    "## Machine disposition summary",
    "",
    "| Recommendation | Count | Meaning |",
    "| --- | ---: | --- |",
    ...Object.entries(model.counts.recommendations).map(([action, count]) => `| ${action} | ${count} | ${escapeTable(model.interpretationRules[action])} |`),
    "",
    "All 71 records remain in the freshness queue. A `retain` recommendation preserves a distinct intent proposal; it does not certify the captured copy as accurate or fresh.",
    "",
    `Captured publication-year distribution is ${Object.entries(model.counts.capturedPublishedYear).map(([year, count]) => `${year}: ${count}`).join(", ")}; captured last-modified-year distribution is ${Object.entries(model.counts.capturedLastmodYear).map(([year, count]) => `${year}: ${count}`).join(", ")}. Publication date and modification date are kept separate in every JSON record.`,
    "",
    "## Canonical intent map (machine draft)",
    "",
    "This map supplies a single provisional owner per reader intent. Multi-member rows are overlap candidates only. Search Console query/page evidence and an accountable editor are required before claiming cannibalization or authorizing consolidation.",
    "",
    "| Intent ID | Reader job | Machine primary | Members | Status |",
    "| --- | --- | --- | --- | --- |",
    ...model.canonicalIntentMap.map((intent) => {
      const primary = byId.get(intent.recommendedPrimaryPostId);
      return `| ${intent.id} | ${escapeTable(intent.audienceJob)} | ${intent.recommendedPrimaryPostId}: ${escapeTable(primary.title)} | ${intent.memberPostIds.join(", ")} | human/search-data approval required |`;
    }),
    "",
    "## Exact-intent overlap candidates",
    "",
    "| Intent | Machine primary | Candidate members | Machine note |",
    "| --- | --- | --- | --- |",
    ...model.canonicalIntentMap.filter((intent) => intent.memberPostIds.length > 1).map((intent) => {
      const candidates = intent.memberPostIds.filter((id) => id !== intent.recommendedPrimaryPostId);
      return `| ${intent.id} | ${intent.recommendedPrimaryPostId} | ${candidates.join(", ")} | Candidate relationship; not proof of search cannibalization |`;
    }),
    "",
    "## Freshness review queue — 71/71",
    "",
    "The due dates below are machine scheduling proposals. Completion requires the named owner, editor/domain review, current primary sources where material, visible reviewed-on date, material change note, and next review date. Changing only a WordPress timestamp does not count.",
    "",
    "| ID | Captured title | Effective date | Age days | Cluster | Action | Priority / proposed due | Staging evidence | Leading risk signals |",
    "| ---: | --- | --- | ---: | --- | --- | --- | --- | --- |",
    ...model.freshnessReviewQueue.map((queue) => {
      const post = byId.get(queue.postId);
      return `| ${post.postId} | ${escapeTable(post.title)} | ${dateOnly(post.date.effectiveFreshnessDate)} | ${post.date.ageDaysAsOfAudit} | ${post.topicCluster.id} | **${post.machineRecommendation.action}** | ${queue.priority} / ${queue.dueByMachineDraft} | ${post.stagingEvidence.status} | ${post.currentRiskSignals.slice(0, 4).map((signal) => signal.code).join(", ")} |`;
    }),
    "",
    "## Risk baseline",
    "",
    "| Signal | Occurrences across posts |",
    "| --- | ---: |",
    ...Object.entries(model.counts.riskSignalOccurrences).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).map(([code, count]) => `| ${code} | ${count} |`),
    "",
    "Formulaic-language signals are triage markers, not proof of AI authorship or a search penalty. Exact captured body-phrase results:",
    "",
    "| Phrase | Posts with match | Total captured occurrences |",
    "| --- | ---: | ---: |",
    ...Object.entries(model.counts.formulaicBodyPhraseBaseline).map(([phrase, counts]) => `| ${phrase} | ${counts.postsWithMatch} | ${counts.totalOccurrences} |`),
    "",
    "## Required human decisions",
    "",
    "1. Save the final staging `post-sitemap.xml` URL list and reconcile it against all 71 audited IDs; explain the one-item aggregate delta.",
    "2. Assign a named owner and exactly one approved disposition to every record, using current Search Console query/page data before any overlap merge.",
    "3. Keep the seven verified draft posts fail-closed until their factual, product, benchmark or reproducible-artifact gates pass.",
    "4. For every retained or updated post, complete source, domain, authorship, reviewed-on, change-note and next-review evidence. Do not freshness-wash by changing timestamps alone.",
    "5. Treat lexical overlap and stock language as review prioritization only; a human editor must judge usefulness, originality, technical meaning and scope.",
    "",
    "## Verification",
    "",
    "Run:",
    "",
    "```powershell",
    "node remediation/tests/content-intent-freshness-inventory.mjs",
    "```",
    "",
    "The dependency-free verifier rebuilds the model from the frozen audit, sitemap, manifest, page snapshots and retained staging evidence; validates all 71 IDs/URLs/titles/dates/word counts, exact one-action disposition, complete intent/queue coverage, overlap references, source hashes and evidence paths; and checks that this Markdown is synchronized with the JSON inventory.",
    ""
  ];
  return lines.join("\n");
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function validate(model, expected, expectedMarkdown) {
  const errors = [];
  assert(model.schemaVersion === "1.0.0", "schemaVersion must be 1.0.0", errors);
  assert(model.authority === "machine_generated_review_queue_not_human_approval", "authority boundary is missing", errors);
  assert(model.posts.length === 71, `expected 71 posts, found ${model.posts.length}`, errors);
  assert(model.freshnessReviewQueue.length === 71, `expected 71 queue entries, found ${model.freshnessReviewQueue.length}`, errors);
  assert(model.scope.finalStagingPostSitemapAggregate === 65, `expected retained staging aggregate 65, found ${model.scope.finalStagingPostSitemapAggregate}`, errors);
  assert(model.scope.arithmeticUnreconciledDelta === 1, `expected explicit staging reconciliation delta 1, found ${model.scope.arithmeticUnreconciledDelta}`, errors);

  const ids = model.posts.map((post) => post.postId);
  const urls = model.posts.map((post) => post.url);
  assert(new Set(ids).size === 71, "post IDs must be unique", errors);
  assert(new Set(urls).size === 71, "post URLs must be unique", errors);
  for (const post of model.posts) {
    assert(Number.isInteger(post.postId) && post.postId > 0, `invalid post ID ${post.postId}`, errors);
    assert(/^https:\/\/www\.aiamigos\.org\/.+\/$/.test(post.url), `invalid canonical production URL for ${post.postId}: ${post.url}`, errors);
    assert(typeof post.machineRecommendation?.action === "string" && ALLOWED_ACTIONS.has(post.machineRecommendation.action), `post ${post.postId} must have exactly one allowed machine action`, errors);
    assert(!Array.isArray(post.machineRecommendation.action), `post ${post.postId} action must not be an array`, errors);
    assert(post.machineRecommendation.status === "machine_recommendation_not_human_approval", `post ${post.postId} lacks machine-only boundary`, errors);
    assert(post.topicCluster?.id && post.canonicalIntentId, `post ${post.postId} lacks topic/intent`, errors);
    assert(post.date?.published && post.date?.modified && post.date?.sitemapLastmod, `post ${post.postId} lacks exact captured dates`, errors);
    assert(Number.isInteger(post.wordCount) && post.wordCount > 0, `post ${post.postId} has invalid word count`, errors);
    assert(post.evidencePaths.includes(AUDIT_PATH) && post.evidencePaths.includes(MANIFEST_PATH) && post.evidencePaths.includes(POST_SITEMAP_PATH) && post.evidencePaths.includes(post.snapshotPath), `post ${post.postId} lacks mandatory evidence path`, errors);
    for (const path of post.evidencePaths) {
      const absolute = resolve(ROOT, path);
      assert(relative(ROOT, absolute) && !relative(ROOT, absolute).startsWith("..") && existsSync(absolute), `post ${post.postId} evidence path is missing/outside root: ${path}`, errors);
    }
    const candidateIds = post.overlapCandidates.map((candidate) => candidate.postId);
    assert(!candidateIds.includes(post.postId), `post ${post.postId} references itself as overlap`, errors);
    assert(new Set(candidateIds).size === candidateIds.length, `post ${post.postId} has duplicate overlap candidates`, errors);
    assert(candidateIds.every((id) => ids.includes(id)), `post ${post.postId} references unknown overlap candidate`, errors);
  }

  const clusterCoverage = model.topicClusters.flatMap((cluster) => cluster.memberPostIds);
  const intentCoverage = model.canonicalIntentMap.flatMap((intent) => intent.memberPostIds);
  const queueCoverage = model.freshnessReviewQueue.map((entry) => entry.postId);
  for (const [label, coverage] of [["topic cluster", clusterCoverage], ["canonical intent", intentCoverage], ["freshness queue", queueCoverage]]) {
    assert(coverage.length === 71 && new Set(coverage).size === 71, `${label} coverage must contain every post exactly once`, errors);
    assert([...coverage].sort((a, b) => a - b).join(",") === [...ids].sort((a, b) => a - b).join(","), `${label} coverage does not match post IDs`, errors);
  }
  for (const intent of model.canonicalIntentMap) {
    assert(intent.memberPostIds.includes(intent.recommendedPrimaryPostId), `intent ${intent.id} primary is not a member`, errors);
    assert(intent.status.includes("requires_editorial"), `intent ${intent.id} lacks approval boundary`, errors);
  }
  for (const entry of model.sourceEvidence) {
    assert(existsSync(join(ROOT, entry.path)), `missing source evidence ${entry.path}`, errors);
    assert(sha256(entry.path) === entry.sha256, `source hash drift for ${entry.path}`, errors);
  }

  assert(JSON.stringify(model) === JSON.stringify(expected), "inventory differs from deterministic rebuild of current local evidence", errors);
  const currentMarkdown = readText(REVIEW_PATH);
  assert(currentMarkdown === expectedMarkdown, "Markdown review differs from deterministic inventory rendering", errors);
  return errors;
}

const expected = buildModel();
const expectedMarkdown = renderMarkdown(expected);
if (process.argv.includes("--write")) {
  writeFileSync(join(ROOT, INVENTORY_PATH), `${JSON.stringify(expected, null, 2)}\n`, "utf8");
  writeFileSync(join(ROOT, REVIEW_PATH), expectedMarkdown, "utf8");
  console.log(`WROTE ${INVENTORY_PATH}`);
  console.log(`WROTE ${REVIEW_PATH}`);
}

if (!existsSync(join(ROOT, INVENTORY_PATH)) || !existsSync(join(ROOT, REVIEW_PATH))) {
  console.error("FAIL: inventory artifacts do not exist; run with --write once, then verify without it.");
  process.exit(1);
}

const model = readJson(INVENTORY_PATH);
const errors = validate(model, expected, expectedMarkdown);
if (errors.length) {
  for (const error of errors) console.error(`FAIL: ${error}`);
  process.exit(1);
}

console.log(`PASS: ${model.posts.length}/71 audited posts have exact IDs, URLs, titles, dates, word counts, topics, risk signals and one machine-only recommendation.`);
console.log(`PASS: ${model.freshnessReviewQueue.length}/71 posts occur exactly once in the freshness queue; ${model.canonicalIntentMap.length} canonical-intent drafts cover every post exactly once.`);
console.log(`PASS: staging aggregate ${model.scope.finalStagingPostSitemapAggregate}, exact known drafts ${model.scope.individuallyVerifiedStagingDraftPostIds.length}, unreconciled delta ${model.scope.arithmeticUnreconciledDelta} are explicit rather than inferred.`);
console.log("PASS: all evidence paths and source hashes resolve; JSON and Markdown are synchronized with current local evidence.");
