import test from 'node:test';
import assert from 'node:assert/strict';

import { createProject, transitionProject, addArtifact, addExperiment, addEvaluation, addOutcome, evaluationSummary, buildProofPack, sanitizeProofPack } from '../src/lib/practice-os.mjs';
import { PROJECT_STAGES, TRACK_BLUEPRINTS } from '../src/data/practice-blueprints.mjs';
import { createProjectStore } from '../src/lib/local-project-store.mjs';

test('all four track blueprints share the complete practice cycle', () => {
  assert.deepEqual(PROJECT_STAGES, ['frame', 'baseline', 'experiment', 'evaluate', 'decide', 'follow-up', 'publish']);
  assert.deepEqual(Object.keys(TRACK_BLUEPRINTS), ['business', 'careers', 'teaching', 'builders']);
  for (const blueprint of Object.values(TRACK_BLUEPRINTS)) {
    assert.ok(blueprint.promise);
    assert.ok(blueprint.metricLabel);
    assert.ok(blueprint.questions.length >= 3);
  }
});

test('project records work across stages and produces a measurable proof pack', () => {
  let project = createProject({ title: 'Support triage pilot', track: 'business', goal: 'Classify support requests' });
  for (const stage of PROJECT_STAGES.slice(1, 4)) project = transitionProject(project, stage);
  project = addArtifact(project, { type: 'baseline', title: 'Baseline', content: '120 minutes per week' });
  project = addExperiment(project, { method: 'manual import', provider: 'OpenAI', model: 'test-model', inputLabel: 'Case 01', output: 'Draft classification' });
  project = addEvaluation(project, { caseLabel: 'Case 01', score: 4, expected: 'Correct category', observed: 'Correct category' });
  project = addOutcome(project, { metric: 'Cycle time', baseline: '120', target: '60', value: 72, unit: 'minutes' });
  assert.equal(project.experiments.length, 1);
  assert.equal(project.evaluations.length, 1);
  assert.equal(project.outcomes.length, 1);
  assert.deepEqual(evaluationSummary(project), { count: 1, average: 4, band: 'Strong evidence' });
  assert.equal(buildProofPack(project).evaluation.band, 'Strong evidence');
  assert.equal(sanitizeProofPack(project).sensitivity, 'public');
  assert.equal(sanitizeProofPack(project).publication.license, 'CC BY-SA 4.0');
});

test('stage transitions reject skipped stages and preserve history', () => {
  const project = createProject({ title: 'A project', track: 'builders' });
  assert.throws(() => transitionProject(project, 'evaluate'), /Cannot move/);
  const next = transitionProject(project, 'baseline', 'Baseline started');
  assert.equal(next.history.at(-1).note, 'Baseline started');
});

test('local project store persists projects and drains idempotent sync work', async () => {
  const store = createProjectStore({ indexedDb: undefined, storage: undefined });
  const project = createProject({ title: 'Offline project', track: 'teaching' });
  await store.saveProject(project);
  await store.enqueue({ operation: 'upsert', id: project.id });
  assert.equal((await store.listProjects()).length, 1);
  assert.deepEqual((await store.drainQueue()).map((item) => item.operation), ['upsert']);
  assert.deepEqual(await store.drainQueue(), []);
});
