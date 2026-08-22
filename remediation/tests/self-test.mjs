import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { browserProbeFailure, normalBrowserUserAgent } from "./lib/browser-probe.mjs";
import { analyzeHtml } from "./lib/html.mjs";
import { responseFixture } from "./fixtures/response-fixtures.mjs";
import {
  canonicalEvidenceDisposition,
  feedQuarantineEvidence,
  pagerProbeUpperBound,
  partitionStaticPerformanceRows,
  permanentRedirectViolations,
  quarantinedRouteViolations,
  unpublishedRouteViolations,
} from "./lib/invariants.mjs";
import { CACHE_BYPASS_PARAM, LiveSource, cacheBypassUrl, logicalProbeUrl, stripCacheBypass } from "./lib/sources.mjs";
import {
  approvedFallbackViolations,
  inspectRasterImage,
  schemaSemanticViolations,
  socialImageResponseEvidence,
  socialImageResponseViolations,
} from "./lib/social-schema.mjs";
import { contactExchangeViolations, productionContentDefects } from "./lib/content-gates.mjs";

const destination = "https://example.test/redirect-destination/";
const EXPECTED_GONE_PATHS = [
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
];

test("permanent redirect requires the expected healthy 200 destination", () => {
  assert.deepEqual(permanentRedirectViolations(responseFixture({ finalUrl: destination }), destination), []);
});

test("permanent redirect rejects a final 500 even when the hop and URL are correct", () => {
  const violations = permanentRedirectViolations(responseFixture({ finalUrl: destination, finalStatus: 500 }), destination);
  assert.deepEqual(violations.map((entry) => entry.code), ["unhealthy_final"]);
});

test("permanent redirect rejects temporary hops and wrong destinations", () => {
  const violations = permanentRedirectViolations(responseFixture({ initialStatus: 302 }), destination);
  assert.deepEqual(violations.map((entry) => entry.code), ["not_permanent", "wrong_destination"]);
});

test("quarantined routes require a direct nonindexable 200", () => {
  const direct200 = responseFixture({ requestedUrl: destination, finalUrl: destination, initialStatus: 200 });
  direct200.chain = [{ url: destination, status: 200, location: null }];
  assert.deepEqual(quarantinedRouteViolations(direct200, { indexable: false }), []);
  assert.ok(quarantinedRouteViolations(responseFixture({ finalStatus: 503 })).some((entry) => entry.code === "unexpected_status"));
  const direct404 = responseFixture({ initialStatus: 404, finalStatus: 404, requestedUrl: destination, finalUrl: destination });
  direct404.chain = [{ url: destination, status: 404, location: null }];
  assert.ok(quarantinedRouteViolations(direct404, { indexable: null }).some((entry) => entry.code === "unexpected_status"));
  const direct410 = responseFixture({ initialStatus: 410, finalStatus: 410, requestedUrl: destination, finalUrl: destination });
  direct410.chain = [{ url: destination, status: 410, location: null }];
  assert.ok(quarantinedRouteViolations(direct410, { indexable: null }).some((entry) => entry.code === "unexpected_status"));
  assert.ok(quarantinedRouteViolations(direct200, { indexable: true }).some((entry) => entry.code === "missing_noindex"));
  assert.ok(quarantinedRouteViolations(responseFixture({ finalStatus: 404 })).some((entry) => entry.code === "unexpected_status"));
  assert.ok(quarantinedRouteViolations(responseFixture(), { indexable: false }).some((entry) => entry.code === "unexpected_redirect"));
});

test("unpublished routes require a direct 404 or 410", () => {
  for (const status of [404, 410]) {
    const response = responseFixture({ requestedUrl: destination, finalUrl: destination, initialStatus: status, finalStatus: status });
    response.chain = [{ url: destination, status, location: null }];
    assert.deepEqual(unpublishedRouteViolations(response), []);
  }
  assert.ok(unpublishedRouteViolations(responseFixture()).some((entry) => entry.code === "publicly_available"));
  assert.ok(unpublishedRouteViolations(responseFixture({ finalStatus: 404 })).some((entry) => entry.code === "unexpected_redirect"));
});

test("zero canonical evidence fails critical checks and skips noncritical checks", () => {
  assert.equal(canonicalEvidenceDisposition([], "critical"), "fail");
  assert.equal(canonicalEvidenceDisposition([], "high"), "skip");
  assert.equal(canonicalEvidenceDisposition([{}], "critical"), "evaluate");
});

