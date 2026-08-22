import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  accessibilityEvidenceViolations,
  accessibilityProbeExpression,
  normalizeAccessibilityOptions,
} from "./lib/accessibility-evidence.mjs";
import { mutateAccessibilityEvidence, passingAccessibilityEvidence } from "./fixtures/accessibility-fixtures.mjs";

const violationCodes = (evidence) => accessibilityEvidenceViolations(evidence).map((violation) => violation.code);

test("passing fixture satisfies the bounded rendered accessibility contract", () => {
  assert.deepEqual(accessibilityEvidenceViolations(passingAccessibilityEvidence()), []);
});

test("dot names, current state, associations, and adopted target size fail closed", () => {
  const evidence = mutateAccessibilityEvidence((fixture) => {
    fixture.carousel.dots[0].name = "";
    fixture.carousel.dots[1].ariaCurrent = "true";
    fixture.carousel.currentDotIndexes = [1, 2];
    fixture.carousel.dots[2].controlsExistingElement = false;
    fixture.carousel.dots[3].target.width = 43.99;
  });
  const codes = violationCodes(evidence);
  assert.ok(codes.includes("dot_names"));
  assert.ok(codes.includes("dot_current_state"));
  assert.ok(codes.includes("dot_contract"));
  assert.ok(codes.includes("dot_target"));
});

test("clones fail when exposed, sequentially focusable, or focused", () => {
  const evidence = mutateAccessibilityEvidence((fixture) => {
    Object.assign(fixture.carousel.clones[0], { ariaHidden: "false", sequentialFocusLeaks: 1, containsFocus: true });
  });
  assert.ok(violationCodes(evidence).includes("clone_exposed"));
});

test("focused autoplay observation fails when state moves or focus becomes hidden", () => {
  const evidence = mutateAccessibilityEvidence((fixture) => {
    Object.assign(fixture.carousel.focusAndAutoplay, {
      observationMs: 5_999,
      stateUnchanged: false,
      afterSignature: "fixture-moved-state",
      hiddenAncestorAfter: { tag: "div", className: "owl-item", id: null },
    });
  });
  const codes = violationCodes(evidence);
  assert.ok(codes.includes("carousel_autoplay"));
  assert.ok(codes.includes("focused_hidden"));
});

test("menu and search keyboard contracts require activation, focus transfer, Escape, and return", () => {
  const evidence = mutateAccessibilityEvidence((fixture) => {
    fixture.disclosures.menu.keyboard.focusTransferred = false;
    fixture.disclosures.search.escape.focusReturned = false;
  });
  const codes = violationCodes(evidence);
  assert.ok(codes.includes("menu_keyboard_open"));
  assert.ok(codes.includes("search_escape_close"));
});

test("compact styling is independently represented for every authored h3", () => {
  const evidence = mutateAccessibilityEvidence((fixture) => {
    fixture.carousel.headings.records[7].compact = false;
    fixture.carousel.headings.records[7].fontSizePx = 24;
  });
  assert.ok(violationCodes(evidence).includes("heading_style"));
});

test("proof boundary must explicitly disclaim screen-reader and accessibility-tree proof", () => {
  const evidence = mutateAccessibilityEvidence((fixture) => {
    fixture.proofBoundary.humanScreenReaderProof = true;
  });
  assert.ok(violationCodes(evidence).includes("proof_boundary"));
});

test("browser expression is syntactically valid and contains every exact control selector", () => {
  const expression = accessibilityProbeExpression({ autoplayObservationMs: 6_250 });
  assert.doesNotThrow(() => new Function(`return ${expression};`));
  for (const selector of [
    "#open_nav.hamburger",
    "amp-sidebar#sidebar1",
    ".header-search .search-icon",
    ".header-search .serach_outer .closepop > i",
    "#our-blogs .owl-carousel",
    ".owl-item.cloned",
    ".owl-dots > button.owl-dot",
    "h3.aiamigos-blog-card-title",
  ]) assert.ok(expression.includes(selector), selector);
  assert.ok(expression.includes('"autoplayObservationMs":6250'));
});

test("probe options clamp observation time to the six-second evidence floor", () => {
  assert.equal(normalizeAccessibilityOptions({ autoplayObservationMs: 1 }).autoplayObservationMs, 6_000);
  assert.equal(normalizeAccessibilityOptions({ minTargetPx: 44 }).minTargetPx, 44);
});

test("browser and report harness persist the versioned accessibility evidence", async () => {
  const browserProbe = await readFile(new URL("./lib/browser-probe.mjs", import.meta.url), "utf8");
  const harness = await readFile(new URL("./seo-regression.mjs", import.meta.url), "utf8");
  const example = JSON.parse(await readFile(new URL("./regression.config.example.json", import.meta.url), "utf8"));
  assert.ok(browserProbe.includes("accessibilityProbeExpression(accessibility)"));
  assert.ok(browserProbe.includes("awaitPromise: true"));
  assert.ok(browserProbe.includes("accessibility: accessibilityEvidence"));
  assert.ok(harness.includes('createCheck("browser.accessibility"'));
  assert.ok(harness.includes("accessibilityEvidenceViolations(accessibilityPage.accessibility"));
  assert.deepEqual(example.browser.accessibility, {
    enabled: true,
    rootPath: "/",
    expectedCarouselDots: 20,
    minTargetPx: 44,
    autoplayObservationMs: 6250,
    minAutoplayObservationMs: 6000,
    interactionSettleMs: 650,
  });
});
