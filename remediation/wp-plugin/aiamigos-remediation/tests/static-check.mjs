#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function phpFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return phpFiles(target);
    return entry.isFile() && entry.name.endsWith(".php") ? [target] : [];
  }));
  return nested.flat();
}

function structuralBalance(source) {
  const counts = { "{": 0, "(": 0, "[": 0 };
  const close = { "}": "{", ")": "(", "]": "[" };
  let state = "code";
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (state === "line") {
      if (char === "\n") state = "code";
      continue;
    }
    if (state === "block") {
      if (char === "*" && next === "/") { state = "code"; index += 1; }
      continue;
    }
    if (state === "single" || state === "double") {
      if (escaped) { escaped = false; continue; }
      if (char === "\\") { escaped = true; continue; }
      if ((state === "single" && char === "'") || (state === "double" && char === '"')) state = "code";
      continue;
    }
    if (char === "/" && next === "/") { state = "line"; index += 1; continue; }
    if (char === "#") { state = "line"; continue; }
    if (char === "/" && next === "*") { state = "block"; index += 1; continue; }
    if (char === "'") { state = "single"; continue; }
    if (char === '"') { state = "double"; continue; }
    if (Object.hasOwn(counts, char)) counts[char] += 1;
    if (Object.hasOwn(close, char)) counts[close[char]] -= 1;
    if (Object.values(counts).some((value) => value < 0)) return false;
  }
  return state === "code" && Object.values(counts).every((value) => value === 0);
}

const files = await phpFiles(root);
const sources = Object.fromEntries(await Promise.all(files.map(async (file) => [file, await readFile(file, "utf8")])));
const all = Object.values(sources).join("\n");
const pluginFile = path.join(root, "includes", "class-aiamigos-remediation-plugin.php");
const policyFile = path.join(root, "includes", "class-aiamigos-remediation-policy.php");
const bootstrapFile = path.join(root, "aiamigos-remediation.php");
const readmeFile = path.join(root, "README.md");
const plugin = sources[pluginFile];
const policy = sources[policyFile];
const bootstrap = sources[bootstrapFile];
const readme = await readFile(readmeFile, "utf8");
let failures = 0;
let checks = 0;

function extractQuotedArray(functionName, variableName) {
  const block = plugin.match(new RegExp(`private static function ${functionName}\\(\\) \\{[\\s\\S]*?\\$${variableName} = array\\(([\\s\\S]*?)\\n\\s*\\);`));
  return block ? [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]) : [];
}

function extractIntegerArray(functionName, variableName) {
  const block = plugin.match(new RegExp(`private static function ${functionName}\\(\\) \\{[\\s\\S]*?\\$${variableName} = array\\(([^)]*)\\);`));
  return block ? [...block[1].matchAll(/\b\d+\b/g)].map((match) => Number.parseInt(match[0], 10)) : [];
}

function check(condition, label) {
  checks += 1;
  if (condition) console.log(`PASS ${label}`);
  else { failures += 1; console.error(`FAIL ${label}`); }
}

