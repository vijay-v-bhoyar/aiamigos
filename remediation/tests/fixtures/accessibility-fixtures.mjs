const EXPECTED_DOTS = 20;

function target(selector, index = 1) {
  return {
    selector,
    index,
    tag: "button",
    id: null,
    className: "fixture-control",
    name: `Fixture control ${index}`,
    visible: true,
    width: 44,
    height: 44,
    meetsAdoptedTarget: true,
  };
}

function disclosure(id, openerName, closerName, controls) {
  return {
    id,
    present: true,
    expectedNames: { opener: openerName, closer: closerName },
    semantics: {
      openerRole: "button",
      openerTabIndex: 0,
      openerName,
      openerControls: controls,
      closerRole: "button",
      closerTabIndex: 0,
      closerName,
      closerControls: controls,
    },
    openerTarget: target(`#${id}-opener`),
    closeTargetWhileOpen: target(`#${id}-closer`),
    keyboard: {
      key: "Enter",
      eventCanceled: true,
      clickEventsObserved: 1,
      opened: true,
      focusTransferred: true,
      activeAfterOpen: { tag: "button", id: `${id}-closer` },
    },
    escape: {
      key: "Escape",
      eventCanceled: true,
      closed: true,
      focusReturned: true,
      activeAfterClose: { tag: "button", id: `${id}-opener` },
    },
  };
}

export function passingAccessibilityEvidence() {
  const dots = Array.from({ length: EXPECTED_DOTS }, (_, zeroBased) => {
    const index = zeroBased + 1;
    return {
      index,
      name: `Show Fixture article ${index} (${index} of ${EXPECTED_DOTS})`,
      ariaCurrent: index === 1 ? "true" : null,
      activeClass: index === 1,
      ariaControls: `aiamigos-blog-slide-${index}`,
      controlsExistingElement: true,
      target: target("#our-blogs .owl-dots > button.owl-dot", index),
    };
  });
  const headings = Array.from({ length: EXPECTED_DOTS }, (_, zeroBased) => ({
    index: zeroBased + 1,
    present: true,
    tag: "h3",
    className: "aiamigos-blog-card-title",
    text: `Fixture article ${zeroBased + 1}`,
    fontSizePx: 16.28,
    lineHeightPx: 21.98,
    lineHeightRatio: 1.35,
    fontWeight: 700,
    marginBottomPx: 10.4,
    overflowWrap: "anywhere",
    compact: true,
  }));
  const clones = Array.from({ length: 4 }, (_, zeroBased) => ({
    index: zeroBased + 1,
    ariaHidden: "true",
    focusableDescendants: 1,
    sequentialFocusLeaks: 0,
    containsFocus: false,
  }));
  return {
    schemaVersion: 1,
    observed: true,
    scope: "configured-mobile-root",
    proofBoundary: {
      renderedDom: true,
      syntheticKeyboardEvents: true,
      boundingClientRects: true,
      accessibilityTreeSnapshot: false,
      humanScreenReaderProof: false,
      humanKeyboardProof: false,
      certification: false,
      limitations: ["Fixture limitation."],
    },
    viewport: { width: 390, height: 844, devicePixelRatio: 1, mobileWidth: true },
    expected: { carouselDots: EXPECTED_DOTS, minTargetPx: 44, minAutoplayObservationMs: 6_000 },
    disclosures: {
      menu: disclosure("navigation-menu", "Open navigation menu", "Close navigation menu", "sidebar1"),
      search: disclosure("site-search", "Open search", "Close search", "aiamigos-search-panel"),
    },
    targetMeasurements: [
      target("#open_nav.hamburger"),
      target(".header-search .search-icon"),
      ...dots.map((dot) => dot.target),
    ],
    carousel: {
      present: true,
      selector: "#our-blogs .owl-carousel",
      authoredSlideCount: EXPECTED_DOTS,
      dotCount: EXPECTED_DOTS,
      dots,
      currentDotIndexes: [1],
      cloneCount: clones.length,
      clones,
      headings: { count: EXPECTED_DOTS, records: headings },
      focusAndAutoplay: {
        focusTarget: { index: 1, name: dots[0].name },
        observationMs: 6_251,
        focusInsideBefore: true,
        focusInsideAfter: true,
        focusRemainedOnTarget: true,
        stoppedMarkerBefore: true,
        beforeSignature: "fixture-stable-state",
        afterSignature: "fixture-stable-state",
        stateUnchanged: true,
        focusedInClone: false,
        hiddenAncestorBefore: null,
        hiddenAncestorAfter: null,
      },
    },
  };
}

export function mutateAccessibilityEvidence(mutator) {
  const evidence = passingAccessibilityEvidence();
  mutator(evidence);
  return evidence;
}
