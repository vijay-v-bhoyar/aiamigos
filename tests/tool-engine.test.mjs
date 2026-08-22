import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWorkflow,
  scoreBusinessUseCase,
  buildCareerRoadmap,
  buildTeachingPlan,
  buildEvaluationPlan,
  containsSensitiveInput,
} from '../src/lib/tool-engine.mjs';

test('workflow planner turns visitor inputs into a governed workflow', () => {
  const result = buildWorkflow({
    role: 'Operations manager',
    goal: 'Summarize weekly customer feedback',
    frequency: 'weekly',
    sensitivity: 'confidential',
    quality: 'high',
  });
  assert.equal(result.title, 'AI workflow for Summarize weekly customer feedback');
  assert.match(result.promptScaffold, /Operations manager/);
  assert.ok(result.humanGates.length >= 2);
  assert.match(result.privacyNote, /approved environment/i);
});

test('business scorecard explains a bounded input-derived score and ROI range', () => {
  const result = scoreBusinessUseCase({
    task: 'Classify support requests',
    monthlyHours: 80,
    hourlyCost: 40,
    repeatability: 5,
    dataReadiness: 4,
    risk: 3,
    expectedTimeSavedPercent: 25,
  });
  assert.ok(result.score >= 0 && result.score <= 100);
  assert.ok(result.explanations.length >= 3);
  assert.equal(result.roi.monthlyLow, 480);
  assert.equal(result.roi.monthlyHigh, 800);
  assert.match(result.roi.note, /input-derived/i);
});

test('career roadmap produces 30, 60, and 90 day phases for ages 15+', () => {
  const result = buildCareerRoadmap({
    currentRole: 'College student',
    targetRole: 'AI product manager',
    weeklyHours: 6,
    experience: 'beginner',
  });
  assert.deepEqual(result.phases.map((phase) => phase.days), [30, 60, 90]);
  assert.ok(result.portfolioProjects.length >= 2);
  assert.match(result.responsibleSearch.join(' '), /verify/i);
});

test('teaching planner includes integrity, privacy, and disclosure checks', () => {
  const result = buildTeachingPlan({
    learners: 'Higher education',
    objective: 'Compare evidence quality in AI answers',
    duration: 60,
    aiRole: 'Critique partner',
  });
  assert.match(result.disclosureLanguage, /AI/i);
  assert.ok(result.integrityChecks.length >= 2);
  assert.ok(result.privacyChecks.length >= 2);
});

test('builder workbench creates tests, failure taxonomy, gates, and rollback', () => {
  const result = buildEvaluationPlan({
    systemType: 'RAG',
    outcome: 'Answer policy questions with citations',
    riskLevel: 'high',
    sampleCount: 40,
  });
  assert.ok(result.testMatrix.length >= 4);
  assert.ok(result.failureTaxonomy.includes('Unsupported claim'));
  assert.ok(result.humanGates.length >= 2);
  assert.ok(result.rollbackChecklist.length >= 3);
});

test('sensitive-input warning detects common secrets without transmitting them', () => {
  assert.equal(containsSensitiveInput('My password is hunter2'), true);
  assert.equal(containsSensitiveInput('Plan a public workshop'), false);
});
