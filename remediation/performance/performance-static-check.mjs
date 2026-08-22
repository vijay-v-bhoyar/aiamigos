import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const performanceRoot = import.meta.dirname;
const workspaceRoot = path.resolve(performanceRoot, "..", "..");
const inventoryPath = path.join(performanceRoot, "performance-inventory.json");
const homePatchPath = path.join(workspaceRoot, "remediation", "theme-patch", "sirat-pro-home-blog-responsive-image.patch");
const archivePatchPath = path.join(workspaceRoot, "remediation", "theme-patch", "sirat-pro-archive-responsive-image.patch");
const homePreimagePath = path.join(workspaceRoot, "remediation", "theme-patch", "evidence", "section-our-blog.php.patched");
const archivePreimagePath = path.join(workspaceRoot, "remediation", "theme-patch", "evidence", "post-content.php.preimage");
const homePreparedPath = path.join(workspaceRoot, "remediation", "theme-patch", "prepared", "wp-content", "themes", "sirat-pro", "template-parts", "home", "section-our-blog.php");
const archivePreparedPath = path.join(workspaceRoot, "remediation", "theme-patch", "prepared", "wp-content", "themes", "sirat-pro", "template-parts", "post", "post-content.php");
const deploymentManifestPath = path.join(workspaceRoot, "remediation", "theme-patch", "theme-performance-manifest.json");
const expectedCurrentThemeHash = "2dea4f7a2800034b9addc82be14e7da18002d155cc6d829f0f1fc15b2a84e815";
const expectedArchiveThemeHash = "8b024f9215d35798fa220b9c827e712bfd0fb777016e66a52f31726911c7822c";
const expectedPreparedHomeHash = "8cc6a5771f0b7ae557c263a3cf422976751eb655079f0b611a19d02828206258";
const expectedPreparedArchiveHash = "f24051f220b6191122db539201a3aad582e474b8e402d917f3b9ae392272c070";
const rawThemeLine = `                 <img src="<?php echo wp_get_attachment_url(get_post_thumbnail_id()); ?>" alt="<?php echo esc_html(get_theme_mod('vw_sirat_pro_blog_image_alt_text' . $i)); ?>">`;
const rawArchiveLine = `           <img src="<?php the_post_thumbnail_url( 'full' ); ?>" alt="<?php the_title(); ?> post thumbnail">`;

const checks = [];
function check(name, condition, details = null) {
  checks.push({ name, pass: Boolean(condition), details });
}

