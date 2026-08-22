import { comparableUrl } from "./html.mjs";

export function isHealthyFinalResponse(response) {
  return Boolean(response?.observed) && Number(response.status) === 200;
}

export function permanentRedirectViolations(response, expectedFinalUrl) {
  const violations = [];
  if (!response?.observed) {
    violations.push({ code: "unobserved", message: "Redirect response was not observed." });
    return violations;
  }

  const initialStatus = Number(response.chain?.[0]?.status);
  if (![301, 308].includes(initialStatus)) {
    violations.push({ code: "not_permanent", message: "Initial response is not a permanent 301/308 redirect.", actual: initialStatus || null });
  }
  if (comparableUrl(response.finalUrl) !== comparableUrl(expectedFinalUrl)) {
    violations.push({ code: "wrong_destination", message: "Redirect resolved to the wrong final URL.", actual: response.finalUrl ?? null, expected: expectedFinalUrl });
  }
  if (!isHealthyFinalResponse(response)) {
    violations.push({ code: "unhealthy_final", message: "Redirect destination did not return a healthy final 200 response.", actual: response.status ?? null });
  }
  return violations;
}

export function quarantinedRouteViolations(response, { indexable = null } = {}) {
  const violations = [];
  if (!response?.observed) {
    violations.push({ code: "unobserved", message: "Quarantined route was not observed." });
    return violations;
  }
  const status = Number(response.status);
  const redirectCount = Number.isFinite(Number(response.redirectCount))
    ? Number(response.redirectCount)
    : Math.max(0, (response.chain?.length ?? 1) - 1);
  if (redirectCount !== 0 || comparableUrl(response.requestedUrl) !== comparableUrl(response.finalUrl)) {
    violations.push({ code: "unexpected_redirect", message: "Quarantined route must resolve directly without redirecting.", actual: response.finalUrl ?? null });
  }
  if (status !== 200) {
    violations.push({ code: "unexpected_status", message: "Quarantined route must return a readable non-404/410 HTML response.", actual: status || null, expected: 200 });
  } else if (indexable !== false) {
    violations.push({ code: "missing_noindex", message: "Readable quarantined route remains indexable or its noindex state could not be proven.", actual: indexable });
  }
  return violations;
}

export function unpublishedRouteViolations(response) {
  const violations = [];
  if (!response?.observed) {
    violations.push({ code: "unobserved", message: "Expected unpublished route was not observed." });
    return violations;
  }
  const status = Number(response.status);
  const redirectCount = Number.isFinite(Number(response.redirectCount))
    ? Number(response.redirectCount)
    : Math.max(0, (response.chain?.length ?? 1) - 1);
  if (redirectCount !== 0 || comparableUrl(response.requestedUrl) !== comparableUrl(response.finalUrl)) {
    violations.push({ code: "unexpected_redirect", message: "Unpublished route must not redirect to another public surface.", actual: response.finalUrl ?? null });
  }
  if (![404, 410].includes(status)) {
    violations.push({ code: "publicly_available", message: "Unpublished route must return 404 or 410.", actual: status || null, expected: [404, 410] });
  }
  return violations;
}

export function canonicalEvidenceDisposition(rows, severity) {
  if (rows.length) return "evaluate";
  return severity === "critical" ? "fail" : "skip";
}

export function partitionStaticPerformanceRows(rows) {
  const analyzed = rows.filter((row) => row?.analysis && row?.response?.observed);
  return {
    healthy: analyzed.filter((row) => isHealthyFinalResponse(row.response)),
    unhealthy: analyzed.filter((row) => !isHealthyFinalResponse(row.response)),
  };
}

export function pagerProbeUpperBound(expectedPagerPages, discoveredPageNumbers = []) {
  const expected = Number.isFinite(Number(expectedPagerPages)) ? Math.max(1, Math.trunc(Number(expectedPagerPages))) : 1;
  const discovered = discoveredPageNumbers
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value >= 1)
    .map(Math.trunc);
  return Math.max(expected, 1, ...discovered);
}

export function feedQuarantineEvidence(xml, forbiddenPaths = []) {
  const body = String(xml ?? "").toLowerCase();
  const forbiddenHits = [];
  for (const path of forbiddenPaths) {
    const normalizedPath = String(path ?? "").trim().toLowerCase();
    if (!normalizedPath) continue;
    const slug = normalizedPath.split("/").filter(Boolean).at(-1) ?? "";
    if (body.includes(normalizedPath) || (slug && body.includes(slug))) forbiddenHits.push(normalizedPath);
  }
  return {
    itemCount: (body.match(/<item\b/g) ?? []).length,
    forbiddenHits: [...new Set(forbiddenHits)],
  };
}
