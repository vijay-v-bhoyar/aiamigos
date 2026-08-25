import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { methodExamples, pilotPackages, pilotReadyRelease, validatePilotReadyRelease } from '../src/data/pilot-ready-release.mjs';
import { adoptions, verifiedOutcomes, independentReviews, externalCitations } from '../src/data/evidence-platform.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative));

test('all synthetic examples validate against their published JSON Schemas', () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  for (const example of methodExamples) {
    const schema = JSON.parse(read(`public${example.schemaPath}`).toString('utf8'));
    const record = JSON.parse(read(`public${example.jsonPath}`).toString('utf8'));
    const validate = ajv.compile(schema);
    assert.equal(validate(record), true, `${example.slug}: ${ajv.errorsText(validate.errors)}`);
  }
});

test('synthetic fixtures cannot be mistaken for adoption, outcomes, reviews, or citations', () => {
  assert.deepEqual(validatePilotReadyRelease(), []);
  assert.equal(methodExamples.length, 3);
  assert.equal(pilotPackages.length, 4);
  assert.deepEqual(adoptions, []);
  assert.deepEqual(verifiedOutcomes, []);
  assert.deepEqual(independentReviews, []);
  assert.deepEqual(externalCitations, []);
  for (const example of methodExamples) assert.match(`${example.title} ${example.scenario} ${example.summary}`, /synthetic|fictional|non-publication/i);
  const benchmark = JSON.parse(read('public/examples/benchmark-method.synthetic.json').toString('utf8'));
  assert.equal(benchmark.synthetic, true);
  assert.equal(benchmark.decision.publicationEligible, false);
  assert.ok(benchmark.reports.length < benchmark.gates.minimumReports);
  assert.ok(new Set(benchmark.reports.map((item) => item.organizationCode)).size < benchmark.gates.minimumOrganizations);
});

test('release manifest binds every artifact to bytes and SHA-256', () => {
  const manifest = JSON.parse(read(`public/releases/${pilotReadyRelease.id}/manifest.json`).toString('utf8'));
  assert.equal(manifest.releaseId, 'v0.1.1');
  assert.equal(manifest.status, 'author-controlled-release');
  assert.match(manifest.nonClaim, /not evidence of adoption/i);
  assert.equal(manifest.artifactCount, manifest.files.length);
  for (const file of manifest.files) {
    const body = read(`public${file.path}`);
    assert.equal(body.byteLength, file.bytes, file.path);
    assert.equal(crypto.createHash('sha256').update(body).digest('hex'), file.sha256, file.path);
  }
});

test('participant and reviewer templates fail closed on publication and independence', () => {
  const preregistration = JSON.parse(read('public/pilot-kit/pilot-preregistration.template.json').toString('utf8'));
  const proofPack = JSON.parse(read('public/pilot-kit/proof-pack-submission.template.json').toString('utf8'));
  const reviewer = JSON.parse(read('public/reviewer-kit/external-review-record.template.json').toString('utf8'));
  assert.equal(preregistration.status, 'private-draft');
  assert.equal(preregistration.publicationChoice, 'private-only');
  assert.equal(proofPack.status, 'private-draft');
  assert.equal(proofPack.consent.publishSanitizedRecord, false);
  assert.equal(reviewer.decision, 'changes-required');
  assert.equal(reviewer.reviewerControlledVerificationUrl, '');
  assert.match(reviewer.nonClaim, /does not by itself prove adoption/i);
});
