import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { methodExamples, pilotReadyRelease } from '../src/data/pilot-ready-release.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
const outputDir = path.join(publicRoot, 'releases', pilotReadyRelease.id);

const artifactPaths = [
  ...methodExamples.flatMap((item) => [item.jsonPath, item.schemaPath]),
  '/pilot-kit/pilot-preregistration.template.json',
  '/pilot-kit/proof-pack-submission.template.json',
  '/pilot-kit/participant-checklist.md',
  '/reviewer-kit/external-review-checklist.md',
  '/reviewer-kit/external-review-record.template.json',
];

const uniquePaths = [...new Set(artifactPaths)].sort();
const files = uniquePaths.map((publicPath) => {
  const full = path.join(publicRoot, publicPath.replace(/^\//, ''));
  if (!fs.existsSync(full)) throw new Error(`Release artifact missing: ${publicPath}`);
  const body = fs.readFileSync(full);
  return { path: publicPath, bytes: body.byteLength, sha256: crypto.createHash('sha256').update(body).digest('hex') };
});

const manifest = {
  schemaVersion: 1,
  releaseId: pilotReadyRelease.id,
  releasedAt: pilotReadyRelease.releasedAt,
  title: pilotReadyRelease.title,
  status: pilotReadyRelease.status,
  canonicalUrl: `https://www.aiamigos.org/releases/${pilotReadyRelease.id}/`,
  nonClaim: pilotReadyRelease.nonClaim,
  artifactCount: files.length,
  files,
};

fs.mkdirSync(outputDir, { recursive: true });
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
const target = path.join(outputDir, 'manifest.json');
if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== serialized) fs.writeFileSync(target, serialized, 'utf8');
console.log(`Evidence release ${pilotReadyRelease.id}: ${files.length} artifacts hashed into ${path.relative(root, target)}.`);