test("non-200 analyzed HTML is excluded from healthy static performance evidence", () => {
  const healthy = { response: responseFixture(), analysis: { htmlBytes: 100 } };
  const partial500 = { response: responseFixture({ finalStatus: 500 }), analysis: { htmlBytes: 20 } };
  const partitioned = partitionStaticPerformanceRows([healthy, partial500, { response: responseFixture() }]);
  assert.deepEqual(partitioned.healthy, [healthy]);
  assert.deepEqual(partitioned.unhealthy, [partial500]);
});

test("metadata analysis counts duplicate description, Open Graph, and Twitter tags", () => {
  const html = `<!doctype html><html><head>
    <title>Metadata fixture</title>
    <meta name="description" content="first">
    <meta name="description" content="duplicate">
    <meta property="og:description" content="first">
    <meta property="og:description" content="duplicate">
    <meta name="twitter:description" content="first">
    <meta name="twitter:description" content="duplicate">
  </head><body></body></html>`;
  assert.deepEqual(analyzeHtml(html, "https://example.test/").metadataTagCounts, {
    description: 2,
    ogDescription: 2,
    twitterDescription: 2,
  });
});

test("parsed JSON-LD contributes nested HTTP URLs to the explicit-reference gate", () => {
  const html = `<!doctype html><html><head>
    <script type="application/ld+json">{
      "@context":"https://schema.org",
      "@graph":[{"@type":"Organization","logo":{"url":"http://example.test/logo.png"},"sameAs":["https://social.example/ok"]}]
    }</script>
  </head><body></body></html>`;
  const analysis = analyzeHtml(html, "https://example.test/");
  assert.deepEqual(analysis.schema.httpReferences, ["http://example.test/logo.png"]);
  assert.ok(analysis.httpReferences.includes("http://example.test/logo.png"));
});

