import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const patchRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(patchRoot, "..", "..");
const manifestPath = path.join(patchRoot, "theme-accessibility-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const target = manifest.target;

function fromRepository(relativePath) {
  return path.join(repositoryRoot, ...relativePath.split("/"));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeLineEndings(value) {
  return value.replace(/\r\n/g, "\n");
}

function occurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

const preimage = await readFile(fromRepository(target.preimagePath));
const prepared = await readFile(fromRepository(target.preparedReviewPath));
const patch = await readFile(fromRepository(target.patchPath));
const preimageText = preimage.toString("utf8");
const preparedText = prepared.toString("utf8");
const patchText = patch.toString("utf8");

const duplicate = '<h3 class="aiamigos-blog-card-title"><?php the_title(); ?><span class="screen-reader-text"><?php the_title(); ?></span></h3>';
const replacement = '<h3 class="aiamigos-blog-card-title"><?php the_title(); ?></h3>';
const duplicateCount = occurrences(preimageText, duplicate);
const canonicalText = preimageText.replace(duplicate, replacement);
const canonical = Buffer.from(canonicalText, "utf8");

const changedLines = patchText
  .split(/\r?\n/)
  .filter((line) => (/^[+-]/.test(line) && !/^--- |^\+\+\+ /.test(line)));
const deletionLines = changedLines.filter((line) => line.startsWith("-"));
const insertionLines = changedLines.filter((line) => line.startsWith("+"));

const checks = [
  ["production remains unauthorized", manifest.productionAuthorized === false],
  ["exact preimage SHA-256", sha256(preimage) === target.preimageSha256],
  ["exact preimage byte count", preimage.length === target.preimageBytes],
  ["exact patch SHA-256", sha256(patch) === target.patchSha256],
  ["one duplicate title occurrence", duplicateCount === target.expectedReplacementCount],
  ["canonical output removes duplicate", occurrences(canonicalText, duplicate) === 0],
  ["canonical output contains one compact H3", occurrences(canonicalText, replacement) === 1],
  ["canonical patched SHA-256", sha256(canonical) === target.canonicalPatchedSha256],
  ["canonical patched byte count", canonical.length === target.canonicalPatchedBytes],
  ["prepared review SHA-256", sha256(prepared) === target.preparedReviewSha256],
  ["prepared review matches canonical after line-ending normalization", normalizeLineEndings(preparedText) === normalizeLineEndings(canonicalText)],
  ["patch has one deletion and one insertion", deletionLines.length === 1 && insertionLines.length === 1],
  ["patch deletion is the exact duplicate", deletionLines[0]?.slice(1).trim() === duplicate],
  ["patch insertion is the exact replacement", insertionLines[0]?.slice(1).trim() === replacement],
];

const failures = checks.filter(([, passed]) => !passed).map(([name]) => name);
console.log(JSON.stringify({
  status: failures.length ? "failed" : "passed",
  checks: checks.length,
  passed: checks.length - failures.length,
  failures,
  hashes: {
    preimage: sha256(preimage),
    patch: sha256(patch),
    preparedReview: sha256(prepared),
    canonicalPatched: sha256(canonical),
  },
  productionAuthorized: manifest.productionAuthorized,
}, null, 2));

if (failures.length) process.exitCode = 1;