for (const [file, source] of Object.entries(sources)) check(structuralBalance(source), `balanced PHP structure: ${path.relative(root, file)}`);
check(/Version:\s*1\.4\.1/.test(bootstrap) && /AIAMIGOS_REMEDIATION_VERSION',\s*'1\.4\.1'/.test(bootstrap), "plugin versions agree");
check(!/[ÂÃ]|â(?:€™|€|†|‡|ˆ|œ|ž)/u.test(all), "no common UTF-8 mojibake markers");
check(
  /function\s+label_update_request_widget\s*\(\s*\$title\s*,\s*\$instance\s*=\s*array\(\)\s*,\s*\$id_base\s*=\s*''\s*\)/.test(plugin),
  "widget-title callback tolerates Sirat's one-argument invocation"
);
check(!/\$attr\s*\[\s*['"]loading['"]\s*\]\s*=\s*['"]lazy['"]/.test(plugin), "plugin does not force lazy loading");
check(!/unset\s*\(\s*\$attr\s*\[\s*['"]fetchpriority['"]/.test(plugin), "plugin preserves core fetch priority");
check(/add_filter\(\s*'option_users_can_register'.*force_users_cannot_register/.test(plugin), "public registration option is force-disabled");
check(/add_filter\(\s*'pre_option_users_can_register'.*force_users_cannot_register/.test(plugin), "registration option cache is force-disabled");
check(/public static function force_users_cannot_register/.test(plugin) && /apply_filters\( 'aiamigos_remediation_users_can_register', false,/.test(plugin), "registration hardening is bounded and filterable");
check(/script_loader_tag'.*PHP_INT_MAX,\s*3/.test(plugin), "WordPress dependency strategy repair runs after ordinary optimization filters");
check(/post__in/.test(plugin) && /array\(\s*0\s*\)/.test(plugin), "explicit allowlists fail closed after quarantine subtraction");
const quarantineQueryBlock = plugin.match(/public static function exclude_quarantined_records_from_queries\( \$query \) \{([\s\S]*?)\n\s*\}/);
check(Boolean(quarantineQueryBlock) && !/is_feed/.test(quarantineQueryBlock[1]), "front-end feed queries are not exempt from quarantine");
const expectedGonePaths = [
  "/classes/recent-case-title-01/", "/classes/recent-case-title-02/",
  "/testimonials/client-name-01/", "/testimonials/client-name-02/", "/testimonials/client-name-03/",
  "/team/member-name-02/", "/team/member-name-03/", "/team/member-name-04/",
  "/services/ai-amigos-academy/", "/services/ai-amigos-pro/", "/services/ai-by-job-role/", "/services/ai-for-kids/",
  "/ai-certifications/", "/gpt-models/", "/grokai/", "/ai-model-benchmarks-a-comprehensive-guide/", "/others/", "/shop/",
  "/langgraph-5-stunning-secrets-for-building-a-generative-ai-application/",
  "/ways-to-test-a-rag-architecture-based-generative-ai-application/",
  "/building-agentic-ai-saas-a-strategic-roadmap-using-google-gemini-enterprise/", "/custom-gpt-models/",
  "/services/", "/classes/", "/ai-tools-for-kids/", "/ai-books-for-kids/", "/newsletter/", "/newsletter-2/",
];
const expectedQuarantinedIds = [34, 36, 46, 48, 50, 40, 42, 44, 26, 28, 30, 32, 945, 441, 783, 1405, 552, 6, 1411, 1407, 1421, 926, 21, 22, 877, 149, 157, 1417];
const actualGonePaths = extractQuotedArray("gone_paths", "paths");
const actualQuarantinedIds = extractIntegerArray("quarantined_post_ids", "ids");
check(JSON.stringify(actualGonePaths) === JSON.stringify(expectedGonePaths), "exact 28-entry gone-path manifest matches the governed route order");
check(JSON.stringify(actualQuarantinedIds) === JSON.stringify(expectedQuarantinedIds), "exact 28-entry quarantine-ID manifest matches the governed record order");
check(new Set(actualGonePaths).size === 28 && new Set(actualQuarantinedIds).size === 28 && !actualQuarantinedIds.includes(38), "route and record manifests are unique and protect genuine team ID 38");
const redirectBlock = plugin.match(/private static function redirect_paths\(\) \{([\s\S]*?)\n\s*\}/);
check(Boolean(redirectBlock) && /'\/home\/'\s*=>\s*'\/'/.test(redirectBlock[1]) && !/newsletter/.test(redirectBlock[1]), "only the legacy home route remains in the explicit redirect manifest");
check(
  /34,\s*36,\s*46,\s*48,\s*50,\s*40,\s*42,\s*44,\s*26,\s*28,\s*30,\s*32/.test(plugin) &&
  !/quarantined_post_ids[\s\S]*?array\([^)]*\b38\b/.test(plugin),
  "content-plan service IDs are quarantined without affecting real team ID 38"
);
check(
  ["ai-amigos-academy", "ai-amigos-pro", "ai-by-job-role", "ai-for-kids"].every((slug) => plugin.includes(`/services/${slug}/`)),
  "content-plan service paths return exact recoverable 410 responses"
);
const retiredPaths = [
  "/ai-certifications/", "/gpt-models/", "/grokai/", "/ai-model-benchmarks-a-comprehensive-guide/", "/others/", "/shop/",
  "/langgraph-5-stunning-secrets-for-building-a-generative-ai-application/", "/ways-to-test-a-rag-architecture-based-generative-ai-application/",
  "/building-agentic-ai-saas-a-strategic-roadmap-using-google-gemini-enterprise/", "/custom-gpt-models/", "/services/", "/classes/",
  "/ai-tools-for-kids/", "/ai-books-for-kids/",
];
check(retiredPaths.every((pathname) => plugin.includes(`'${pathname}'`)), "all fourteen high-risk or empty draft paths receive exact reversible 410 tombstones");
check(/945, 441, 783, 1405, 552, 6, 1411, 1407, 1421, 926, 21, 22, 877, 149/.test(plugin), "all fourteen retired records remain fail-closed in queries and sitemaps after accidental republication");
check(/path_is_listed\( \$path, self::gone_paths\(\) \)[\s\S]*?return array\( 'action' => 'unlink'/.test(plugin), "every exact 410 path is also unlinked from controlled public output");
check(
  /CP-011 IDs `26`[\s\S]*?`28`[\s\S]*?`30`[\s\S]*?CP-014 ID `32`/.test(readme) && /team record ID `38` is explicitly not quarantined/.test(readme),
  "content-plan quarantine and protected team record are documented"
);
check(/wpseo_exclude_from_sitemap_by_post_ids/.test(plugin) && /wp_sitemaps_posts_query_args/.test(plugin) && /rank_math\/sitemap\/entry/.test(plugin), "all supported sitemap exclusions are registered");
check(/rank_math\/sitemap\/exclude_taxonomy/.test(plugin) && /wp_sitemaps_taxonomies/.test(plugin), "category sitemap exclusions use official Rank Math and core hooks");
check(/exclude_category_from_rank_math_sitemap[\s\S]*?'category'\s*===\s*\(string\)\s*\$taxonomy/.test(plugin) && /unset\(\s*\$taxonomies\['category'\]\s*\)/.test(plugin), "category exclusion is exact and preserves other taxonomies");
check(/945,\s*441,\s*783,\s*1405,\s*292,\s*24,\s*158,\s*941/.test(plugin) && ["/privacy-policy-2/", "/page/", "/academy/", "/ai-career/"].every((path) => plugin.includes(`'${path}'`)), "factual, institutional, child-directed, and thin records are noindex and sitemap-excluded");
check(/RankMath\\Sitemap\\Cache/.test(plugin) && /invalidate_storage/.test(plugin), "activation invalidates Rank Math sitemap storage when available");
const titleOverrideBlock = plugin.match(/private static function exact_title_overrides\(\)[\s\S]*?return array\(([\s\S]*?)\n\s*\);/);
const titleOverrides = titleOverrideBlock ? [...titleOverrideBlock[1].matchAll(/'([^']+)'\s*=>\s*'([^']+)'/g)] : [];
check(titleOverrides.length === 44, "all 38 long-title and six short-hub slugs have explicit overrides");
check(titleOverrides.length === 44 && titleOverrides.every(([, , title]) => [...title].length <= 60), "all exact title overrides are 60 characters or fewer");
check(/rank_math\/frontend\/description/.test(plugin) && /normalize_description_text/.test(plugin) && /self::text_length\( trim\( \$bounded \) \) >= 120/.test(plugin), "description normalization is bounded to meaningful excerpts");
check(/member-name-01[\s\S]*?identity, role, authorship/.test(plugin) && /render_exact_description_fallback/.test(plugin) && /meta_description_seen/.test(plugin), "newsletter and team descriptions have duplicate-safe non-claiming fallbacks");
check(/'about-us'[\s\S]*?'contact'[\s\S]*?'privacy-policy-2'/.test(plugin) && /render_bounded_institutional_page/.test(plugin), "institutional pages use bounded copy and exact descriptions");
check(/Archived article bylines and reviewer identities remain under review/.test(plugin) && !/responsible for the current AI Amigos review process/.test(plugin), "About copy does not assert unattested sitewide editorial responsibility");
check(/rank_math\/opengraph\/facebook\/image/.test(plugin) && /rank_math\/opengraph\/twitter\/image/.test(plugin) && /set_url_scheme\( \$logo, 'https' \)/.test(plugin), "social fallback uses the current custom logo over HTTPS");
check(/render_site_icon_fallback/.test(plugin) && /has_site_icon/.test(plugin) && /rel=\\"icon/.test(plugin), "missing favicon falls back to the existing HTTPS custom logo");
check(/rank_math\/json_ld'.*filter_unverified_schema.*99,\s*2/.test(plugin) && /retain_approved_schema_types/.test(plugin) && /'website', 'webpage', 'breadcrumblist', 'listitem', 'imageobject'/.test(plugin), "all-page schema retains only approved structural entity types");
check(/array_diff\( \$types, \$allowed \)/.test(plugin) && /return \$is_list \? array_values\( \$value \) : \$value/.test(plugin), "schema allowlist recursively removes unapproved nodes while preserving list shape");
check(/collect_schema_ids\( \$data, \$before_ids \)/.test(plugin) && /collect_schema_ids\( \$data, \$after_ids \)/.test(plugin), "schema records definition IDs before and after type pruning");
check(/isset\( \$value\['@type'\], \$value\['@id'\] \)/.test(plugin), "schema ID ledger excludes bare references that could conceal a removed definition");
check(/\$removed_ids = array_diff_key\( \$before_ids, \$after_ids \)/.test(plugin), "schema detects directly and transitively omitted entity IDs without rejecting surviving duplicates");
check(/remove_unverified_schema_relationships\( \$data, \$removed_ids \)/.test(plugin) && /isset\( \$removed_ids\[ \$value\['@id'\] \] \)/.test(plugin), "schema removes dangling references to omitted entity IDs");
check(
  ["'author'", "'creator'", "'editor'", "'mainEntity'", "'maintainer'", "'owner'", "'publisher'", "'publisherImprint'", "'sdPublisher'", "'sourceOrganization'", "'translator'"].every((key) => plugin.includes(key)),
  "schema removes typed and untyped identity-bearing relationships"
);
check(/normalize_same_site_schema_urls/.test(plugin) && plugin.includes("preg_replace( '/^www\\./i'") && plugin.includes("array_filter( array( $site_host, 'aiamigos.org' ) )") && plugin.includes("in_array( $value_host, $allowed_hosts, true ) ? set_url_scheme( $value, 'https' )"), "same-site and www-alias schema HTTP URLs are upgraded without rewriting external hosts");
check(/rank_math\/opengraph\/twitter\/twitter_label1'.*filter_unattested_twitter_author_label.*99/.test(plugin) && /filter_unattested_twitter_author_label[\s\S]*?is_singular\( 'post' \) \? false : \$content/.test(plugin), "single-post Twitter author label slot is suppressed");
check(/rank_math\/opengraph\/twitter\/twitter_data1'.*filter_unattested_twitter_author_value.*99/.test(plugin) && /filter_unattested_twitter_author_value[\s\S]*?is_singular\( 'post' \) \? false : \$content/.test(plugin), "single-post Twitter author value slot is suppressed as a pair");
check(
  !plugin.includes("add_filter( 'rank_math/opengraph/twitter/twitter_label1', '__return_false'") &&
  !plugin.includes("add_filter( 'rank_math/opengraph/twitter/twitter_data1', '__return_false'"),
  "page and archive Twitter label1/data1 metadata remains available"
);
check(/rank_math\/opengraph\/facebook\/og_description/.test(plugin) && /rank_math\/opengraph\/twitter\/twitter_description/.test(plugin) && !/rank_math\/opengraph\/(?:facebook|twitter)\/description'/.test(plugin), "Rank Math social-description hooks use exact property names");
check(/WP_HTML_Tag_Processor/.test(plugin) && /remove_attribute\( 'href' \)/.test(plugin) && /the-magical-world-of-ai-from-baby-steps-to-quantum-leaps/.test(plugin), "known links are rewritten or unlinked without deleting visible text");
check(/demystifying-artificial-intelligence-ai-how-does-it-shape-our-world/.test(plugin) && /academy\/www\.youtube\.com\/@aieducation4kids/.test(plugin) && /ai-career-path/.test(plugin), "all captured broken-link families are represented");
const unverifiedKidsChannelBranches = [...plugin.matchAll(/@aieducation4kids[\s\S]{0,180}?return array\( 'action' => 'unlink', 'href' => '' \);/g)];
check(unverifiedKidsChannelBranches.length === 3 && !plugin.includes('https://www.youtube.com/@Aieducation4kids'), "all three unverified children-channel branches unlink pending identity proof");
check(/https:\/\/www\.youtube\.com\/@AIamigos-sn8uf/.test(plugin) && /https:\/\/ai\.baidu\.com\//.test(plugin), "exact HTTP YouTube and Baidu references are upgraded to HTTPS");
check(["designs.ai", "elai.io", "kaiber.ai", "rephrase.ai", "veed.io"].every((host) => plugin.includes(`http://${host}`) && plugin.includes(`https://${host}`) || (host === "veed.io" && plugin.includes("https://www.veed.io/"))), "five observed product-name links are upgraded to verified HTTPS targets");
check(["/services/", "/classes/", "/ai-tools-for-kids/", "/ai-books-for-kids/"].every((path) => plugin.includes(`'${path}'`)), "all four newly drafted internal targets are unlinked");
check(["/page/", "/academy/", "/ai-career/"].every((path) => plugin.includes(`'${path}'`)), "unapproved mission, child-learning, and thin career hubs are unlinked while noindexed");
check(/theme_mod_vw_sirat_pro_our_services_enable/.test(plugin) && /disable_unverified_services_section/.test(plugin), "unverified homepage service promotion is disabled");
check(/theme_mod_vw_sirat_pro_footer_widgets_enable/.test(plugin) && /disable_unreviewed_footer_widgets/.test(plugin), "unsupported legacy footer claims are disabled");
check(/'Service Url'\s*=>\s*'Service page'/.test(plugin) && /'Linkden'\s*=>\s*'LinkedIn'/.test(plugin), "exact UI strings are corrected through gettext");
check(/preg_replace_callback\([\s\S]*?<h\(\[1-6\]\)/.test(plugin) && /count\( \$words\[0\] \) > 60/.test(plugin) && /if \( 1 === \$level \)/.test(plugin), "main editor content repairs blank, embedded H1, skipped, and overlong headings");
check(/\$allow_collection_form\s*=\s*false/.test(plugin) && !/WPCF7_ContactForm|aiamigos_remediation_cf7_form_title|allow_cf7/.test(plugin) && /wp_dequeue_script\( \$handle \)/.test(plugin), "retired newsletter surfaces contain no CF7 release path and always dequeue its assets");
check(/Google\\\\Site_Kit\\\\Modules\\\\AdSense/.test(plugin) && /Google\\\\Site_Kit\\\\Modules\\\\Analytics_4/.test(plugin) && /'register_tag'/.test(plugin), "exact Site Kit analytics and ads registration callbacks are suppressed");
check(/google_gtagjs/.test(plugin) && /googlesitekit-consent-mode/.test(plugin) && /apply_filters\( 'aiamigos_remediation_disable_measurement_scripts', true \)/.test(plugin), "known measurement handles are fail-closed behind a release filter");
check(/hostinger_chatbot_vendor/.test(plugin) && /wp_deregister_script\( 'hostinger_chatbot' \)/.test(plugin) && /aiamigos_remediation_disable_unreviewed_chatbot/.test(plugin), "unreviewed public chatbot assets are disabled by exact handles");
check(/File uploads and the former phone field are disabled/.test(plugin) && /Retention and response timing are not yet published/.test(plugin) && /mailto:/.test(plugin), "contact collection is replaced with a bounded email-only path");
check(!/ob_start\s*\(/.test(plugin), "plugin does not buffer whole HTML documents");
check(/unset\(\s*\$robots\['index'\],\s*\$robots\['nofollow'\]\s*\)/.test(plugin) && /\$robots\['noindex'\]\s*=\s*'noindex'/.test(plugin), "Rank Math robots array uses noindex key");
check(/update_request_markup\(\)/.test(plugin) && /contact request, not an automatic newsletter subscription/.test(plugin), "residual MailPoet tokens degrade to a bounded email request only");
check(/add_filter\(\s*'the_content'.*'prepend_accountable_byline'\s*\),\s*9\s*\)/s.test(plugin), "publication-date line runs after shortcode replacement");
check(/is_singular\(\s*'post'\s*\)/.test(plugin) && /is_main_query\(\)/.test(plugin) && /in_the_loop\(\)/.test(plugin) && !/get_the_author_meta/.test(plugin), "publication line is main-post-only and makes no unreviewed author claim");
check(/DAY_IN_SECONDS/.test(plugin) && /get_post_modified_time/.test(plugin), "updated date requires a material timestamp difference");
check(/X-Frame-Options'\s*=>\s*'SAMEORIGIN'/.test(plugin) && /Cache-Control/.test(plugin), "frame and cache header policies are present");
check(/header_remove\(\s*'X-Powered-By'\s*\)/.test(plugin), "runtime disclosure removal is attempted");
check(/return\s+\$target_path\s*===\s*\$path\s*\?\s*null/.test(policy), "self redirects are suppressed");
check(/\[1-9\]\[0-9\]\+/.test(policy), "legacy pagination includes pages 10 and above");
check(/wp_safe_redirect[\s\S]*?\)\s*\{\s*exit;/m.test(plugin), "redirect exits only after a successful send");

const callbackMatches = [...plugin.matchAll(/add_(?:action|filter)\([^;]*?array\(\s*__CLASS__,\s*'([^']+)'\s*\)/gs)].map((match) => match[1]);
const methodNames = new Set([...plugin.matchAll(/function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)].map((match) => match[1]));
const missingCallbacks = [...new Set(callbackMatches)].filter((name) => !methodNames.has(name));
check(missingCallbacks.length === 0, `all ${new Set(callbackMatches).size} registered class callbacks resolve${missingCallbacks.length ? `: ${missingCallbacks.join(", ")}` : ""}`);

console.log(`\n${checks} check(s), ${failures} failure(s).`);
process.exitCode = failures ? 1 : 0;
