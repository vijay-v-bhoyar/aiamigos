import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  methods, adoptions, verifiedOutcomes, independentReviews, publicEvidenceStats,
  canPublishAdoption, canPublishOutcome, canPublishIndependentReview, validateEvidencePlatform,
} from '../src/data/evidence-platform.mjs';

test('working methods are operational, sourced, versioned, and honestly author controlled', () => {
  assert.equal(methods.length,3);
  assert.deepEqual(validateEvidencePlatform(),[]);
  for (const method of methods) {
    assert.equal(method.evidenceTier,'author-controlled');
    assert.match(method.version,/^\d+\.\d+\.\d+$/);
    assert.ok(method.steps.length>=5);
    assert.ok(method.publicationGate.length>=5);
    assert.ok(method.sources.length>=2);
    assert.match(method.originalityStatus,/no claim|not been established|no public cohort/i);
  }
});

test('public independent-evidence registries start at zero instead of inventing proof', () => {
  assert.deepEqual(adoptions,[]);
  assert.deepEqual(verifiedOutcomes,[]);
  assert.deepEqual(independentReviews,[]);
  assert.equal(publicEvidenceStats.independentlyVerifiedAdoptions,0);
  assert.equal(publicEvidenceStats.reviewedOutcomes,0);
  assert.equal(publicEvidenceStats.externalCitations,0);
});

test('adoption publication requires approval, consent, version, and outside verification', () => {
  assert.equal(canPublishAdoption({status:'approved'}),false);
  assert.equal(canPublishAdoption({status:'approved',consentStatus:'granted',methodVersion:'0.1.0',externalVerificationUrl:'https://example.org/adoption'}),true);
});

test('outcome publication requires compatible numeric measurements, privacy, version, and review', () => {
  assert.equal(canPublishOutcome({status:'approved'}),false);
  assert.equal(canPublishOutcome({status:'approved',baseline:{value:10,unit:'minutes'},result:{value:8,unit:'minutes'},methodVersion:'0.1.0',reviewerId:'reviewer-1',privacyStatus:'passed'}),true);
  assert.equal(canPublishOutcome({status:'approved',baseline:{value:10,unit:'minutes'},result:{value:8,unit:'percent'},methodVersion:'0.1.0',reviewerId:'reviewer-1',privacyStatus:'passed'}),false);
});

test('independent review requires qualification, conflict disclosure, exact version, and outside verification', () => {
  assert.equal(canPublishIndependentReview({status:'approved'}),false);
  assert.equal(canPublishIndependentReview({status:'approved',reviewerName:'Reviewer',reviewerQualification:'Relevant practitioner',reviewedVersion:'0.1.0',conflictDisclosure:'None declared',externalVerificationUrl:'https://example.edu/review'}),true);
});

test('evidence migration defines the complete RLS-protected provenance model', () => {
  const sql=fs.readFileSync(new URL('../supabase/migrations/202608250001_public_evidence_platform.sql',import.meta.url),'utf8');
  for (const table of ['contributions','contribution_versions','prior_art_references','adopters','adoption_attestations','implementations','outcome_measurements','external_evidence','independent_reviews','reviewer_conflicts','citations','publications','recognition_events','judging_events','endeavor_milestones','evidence_claims','evidence_links','consent_records','evidence_snapshots']) {
    assert.match(sql,new RegExp(`create table public\\.${table} \\(`));
    assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(sql,/evidence_claims_private/);
  assert.match(sql,/consent_records_reviewer_only/);
  assert.doesNotMatch(sql,/grant select on public\.evidence_claims to anon/);
});

test('public and private evidence exchange schemas are valid JSON Schemas', () => {
  for (const name of ['workflow-evidence-record','public-evidence-record','counsel-evidence-record']) {
    const schema=JSON.parse(fs.readFileSync(new URL(`../public/schemas/${name}.schema.json`,import.meta.url),'utf8'));
    assert.equal(schema.$schema,'https://json-schema.org/draft/2020-12/schema');
    assert.equal(schema.type,'object');
    assert.ok(Array.isArray(schema.required));
    assert.ok(schema.required.length>=3);
  }
});

test('counsel export stays private and cannot manufacture a legal conclusion', () => {
  const script=fs.readFileSync(new URL('../scripts/export-counsel-evidence.mjs',import.meta.url),'utf8');
  const ignore=fs.readFileSync(new URL('../.gitignore',import.meta.url),'utf8');
  assert.match(ignore,/^private-evidence\/$/m);
  assert.match(ignore,/^counsel-exports\/$/m);
  assert.match(script,/staysInside\(input, privateRoot\)/);
  assert.match(script,/staysInside\(output, exportRoot\)/);
  assert.match(script,/remove legalConclusion/);
  assert.match(script,/never deploy to the public site/);
});
