export const ACCESSIBILITY_EVIDENCE_SCHEMA_VERSION = 1;

export const ACCESSIBILITY_DEFAULTS = Object.freeze({
  enabled: true,
  rootPath: "/",
  expectedCarouselDots: 20,
  minTargetPx: 44,
  autoplayObservationMs: 6_250,
  minAutoplayObservationMs: 6_000,
  interactionSettleMs: 650,
});

function boundedNumber(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export function normalizeAccessibilityOptions(options = {}) {
  return {
    expectedCarouselDots: Math.round(boundedNumber(options.expectedCarouselDots, ACCESSIBILITY_DEFAULTS.expectedCarouselDots, 1, 1_000)),
    minTargetPx: boundedNumber(options.minTargetPx, ACCESSIBILITY_DEFAULTS.minTargetPx, 1, 200),
    autoplayObservationMs: Math.round(boundedNumber(options.autoplayObservationMs, ACCESSIBILITY_DEFAULTS.autoplayObservationMs, 6_000, 30_000)),
    interactionSettleMs: Math.round(boundedNumber(options.interactionSettleMs, ACCESSIBILITY_DEFAULTS.interactionSettleMs, 500, 5_000)),
  };
}

/*
 * This function is serialized and evaluated inside the already-open browser
 * page. Keep it self-contained: imports and outer-scope bindings are not
 * available in the page runtime.
 */
async function collectAccessibilityEvidenceInPage(config) {
  const delay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const px = (value) => {
    const parsed = Number.parseFloat(String(value || ""));
    return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
  };
  const activeDescriptor = () => {
    const element = document.activeElement;
    if (!element) return null;
    return {
      tag: element.tagName ? element.tagName.toLowerCase() : null,
      id: element.id || null,
      className: normalizeText(element.className),
      ariaLabel: normalizeText(element.getAttribute && element.getAttribute("aria-label")) || null,
    };
  };
  const accessibleName = (element) => {
    if (!element) return "";
    const direct = normalizeText(element.getAttribute("aria-label") || element.getAttribute("title"));
    if (direct) return direct;
    const labelledBy = normalizeText(element.getAttribute("aria-labelledby"));
    if (labelledBy) {
      const referenced = labelledBy.split(/\s+/).map((id) => document.getElementById(id)).filter(Boolean);
      const text = normalizeText(referenced.map((item) => item.textContent).join(" "));
      if (text) return text;
    }
    return normalizeText(element.textContent);
  };
  const isVisible = (element) => {
    if (!element || element.hidden || element.hasAttribute("hidden")) return false;
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  const measure = (element, selector, index) => {
    const rect = element.getBoundingClientRect();
    const width = Math.round(rect.width * 100) / 100;
    const height = Math.round(rect.height * 100) / 100;
    const visible = isVisible(element);
    return {
      selector,
      index: index + 1,
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      className: normalizeText(element.className),
      name: accessibleName(element) || null,
      visible,
      width,
      height,
      meetsAdoptedTarget: !visible || (width >= config.minTargetPx && height >= config.minTargetPx),
    };
  };
  const measureSelector = (selector) => Array.from(document.querySelectorAll(selector)).map((element, index) => measure(element, selector, index));
  const keyboardDisclosure = async ({ id, openerSelector, panelSelector, closerSelector, expectedOpenerName, expectedCloserName, focusTarget }) => {
    const opener = document.querySelector(openerSelector);
    const panel = document.querySelector(panelSelector);
    const closer = document.querySelector(closerSelector);
    if (!opener || !panel || !closer) {
      return {
        id,
        present: false,
        missingSelectors: [
          !opener ? openerSelector : null,
          !panel ? panelSelector : null,
          !closer ? closerSelector : null,
        ].filter(Boolean),
      };
    }

    if (opener.getAttribute("aria-expanded") === "true") {
      closer.click();
      await delay(config.interactionSettleMs);
    }
    let openerClicks = 0;
    const observeClick = () => { openerClicks += 1; };
    opener.addEventListener("click", observeClick, true);
    opener.focus();
    const keyboardEventCanceled = !opener.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      bubbles: true,
      cancelable: true,
    }));
    await delay(config.interactionSettleMs);
    opener.removeEventListener("click", observeClick, true);

    const openActive = document.activeElement;
    const focusTransferred = focusTarget === "closer" ? openActive === closer : panel.contains(openActive);
    const activeAfterOpen = activeDescriptor();
    const closeTargetMeasurement = measure(closer, closerSelector, 0);
    const opened = opener.getAttribute("aria-expanded") === "true" && panel.getAttribute("aria-hidden") === "false";
    const escapeDispatchTarget = document.activeElement || closer;
    const escapeEventCanceled = !escapeDispatchTarget.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      bubbles: true,
      cancelable: true,
    }));
    await delay(config.interactionSettleMs);
    const closed = opener.getAttribute("aria-expanded") === "false" && panel.getAttribute("aria-hidden") === "true";
    const focusReturned = document.activeElement === opener;
    if (!closed) {
      closer.click();
      await delay(config.interactionSettleMs);
    }

    return {
      id,
      present: true,
      selectors: { opener: openerSelector, panel: panelSelector, closer: closerSelector },
      expectedNames: { opener: expectedOpenerName, closer: expectedCloserName },
      semantics: {
        openerRole: opener.getAttribute("role") || opener.tagName.toLowerCase(),
        openerTabIndex: opener.tabIndex,
        openerName: accessibleName(opener),
        openerControls: opener.getAttribute("aria-controls"),
        closerRole: closer.getAttribute("role") || closer.tagName.toLowerCase(),
        closerTabIndex: closer.tabIndex,
        closerName: accessibleName(closer),
        closerControls: closer.getAttribute("aria-controls"),
      },
      openerTarget: measure(opener, openerSelector, 0),
      closeTargetWhileOpen: closeTargetMeasurement,
      keyboard: {
        key: "Enter",
        eventCanceled: keyboardEventCanceled,
        clickEventsObserved: openerClicks,
        opened,
        focusTransferred,
        activeAfterOpen,
      },
      escape: {
        key: "Escape",
        eventCanceled: escapeEventCanceled,
        closed,
        focusReturned,
        activeAfterClose: activeDescriptor(),
      },
    };
  };

  const evidence = {
    schemaVersion: 1,
    observed: true,
    scope: "configured-mobile-root",
    capturedAt: new Date().toISOString(),
    proofBoundary: {
      renderedDom: true,
      syntheticKeyboardEvents: true,
      boundingClientRects: true,
      accessibilityTreeSnapshot: false,
      humanScreenReaderProof: false,
      humanKeyboardProof: false,
      certification: false,
      limitations: [
        "Synthetic DOM keyboard events exercise installed handlers but are not operating-system input.",
        "DOM attributes and focus state do not substitute for a platform accessibility-tree or screen-reader session.",
        "The 44 CSS-pixel threshold is the project's adopted target, not a certification claim.",
      ],
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      mobileWidth: window.innerWidth <= 480,
    },
    expected: {
      carouselDots: config.expectedCarouselDots,
      minTargetPx: config.minTargetPx,
      minAutoplayObservationMs: 6000,
    },
    disclosures: {},
    targetMeasurements: [],
    carousel: { present: false },
  };

  evidence.disclosures.menu = await keyboardDisclosure({
    id: "navigation-menu",
    openerSelector: "#open_nav.hamburger",
    panelSelector: "amp-sidebar#sidebar1",
    closerSelector: "#close_nav.close-sidebar",
    expectedOpenerName: "Open navigation menu",
    expectedCloserName: "Close navigation menu",
    focusTarget: "closer",
  });
  evidence.disclosures.search = await keyboardDisclosure({
    id: "site-search",
    openerSelector: ".header-search .search-icon",
    panelSelector: ".header-search .serach_outer",
    closerSelector: ".header-search .serach_outer .closepop > i",
    expectedOpenerName: "Open search",
    expectedCloserName: "Close search",
    focusTarget: "panel",
  });

  const targetSelectors = [
    "#site_top .socialbox > a",
    "#footer .custom-social-icons > a.custom_linkedin",
    "#open_nav.hamburger",
    ".header-search .search-icon",
    "#our-blogs .owl-nav > button",
    "#our-blogs .owl-dots > button.owl-dot",
  ];
  evidence.targetMeasurements = targetSelectors.flatMap(measureSelector);

  const carousel = document.querySelector("#our-blogs .owl-carousel");
  if (carousel) {
    const focusableSelector = "a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]";
    const originals = Array.from(carousel.querySelectorAll(".owl-item:not(.cloned)"))
      .filter((slide) => Boolean(slide.querySelector(".our-blogs-content")));
    const dots = Array.from(carousel.querySelectorAll(".owl-dots > button.owl-dot"));
    const focusDot = dots.find((dot) => dot.getAttribute("aria-current") === "true") || dots[0] || null;
    if (focusDot) focusDot.focus();
    await delay(100);
    const stateSignature = () => JSON.stringify({
      currentDots: dots.map((dot, index) => dot.getAttribute("aria-current") === "true" ? index + 1 : null).filter(Boolean),
      activeDots: dots.map((dot, index) => dot.classList.contains("active") ? index + 1 : null).filter(Boolean),
      activeOriginals: originals.map((slide, index) => slide.classList.contains("active") ? index + 1 : null).filter(Boolean),
    });
    const autoplayStart = performance.now();
    const beforeSignature = stateSignature();
    const focusInsideBefore = carousel.contains(document.activeElement);
    const stoppedMarkerBefore = carousel.getAttribute("data-aiamigos-autoplay-stopped") === "true";
    const hiddenAncestorBefore = document.activeElement && document.activeElement.closest("[aria-hidden='true'],[hidden]");
    await delay(config.autoplayObservationMs);
    const afterSignature = stateSignature();
    const focusInsideAfter = carousel.contains(document.activeElement);
    const hiddenAncestorAfter = document.activeElement && document.activeElement.closest("[aria-hidden='true'],[hidden]");

    const clones = Array.from(carousel.querySelectorAll(".owl-item.cloned"));
    const cloneRecords = clones.map((clone, index) => {
      const sequentialLeaks = Array.from(clone.querySelectorAll(focusableSelector)).filter((control) => control.tabIndex >= 0);
      return {
        index: index + 1,
        ariaHidden: clone.getAttribute("aria-hidden"),
        focusableDescendants: clone.querySelectorAll(focusableSelector).length,
        sequentialFocusLeaks: sequentialLeaks.length,
        containsFocus: clone.contains(document.activeElement),
      };
    });
    const headingRecords = originals.map((slide, index) => {
      const heading = slide.querySelector(".our-blogs-content h3.aiamigos-blog-card-title");
      if (!heading) return { index: index + 1, present: false, compact: false };
      const style = window.getComputedStyle(heading);
      const fontSizePx = px(style.fontSize);
      const lineHeightPx = px(style.lineHeight);
      const lineHeightRatio = fontSizePx && lineHeightPx ? Math.round((lineHeightPx / fontSizePx) * 100) / 100 : null;
      const fontWeight = Number.parseInt(style.fontWeight, 10);
      const marginBottomPx = px(style.marginBottom);
      const compact = heading.tagName === "H3"
        && fontSizePx !== null && fontSizePx <= 20
        && lineHeightRatio !== null && lineHeightRatio >= 1.3 && lineHeightRatio <= 1.5
        && Number.isFinite(fontWeight) && fontWeight >= 700
        && marginBottomPx !== null && marginBottomPx <= 12
        && style.overflowWrap === "anywhere";
      return {
        index: index + 1,
        present: true,
        tag: heading.tagName.toLowerCase(),
        className: normalizeText(heading.className),
        text: normalizeText(heading.textContent),
        fontSizePx,
        lineHeightPx,
        lineHeightRatio,
        fontWeight: Number.isFinite(fontWeight) ? fontWeight : null,
        marginBottomPx,
        overflowWrap: style.overflowWrap,
        compact,
      };
    });
    const dotRecords = dots.map((dot, index) => ({
      index: index + 1,
      name: accessibleName(dot),
      ariaCurrent: dot.getAttribute("aria-current"),
      activeClass: dot.classList.contains("active"),
      ariaControls: dot.getAttribute("aria-controls"),
      controlsExistingElement: Boolean(dot.getAttribute("aria-controls") && document.getElementById(dot.getAttribute("aria-controls"))),
      target: measure(dot, "#our-blogs .owl-dots > button.owl-dot", index),
    }));

    evidence.carousel = {
      present: true,
      selector: "#our-blogs .owl-carousel",
      authoredSlideCount: originals.length,
      dotCount: dots.length,
      dots: dotRecords,
      currentDotIndexes: dotRecords.filter((dot) => dot.ariaCurrent === "true").map((dot) => dot.index),
      cloneCount: cloneRecords.length,
      clones: cloneRecords,
      headings: {
        count: headingRecords.filter((heading) => heading.present).length,
        records: headingRecords,
      },
      focusAndAutoplay: {
        focusTarget: focusDot ? { index: dots.indexOf(focusDot) + 1, name: accessibleName(focusDot) } : null,
        observationMs: Math.round(performance.now() - autoplayStart),
        focusInsideBefore,
        focusInsideAfter,
        focusRemainedOnTarget: document.activeElement === focusDot,
        stoppedMarkerBefore,
        beforeSignature,
        afterSignature,
        stateUnchanged: beforeSignature === afterSignature,
        focusedInClone: clones.some((clone) => clone.contains(document.activeElement)),
        hiddenAncestorBefore: hiddenAncestorBefore ? {
          tag: hiddenAncestorBefore.tagName.toLowerCase(),
          id: hiddenAncestorBefore.id || null,
          className: normalizeText(hiddenAncestorBefore.className),
        } : null,
        hiddenAncestorAfter: hiddenAncestorAfter ? {
          tag: hiddenAncestorAfter.tagName.toLowerCase(),
          id: hiddenAncestorAfter.id || null,
          className: normalizeText(hiddenAncestorAfter.className),
        } : null,
      },
    };
  }

  return evidence;
}