function occurrences(haystack, needle) {
  return String(haystack).split(needle).length - 1;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
const homePatch = await readFile(homePatchPath, "utf8");
const archivePatch = await readFile(archivePatchPath, "utf8");
const homePreimage = await readFile(homePreimagePath, "utf8");
const archivePreimage = await readFile(archivePreimagePath, "utf8");
const homePrepared = await readFile(homePreparedPath, "utf8");
const archivePrepared = await readFile(archivePreparedPath, "utf8");
const deploymentManifest = JSON.parse(await readFile(deploymentManifestPath, "utf8"));
const root = inventory.pages.find((page) => page.requestedUrl === "https://www.aiamigos.org/");
const brandedHome = inventory.pages.find((page) => page.requestedUrl === "https://www.aiamigos.org/home/");
const gemini = inventory.heavyImages.find((image) => image.url.endsWith("/Gemini_Generated_Image_lru09slru09slru0.png"));
const rawOriginalUrls = new Set(
  inventory.pages.flatMap((page) =>
    page.images.filter((image) => image.src && image.originalUploadInSrc && !image.hasSrcset).map((image) => image.src),
  ),
);
const rawOriginalRecords = inventory.heavyImages.filter((image) => rawOriginalUrls.has(image.url));
const rawOriginalsWithoutMediumLarge = rawOriginalRecords.filter((image) => !image.media?.sizes?.medium_large?.sourceUrl);

check("inventory probes were enabled", inventory.probeEnabled === true);
check("inventory contains both audited surfaces", Boolean(root && brandedHome));
check("root exposes nine raw original image tags without srcset", root?.rawOriginalTagsWithoutSrcset === 9, root?.rawOriginalTagsWithoutSrcset);
check("branded home exposes nineteen raw original image tags without srcset", brandedHome?.rawOriginalTagsWithoutSrcset === 19, brandedHome?.rawOriginalTagsWithoutSrcset);
check("branded home direct source set exceeds 30 MiB", brandedHome?.uniqueDirectSourceBytes > 30 * 1024 * 1024, brandedHome?.uniqueDirectSourceBytes);
check("largest original is the exact 5,888,851-byte image", gemini?.response?.contentLength === 5_888_851, gemini?.response?.contentLength);
check("all probed image responses succeeded", inventory.heavyImages.every((item) => item.response?.status === 200));
check("public media metadata was captured", inventory.mediaMetadataRecordCount >= 90, inventory.mediaMetadataRecordCount);
check("raw-original union contains nineteen URLs", rawOriginalRecords.length === 19, rawOriginalRecords.length);
check(
  "every raw original without a medium-large derivative is below 100 KiB",
  rawOriginalsWithoutMediumLarge.every((item) => item.response.contentLength < 100 * 1024),
  rawOriginalsWithoutMediumLarge.map((item) => ({ url: item.url, bytes: item.response.contentLength })),
);
check("script inventory assigns an owner to every script", inventory.scripts.every((script) => script.source?.owner && script.source?.package));

check("home patch is scoped to the exact home-blog template", occurrences(homePatch, "wp-content/themes/sirat-pro/template-parts/home/section-our-blog.php") === 2);
check("home patch removes the exact raw attachment URL line", occurrences(homePatch, `-${rawThemeLine}`) === 1);
check("home patch uses the WordPress responsive image API", occurrences(homePatch, "wp_get_attachment_image(") === 1);
check("home patch uses an existing generated medium-large source", occurrences(homePatch, "'medium_large'") === 1);
check("home patch supplies responsive sizes", /'sizes'\s*=>\s*'\(max-width: 767px\)/.test(homePatch));
check("home patch lazy-loads this below-fold carousel", occurrences(homePatch, "'loading'  => 'lazy'") === 1);
check("home patch reserves intrinsic dimensions through core output", !/\+.*<img\b/m.test(homePatch));
check("home patch does not guess or preload an LCP asset", !/preload|fetchpriority\s*['\"]?\s*=>\s*['\"]high/i.test(homePatch));

check("archive patch is scoped to the exact post renderer", occurrences(archivePatch, "wp-content/themes/sirat-pro/template-parts/post/post-content.php") === 2);
check("archive patch removes all three full-size thumbnail renderers", occurrences(archivePatch, `-           <img src="<?php the_post_thumbnail_url( 'full' ); ?>"`) === 3);
check("archive patch uses the WordPress responsive image API in all three layout branches", occurrences(archivePatch, "wp_get_attachment_image(") === 3);
check("archive patch uses an existing generated medium-large source in all branches", occurrences(archivePatch, "'medium_large'") === 3);
check("archive patch supplies layout-specific responsive sizes", occurrences(archivePatch, "'sizes'    => '(max-width: 767px)") === 3);
check("archive patch delegates loading and fetch priority to WordPress", !/'loading'\s*=>|'fetchpriority'\s*=>/.test(archivePatch));
check("archive patch reserves intrinsic dimensions through core output", !/\+.*<img\b/m.test(archivePatch));

check("captured home preimage matches staging hash", sha256(homePreimage) === expectedCurrentThemeHash, sha256(homePreimage));
check("captured home preimage has one raw URL renderer", occurrences(homePreimage, rawThemeLine) === 1, occurrences(homePreimage, rawThemeLine));
check("captured home preimage preserves the prior heading repair", occurrences(homePreimage, '<h3 class="aiamigos-blog-card-title">') === 1);
check("captured archive preimage matches staging hash", sha256(archivePreimage) === expectedArchiveThemeHash, sha256(archivePreimage));
check("captured archive preimage has three raw full renderers", occurrences(archivePreimage, rawArchiveLine) === 3, occurrences(archivePreimage, rawArchiveLine));
check("prepared home has the exact expected hash", sha256(homePrepared) === expectedPreparedHomeHash, sha256(homePrepared));
check("prepared home removes raw URL output", occurrences(homePrepared, "wp_get_attachment_url(get_post_thumbnail_id())") === 0);
check("prepared home contains one responsive core renderer", occurrences(homePrepared, "wp_get_attachment_image(") === 1);
check("prepared archive has the exact expected hash", sha256(archivePrepared) === expectedPreparedArchiveHash, sha256(archivePrepared));
check("prepared archive removes all full URL output", occurrences(archivePrepared, "the_post_thumbnail_url( 'full' )") === 0);
check("prepared archive contains three responsive core renderers", occurrences(archivePrepared, "wp_get_attachment_image(") === 3);
check("deployment manifest remains staging-only", deploymentManifest.productionAuthorized === false);
check("deployment manifest has exactly two targets", deploymentManifest.targets?.length === 2, deploymentManifest.targets?.length);
check(
  "deployment manifest hashes match all local artifacts",
  deploymentManifest.targets?.[0]?.preimageSha256 === sha256(homePreimage)
    && deploymentManifest.targets?.[0]?.preparedSha256 === sha256(homePrepared)
    && deploymentManifest.targets?.[1]?.preimageSha256 === sha256(archivePreimage)
    && deploymentManifest.targets?.[1]?.preparedSha256 === sha256(archivePrepared),
);

const sourceFlag = process.argv.indexOf("--theme-source");
let themeSource = null;
if (sourceFlag >= 0) {
  const sourcePath = process.argv[sourceFlag + 1];
  if (!sourcePath) throw new Error("--theme-source requires a path");
  themeSource = await readFile(path.resolve(sourcePath), "utf8");
  check("captured current theme file matches the staging pre-patch hash", sha256(themeSource) === expectedCurrentThemeHash, sha256(themeSource));
  check("captured theme has one exact raw image line", occurrences(themeSource, rawThemeLine) === 1, occurrences(themeSource, rawThemeLine));
  check("captured theme contains the prior heading repair", occurrences(themeSource, '<h3 class="aiamigos-blog-card-title">') === 1);
}

const failures = checks.filter((item) => !item.pass);
console.log(
  JSON.stringify(
    {
      checks: checks.length,
      passed: checks.length - failures.length,
      failed: failures.length,
      failures,
      themeSource: themeSource
        ? {
            currentHash: sha256(themeSource),
            expectedCurrentHash: expectedCurrentThemeHash,
          }
        : null,
    },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