function pngFixture(width, height) {
  const bytes = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  Buffer.from("IHDR", "ascii").copy(bytes, 12);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

function directImageResponse(bytes, contentType = "image/png") {
  const url = "https://example.test/social-card.png";
  return {
    requestedUrl: url,
    finalUrl: url,
    observed: true,
    status: 200,
    headers: { "content-type": contentType },
    bodyBytes: bytes,
    redirectCount: 0,
    chain: [{ url, status: 200, location: null }],
  };
}

test("social image evidence reads exact intrinsic dimensions and delivery metadata", () => {
  const bytes = pngFixture(1200, 630);
  assert.deepEqual(inspectRasterImage(bytes), { format: "png", width: 1200, height: 630 });
  const response = directImageResponse(bytes);
  assert.deepEqual(socialImageResponseViolations(response, { requestedUrl: response.requestedUrl }), []);
  const evidence = socialImageResponseEvidence(response);
  assert.equal(evidence.contentType, "image/png");
  assert.equal(evidence.contentLength, 24);
  assert.match(evidence.sha256, /^[A-F0-9]{64}$/);
});

test("live source binary mode retains response bytes instead of text-decoding them", async () => {
  const bytes = pngFixture(1200, 630);
  const source = new LiveSource({ timeoutMs: 1_000 });
  const response = await source.requestBytes(`data:image/png;base64,${bytes.toString("base64")}`);
  assert.equal(response.status, 200);
  assert.ok(Buffer.isBuffer(response.bodyBytes));
  assert.deepEqual(response.bodyBytes, bytes);
  assert.equal(response.body, "");
});

test("social image resource gate rejects redirects, wrong MIME, and uninspectable bytes", () => {
  const response = directImageResponse(Buffer.from("not an image"), "text/html");
  response.finalUrl = "https://example.test/redirected.png";
  response.redirectCount = 1;
  assert.deepEqual(
    socialImageResponseViolations(response, { requestedUrl: response.requestedUrl }).map((entry) => entry.code),
    ["unexpected_redirect", "unsupported_content_type", "dimensions_unproven"],
  );
});

test("fallback social card requires complete approval and exact 1200x630 hash-pinned bytes", () => {
  const bytes = pngFixture(1200, 630);
  const response = directImageResponse(bytes);
  const sha256 = socialImageResponseEvidence(response).sha256;
  const approved = {
    status: "approved",
    url: response.requestedUrl,
    width: 1200,
    height: 630,
    sha256,
    approvedBy: "Brand owner",
    approvedAt: "2026-08-13",
    evidenceId: "M1-card-review-001",
  };
  assert.deepEqual(approvedFallbackViolations(approved, response, { requestedUrl: response.requestedUrl }), []);
  assert.ok(approvedFallbackViolations({ ...approved, status: "pending" }, response, { requestedUrl: response.requestedUrl }).some((entry) => entry.code === "not_approved"));
  assert.ok(approvedFallbackViolations(approved, directImageResponse(pngFixture(240, 213)), { requestedUrl: response.requestedUrl }).some((entry) => entry.code === "asset_dimensions"));
});

test("schema semantics distinguish parsing from allowlisted claims and DOM/template evidence", () => {
  const allowedTypes = ["BlogPosting", "Organization"];
  const postHtml = `<!doctype html><html><head><script type="application/ld+json">{"@context":"https://schema.org","@type":"BlogPosting","headline":"Evidence-led AI"}</script></head><body><main><article><h1>Evidence-led AI</h1></article></main></body></html>`;
  const post = analyzeHtml(postHtml, "https://example.test/evidence-led-ai/");
  assert.deepEqual(schemaSemanticViolations(post, "https://example.test/evidence-led-ai/", { allowedTypes }), []);
  assert.ok(schemaSemanticViolations(post, "https://example.test/", { allowedTypes }).some((entry) => entry.code === "article_wrong_template"));

  const identityHtml = `<!doctype html><html><head><script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"AI Amigos","url":"https://example.test/"}</script></head><body><h1>AI Amigos</h1></body></html>`;
  const identity = analyzeHtml(identityHtml, "https://example.test/");
  assert.ok(schemaSemanticViolations(identity, "https://example.test/", { allowedTypes }).some((entry) => entry.code === "claim_not_approved"));
  const claimAllowlist = [{ type: "Organization", name: "AI Amigos", url: "https://example.test/", status: "approved", approvedBy: "Publisher", approvedAt: "2026-08-13", evidenceId: "M3-org-001" }];
  assert.deepEqual(schemaSemanticViolations(identity, "https://example.test/", { allowedTypes, claimAllowlist }), []);

  const relationshipHtml = `<!doctype html><html><head><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"BlogPosting","headline":"Evidence-led AI","author":{"@id":"https://example.test/about/#person","name":"Ada Editor"}},{"@type":"Person","@id":"https://example.test/about/#person","name":"Ada Editor","url":"https://example.test/about/"}]}</script></head><body class="single-post"><main><article><h1>Evidence-led AI</h1><p>Reviewed by Ada Editor.</p></article></main></body></html>`;
  const relationship = analyzeHtml(relationshipHtml, "https://example.test/evidence-led-ai/");
  assert.ok(schemaSemanticViolations(relationship, "https://example.test/evidence-led-ai/", { allowedTypes: [...allowedTypes, "Person"] }).some((entry) => entry.code === "relationship_not_approved"));
  const relationshipAllowlist = [{ type: "Person", name: "Ada Editor", url: "https://example.test/about/", relationship: "author", status: "approved", approvedBy: "Publisher", approvedAt: "2026-08-13", evidenceId: "M3-author-001" }];
  assert.deepEqual(schemaSemanticViolations(relationship, "https://example.test/evidence-led-ai/", { allowedTypes: [...allowedTypes, "Person"], claimAllowlist: relationshipAllowlist }), []);

  const unknownHtml = `<!doctype html><html><head><script type="application/ld+json">{"@context":"https://schema.org","@type":"MedicalOrganization","name":"Unsupported"}</script></head><body><h1>Unsupported</h1></body></html>`;
  const unknown = analyzeHtml(unknownHtml, "https://example.test/");
  assert.ok(schemaSemanticViolations(unknown, "https://example.test/", { allowedTypes }).some((entry) => entry.code === "type_not_allowlisted"));
});

test("feed evidence checks every one of the 28 configured gone paths", () => {
  const items = EXPECTED_GONE_PATHS.map((pathname) => `<item><link>https://example.test${pathname}</link></item>`).join("");
  const xml = `<?xml version="1.0"?><rss><channel>${items}</channel></rss>`;
  assert.deepEqual(feedQuarantineEvidence(xml, EXPECTED_GONE_PATHS), {
    itemCount: 28,
    forbiddenHits: EXPECTED_GONE_PATHS,
  });
});

test("legacy pager probes extend through the highest discovered page", () => {
  assert.equal(pagerProbeUpperBound(6, [1, 2, 3, 4, 5, 6, 7]), 7);
  assert.equal(pagerProbeUpperBound(7, [1, 2]), 7);
});

test("query cache bypass preserves ordinary parameters and is reversible", () => {
  const bare = "https://example.test/feed/?post_type=services";
  const busted = cacheBypassUrl(bare, "fixture-token");
  const parsed = new URL(busted);
  assert.equal(parsed.searchParams.get("post_type"), "services");
  assert.equal(parsed.searchParams.get(CACHE_BYPASS_PARAM), "fixture-token");
  assert.equal(stripCacheBypass(busted), bare);
  assert.equal(
    logicalProbeUrl("https://example.test/blog/page/2/?topic=ai&_aiamigos_cache_bust=reflected-token"),
    "https://example.test/blog/page/2/?topic=ai",
  );
});

test("mid-session browser failures normalize to deterministic skipped evidence", () => {
  const result = browserProbeFailure(new Error("CDP command timed out: Page.enable"), [{ finalUrl: "https://example.test/" }]);
  assert.equal(result.skipped, true);
  assert.equal(result.failed, true);
  assert.equal(result.reason, "Browser probe failed before completion: CDP command timed out: Page.enable");
  assert.equal(result.pages.length, 1);
});

test("browser user agent removes the headless token without changing its version", () => {
  assert.equal(
    normalBrowserUserAgent("Mozilla/5.0 HeadlessChrome/127.0.0.0 Safari/537.36"),
    "Mozilla/5.0 Chrome/127.0.0.0 Safari/537.36",
  );
});

test("default and example route policy enumerate all 28 exact gone routes", async () => {
  const example = JSON.parse(await readFile(new URL("./regression.config.example.json", import.meta.url), "utf8"));
  const harness = await readFile(new URL("./seo-regression.mjs", import.meta.url), "utf8");
  assert.deepEqual(example.routePolicies.gonePaths, EXPECTED_GONE_PATHS);
  assert.equal(new Set(example.routePolicies.gonePaths).size, 28);
  for (const pathname of EXPECTED_GONE_PATHS) {
    assert.ok(harness.includes(`"${pathname}"`));
  }
  assert.ok(harness.includes("feedQuarantineEvidence(response.body, config.routePolicies.gonePaths)"));
});

test("default and example policy probe all four newly noindexed hubs", async () => {
  const expectedNoindex = ["/privacy-policy-2/", "/page/", "/academy/", "/ai-career/"];
  const example = JSON.parse(await readFile(new URL("./regression.config.example.json", import.meta.url), "utf8"));
  const harness = await readFile(new URL("./seo-regression.mjs", import.meta.url), "utf8");
  assert.deepEqual(example.routePolicies.quarantinedPaths, expectedNoindex);
  for (const pathname of expectedNoindex) {
    assert.ok(harness.includes(`"${pathname}"`));
  }
});

test("default and example policy keep no unpublished or newsletter redirect exceptions", async () => {
  const example = JSON.parse(await readFile(new URL("./regression.config.example.json", import.meta.url), "utf8"));
  const harness = await readFile(new URL("./seo-regression.mjs", import.meta.url), "utf8");
  assert.equal(example.routePolicies.quarantinedPaths.length, 4);
  assert.deepEqual(example.routePolicies.unpublishedPaths, []);
  assert.deepEqual(example.routePolicies.permanentRedirects, {});
  assert.deepEqual(example.browser.paths, ["/", "/blog/", "/contact/", "/team/member-name-01/"]);
  assert.ok(harness.includes("unpublishedPaths: []"));
  assert.ok(harness.includes("permanentRedirects: {}"));
  assert.ok(harness.includes('paths: ["/", "/blog/", "/contact/", "/team/member-name-01/"]'));
  assert.ok(example.disallowedIndexablePathPatterns.includes("^/category/"));
  assert.ok(harness.includes('"^/category/"'));
});

test("default and example fail closed on social-card approval and schema identity claims", async () => {
  const example = JSON.parse(await readFile(new URL("./regression.config.example.json", import.meta.url), "utf8"));
  const harness = await readFile(new URL("./seo-regression.mjs", import.meta.url), "utf8");
  assert.equal(example.socialImages.fallbackApproval.status, "pending");
  assert.equal(example.socialImages.fallbackApproval.width, 1200);
  assert.equal(example.socialImages.fallbackApproval.height, 630);
  assert.equal(example.socialImages.fallbackApproval.sha256, null);
  assert.deepEqual(example.schemaGovernance.claimAllowlist, []);
  for (const type of ["Person", "Organization", "EducationalOrganization", "Review"]) {
    assert.ok(example.schemaGovernance.approvalRequiredTypes.includes(type));
  }
  assert.ok(harness.includes('status: "pending"'));
  assert.ok(harness.includes('claimAllowlist: []'));
});

test("known M8 production defects and deterministic list defects fail seeded HTML", () => {
  const html = `<!doctype html><html><body>
    <p>Template support is available 24*7.</p>
    <main>
      <p>AI is showing up everywhere!, according to this draft.</p>
      <p>High School or Collage readers can follow Linkden and choose Service Url.</p>
      <ul><li></li></ul>
      <ul><li>1. First model</li><li>3. Third model</li><li>4. Fourth model</li></ul>
    </main>
  </body></html>`;
  assert.deepEqual(
    [...new Set(productionContentDefects(html).map((defect) => defect.id))].sort(),
    [
      "availability_24_star_7",
      "broken_explicit_number_sequence",
      "empty_list_item",
      "malformed_punctuation_comma",
      "misspelled_high_school_or_collage",
      "misspelled_linkedin",
      "placeholder_service_url",
      "showing_up_everywhere_punctuation",
    ],
  );
});

test("corrected M8 copy and contiguous explicit numbering pass the production-defect gate", () => {
  const html = `<!doctype html><html><body>
    <p>Template support is available by appointment.</p>
    <main>
      <p>AI is showing up everywhere. Resources serve high school or college readers.</p>
      <p>Follow LinkedIn and choose the service page.</p>
      <ul><li>A meaningful bullet</li></ul>
      <ol><li>1. First model</li><li>2. Second model</li><li>3. Third model</li></ol>
    </main>
  </body></html>`;
  assert.deepEqual(productionContentDefects(html), []);
});

test("current honest Contact interim copy remains partial because response timing is unpublished", () => {
  const html = `<!doctype html><html><body><main>
    <p>Use this address for editorial corrections, content questions or update requests.</p>
    <p><a href="mailto:contact@example.test">Email contact@example.test</a></p>
    <p>Retention and response timing are not yet published. Review the current <a href="/privacy/">privacy notice</a>.</p>
  </main></body></html>`;
  const result = contactExchangeViolations(html);
  assert.equal(result.evidence.adjacentPrivacyContext, true);
  assert.equal(result.evidence.explicitResponseExpectation, false);
  assert.equal(result.evidence.complete, false);
  assert.deepEqual(result.violations.map((violation) => violation.code), ["response_expectation_missing"]);
});

test("a negated Contact response promise cannot satisfy the response expectation", () => {
  const html = `<!doctype html><html><body><main>
    <p>See our privacy notice. <a href="mailto:contact@example.test">Email us</a>.</p>
    <p>We cannot respond within five business days.</p>
  </main></body></html>`;
  const result = contactExchangeViolations(html);
  assert.equal(result.evidence.adjacentPrivacyContext, true);
  assert.equal(result.evidence.explicitResponseExpectation, false);
  assert.deepEqual(result.violations.map((violation) => violation.code), ["response_expectation_missing"]);
});

test("Contact exchange passes only when privacy and a time-bounded response expectation are adjacent", () => {
  const html = `<!doctype html><html><body><main>
    <p>Read how we handle your information in our <a href="/privacy/">privacy notice</a>.</p>
    <p><a href="mailto:contact@example.test">Email contact@example.test</a>. We aim to respond within three business days.</p>
  </main></body></html>`;
  const result = contactExchangeViolations(html);
  assert.equal(result.evidence.exchangeCount, 1);
  assert.equal(result.evidence.complete, true);
  assert.deepEqual(result.violations, []);
});

test("Contact privacy and response claims beside different distant actions cannot be combined", () => {
  const filler = Array.from({ length: 30 }, () => "separate").join(" ");
  const html = `<!doctype html><html><body><main>
    <p><a href="mailto:privacy@example.test">Privacy request</a> See our privacy notice.</p>
    <p>${filler}</p>
    <p><a href="mailto:editor@example.test">Editorial request</a> We respond within two business days.</p>
  </main></body></html>`;
  const result = contactExchangeViolations(html, { adjacencyWords: 8 });
  assert.equal(result.evidence.adjacentPrivacyContext, true);
  assert.equal(result.evidence.explicitResponseExpectation, true);
  assert.equal(result.evidence.complete, false);
  assert.deepEqual(result.violations.map((violation) => violation.code), ["exchange_context_split"]);
});