export function accessibilityProbeExpression(options = {}) {
  const normalized = normalizeAccessibilityOptions(options);
  return `(${collectAccessibilityEvidenceInPage.toString()})(${JSON.stringify(normalized)})`;
}

function disclosureViolations(violations, disclosure, id, minTargetPx) {
  const add = (code, message, evidence = {}) => violations.push({ code: `${id}_${code}`, message, ...evidence });
  if (!disclosure?.present) {
    add("missing", `${id} disclosure controls were not fully observed.`, { missingSelectors: disclosure?.missingSelectors ?? [] });
    return;
  }
  const semantics = disclosure.semantics ?? {};
  if (semantics.openerRole !== "button" || semantics.openerTabIndex < 0) add("opener_semantics", `${id} opener lacks keyboard button semantics.`, { semantics });
  if (semantics.closerRole !== "button" || semantics.closerTabIndex < 0) add("closer_semantics", `${id} closer lacks keyboard button semantics.`, { semantics });
  if (semantics.openerName !== disclosure.expectedNames?.opener || semantics.closerName !== disclosure.expectedNames?.closer) {
    add("names", `${id} controls do not have the expected deterministic names.`, { expected: disclosure.expectedNames, actual: { opener: semantics.openerName, closer: semantics.closerName } });
  }
  if (!semantics.openerControls || semantics.openerControls !== semantics.closerControls) add("controls", `${id} opener and closer do not reference the same controlled panel.`, { semantics });
  for (const [targetName, target] of [["opener", disclosure.openerTarget], ["closer", disclosure.closeTargetWhileOpen]]) {
    if (!target?.visible || target.width < minTargetPx || target.height < minTargetPx) {
      add(`${targetName}_target`, `${id} ${targetName} did not meet the adopted visible target size.`, { target, minTargetPx });
    }
  }
  if (!disclosure.keyboard?.eventCanceled || disclosure.keyboard?.clickEventsObserved < 1 || !disclosure.keyboard?.opened || !disclosure.keyboard?.focusTransferred) {
    add("keyboard_open", `${id} did not prove Enter activation, opened state, and focus transfer.`, { keyboard: disclosure.keyboard });
  }
  if (!disclosure.escape?.eventCanceled || !disclosure.escape?.closed || !disclosure.escape?.focusReturned) {
    add("escape_close", `${id} did not prove Escape close and focus return.`, { escape: disclosure.escape });
  }
}

