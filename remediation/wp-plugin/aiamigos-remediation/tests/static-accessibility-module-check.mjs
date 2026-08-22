import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testRoot = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(testRoot, "..");
const remediationRoot = path.resolve(pluginRoot, "..", "..");

const files = {
  php: path.join(pluginRoot, "includes", "class-aiamigos-accessibility-remediation.php"),
  js: path.join(pluginRoot, "assets", "js", "aiamigos-accessibility-remediation.js"),
  css: path.join(pluginRoot, "assets", "css", "aiamigos-accessibility-remediation.css"),
  docs: path.join(pluginRoot, "docs", "ACCESSIBILITY-MODULE.md"),
  domFixture: path.join(pluginRoot, "tests", "dom-accessibility-module-fixture.mjs"),
  bootstrap: path.join(pluginRoot, "aiamigos-remediation.php"),
  mainClass: path.join(pluginRoot, "includes", "class-aiamigos-remediation-plugin.php"),
  inventory: path.join(remediationRoot, "media-accessibility-inventory.json"),
};

const [php, js, css, docs, domFixture, bootstrap, mainClass, inventoryText] = await Promise.all(
  Object.values(files).map((file) => readFile(file, "utf8")),
);
const inventory = JSON.parse(inventoryText);

const results = [];
function check(name, condition, evidence = null) {
  results.push({ name, passed: Boolean(condition), evidence });
}

