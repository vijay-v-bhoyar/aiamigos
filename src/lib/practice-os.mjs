import { PROJECT_STAGES, STAGE_LABELS, TRACK_BLUEPRINTS } from '../data/practice-blueprints.mjs';

const clean = (value, fallback = '') => String(value ?? fallback).trim();

export function makeId(prefix = 'id') {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `${prefix}_${uuid}` : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createProject(input = {}) {
  const track = TRACK_BLUEPRINTS[input.track] ? input.track : 'business';
  const title = clean(input.title, 'Untitled AI practice project');
  const now = new Date().toISOString();
  return {
    id: makeId('project'),
    schemaVersion: 1,
    title,
    track,
    blueprintVersion: 1,
    stage: 'frame',
    status: 'active',
    sensitivity: clean(input.sensitivity, 'internal'),
    goal: clean(input.goal, ''),
    ownerNote: clean(input.ownerNote, ''),
    artifacts: [],
    experiments: [],
    evaluations: [],
    outcomes: [],
    history: [{ stage: 'frame', at: now, note: 'Project created' }],
    createdAt: now,
    updatedAt: now,
  };
}

export function transitionProject(project, nextStage, note = '') {
  if (!project || !PROJECT_STAGES.includes(nextStage)) throw new Error('Unknown project stage');
  const currentIndex = PROJECT_STAGES.indexOf(project.stage);
  const nextIndex = PROJECT_STAGES.indexOf(nextStage);
  if (nextIndex > currentIndex + 1 || nextIndex < currentIndex - 1) throw new Error(`Cannot move from ${project.stage} to ${nextStage}`);
  const now = new Date().toISOString();
  return {
    ...project,
    stage: nextStage,
    status: nextStage === 'publish' ? 'ready-to-share' : project.status,
    history: [...project.history, { stage: nextStage, at: now, note: clean(note, STAGE_LABELS[nextStage]) }],
    updatedAt: now,
  };
}

function withTimestamp(item) {
  return { id: makeId('item'), ...item, createdAt: new Date().toISOString() };
}

export function addArtifact(project, input = {}) {
  return { ...project, artifacts: [...project.artifacts, withTimestamp({ type: clean(input.type, 'note'), title: clean(input.title, 'Untitled artifact'), content: clean(input.content), source: clean(input.source, 'user') })], updatedAt: new Date().toISOString() };
}

export function addExperiment(project, input = {}) {
  return { ...project, experiments: [...project.experiments, withTimestamp({ method: clean(input.method, 'manual import'), provider: clean(input.provider, 'not recorded'), model: clean(input.model, 'not recorded'), inputLabel: clean(input.inputLabel, 'Example case'), output: clean(input.output), notes: clean(input.notes) })], updatedAt: new Date().toISOString() };
}

export function addEvaluation(project, input = {}) {
  const score = Math.max(0, Math.min(5, Number(input.score) || 0));
  return { ...project, evaluations: [...project.evaluations, withTimestamp({ caseLabel: clean(input.caseLabel, 'Unnamed case'), dimension: clean(input.dimension, 'Overall quality'), score, expected: clean(input.expected), observed: clean(input.observed), failure: clean(input.failure) })], updatedAt: new Date().toISOString() };
}

export function addOutcome(project, input = {}) {
  const value = Number(input.value);
  return { ...project, outcomes: [...project.outcomes, withTimestamp({ metric: clean(input.metric, TRACK_BLUEPRINTS[project.track].metricLabel), baseline: clean(input.baseline), target: clean(input.target), value: Number.isFinite(value) ? value : null, unit: clean(input.unit), measuredAt: clean(input.measuredAt, new Date().toISOString().slice(0, 10)), note: clean(input.note) })], updatedAt: new Date().toISOString() };
}

export function evaluationSummary(project) {
  const scores = project?.evaluations?.map((item) => Number(item.score)).filter(Number.isFinite) ?? [];
  if (!scores.length) return { count: 0, average: null, band: 'Not evaluated' };
  const average = Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100;
  return { count: scores.length, average, band: average >= 4 ? 'Strong evidence' : average >= 3 ? 'Needs review' : 'Do not ship yet' };
}

export function buildProofPack(project) {
  const blueprint = TRACK_BLUEPRINTS[project.track];
  return {
    schemaVersion: project.schemaVersion,
    title: project.title,
    track: project.track,
    trackLabel: blueprint.label,
    goal: project.goal,
    stage: project.stage,
    sensitivity: project.sensitivity,
    artifacts: project.artifacts,
    experiments: project.experiments,
    evaluations: project.evaluations,
    evaluation: evaluationSummary(project),
    outcomes: project.outcomes,
    limitations: ['This proof pack records the supplied evidence; it does not independently verify claims.', 'Remove confidential or personal information before sharing.'],
    history: project.history,
    generatedAt: new Date().toISOString(),
  };
}

export function sanitizeProofPack(project) {
  const pack = buildProofPack(project);
  return {
    ...pack,
    sensitivity: 'public',
    artifacts: pack.artifacts.map(({ id, type, title }) => ({ id, type, title, content: '[Removed for public review]' })),
    experiments: pack.experiments.map(({ id, method, provider, model, inputLabel, notes, createdAt }) => ({ id, method, provider, model, inputLabel, notes, createdAt })),
    publication: { license: 'CC BY-SA 4.0', requiresHumanApproval: true, status: 'submitted' },
  };
}

export { PROJECT_STAGES, STAGE_LABELS, TRACK_BLUEPRINTS };
