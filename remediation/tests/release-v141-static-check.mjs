#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const remediationRoot = path.resolve(testsDir, "..");
const sourceRoot = path.join(remediationRoot, "wp-plugin", "aiamigos-remediation");
const releaseRoot = path.join(remediationRoot, "releases", "aiamigos-remediation-1.4.1-candidate", "aiamigos-remediation");
const zipPath = path.join(remediationRoot, "releases", "aiamigos-remediation-1.4.1-candidate.zip");
const manifestPath = path.join(remediationRoot, "releases", "aiamigos-remediation-1.4.1-candidate-manifest.json");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const failures = [];
let assertions = 0;

function check(condition, message) {
  assertions += 1;
  if (!condition) failures.push(message);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex").toUpperCase();
}

check(manifest.schemaVersion === 1, "manifest schemaVersion must be 1");
check(manifest.version === "1.4.1", "manifest version must be 1.4.1");
check(manifest.status === "PREPARED_NOT_DEPLOY_READY", "candidate must remain explicitly non-deploy-ready");
check(manifest.runtimeFiles?.length === 8, "manifest must enumerate exactly eight runtime files");
check(manifest.sourceEquivalence?.sha256Mismatches === 0, "manifest must record zero source mismatches");
check(manifest.releaseGates?.packagedZipExtractionAndPhpLint === "passed", "packaged ZIP lint gate must be retained");
check(manifest.releaseGates?.stagingCurrentCandidate === "not_run", "current-candidate staging must not be overclaimed");
check(manifest.releaseGates?.production === "not_authorized", "production must remain unauthorized");

const manifestPaths = manifest.runtimeFiles.map((record) => record.path);
check(new Set(manifestPaths).size === 8, "runtime paths must be unique");

for (const record of manifest.runtimeFiles) {
  const nativePath = record.path.split("/").join(path.sep);
  const releaseFile = path.join(releaseRoot, nativePath);
  const sourceFile = path.join(sourceRoot, nativePath);
  const [releaseBytes, sourceBytes] = await Promise.all([readFile(releaseFile), readFile(sourceFile)]);
  check(releaseBytes.byteLength === record.bytes, `${record.path}: packaged byte count drifted`);
  check(sha256(releaseBytes) === record.sha256, `${record.path}: packaged SHA-256 drifted`);
  check(sha256(sourceBytes) === record.sha256, `${record.path}: source no longer matches packaged bytes`);
}

const zipBytes = await readFile(zipPath);
const zipStat = await stat(zipPath);
check(zipStat.size === manifest.zip.bytes, "candidate ZIP byte count drifted");
check(sha256(zipBytes) === manifest.zip.sha256, "candidate ZIP SHA-256 drifted");

const bootstrap = await readFile(path.join(releaseRoot, "aiamigos-remediation.php"), "utf8");
check(/Version:\s*1\.4\.1/.test(bootstrap), "packaged plugin header is not v1.4.1");
check(/AIAMIGOS_REMEDIATION_VERSION',\s*'1\.4\.1'/.test(bootstrap), "packaged runtime constant is not v1.4.1");
check(!/Version:\s*1\.4\.0/.test(bootstrap), "packaged plugin retains a v1.4.0 header");

console.log(JSON.stringify({
  result: failures.length ? "fail" : "pass",
  assertions,
  failures,
  runtimeFiles: manifest.runtimeFiles.length,
  zipSha256: sha256(zipBytes),
  status: manifest.status,
}, null, 2));

process.exitCode = failures.length ? 1 : 0;
