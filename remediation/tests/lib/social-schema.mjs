import { createHash } from "node:crypto";
import { comparableUrl, normalizeUrl } from "./html.mjs";

function integer24LE(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

/**
 * Read intrinsic raster dimensions without decoding or rewriting the asset.
 * The deliberately small format allowlist matches the social-image MIME
 * allowlist; an uninspectable format is evidence failure, not inferred proof.
 */
export function inspectRasterImage(input) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input ?? []);
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { format: "png", width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length >= 10 && /^(?:GIF87a|GIF89a)$/.test(bytes.subarray(0, 6).toString("ascii"))) {
    return { format: "gif", width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  }
  if (bytes.length >= 30 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    const chunk = bytes.subarray(12, 16).toString("ascii");
    if (chunk === "VP8X" && bytes.length >= 30) {
      return { format: "webp", width: integer24LE(bytes, 24) + 1, height: integer24LE(bytes, 27) + 1 };
    }
    if (chunk === "VP8 " && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      return { format: "webp", width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
      const b1 = bytes[21];
      const b2 = bytes[22];
      const b3 = bytes[23];
      const b4 = bytes[24];
      return {
        format: "webp",
        width: 1 + b1 + ((b2 & 0x3f) << 8),
        height: 1 + ((b2 & 0xc0) >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10),
      };
    }
    return { format: "webp", width: null, height: null };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      while (bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset];
      offset += 1;
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) {
        return { format: "jpeg", width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
      }
      offset += length;
    }
    return { format: "jpeg", width: null, height: null };
  }
  return { format: null, width: null, height: null };
}

export function socialImageResponseEvidence(response) {
  const bodyBytes = Buffer.isBuffer(response?.bodyBytes) ? response.bodyBytes : Buffer.from(response?.bodyBytes ?? []);
  const dimensions = inspectRasterImage(bodyBytes);
  return {
    observed: Boolean(response?.observed),
    status: Number(response?.status) || null,
    finalUrl: response?.finalUrl ?? null,
    redirectCount: Number.isFinite(Number(response?.redirectCount)) ? Number(response.redirectCount) : Math.max(0, (response?.chain?.length ?? 1) - 1),
    contentType: String(response?.headers?.["content-type"] ?? "").split(";", 1)[0].trim().toLowerCase() || null,
    contentLength: bodyBytes.length,
    sha256: bodyBytes.length ? createHash("sha256").update(bodyBytes).digest("hex").toUpperCase() : null,
    ...dimensions,
  };
}

export function socialImageResponseViolations(response, {
  requestedUrl,
  allowedContentTypes = ["image/png", "image/jpeg", "image/webp"],
  maxBytes = 5_000_000,
} = {}) {
  const evidence = socialImageResponseEvidence(response);
  const violations = [];
  if (!evidence.observed) return [{ code: "unobserved", message: "Social image was not observed." }];
  if (evidence.status !== 200) violations.push({ code: "unexpected_status", message: "Social image did not return 200.", actual: evidence.status });
  if (evidence.redirectCount !== 0 || (requestedUrl && comparableUrl(requestedUrl) !== comparableUrl(evidence.finalUrl))) {
    violations.push({ code: "unexpected_redirect", message: "Social image must resolve directly at the referenced URL.", actual: evidence.finalUrl });
  }
  if (!allowedContentTypes.map((value) => value.toLowerCase()).includes(evidence.contentType ?? "")) {
    violations.push({ code: "unsupported_content_type", message: "Social image Content-Type is not approved.", actual: evidence.contentType, expected: allowedContentTypes });
  }
  if (!evidence.contentLength) violations.push({ code: "empty_body", message: "Social image response body is empty." });
  if (evidence.contentLength > maxBytes) violations.push({ code: "oversize", message: "Social image exceeds the configured byte limit.", actual: evidence.contentLength, expectedMaximum: maxBytes });
  if (!evidence.format || !evidence.width || !evidence.height) violations.push({ code: "dimensions_unproven", message: "Intrinsic social image dimensions could not be read from the response bytes." });
  return violations;
}

