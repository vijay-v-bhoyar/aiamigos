#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";

const expectedIds = [
  ...Array.from({ length: 8 }, (_, index) => `C${index + 1}`),
  ...Array.from({ length: 13 }, (_, index) => `H${index + 1}`),
  ...Array.from({ length: 11 }, (_, index) => `M${index + 1}`),
];

const allowedStatuses = new Set([
  "historical_staging_mechanical_evidence",
  "historical_staging_containment_evidence",
  "partial",
  "human_or_legal_gate",
  "open_runtime",
]);

const expectedSeverity = (id) => {
  if (id.startsWith("C")) return "critical";
  if (id.startsWith("H")) return "high";
  return "moderate";
};

const fail = (errors, message) => errors.push(message);

const nonemptyStrings = (value) =>
  Array.isArray(value) && value.length > 0 && value.every((entry) => typeof entry === "string" && entry.trim().length > 0);

const relativeEvidenceRefs = (value) =>
  nonemptyStrings(value) &&
  value.every((entry) => {
    const normalized = entry.replaceAll("\\", "/");
    return !path.isAbsolute(entry) && !normalized.split("/").includes("..") && !normalized.startsWith("/");
  });

function verify(ledger, workspaceRoot) {
  const errors = [];

  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger)) {
    return ["Ledger root must be a JSON object."];
  }
  if (ledger.schemaVersion !== "2.0.0") fail(errors, "schemaVersion must be exactly 2.0.0.");
  if (ledger.truthBoundary?.productionClosedCount !== 0) fail(errors, "truthBoundary.productionClosedCount must be exactly 0.");
  if (ledger.truthBoundary?.releasePosture !== "NO-GO/PREPARED_NOT_DEPLOY_READY") {
    fail(errors, "releasePosture must remain NO-GO/PREPARED_NOT_DEPLOY_READY.");
  }
  if (ledger.truthBoundary?.historicalStagingCandidate?.evidenceState !== "historical_not_current") {
    fail(errors, "The v1.4.0 staging evidence must be labelled historical_not_current.");
  }
  const candidate = ledger.truthBoundary?.localCandidate;
  const candidateSha256 = "EAE265DCE613022C0BFDE1EFCAA9EE14387963BACC5C1DD9D6D8CB39260E7FCA";
  const candidateArtifact = "remediation/releases/aiamigos-remediation-1.4.1-candidate.zip";
  if (candidate?.version !== "1.4.1") fail(errors, "Local candidate version must be exactly 1.4.1.");
  if (candidate?.status !== "PREPARED_NOT_DEPLOY_READY") fail(errors, "Local candidate status must remain PREPARED_NOT_DEPLOY_READY.");
  if (candidate?.artifact !== candidateArtifact) fail(errors, `Local candidate artifact must be ${candidateArtifact}.`);
  if (candidate?.sha256 !== candidateSha256) fail(errors, "Local candidate SHA-256 does not match settled evidence.");
  if (candidate?.deployedToStaging !== false) fail(errors, "Local v1.4.1 must remain explicitly undeployed to staging.");
  if (candidate?.deployedToProduction !== false) fail(errors, "Local v1.4.1 must remain explicitly undeployed to production.");
  if (candidate?.releaseZipCurrent !== true) fail(errors, "The source-equivalent v1.4.1 candidate ZIP must be recorded as current.");
  if (candidate?.runtimeFiles !== 8 || candidate?.sourceEquivalentFiles !== 8 || candidate?.sourceEquivalenceMismatches !== 0 || candidate?.extractedRuntimeFiles !== 8) {
    fail(errors, "Candidate package must record 8 runtime files, 8 source-equivalent files, zero mismatches, and 8 extracted files.");
  }
  if (candidate?.phpLintAfterCandidateChanges !== true) fail(errors, "Post-v1.4.1 PHP lint must be recorded as passed.");
  if (candidate?.currentSourcePhpLint?.passed !== 7 || candidate?.currentSourcePhpLint?.total !== 7) fail(errors, "Current-source PHP lint must be exactly 7/7.");
  if (candidate?.policyAssertions?.passed !== 29 || candidate?.policyAssertions?.total !== 29) fail(errors, "Policy assertions must be exactly 29/29.");
  if (candidate?.schemaAuthorAssertions?.passed !== 36 || candidate?.schemaAuthorAssertions?.total !== 36) fail(errors, "Schema/author assertions must be exactly 36/36.");
  if (candidate?.packagedPhpLint?.passed !== 5 || candidate?.packagedPhpLint?.total !== 5) fail(errors, "Packaged PHP lint must be exactly 5/5.");
  const graph = candidate?.graphify;
  if (graph?.scope !== "current_v1.4.1_source" || graph?.nodes !== 257 || graph?.edges !== 389 || [graph?.missingEdges, graph?.danglingEdges, graph?.selfLoops, graph?.duplicateEdges, graph?.collapsedEdges].some((value) => value !== 0)) {
    fail(errors, "Graphify must record 257 nodes, 389 edges, and zero integrity defects.");
  }
  if (candidate?.fullStagingCrawlAfterCandidateChanges !== false) fail(errors, "Post-v1.4.1 staging crawl must remain explicitly absent.");
  if (candidate?.currentStagingBrowserEvidence !== false) fail(errors, "Current-candidate staging browser evidence must remain explicitly absent.");
  if (candidate?.currentStagingLogEvidence !== false) fail(errors, "Current-candidate staging log evidence must remain explicitly absent.");
  if (candidate?.hostingerWebSapiCompatibility !== false) fail(errors, "Hostinger web-SAPI compatibility must remain explicitly unproven.");
  const candidatePath = path.resolve(workspaceRoot, candidateArtifact);
  if (!fs.existsSync(candidatePath)) {
    fail(errors, `Candidate ZIP does not exist: ${candidateArtifact}`);
  } else {
    const actualSha256 = crypto.createHash("sha256").update(fs.readFileSync(candidatePath)).digest("hex").toUpperCase();
    if (actualSha256 !== candidateSha256) fail(errors, `Candidate ZIP SHA-256 mismatch: ${actualSha256}.`);
  }
  const candidateManifestPath = path.resolve(workspaceRoot, "remediation/releases/aiamigos-remediation-1.4.1-candidate-manifest.json");
  let candidateManifest = null;
  try {
    candidateManifest = JSON.parse(fs.readFileSync(candidateManifestPath, "utf8"));
  } catch (error) {
    fail(errors, `Unable to read candidate manifest: ${error.message}`);
  }
  if (candidateManifest) {
    if (candidateManifest.artifact !== path.basename(candidateArtifact) || candidateManifest.version !== "1.4.1" || candidateManifest.status !== "PREPARED_NOT_DEPLOY_READY") {
      fail(errors, "Candidate manifest identity, version, or status does not match the ledger.");
    }
    if (candidateManifest.zip?.sha256 !== candidateSha256) fail(errors, "Candidate manifest ZIP SHA-256 does not match settled evidence.");
    if (candidateManifest.sourceEquivalence?.filesCompared !== 8 || candidateManifest.sourceEquivalence?.sha256Mismatches !== 0) {
      fail(errors, "Candidate manifest must record 8 compared runtime files and zero SHA-256 mismatches.");
    }
    const expectedGateStates = {
      localStatic: "passed",
      localPhpSourceLint: "passed",
      localPolicyFixture: "passed",
      localSchemaAuthorFixture: "passed",
      packagedZipExtractionAndPhpLint: "passed",
      stagingCurrentCandidate: "not_run",
      production: "not_authorized",
    };
    for (const [gate, expected] of Object.entries(expectedGateStates)) {
      if (candidateManifest.releaseGates?.[gate] !== expected) fail(errors, `Candidate manifest release gate ${gate} must be ${expected}.`);
    }
    const runtimeFiles = Array.isArray(candidateManifest.runtimeFiles) ? candidateManifest.runtimeFiles : [];
    if (runtimeFiles.length !== 8 || new Set(runtimeFiles.map((entry) => entry?.path)).size !== 8) {
      fail(errors, "Candidate manifest must contain exactly 8 unique runtime files.");
    }
    for (const entry of runtimeFiles) {
      const relativePath = typeof entry?.path === "string" ? entry.path.replaceAll("\\", "/") : "";
      if (!relativePath || relativePath.startsWith("/") || relativePath.split("/").includes("..")) {
        fail(errors, `Candidate manifest contains an unsafe runtime path: ${String(entry?.path)}.`);
        continue;
      }
      const sourcePath = path.resolve(workspaceRoot, "remediation/wp-plugin/aiamigos-remediation", relativePath);
      if (!fs.existsSync(sourcePath)) {
        fail(errors, `Settled source runtime file is missing: ${relativePath}.`);
        continue;
      }
      const sourceSha256 = crypto.createHash("sha256").update(fs.readFileSync(sourcePath)).digest("hex").toUpperCase();
      if (sourceSha256 !== entry.sha256) fail(errors, `Settled source no longer matches the candidate manifest: ${relativePath}.`);
    }
  }
  if (ledger.truthBoundary?.latestHardenedPolicyAttempt?.correctionState !== "configuration corrected locally; corrected network rerun blocked by network quota") {
    fail(errors, "Corrected policy rerun boundary must record the network-quota block exactly.");
  }

  if (!Array.isArray(ledger.findings)) {
    fail(errors, "findings must be an array.");
    return errors;
  }
  if (ledger.findings.length !== expectedIds.length) fail(errors, `Expected 32 findings; found ${ledger.findings.length}.`);

  const ids = ledger.findings.map((finding) => finding?.id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) fail(errors, "Finding IDs must be unique.");
  for (const id of expectedIds) if (!uniqueIds.has(id)) fail(errors, `Missing required finding ${id}.`);
  for (const id of uniqueIds) if (!expectedIds.includes(id)) fail(errors, `Unexpected finding ID ${String(id)}.`);
  if (ids.join("|") !== expectedIds.join("|")) fail(errors, "Findings must be ordered C1-C8, H1-H13, M1-M11.");

  const statusCounts = Object.fromEntries([...allowedStatuses].map((status) => [status, 0]));
  let productionComplete = 0;
  let stagingComplete = 0;
  let localReleaseReady = 0;

  for (const finding of ledger.findings) {
    const label = finding?.id ?? "<missing-id>";
    if (finding?.severity !== expectedSeverity(label)) fail(errors, `${label}: severity does not match its audit prefix.`);
    if (typeof finding?.title !== "string" || finding.title.trim().length === 0) fail(errors, `${label}: title must be nonempty.`);
    if (!allowedStatuses.has(finding?.status)) fail(errors, `${label}: status is not allowed.`);
    else statusCounts[finding.status] += 1;
    if (!nonemptyStrings(finding?.progress)) fail(errors, `${label}: progress must contain at least one nonempty statement.`);
    if (!nonemptyStrings(finding?.remainingGates)) fail(errors, `${label}: remainingGates must contain at least one nonempty statement.`);
    if (!relativeEvidenceRefs(finding?.evidenceRefs)) {
      fail(errors, `${label}: evidenceRefs must contain safe workspace-relative paths.`);
    } else {
      for (const evidenceRef of finding.evidenceRefs) {
        if (!fs.existsSync(path.resolve(workspaceRoot, evidenceRef))) fail(errors, `${label}: evidenceRef does not exist: ${evidenceRef}`);
      }
    }

    const completion = finding?.completion;
    if (!completion || typeof completion !== "object" || Array.isArray(completion)) {
      fail(errors, `${label}: completion must be an object.`);
      continue;
    }
    for (const key of ["production", "stagingCurrentCandidate", "localReleaseReady"]) {
      if (typeof completion[key] !== "boolean") fail(errors, `${label}: completion.${key} must be boolean.`);
    }
    if (completion.production !== false) {
      productionComplete += 1;
      fail(errors, `${label}: production completion is forbidden without retained live production evidence.`);
    }
    if (completion.stagingCurrentCandidate === true) stagingComplete += 1;
    if (completion.localReleaseReady === true) localReleaseReady += 1;
  }

  const summary = ledger.summary ?? {};
  if (summary.totalFindings !== expectedIds.length) fail(errors, "summary.totalFindings must be 32.");
  if (summary.productionComplete !== productionComplete || summary.productionComplete !== 0) fail(errors, "summary.productionComplete must be computed as 0.");
  if (summary.stagingCurrentCandidateComplete !== stagingComplete || summary.stagingCurrentCandidateComplete !== 0) fail(errors, "summary.stagingCurrentCandidateComplete must be computed as 0.");
  if (summary.localReleaseReady !== localReleaseReady || summary.localReleaseReady !== 0) fail(errors, "summary.localReleaseReady must be computed as 0.");
  for (const status of allowedStatuses) {
    if (summary.byStatus?.[status] !== statusCounts[status]) {
      fail(errors, `summary.byStatus.${status} must equal computed count ${statusCounts[status]}.`);
    }
  }

  return errors;
}

