import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = path.resolve(process.argv[2] ?? ".");
const snapshotRoot = path.join(workspaceRoot, "public-site-snapshot");
const outputPath = path.join(workspaceRoot, "remediation", "media-accessibility-inventory.json");
const decisionsPath = path.join(workspaceRoot, "remediation", "media-accessibility-decisions.json");
const mode = process.argv.includes("--write") ? "write" : "verify";

const manifest = JSON.parse(await readFile(path.join(snapshotRoot, "snapshot-manifest.json"), "utf8"));
const audit = JSON.parse(await readFile(path.join(workspaceRoot, "output", "seo-audit.json"), "utf8"));
const registry = JSON.parse(await readFile(path.join(workspaceRoot, "remediation", "remediation-registry.json"), "utf8"));
const contentPlan = JSON.parse(await readFile(path.join(workspaceRoot, "remediation", "content-patch-plan.json"), "utf8"));
const report = await readFile(path.join(workspaceRoot, "AIAMIGOS_HOSTILE_SEO_CONTENT_REVIEW_2026-08-13.md"), "utf8");

const voidElements = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

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
  return decode(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

function attributes(tag = "") {
  const result = {};
  const tagName = tag.match(/^<\/?\s*([^\s/>]+)/)?.[1]?.toLowerCase();
  for (const match of tag.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const key = match[1].replace(/^</, "").toLowerCase();
    if (!key || key === tagName) continue;
    result[key] = decode(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

function lineAt(html, offset) {
  return html.slice(0, offset).split("\n").length;
}

function selectorPart(node) {
  const id = node.attrs.id ? `#${node.attrs.id}` : "";
  const classes = (node.attrs.class ?? "").split(/\s+/).filter(Boolean).slice(0, 3).map((value) => `.${value}`).join("");
  return `${node.name}${id}${classes}`;
}

function contextPath(stack) {
  return stack.slice(-6).map(selectorPart).join(" > ");
}

function normalizeUrl(value) {
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    if (parsed.pathname !== "/") parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return parsed.href;
  } catch {
    return value;
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hasAccessibleName(attrs, innerHtml = "") {
  if ((attrs["aria-label"] ?? "").trim() || (attrs.title ?? "").trim()) return true;
  if ((attrs["aria-labelledby"] ?? "").trim()) return true;
  if (text(innerHtml)) return true;
  return [...innerHtml.matchAll(/<img\b[^>]*>/gi)].some((match) => (attributes(match[0]).alt ?? "").trim());
}

function findEnclosingAnchor(anchors, offset) {
  return anchors.find((anchor) => anchor.start < offset && anchor.end > offset) ?? null;
}

function machineTriage(image) {
  if (!image.src && !image.lazy_src) {
    return {
      category: "structural_empty_source",
      safely_automatable: true,
      prescribed_action: "Remove the empty image element or suppress it at the template source; do not synthesize alt text.",
      reason: "The captured element has neither src content nor a lazy-load source.",
    };
  }
  if (/\bavatar\b/i.test(image.class_name)) {
    return {
      category: "author_avatar_context_review",
      safely_automatable: false,
      prescribed_action: "Render with the adjacent author block and decide whether the portrait is redundant decoration or informative identity content.",
      reason: "A repeated avatar template cannot be classified from filename or markup alone.",
    };
  }
  if (image.link?.href && !image.link.accessible_name_present) {
    return {
      category: "functional_link_failure",
      safely_automatable: false,
      prescribed_action: "Name the destination or purpose after confirming the linked action in rendered context.",
      reason: "An image-only link with an empty alt has no captured accessible name.",
    };
  }
  if (image.role === "presentation" || image.aria_hidden === "true") {
    return {
      category: "explicit_decorative_candidate",
      safely_automatable: false,
      prescribed_action: "Confirm that the image conveys no information; retain null alt only after that review.",
      reason: "Markup signals decorative intent, but the visual/content decision remains human-owned.",
    };
  }
  return {
    category: "visual_context_review",
    safely_automatable: false,
    prescribed_action: "Inspect the rendered image and adjacent copy; choose decorative, informative, functional, or remove, then write alt only if needed.",
    reason: "Markup and filenames do not prove the image's purpose or visual meaning.",
  };
}

function parsePage(html, page) {
  const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => {
    const attrs = attributes(`<a ${match[1]}>`);
    return {
      start: match.index,
      end: match.index + match[0].length,
      attrs,
      inner: match[2],
      accessible_name_present: hasAccessibleName(attrs, match[2]),
      visible_or_sr_text: text(match[2]),
    };
  });

  const images = [];
  const roleButtons = [];
  const pseudoControls = [];
  const stack = [];
  let imageIndex = 0;
  for (const match of html.matchAll(/<!--(?:[\s\S]*?)-->|<\/?[a-z][^>]*>/gi)) {
    if (match[0].startsWith("<!--")) continue;
    const closing = /^<\//.test(match[0]);
    const name = match[0].match(/^<\/?\s*([^\s/>]+)/)?.[1]?.toLowerCase();
    if (!name) continue;
    if (closing) {
      const index = stack.map((node) => node.name).lastIndexOf(name);
      if (index >= 0) stack.splice(index);
      continue;
    }
    const attrs = attributes(match[0]);
    const node = { name, attrs };
    const currentPath = contextPath([...stack, node]);
    if (name === "img") {
      imageIndex += 1;
      const anchor = findEnclosingAnchor(anchors, match.index);
      images.push({
        page_image_index: imageIndex,
        line: lineAt(html, match.index),
        src: attrs.src ?? "",
        lazy_src: attrs["data-src"] ?? attrs["data-lazy-src"] ?? "",
        srcset: attrs.srcset ?? "",
        alt_present: Object.hasOwn(attrs, "alt"),
        alt: attrs.alt ?? null,
        title: attrs.title ?? "",
        class_name: attrs.class ?? "",
        width: attrs.width ?? "",
        height: attrs.height ?? "",
        role: attrs.role ?? "",
        aria_hidden: attrs["aria-hidden"] ?? "",
        wp_media_id: Number.parseInt((attrs.class ?? "").match(/\bwp-image-(\d+)\b/)?.[1] ?? "", 10) || null,
        context_path: currentPath,
        link: anchor ? {
          href: anchor.attrs.href ?? "",
          accessible_name_present: anchor.accessible_name_present,
          captured_text: anchor.visible_or_sr_text,
          aria_label: anchor.attrs["aria-label"] ?? "",
          title: anchor.attrs.title ?? "",
        } : null,
      });
    }
    if (attrs.role === "button") {
      const close = html.indexOf(`</${name}>`, match.index + match[0].length);
      const inner = close >= 0 ? html.slice(match.index + match[0].length, close) : "";
      roleButtons.push({
        line: lineAt(html, match.index),
        element: name,
        element_id: attrs.id ?? "",
        class_name: attrs.class ?? "",
        accessible_name_present: hasAccessibleName(attrs, inner),
        aria_label: attrs["aria-label"] ?? "",
        context_path: currentPath,
      });
    }
    const classes = (attrs.class ?? "").split(/\s+/);
    for (const pattern of ["search-icon", "closepop"]) {
      if (!classes.includes(pattern)) continue;
      pseudoControls.push({
        line: lineAt(html, match.index),
        element: name,
        class_name: pattern,
        semantic_role_present: Boolean(attrs.role),
        keyboard_focusable: attrs.tabindex === "0" || ["button", "a", "input", "select", "textarea"].includes(name),
        accessible_name_present: Boolean((attrs["aria-label"] ?? "").trim() || (attrs.title ?? "").trim()),
        context_path: currentPath,
      });
    }
    if (!voidElements.has(name) && !/\/>$/.test(match[0])) stack.push(node);
  }

  const emptyAnchors = anchors.filter((anchor) => !anchor.accessible_name_present).map((anchor) => {
    let pattern = "other_unnamed_anchor";
    const childImageCount = (anchor.inner.match(/<img\b/gi) ?? []).length;
    if ((anchor.attrs.class ?? "").split(/\s+/).includes("custom_linkedin")) pattern = "footer_linkedin_icon_link";
    else if (normalizeUrl(anchor.attrs.href ?? "") === "https://www.aiamigos.org/") pattern = "empty_home_breadcrumb_link";
    else if (childImageCount > 0) pattern = "image_only_unnamed_link";
    else if (!text(anchor.inner)) pattern = "empty_content_anchor";
    return {
      line: lineAt(html, anchor.start),
      href: anchor.attrs.href ?? "",
      element_id: anchor.attrs.id ?? "",
      class_name: anchor.attrs.class ?? "",
      pattern,
      child_image_count: childImageCount,
    };
  });

  return { images, emptyAnchors, roleButtons, pseudoControls };
}

function extractAnchors(fragment) {
  return [...fragment.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => {
    const attrs = attributes(`<a ${match[1]}>`);
    return {
      href: attrs.href ?? "",
      class_name: attrs.class ?? "",
      name: text(match[2]),
      aria_label: attrs["aria-label"] ?? "",
    };
  });
}

function extractRouteControls(html) {
  const headerSocialFragment = html.match(/<div\b[^>]*class=["'][^"']*\bsocialbox\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
  const sidebarFragment = html.match(/<amp-sidebar\b[\s\S]*?<\/amp-sidebar>/i)?.[0] ?? "";
  return {
    header_social_controls: extractAnchors(headerSocialFragment),
    mobile_menu_controls: extractAnchors(sidebarFragment),
  };
}

function extractCarousel(html) {
  const section = html.match(/<section\b[^>]*id=["']our-blogs["'][\s\S]*?<\/section>/i)?.[0] ?? "";
  const chunks = section.split(/<div\b[^>]*class=["'][^"']*\bour-blogs-content\b[^"']*["'][^>]*>/i).slice(1);
  const items = chunks.map((chunk, index) => {
    const imageTag = chunk.match(/<img\b[^>]*>/i)?.[0] ?? "";
    const imageAttrs = attributes(imageTag);
    const headingHtml = chunk.match(/<h5\b[^>]*>([\s\S]*?)<\/h5>/i)?.[1] ?? "";
    const heading = text(headingHtml.replace(/<span\b[^>]*class=["'][^"']*\bscreen-reader-text\b[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, ""));
    const allLinks = extractAnchors(chunk);
    const blogLink = allLinks.find((link) => /\bblog-link\b/.test(link.class_name)) ?? null;
    return {
      item_index: index + 1,
      title: heading,
      destination: blogLink?.href ?? "",
      image_src: imageAttrs.src ?? "",
      image_alt: imageAttrs.alt ?? null,
      generated_picker_observation: "Rendered audit reported the corresponding carousel control had no accessible name.",
      required_control_result: `A unique programmatic name identifying slide ${index + 1} or its article; current-state exposure must also be programmatic.`,
    };
  });
  return {
    source_selector: "#our-blogs .owl-carousel",
    authored_carousel_count: (section.match(/class=["'][^"']*\bowl-carousel\b/gi) ?? []).length,
    authored_item_count: items.length,
    rendered_unnamed_picker_count_from_report: 20,
    items,
    cloned_slide_boundary: {
      status: "requires_rendered_validation",
      selector_to_test: "#our-blogs .owl-item.cloned",
      assertion: "No cloned or inactive slide content is exposed in the accessibility tree or sequential keyboard order.",
      exact_clone_count: null,
      reason: "Client-side clone count is not present in the static snapshot and was not enumerated in the hostile report.",
    },
  };
}

const pages = [];
const emptyAltQueue = [];
const emptyAnchorQueue = [];
const unnamedRoleButtonQueue = [];
const pseudoControlQueue = [];
let totalImages = 0;
let missingAlt = 0;
for (const page of manifest.pages) {
  const html = await readFile(path.join(snapshotRoot, page.file), "utf8");
  const parsed = parsePage(html, page);
  totalImages += parsed.images.length;
  missingAlt += parsed.images.filter((image) => !image.alt_present).length;
  const pageRecord = {
    url: page.finalUrl || page.requestedUrl,
    snapshot_file: path.posix.join("public-site-snapshot", page.file.replaceAll("\\", "/")),
    image_count: parsed.images.length,
    empty_alt_count: parsed.images.filter((image) => image.alt_present && !image.alt.trim()).length,
    unnamed_anchor_count: parsed.emptyAnchors.length,
  };
  pages.push(pageRecord);
  for (const image of parsed.images.filter((entry) => entry.alt_present && !entry.alt.trim())) {
    const record = {
      id: `ALT-${String(emptyAltQueue.length + 1).padStart(3, "0")}`,
      url: pageRecord.url,
      snapshot_file: pageRecord.snapshot_file,
      ...image,
    };
    record.machine_triage = machineTriage(record);
    record.review_status = "unreviewed";
    emptyAltQueue.push(record);
  }
  for (const anchor of parsed.emptyAnchors) {
    emptyAnchorQueue.push({
      id: `CTRL-LINK-${String(emptyAnchorQueue.length + 1).padStart(3, "0")}`,
      url: pageRecord.url,
      snapshot_file: pageRecord.snapshot_file,
      ...anchor,
      safely_automatable: ["footer_linkedin_icon_link", "empty_home_breadcrumb_link", "empty_content_anchor"].includes(anchor.pattern),
    });
  }
  for (const control of parsed.roleButtons.filter((entry) => !entry.accessible_name_present)) {
    unnamedRoleButtonQueue.push({
      id: `CTRL-ROLE-${String(unnamedRoleButtonQueue.length + 1).padStart(3, "0")}`,
      url: pageRecord.url,
      snapshot_file: pageRecord.snapshot_file,
      ...control,
      safely_automatable: control.element_id === "open_nav",
      prescribed_action: control.element_id === "open_nav"
        ? "Add an Open navigation menu name plus aria-controls and correctly managed aria-expanded state."
        : "Confirm purpose in rendered context before naming.",
    });
  }
  for (const control of parsed.pseudoControls) {
    pseudoControlQueue.push({
      id: `CTRL-PSEUDO-${String(pseudoControlQueue.length + 1).padStart(3, "0")}`,
      url: pageRecord.url,
      snapshot_file: pageRecord.snapshot_file,
      ...control,
      safely_automatable: ["search-icon", "closepop"].includes(control.class_name),
      prescribed_action: control.class_name === "search-icon"
        ? "Use a native button named Open search."
        : "Use a native button named Close search.",
    });
  }
}

const sourceGroups = new Map();
for (const record of emptyAltQueue) {
  const key = record.src || record.lazy_src;
  if (!sourceGroups.has(key)) sourceGroups.set(key, []);
  sourceGroups.get(key).push(record);
}
const uniqueEmptyAltSources = [...sourceGroups.entries()].map(([src, records]) => ({
  src,
  occurrence_count: records.length,
  affected_urls: [...new Set(records.map((record) => record.url))].sort(),
  queue_ids: records.map((record) => record.id),
  triage_categories: [...new Set(records.map((record) => record.machine_triage.category))].sort(),
})).sort((a, b) => b.occurrence_count - a.occurrence_count || a.src.localeCompare(b.src));

const assertedRouteUrls = ["https://www.aiamigos.org/", "https://www.aiamigos.org/home/"];
const assertedRoutes = [];
let homeCarousel = null;
for (const url of assertedRouteUrls) {
  const page = manifest.pages.find((entry) => normalizeUrl(entry.finalUrl || entry.requestedUrl) === normalizeUrl(url));
  if (!page) continue;
  const html = await readFile(path.join(snapshotRoot, page.file), "utf8");
  assertedRoutes.push({
    url,
    snapshot_file: path.posix.join("public-site-snapshot", page.file.replaceAll("\\", "/")),
    viewport_evidence_from_report: {
      viewport_css_pixels: "390x844",
      horizontal_overflow_observed: false,
      header_social_target_height_approx_css_px: 17,
      mobile_menu_row_height_approx_css_px: 39,
    },
    ...extractRouteControls(html),
  });
  if (normalizeUrl(url) === "https://www.aiamigos.org/home") homeCarousel = extractCarousel(html);
}

const auditEmptyAltUrls = audit.summary.emptyImageAlt.map((entry) => entry.url).sort();
const registryM2 = registry.items.find((item) => item.id === "M2");
const registryM5 = registry.items.find((item) => item.id === "M5");
const registryM2Queue = registry.items.filter((item) => item.parent_id === "M2");
const registryM5Queue = registry.items.filter((item) => item.parent_id === "M5");
const contentPlanM2M5Patches = contentPlan.patches.filter((patch) => (patch.findings ?? []).some((finding) => ["M2", "M5"].includes(finding))).map((patch) => patch.id);
const inventoryEmptyAltUrls = [...new Set(emptyAltQueue.map((record) => record.url))].sort();
const inventoryPageUrls = pages.map((page) => page.url).sort();

const assertions = [
  ["manifest has 114 captured pages", manifest.pages.length === 114, manifest.pages.length],
  ["snapshot has 974 image elements", totalImages === 974, totalImages],
  ["no image omits the alt attribute", missingAlt === 0, missingAlt],
  ["empty-alt queue has 184 instances", emptyAltQueue.length === 184, emptyAltQueue.length],
  ["empty-alt queue affects 77 pages", inventoryEmptyAltUrls.length === 77, inventoryEmptyAltUrls.length],
  ["empty-alt queue has four image-only link failures", emptyAltQueue.filter((item) => item.machine_triage.category === "functional_link_failure").length === 4, emptyAltQueue.filter((item) => item.machine_triage.category === "functional_link_failure").length],
  ["empty-alt queue has two source-less carousel images", emptyAltQueue.filter((item) => item.machine_triage.category === "structural_empty_source").length === 2, emptyAltQueue.filter((item) => item.machine_triage.category === "structural_empty_source").length],
  ["empty-alt queue has 71 repeated author avatars", emptyAltQueue.filter((item) => item.machine_triage.category === "author_avatar_context_review").length === 71, emptyAltQueue.filter((item) => item.machine_triage.category === "author_avatar_context_review").length],
  ["empty-alt URL set matches seo-audit.json", JSON.stringify(inventoryEmptyAltUrls) === JSON.stringify(auditEmptyAltUrls), auditEmptyAltUrls.length],
  ["empty-alt URL set matches M2 registry", JSON.stringify(inventoryEmptyAltUrls) === JSON.stringify([...registryM2.affected.urls].sort()), registryM2.affected.urls.length],
  ["M2 deterministic queue has 77 records", registryM2Queue.length === 77, registryM2Queue.length],
  ["static unnamed-anchor queue has 259 instances", emptyAnchorQueue.length === 259, emptyAnchorQueue.length],
  ["every captured page has at least one unnamed anchor", pages.every((page) => page.unnamed_anchor_count >= 1), pages.filter((page) => page.unnamed_anchor_count < 1).length],
  ["unnamed anchors include 113 empty home breadcrumbs", emptyAnchorQueue.filter((item) => item.pattern === "empty_home_breadcrumb_link").length === 113, emptyAnchorQueue.filter((item) => item.pattern === "empty_home_breadcrumb_link").length],
  ["unnamed anchors include 114 footer LinkedIn links", emptyAnchorQueue.filter((item) => item.pattern === "footer_linkedin_icon_link").length === 114, emptyAnchorQueue.filter((item) => item.pattern === "footer_linkedin_icon_link").length],
  ["unnamed anchors include 28 zero-content editor links", emptyAnchorQueue.filter((item) => item.pattern === "empty_content_anchor").length === 28, emptyAnchorQueue.filter((item) => item.pattern === "empty_content_anchor").length],
  ["unnamed anchors include four image-only links", emptyAnchorQueue.filter((item) => item.pattern === "image_only_unnamed_link").length === 4, emptyAnchorQueue.filter((item) => item.pattern === "image_only_unnamed_link").length],
  ["M5 deterministic queue covers 114 pages", registryM5Queue.length === 114, registryM5Queue.length],
  ["M5 queue URL set matches all captured pages", JSON.stringify(registryM5Queue.flatMap((item) => item.affected.urls).sort()) === JSON.stringify(inventoryPageUrls), inventoryPageUrls.length],
  ["shared unnamed menu opener occurs on 114 pages", unnamedRoleButtonQueue.filter((item) => item.element_id === "open_nav").length === 114, unnamedRoleButtonQueue.length],
  ["search opener pseudo-control occurs on 114 pages", pseudoControlQueue.filter((item) => item.class_name === "search-icon").length === 114, pseudoControlQueue.filter((item) => item.class_name === "search-icon").length],
  ["search closer pseudo-control occurs on 114 pages", pseudoControlQueue.filter((item) => item.class_name === "closepop").length === 114, pseudoControlQueue.filter((item) => item.class_name === "closepop").length],
  ["M5 registry names root and /home", JSON.stringify([...registryM5.affected.urls].sort()) === JSON.stringify(assertedRouteUrls.sort()), registryM5.affected.urls.length],
  ["M5 routes each expose five header social controls and 18 mobile menu links", assertedRoutes.every((route) => route.header_social_controls.length === 5 && route.mobile_menu_controls.length === 18), assertedRoutes.map((route) => ({ url: route.url, social: route.header_social_controls.length, menu: route.mobile_menu_controls.length }))],
  ["/home carousel has one authored carousel and 20 authored items", homeCarousel?.authored_carousel_count === 1 && homeCarousel?.authored_item_count === 20, homeCarousel?.authored_item_count ?? null],
  ["hostile report contains the 184/77 M2 evidence", /184 had empty alt across 77 pages/.test(report), null],
  ["hostile report contains the 20-control M5 evidence", /20 carousel controls on `\/home\/` lacked accessible names/.test(report), null],
];

const validation = assertions.map(([assertion, passed, observed]) => ({ assertion, passed, observed }));
const failures = validation.filter((entry) => !entry.passed);

const triageCounts = Object.fromEntries(
  [...new Set(emptyAltQueue.map((record) => record.machine_triage.category))].sort().map((category) => [
    category,
    emptyAltQueue.filter((record) => record.machine_triage.category === category).length,
  ]),
);

const inventory = {
  schema_version: "1.0.0",
  inventory_id: "aiamigos-media-accessibility-2026-08-13",
  generated_from_snapshot_at: manifest.generatedAt,
  snapshot_provenance: manifest.provenance,
  evidence_boundary: [
    "This is a deterministic inventory of captured deployed HTML, not the authoritative WordPress database or theme source.",
    "An empty alt is not automatically a defect; rendered purpose determines whether an image is decorative, informative, functional, or removable.",
    "No alt text is proposed from a filename, generated-image prompt, slug, or nearby title alone.",
    "Bounding boxes, keyboard behavior, computed names, carousel clones, and the accessibility tree require a rendered browser pass after implementation.",
  ],
  standards_basis: [
    { id: "WCAG-2.2-1.1.1", url: "https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html" },
    { id: "WCAG-2.2-H67", url: "https://www.w3.org/WAI/WCAG22/Techniques/html/H67.html" },
    { id: "WCAG-2.2-2.5.8", url: "https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum" },
    { id: "WAI-ARIA-CAROUSEL", url: "https://www.w3.org/WAI/ARIA/apg/patterns/carousel/" },
  ],
  sources: [
    "AIAMIGOS_HOSTILE_SEO_CONTENT_REVIEW_2026-08-13.md",
    "output/seo-audit.json",
    "public-site-snapshot/snapshot-manifest.json",
    "remediation/remediation-registry.json",
    "remediation/content-patch-plan.json",
  ],
  summary: {
    captured_pages: manifest.pages.length,
    captured_images: totalImages,
    images_missing_alt_attribute: missingAlt,
    empty_alt_instances: emptyAltQueue.length,
    empty_alt_affected_pages: inventoryEmptyAltUrls.length,
    unique_empty_alt_sources: uniqueEmptyAltSources.length,
    linked_empty_alt_instances: emptyAltQueue.filter((record) => record.link).length,
    safely_automatable_empty_source_instances: emptyAltQueue.filter((record) => record.machine_triage.safely_automatable).length,
    machine_triage_counts: triageCounts,
    static_unnamed_anchor_instances: emptyAnchorQueue.length,
    static_unnamed_anchor_affected_pages: new Set(emptyAnchorQueue.map((record) => record.url)).size,
    unnamed_role_button_instances: unnamedRoleButtonQueue.length,
    pointer_only_search_pseudo_control_instances: pseudoControlQueue.length,
    m5_asserted_routes: assertedRoutes.length,
    home_carousel_authored_items: homeCarousel?.authored_item_count ?? null,
    home_carousel_rendered_unnamed_pickers_from_report: homeCarousel?.rendered_unnamed_picker_count_from_report ?? null,
    content_plan_patch_ids_covering_m2_or_m5: contentPlanM2M5Patches,
  },
  review_taxonomy: {
    allowed_dispositions: ["decorative", "informative", "functional", "remove"],
    required_decision_fields: ["disposition", "reviewer", "reviewed_at", "rendered_context_evidence"],
    informative_or_functional_additional_fields: ["approved_accessible_text"],
    decorative_rule: "Retain alt=\"\" only when the rendered image adds no information or function; do not add filename-like filler.",
    removal_rule: "Remove empty-source, broken, redundant, or purposeless elements at their source template/content record.",
  },
  pages,
  empty_alt_review_queue: emptyAltQueue,
  unique_empty_alt_sources: uniqueEmptyAltSources,
  static_control_inventory: {
    unnamed_anchors: emptyAnchorQueue,
    unnamed_role_buttons: unnamedRoleButtonQueue,
    pointer_only_search_controls: pseudoControlQueue,
    template_action_queue: [
      { pattern: "empty_home_breadcrumb_link", occurrences: emptyAnchorQueue.filter((item) => item.pattern === "empty_home_breadcrumb_link").length, action: "Give the breadcrumb home link visible or programmatic text." },
      { pattern: "footer_linkedin_icon_link", occurrences: emptyAnchorQueue.filter((item) => item.pattern === "footer_linkedin_icon_link").length, action: "Give the icon link a destination-oriented accessible name." },
      { pattern: "empty_content_anchor", occurrences: emptyAnchorQueue.filter((item) => item.pattern === "empty_content_anchor").length, action: "Remove the zero-content anchor from the content record after confirming that it has no rendered CSS background or scripted behavior." },
      { pattern: "image_only_unnamed_link", occurrences: emptyAnchorQueue.filter((item) => item.pattern === "image_only_unnamed_link").length, action: "Review the image and destination together; give the link a nonredundant purpose-oriented name or remove the link." },
      { pattern: "open_nav", occurrences: unnamedRoleButtonQueue.filter((item) => item.element_id === "open_nav").length, action: "Name the control and expose controls/expanded state; preserve keyboard activation." },
      { pattern: "search-icon", occurrences: pseudoControlQueue.filter((item) => item.class_name === "search-icon").length, action: "Replace the span with a native named button." },
      { pattern: "closepop", occurrences: pseudoControlQueue.filter((item) => item.class_name === "closepop").length, action: "Replace the div with a native named button." },
    ],
  },
  m5_rendered_route_inventory: {
    asserted_routes: assertedRoutes,
    home_carousel: homeCarousel,
    deterministic_release_checks: [
      "At 390x844 and each approved breakpoint, record width, height, and center-to-center spacing for every visible pointer target; test WCAG 2.2 SC 2.5.8 at 24 CSS pixels including its spacing exceptions.",
      "Use an adopted 44x44 CSS pixel design target where feasible; do not describe 44 pixels as the WCAG 2.2 AA minimum.",
      "Tab through header, menu, search, carousel, and footer controls; every action must be reachable, visibly focused, uniquely named, and operable without pointer input.",
      "Inspect the accessibility tree: inactive/cloned slides must be absent, the current slide/state must be exposed, and duplicate article content must not be announced.",
      "Record DOM element count and carousel clone count after client-side settlement; no static-snapshot inference can satisfy this check.",
    ],
  },
  decision_overlay: {
    path: "remediation/media-accessibility-decisions.json",
    rule: "Keep human decisions separate from this reproducible evidence inventory; one decision is required for each ALT queue ID before M2 can close.",
  },
  validation: {
    command: "node remediation/tests/media-accessibility-inventory.mjs . --verify",
    passed: failures.length === 0,
    assertions: validation,
    inventory_sha256_excluding_this_field: null,
  },
};
inventory.validation.inventory_sha256_excluding_this_field = sha256(JSON.stringify({ ...inventory, validation: { ...inventory.validation, inventory_sha256_excluding_this_field: null } }));
const serialized = `${JSON.stringify(inventory, null, 2)}\n`;

if (failures.length) {
  console.error(JSON.stringify({ status: "failed", failures }, null, 2));
  process.exitCode = 1;
} else if (mode === "write") {
  await writeFile(outputPath, serialized, "utf8");
  try {
    await readFile(decisionsPath, "utf8");
  } catch {
    await writeFile(decisionsPath, `${JSON.stringify({
      schema_version: "1.0.0",
      inventory_id: inventory.inventory_id,
      allowed_dispositions: inventory.review_taxonomy.allowed_dispositions,
      decisions: {},
    }, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify({ status: "written", outputPath, decisionsPath, summary: inventory.summary }, null, 2));
} else {
  const current = await readFile(outputPath, "utf8");
  const decisions = JSON.parse(await readFile(decisionsPath, "utf8"));
  const badDecisionIds = Object.keys(decisions.decisions ?? {}).filter((id) => !emptyAltQueue.some((record) => record.id === id));
  const badDispositions = Object.entries(decisions.decisions ?? {}).filter(([, decision]) => !inventory.review_taxonomy.allowed_dispositions.includes(decision.disposition));
  const incompleteDecisions = Object.entries(decisions.decisions ?? {}).filter(([, decision]) => {
    if (!["disposition", "reviewer", "reviewed_at", "rendered_context_evidence"].every((key) => String(decision[key] ?? "").trim())) return true;
    return ["informative", "functional"].includes(decision.disposition) && !String(decision.approved_accessible_text ?? "").trim();
  });
  const deterministicDecisionIds = Object.entries(decisions.decisions ?? {})
    .filter(([, decision]) => String(decision.reviewer ?? "") === "Codex deterministic structural rule")
    .map(([id]) => id)
    .sort();
  const allowedDeterministicIds = emptyAltQueue
    .filter((record) => record.machine_triage.category === "structural_empty_source" && record.machine_triage.safely_automatable)
    .map((record) => record.id)
    .sort();
  const invalidDeterministicDecisions = deterministicDecisionIds.filter((id) => {
    const record = emptyAltQueue.find((item) => item.id === id);
    const decision = decisions.decisions[id];
    return !record || !record.machine_triage.safely_automatable || record.machine_triage.category !== "structural_empty_source" || decision.disposition !== "remove" || !String(decision.decision_basis ?? "").trim() || !String(decision.implementation ?? "").trim();
  });
  const missingDeterministicDecisions = allowedDeterministicIds.filter((id) => !deterministicDecisionIds.includes(id));
  if (decisions.inventory_id !== inventory.inventory_id || current !== serialized || badDecisionIds.length || badDispositions.length || incompleteDecisions.length || invalidDeterministicDecisions.length || missingDeterministicDecisions.length) {
    console.error(JSON.stringify({
      status: "failed",
      decision_inventory_id_matches: decisions.inventory_id === inventory.inventory_id,
      inventory_matches_snapshot: current === serialized,
      bad_decision_ids: badDecisionIds,
      bad_dispositions: badDispositions.map(([id, decision]) => ({ id, disposition: decision.disposition })),
      incomplete_decisions: incompleteDecisions.map(([id]) => id),
      invalid_deterministic_decisions: invalidDeterministicDecisions,
      missing_deterministic_decisions: missingDeterministicDecisions,
    }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ status: "passed", summary: inventory.summary, decision_count: Object.keys(decisions.decisions ?? {}).length }, null, 2));
  }
}