export function approvedFallbackViolations(approval, response, { requestedUrl, allowedContentTypes, maxBytes } = {}) {
  const expected = approval ?? {};
  const violations = [];
  if (expected.status !== "approved") violations.push({ code: "not_approved", message: "The 1200x630 fallback social card has no explicit approved status." });
  for (const field of ["url", "sha256", "approvedBy", "approvedAt", "evidenceId"]) {
    if (!String(expected[field] ?? "").trim()) violations.push({ code: `missing_${field}`, message: `Fallback approval is missing ${field}.` });
  }
  if (Number(expected.width) !== 1200 || Number(expected.height) !== 630) {
    violations.push({ code: "approval_dimensions", message: "Fallback approval must specify exactly 1200x630.", actual: { width: expected.width ?? null, height: expected.height ?? null } });
  }
  if (!response) return violations;
  violations.push(...socialImageResponseViolations(response, { requestedUrl, allowedContentTypes, maxBytes }));
  const evidence = socialImageResponseEvidence(response);
  if (evidence.width !== 1200 || evidence.height !== 630) violations.push({ code: "asset_dimensions", message: "Fetched fallback social card is not exactly 1200x630.", actual: { width: evidence.width, height: evidence.height } });
  if (expected.sha256 && evidence.sha256 !== String(expected.sha256).trim().toUpperCase()) {
    violations.push({ code: "hash_mismatch", message: "Fetched fallback bytes do not match the approved SHA-256.", actual: evidence.sha256, expected: String(expected.sha256).trim().toUpperCase() });
  }
  return violations;
}