const root = process.cwd();
const inputPath = path.resolve(root, process.argv[2] ?? "remediation/status-v2/finding-completion-ledger.json");
let ledger;
try {
  ledger = JSON.parse(fs.readFileSync(inputPath, "utf8"));
} catch (error) {
  console.error(JSON.stringify({ result: "fail", inputPath, errors: [`Unable to read or parse ledger: ${error.message}`] }, null, 2));
  process.exit(1);
}

const errors = verify(ledger, root);
const result = {
  result: errors.length === 0 ? "pass" : "fail",
  inputPath,
  releasePosture: ledger.truthBoundary?.releasePosture ?? null,
  candidate: {
    version: ledger.truthBoundary?.localCandidate?.version ?? null,
    status: ledger.truthBoundary?.localCandidate?.status ?? null,
    sha256: ledger.truthBoundary?.localCandidate?.sha256 ?? null,
    currentPackage: ledger.truthBoundary?.localCandidate?.releaseZipCurrent ?? null,
    deployedToStaging: ledger.truthBoundary?.localCandidate?.deployedToStaging ?? null,
    sourcePhpLint: ledger.truthBoundary?.localCandidate?.currentSourcePhpLint ?? null,
    policyAssertions: ledger.truthBoundary?.localCandidate?.policyAssertions ?? null,
    schemaAuthorAssertions: ledger.truthBoundary?.localCandidate?.schemaAuthorAssertions ?? null,
    packagedPhpLint: ledger.truthBoundary?.localCandidate?.packagedPhpLint ?? null,
    graphify: ledger.truthBoundary?.localCandidate?.graphify ?? null,
  },
  findings: Array.isArray(ledger.findings) ? ledger.findings.length : 0,
  uniqueIds: Array.isArray(ledger.findings) ? new Set(ledger.findings.map((finding) => finding?.id)).size : 0,
  productionComplete: Array.isArray(ledger.findings) ? ledger.findings.filter((finding) => finding?.completion?.production === true).length : null,
  statusCounts: Array.isArray(ledger.findings)
    ? Object.fromEntries([...allowedStatuses].map((status) => [status, ledger.findings.filter((finding) => finding?.status === status).length]))
    : {},
  errors,
};

console.log(JSON.stringify(result, null, 2));
process.exit(errors.length === 0 ? 0 : 1);