export function accessibilityEvidenceViolations(evidence, options = {}) {
  const config = { ...ACCESSIBILITY_DEFAULTS, ...options };
  const violations = [];
  const add = (code, message, detail = {}) => violations.push({ code, message, ...detail });
  if (!evidence?.observed) {
    add("evidence_unobserved", "Structured accessibility evidence was not observed.", { reason: evidence?.reason ?? evidence?.error ?? null });
    return violations;
  }
  if (evidence.schemaVersion !== ACCESSIBILITY_EVIDENCE_SCHEMA_VERSION) add("schema_version", "Unexpected accessibility evidence schema version.", { expected: ACCESSIBILITY_EVIDENCE_SCHEMA_VERSION, actual: evidence.schemaVersion });
  if (evidence.proofBoundary?.humanScreenReaderProof !== false || evidence.proofBoundary?.accessibilityTreeSnapshot !== false) {
    add("proof_boundary", "Evidence must explicitly avoid claiming screen-reader or platform accessibility-tree proof.", { proofBoundary: evidence.proofBoundary });
  }
  if (!evidence.viewport?.mobileWidth) add("mobile_viewport", "The exact root accessibility gate requires a mobile-width viewport.", { viewport: evidence.viewport });

  const minTargetPx = Number(config.minTargetPx ?? ACCESSIBILITY_DEFAULTS.minTargetPx);
  for (const target of evidence.targetMeasurements ?? []) {
    if (target.visible && (target.width < minTargetPx || target.height < minTargetPx)) {
      add("target_too_small", "A visible adopted control target is smaller than the project threshold.", { target, minTargetPx });
    }
  }
  disclosureViolations(violations, evidence.disclosures?.menu, "menu", minTargetPx);
  disclosureViolations(violations, evidence.disclosures?.search, "search", minTargetPx);

  const carousel = evidence.carousel;
  const expectedDots = Number(config.expectedCarouselDots ?? ACCESSIBILITY_DEFAULTS.expectedCarouselDots);
  if (!carousel?.present) {
    add("carousel_missing", "The exact root carousel was not observed.");
    return violations;
  }
  if (carousel.authoredSlideCount !== expectedDots || carousel.dotCount !== expectedDots) {
    add("carousel_count", "Authored slides and generated dots must match the exact expected count.", { expectedDots, authoredSlideCount: carousel.authoredSlideCount, dotCount: carousel.dotCount });
  }
  const dots = Array.isArray(carousel.dots) ? carousel.dots : [];
  const names = dots.map((dot) => String(dot.name ?? "").trim());
  if (names.some((name) => !name) || new Set(names).size !== names.length) add("dot_names", "Every carousel dot must have a nonempty unique accessible name.", { names });
  for (const dot of dots) {
    const expectedPosition = `(${dot.index} of ${expectedDots})`;
    if (!dot.name?.startsWith("Show ") || !dot.name.includes(expectedPosition) || !dot.ariaControls || !dot.controlsExistingElement) {
      add("dot_contract", "A carousel dot lacks its deterministic name, position, or slide association.", { dot, expectedPosition });
    }
    if (!dot.target?.visible || dot.target.width < minTargetPx || dot.target.height < minTargetPx) {
      add("dot_target", "A carousel dot did not meet the adopted visible target size.", { dot: dot.index, target: dot.target, minTargetPx });
    }
  }
  if (!Array.isArray(carousel.currentDotIndexes) || carousel.currentDotIndexes.length !== 1) {
    add("dot_current_state", "Exactly one carousel dot must expose aria-current=true.", { currentDotIndexes: carousel.currentDotIndexes });
  } else {
    const current = dots[carousel.currentDotIndexes[0] - 1];
    if (!current?.activeClass) add("dot_current_mismatch", "The aria-current dot must match Owl's active dot.", { currentDotIndexes: carousel.currentDotIndexes });
  }

  if (!Number.isFinite(carousel.cloneCount) || carousel.cloneCount < 1) add("clone_evidence_missing", "Rendered Owl clone evidence was not present.", { cloneCount: carousel.cloneCount });
  for (const clone of carousel.clones ?? []) {
    if (clone.ariaHidden !== "true" || clone.sequentialFocusLeaks !== 0 || clone.containsFocus) add("clone_exposed", "A cloned slide is exposed or retains sequential focus.", { clone });
  }

  const headings = carousel.headings?.records ?? [];
  if (carousel.headings?.count !== expectedDots || headings.length !== expectedDots) add("heading_count", "Every authored carousel slide must expose one compact h3 title.", { expectedDots, count: carousel.headings?.count, records: headings.length });
  for (const heading of headings) {
    if (!heading.present || heading.tag !== "h3" || !heading.compact) add("heading_style", "A carousel title does not match the compact h3 contract.", { heading });
  }

  const autoplay = carousel.focusAndAutoplay ?? {};
  const minimumObservation = Number(config.minAutoplayObservationMs ?? ACCESSIBILITY_DEFAULTS.minAutoplayObservationMs);
  if (!autoplay.focusTarget || !autoplay.focusInsideBefore || !autoplay.focusInsideAfter || !autoplay.focusRemainedOnTarget) {
    add("carousel_focus", "The autoplay observation did not retain focus within the carousel on the selected dot.", { autoplay });
  }
  if (!autoplay.stoppedMarkerBefore || autoplay.observationMs < minimumObservation || !autoplay.stateUnchanged) {
    add("carousel_autoplay", "Carousel state changed, lacked the stop marker, or was observed for less than six seconds while focused.", { autoplay, minimumObservation });
  }
  if (autoplay.focusedInClone || autoplay.hiddenAncestorBefore || autoplay.hiddenAncestorAfter) {
    add("focused_hidden", "Focused carousel content was inside a clone or aria-hidden/hidden subtree.", { autoplay });
  }
  return violations;
}