function normalizedText(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

function validApproval(record) {
  return record?.status === "approved"
    && String(record.type ?? "").trim()
    && String(record.name ?? "").trim()
    && String(record.approvedBy ?? "").trim()
    && String(record.approvedAt ?? "").trim()
    && String(record.evidenceId ?? "").trim();
}

function approvalMatches(record, entity, type, pageUrl) {
  if (!validApproval(record) || normalizedText(record.type) !== normalizedText(type) || normalizedText(record.name) !== normalizedText(entity.name)) return false;
  if (record.url && comparableUrl(record.url, pageUrl) !== comparableUrl(entity.url || entity.id, pageUrl)) return false;
  if (record.scopePath && !new RegExp(record.scopePath, "i").test(new URL(pageUrl).pathname)) return false;
  return true;
}

function relationshipApprovalMatches(record, relationship, pageUrl) {
  if (!validApproval(record) || normalizedText(record.relationship) !== normalizedText(relationship.relation)) return false;
  const target = relationship.target ?? {};
  if (target.name && normalizedText(record.name) !== normalizedText(target.name)) return false;
  const targetUrl = target.url || target.id;
  if (targetUrl && (!record.url || comparableUrl(record.url, pageUrl) !== comparableUrl(targetUrl, pageUrl))) return false;
  if (target.types?.length && !target.types.some((type) => normalizedText(type) === normalizedText(record.type))) return false;
  return Boolean(target.name || targetUrl);
}

/**
 * Conservative semantics gate. Parsing is handled elsewhere; this function
 * requires each emitted type to be allowlisted, checks page/template claims
 * against DOM evidence, and requires approval packets for identity/review types.
 */
export function schemaSemanticViolations(analysis, pageUrl, {
  allowedTypes = [],
  approvalRequiredTypes = ["Person", "Organization", "EducationalOrganization", "Review"],
  claimAllowlist = [],
  collectionPagePathPatterns = ["^/blog/?$"],
  articleDeniedPathPatterns = ["^/$", "^/blog/?$"],
  articleBodyClassPatterns = ["\\bsingle-post\\b"],
} = {}) {
  const violations = [];
  const allowed = new Set(allowedTypes.map(normalizedText));
  const approvalTypes = new Set(approvalRequiredTypes.map(normalizedText));
  const pathname = new URL(pageUrl).pathname;
  const h1Names = (analysis?.h1 ?? []).map((entry) => normalizedText(entry.text)).filter(Boolean);
  const visible = normalizedText(analysis?.bodyText ?? analysis?.visibleText);
  for (const entity of analysis?.schema?.entities ?? []) {
    for (const type of entity.types ?? []) {
      if (!allowed.has(normalizedText(type))) {
        violations.push({ code: "type_not_allowlisted", message: "JSON-LD type is not in the reviewed project allowlist.", type, entity: entity.name || entity.id || null });
        continue;
      }
      if (approvalTypes.has(normalizedText(type)) && !claimAllowlist.some((record) => approvalMatches(record, entity, type, pageUrl))) {
        violations.push({ code: "claim_not_approved", message: "Identity/review schema claim has no matching complete approval packet.", type, name: entity.name || null, url: entity.url || entity.id || null });
      }
      if (normalizedText(type) === "person" && entity.name && !visible.includes(normalizedText(entity.name))) {
        violations.push({ code: "person_not_visible", message: "Person schema name is not visible in the captured page DOM.", name: entity.name });
      }
      if (["article", "blogposting"].includes(normalizedText(type))) {
        if (articleDeniedPathPatterns.some((pattern) => new RegExp(pattern, "i").test(pathname))) {
          violations.push({ code: "article_wrong_template", message: "Article/BlogPosting schema is forbidden on this configured route template.", type, pathname });
        }
        const bodyClassText = (analysis?.bodyClasses ?? []).join(" ");
        const hasArticleTemplateEvidence = Boolean(analysis?.semanticElements?.articleCount)
          || articleBodyClassPatterns.some((pattern) => new RegExp(pattern, "i").test(bodyClassText));
        if (!hasArticleTemplateEvidence) violations.push({ code: "article_dom_missing", message: "Article/BlogPosting schema has no <article> or approved body-template-class DOM evidence.", type, bodyClasses: analysis?.bodyClasses ?? [] });
        const headline = normalizedText(entity.headline || entity.name);
        if (!headline || !h1Names.includes(headline)) violations.push({ code: "headline_h1_mismatch", message: "Article/BlogPosting headline does not exactly match a visible H1.", type, headline: entity.headline || entity.name || null, h1: (analysis?.h1 ?? []).map((entry) => entry.text) });
      }
      if (normalizedText(type) === "collectionpage") {
        if (!collectionPagePathPatterns.some((pattern) => new RegExp(pattern, "i").test(pathname))) {
          violations.push({ code: "collection_wrong_template", message: "CollectionPage schema appears outside an approved collection route.", pathname });
        }
        const name = normalizedText(entity.name);
        if (name && !h1Names.includes(name)) violations.push({ code: "collection_h1_mismatch", message: "CollectionPage name does not exactly match a visible H1.", name: entity.name, h1: (analysis?.h1 ?? []).map((entry) => entry.text) });
      }
      if (normalizedText(type) === "webpage" && entity.url && comparableUrl(entity.url, pageUrl) !== comparableUrl(pageUrl)) {
        violations.push({ code: "webpage_url_mismatch", message: "WebPage schema URL does not match the canonical page under test.", actual: entity.url, expected: pageUrl });
      }
    }
  }
  for (const relationship of analysis?.schema?.relationships ?? []) {
    if (!claimAllowlist.some((record) => relationshipApprovalMatches(record, relationship, pageUrl))) {
      violations.push({
        code: "relationship_not_approved",
        message: "Author, publisher, reviewer, or works-for relationship has no matching complete approval packet.",
        relationship: relationship.relation,
        ownerTypes: relationship.owner?.types ?? [],
        targetTypes: relationship.target?.types ?? [],
        name: relationship.target?.name || null,
        url: relationship.target?.url || relationship.target?.id || null,
      });
    }
    if (["author", "reviewedBy"].includes(relationship.relation) && relationship.target?.name && !visible.includes(normalizedText(relationship.target.name))) {
      violations.push({ code: "relationship_identity_not_visible", message: "Author/reviewer relationship name is not visible in the captured page DOM.", relationship: relationship.relation, name: relationship.target.name });
    }
  }
  return violations;
}

export function resolvedSocialImage(value, pageUrl) {
  const normalized = normalizeUrl(value, pageUrl);
  if (!normalized || !/^https:$/.test(new URL(normalized).protocol)) return null;
  return normalized;
}