check("PHP has a direct-execution guard", /defined\(\s*'ABSPATH'\s*\)/.test(php) && /\bexit\s*;/.test(php));
check("PHP declares the isolated final class", /final class AIAmigos_Accessibility_Remediation\b/.test(php));
check("boot is idempotent", /private static \$booted = false/.test(php) && /if \( self::\$booted \)/.test(php));
check("module registers only the asset hook", /add_action\(\s*'wp_enqueue_scripts',\s*array\( __CLASS__, 'enqueue_assets' \),\s*1000\s*\)/.test(php));
check("paired CSS and JS assets fail closed", /is_readable\( \$style_path \).*is_readable\( \$script_path \)/s.test(php));
check("assets use one isolated handle", (php.match(/aiamigos-accessibility-remediation/g) ?? []).length >= 2);
check("script is requested with defer strategy", /wp_script_add_data\( \$handle, 'strategy', 'defer' \)/.test(php));
check("admin and machine planes are excluded", ["is_admin", "wp_doing_ajax", "wp_doing_cron", "WP_CLI", "REST_REQUEST", "XMLRPC_REQUEST", "is_feed", "is_embed"].every((token) => php.includes(token)));
check("module has no output buffering", !/\bob_(?:start|get_clean|get_contents|end_clean|end_flush)\b/.test(php));
check("module has no content or template rewrite hook", !/['"](?:the_content|widget_text|template_redirect|template_include)['"]/.test(php));
check("module has no database or option mutation", !/\b(?:update_option|add_option|delete_option|wp_insert_post|wp_update_post|wpdb)\b/.test(php));

check("JavaScript labels only exact social and breadcrumb selectors", js.includes("#site_top .socialbox > a[href], #footer .custom-social-icons > a.custom_linkedin[href]") && js.includes(".bradcrumbs > a[href]"));
check("JavaScript wires exact navigation controls", js.includes("#open_nav.hamburger") && js.includes("#close_nav.close-sidebar") && js.includes('"aria-expanded"'));
check("JavaScript wires exact search controls", js.includes(".header-search .search-icon") && js.includes(".header-search .serach_outer .closepop > i"));
check("button-like controls receive keyboard activation", js.includes('event.key !== "Enter"') && js.includes('event.key !== " "') && js.includes("element.click()"));
check("truthful custom-button semantics are explicit", js.includes("function makeEquivalentCustomButton") && !js.includes("makeNativeButton"));
check("existing accessible names are preserved", /if \(!element \|\| hasAccessibleName\(element, ignoreHiddenFiller\)/.test(js));
check("expanded pointer areas forward only parent-origin clicks", js.includes('event.target !== parent') && js.includes('data-aiamigos-child-forwarding') && js.includes("stopImmediatePropagation") && js.includes("forwarding = true"));
check("search opener forwards to its existing icon child while the closer is the exact icon", js.includes('forwardExpandedPointerAreaToChild(opener, "i")') && !js.includes('forwardExpandedPointerAreaToChild(closer, "i")'));
check("search closer sizing preserves Sirat wrapper layout", css.includes(".header-search .serach_outer .closepop > i") && !/(?:^|,)\s*\.header-search \.serach_outer \.closepop\s*(?:,|\{)/m.test(css));
check("disabled Owl dots remain hidden", css.includes("#our-blogs .owl-dots:not(.disabled)") && !/#our-blogs \.owl-dots\s*\{/.test(css));
check("disclosure state derives from visibility and style mutations", js.includes("function elementIsVisible") && js.includes('attributeFilter: ["class", "hidden", "open", "style"]') && js.includes('setAttributeIfChanged(panel, "aria-hidden"'));
check("menu and search implement focus transfer, return, and Escape", (js.match(/event\.key !== "Escape"/g) ?? []).length === 2 && js.includes("focusSafely(closer)") && (js.match(/focusSafely\(opener\)/g) ?? []).length === 2 && js.includes("input[type='search']"));
check("no semantic alt value is assigned", !/setAttribute\(\s*["']alt["']/.test(js) && !/\.alt\s*=/.test(js));
check("source-less removal is carousel-scoped", js.includes("#our-blogs .owl-carousel .latest-blog-image > img[alt]") && js.includes('image.getAttribute("src") !== ""') && js.includes('image.getAttribute("alt") !== ""'));
check("source-less removal preserves real and lazy sources", ["srcset", "data-src", "data-lazy-src"].every((token) => js.includes(`image.getAttribute("${token}")`)) && js.includes("image.remove()"));
check("JavaScript does not scan every image generically", !/querySelectorAll\(\s*["']img["']\s*\)/.test(js));
check("carousel is scoped to the evidenced home section", js.includes('document.querySelector("#our-blogs .owl-carousel")'));
check("slide names derive only from the exact visible H3", js.includes('slide.querySelector(".our-blogs-content h3.aiamigos-blog-card-title")') && !js.includes('.our-blogs-content h5') && js.includes("heading.cloneNode(true)"));
check("duplicate or hidden title filler is removed before naming", js.includes(".screen-reader-text, [hidden], [aria-hidden='true']") && js.includes("duplicate.remove()"));
check("Owl dot naming ignores exact Sirat blog-dots filler", js.includes('HIDDEN_FILLER_SELECTOR = ".blog-dots,') && js.includes("textWithoutHiddenFiller") && js.includes("setLabelIfMissing(dot, label, true)"));
check("title-to-picker mapping requires one-to-one counts", js.includes("dots.length === originalSlides.length") && js.includes('"Show " + titles[index]'));
check("ambiguous picker mapping falls back to ordinal UI text", js.includes('"Show carousel page " + (index + 1)'));
check("unfocused clones are hidden and removed from tab order", js.includes('.querySelectorAll(".owl-item.cloned")') && js.includes('setAttributeIfChanged(clone, "aria-hidden", focused ? "false" : "true")') && js.includes("suppressFocus(clone, !focused)"));
check("focused slides are never aria-hidden", js.includes("containsActiveFocus(clone)") && js.includes("focusedOriginals") && js.includes("&& !containsActiveFocus(slide)"));
check("current states follow Owl active classes", (js.match(/setAttributeIfChanged\([^\n]+"aria-current", "true"\)/g) ?? []).length >= 2 && (js.match(/removeAttributeIfPresent\([^\n]+"aria-current"\)/g) ?? []).length >= 2);
check("active originals have a deterministic fallback", js.includes("activeDotIndex") && js.includes("if (!exposed.length) exposed = [originalSlides[0]]"));
check("carousel observer is subtree-scoped and class-only", js.includes("observer.observe(carousel") && js.includes("subtree: true") && /attributeFilter: \["class"\]/.test(js));
check("carousel autoplay stops on focus and reduced motion", js.includes('owl.trigger("stop.owl.autoplay")') && js.includes('carousel.addEventListener("focusin"') && js.includes('matchMedia("(prefers-reduced-motion: reduce)")'));
check("JavaScript has no whole-document serialization", !/\b(?:innerHTML|outerHTML|document\.write)\b/.test(js));
check("JavaScript has no network or persistent storage side effect", !/\b(?:fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage)\b|document\.cookie/.test(js));

check("CSS adopts exact 44px targets", /min-height:\s*44px/.test(css) && /min-width:\s*44px/.test(css) && /min-block-size:\s*44px/.test(css) && /min-inline-size:\s*44px/.test(css));
check("CSS sizes the exact mobile menu", css.includes("amp-sidebar#sidebar1 .side-navigation .primary-menu a"));
check("CSS includes visible focus treatment", css.includes(":focus-visible") && /outline:\s*3px solid/.test(css));
check("CSS uses two-tone focus on dark surfaces", /outline:\s*3px solid #ffffff/.test(css) && /box-shadow:\s*0 0 0 6px #111111/.test(css));
check("CSS supports forced high-contrast focus", css.includes("@media (forced-colors: active)") && css.includes("outline-color: Highlight") && css.includes("forced-color-adjust: auto"));
check("CSS includes reduced-motion handling", css.includes("@media (prefers-reduced-motion: reduce)") && css.includes("#our-blogs .owl-stage"));
check("CSS uses the exact compact H3 title selector", css.includes("#our-blogs .our-blogs-content h3.aiamigos-blog-card-title") && /font-size:\s*clamp\(/.test(css) && /line-height:\s*1\.35/.test(css) && /margin-block:\s*0 0\.65rem/.test(css));
check("CSS avoids a bare global anchor rule", !/(?:^|})\s*a\s*\{/m.test(css));

const requireLine = "require_once AIAMIGOS_REMEDIATION_DIR . 'includes/class-aiamigos-accessibility-remediation.php';";
const bootLine = "AIAmigos_Accessibility_Remediation::boot();";
check("documentation contains the exact two-line integration", docs.includes(requireLine) && docs.includes(bootLine));
check("documentation explicitly records staging integration and production non-promotion", /integrated in plugin v1\.4\.0 and deployed on staging; not promoted to production/i.test(docs));
check("documentation prohibits generated semantic alt", /Do not assign, generate, or infer semantic alt text/i.test(docs));
check("documentation describes equivalent custom-button semantics truthfully", /equivalent custom-button semantics/i.test(docs) && !/receive native button/i.test(docs));
check("dependency-free DOM fixture covers required interaction risks", ["hidden Owl filler", "close icon", "style mutation", "exact H3", "autoplay", "mutation loop"].every((token) => domFixture.toLowerCase().includes(token.toLowerCase())));
check("bootstrap integration is absent or complete", bootstrap.includes(requireLine) === bootstrap.includes(bootLine), { integrated: bootstrap.includes(requireLine) && bootstrap.includes(bootLine) });
check("accessibility module is not embedded in the active main class", !mainClass.includes("AIAmigos_Accessibility_Remediation"));

check("inventory validation is green", inventory.validation?.passed === true);
check("inventory authorizes exactly two structural removals", inventory.summary?.safely_automatable_empty_source_instances === 2);
check("inventory protects 182 human-review alt cases", inventory.summary?.empty_alt_instances === 184 && inventory.summary?.safely_automatable_empty_source_instances === 2);
check("inventory identifies four functional linked-image cases", inventory.summary?.linked_empty_alt_instances === 4 && inventory.empty_alt_review_queue.filter((item) => item.machine_triage.category === "functional_link_failure").length === 4);
check("structural removal IDs are exact", JSON.stringify(inventory.empty_alt_review_queue.filter((item) => item.machine_triage.category === "structural_empty_source").map((item) => item.id)) === JSON.stringify(["ALT-162", "ALT-163"]));
check("inventory binds 20 carousel items", inventory.summary?.home_carousel_authored_items === 20 && inventory.m5_rendered_route_inventory?.home_carousel?.items?.length === 20);
check("inventory binds exact M5 route control counts", inventory.m5_rendered_route_inventory.asserted_routes.every((route) => route.header_social_controls.length === 5 && route.mobile_menu_controls.length === 18));

const failures = results.filter((result) => !result.passed);
console.log(JSON.stringify({
  status: failures.length ? "failed" : "passed",
  checks: results.length,
  failures,
  integration_status: bootstrap.includes(requireLine) && bootstrap.includes(bootLine) ? "integrated" : "dormant",
}, null, 2));
if (failures.length) process.exitCode = 1;
