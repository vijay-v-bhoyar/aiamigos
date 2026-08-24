export const MIN_BENCHMARK_SAMPLE = 10;

export const playbooks = [
  {
    slug: 'support-triage-controlled-pilot',
    title: 'Run a controlled support-triage pilot',
    track: 'business',
    version: '1.0',
    status: 'reviewed-protocol',
    reviewer: 'AI Amigos Editorial Desk',
    reviewerScope: 'Protocol structure, privacy boundary, and measurement method',
    reviewedAt: '2026-08-24',
    nextReviewAt: '2026-11-22',
    summary: 'Compare a human-only baseline with an AI-assisted draft-and-review workflow without automating the final customer decision.',
    jobToBeDone: 'Test whether AI can reduce triage time while preserving routing accuracy and human approval.',
    sample: 'Editorial reference protocol; no community outcome is claimed.',
    baseline: ['Measure median triage minutes per case', 'Record routing accuracy on a fixed reviewed sample', 'Record escalation and rework rates'],
    method: ['Select 30 non-sensitive historical cases', 'Blind the reviewer to the workflow variant', 'Run human-only and AI-assisted variants', 'Require human approval before any external action'],
    evaluation: ['Median minutes per case', 'Routing accuracy', 'Critical miss count', 'Reviewer override rate'],
    limitations: ['The protocol is an editorial starting point, not evidence that AI improves support work.', 'Do not include customer personal data unless an approved data-processing agreement and access control exist.'],
    sources: ['https://www.nist.gov/itl/ai-risk-management-framework', 'https://www.iso.org/standard/81230.html'],
    revisions: [{ version: '1.0', date: '2026-08-24', note: 'Initial editorial protocol.' }],
  },
  {
    slug: 'portfolio-proof-weekly-cycle',
    title: 'Build portfolio proof in a weekly evidence cycle',
    track: 'careers',
    version: '1.0',
    status: 'reviewed-protocol',
    reviewer: 'AI Amigos Editorial Desk',
    reviewerScope: 'Evidence rubric, privacy boundary, and claim language',
    reviewedAt: '2026-08-24',
    nextReviewAt: '2026-11-22',
    summary: 'Turn one role-relevant task into a reproducible portfolio artifact with a baseline, evaluation, limitations, and verification notes.',
    jobToBeDone: 'Create verifiable proof of skill without inventing job outcomes or exposing employer information.',
    sample: 'Editorial reference protocol; no community outcome is claimed.',
    baseline: ['Choose one target role and current job description', 'Score present evidence against a role-specific rubric', 'Record the time required without AI assistance'],
    method: ['Define a small artifact that can be completed in one week', 'Record AI assistance and human decisions', 'Test the output against the rubric', 'Publish only sanitized evidence'],
    evaluation: ['Rubric score change', 'Reproducibility', 'Source quality', 'Disclosure completeness'],
    limitations: ['Portfolio quality does not guarantee interviews or employment.', 'Labor-market requirements vary by region, role, and date.'],
    sources: ['https://www.bls.gov/ooh/computer-and-information-technology/home.htm', 'https://www.nist.gov/itl/ai-risk-management-framework'],
    revisions: [{ version: '1.0', date: '2026-08-24', note: 'Initial editorial protocol.' }],
  },
  {
    slug: 'assessment-with-declared-ai-roles',
    title: 'Design an assessment with declared AI roles',
    track: 'teaching',
    version: '1.0',
    status: 'reviewed-protocol',
    reviewer: 'AI Amigos Editorial Desk',
    reviewerScope: 'Protocol structure, learner privacy, accessibility, and measurement method',
    reviewedAt: '2026-08-24',
    nextReviewAt: '2026-11-22',
    summary: 'Specify where AI is permitted, required, or prohibited, then compare learner evidence against an explicit rubric.',
    jobToBeDone: 'Use AI in an assessment without hiding its role or weakening the evidence of learning.',
    sample: 'Editorial reference protocol; no community outcome is claimed.',
    baseline: ['Identify the learning objective', 'Record the current assessment rubric', 'Document accessibility and privacy constraints'],
    method: ['Label AI-permitted stages', 'Add process evidence requirements', 'Test the rubric on sample work', 'Collect learner feedback without personal data'],
    evaluation: ['Objective alignment', 'Process evidence quality', 'Accessibility', 'Disclosure compliance'],
    limitations: ['Institutional policy and applicable law take precedence.', 'The protocol does not determine academic misconduct.'],
    sources: ['https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research', 'https://www.w3.org/TR/WCAG22/'],
    revisions: [{ version: '1.0', date: '2026-08-24', note: 'Initial editorial protocol.' }],
  },
  {
    slug: 'rag-change-evaluation-gate',
    title: 'Gate a RAG change with a fixed evaluation set',
    track: 'builders',
    version: '1.0',
    status: 'reviewed-protocol',
    reviewer: 'AI Amigos Editorial Desk',
    reviewerScope: 'Evaluation structure, version traceability, and rollback controls',
    reviewedAt: '2026-08-24',
    nextReviewAt: '2026-11-22',
    summary: 'Compare two retrieval configurations on the same versioned cases, failure taxonomy, latency, and cost gates.',
    jobToBeDone: 'Decide whether a RAG change is safe to ship using reproducible evidence instead of a demo impression.',
    sample: 'Editorial reference protocol; no community outcome is claimed.',
    baseline: ['Freeze a representative evaluation set', 'Record current configuration and dependencies', 'Define pass, latency, cost, and rollback thresholds'],
    method: ['Run both versions on identical cases', 'Blind qualitative review where feasible', 'Record retrieval and answer failures separately', 'Stop if any critical gate fails'],
    evaluation: ['Pass rate', 'Citation support', 'P50/P95 latency', 'Cost per case', 'Critical failure count'],
    limitations: ['A fixed set can miss production distribution shifts.', 'Cost and latency depend on provider, region, cache state, and date.'],
    sources: ['https://www.nist.gov/itl/ai-risk-management-framework', 'https://owasp.org/www-project-top-10-for-large-language-model-applications/'],
    revisions: [{ version: '1.0', date: '2026-08-24', note: 'Initial editorial protocol.' }],
  },
];

export const challenges = [
  { slug: 'business-baseline-week', track: 'business', title: 'Baseline before you automate', month: 'September 2026', prompt: 'Measure one repeated process for five working days before choosing an AI intervention.', protocol: 'Record frequency, human time, defects, rework, data boundary, and approval owner.', status: 'scheduled' },
  { slug: 'career-proof-week', track: 'careers', title: 'One verifiable portfolio proof', month: 'September 2026', prompt: 'Build and test one role-relevant artifact with an explicit AI-use disclosure.', protocol: 'Use a public rubric, record revisions, and remove employer or student information.', status: 'scheduled' },
  { slug: 'teaching-ai-role-week', track: 'teaching', title: 'Declare the AI role', month: 'September 2026', prompt: 'Redesign one learning task so permitted, required, and prohibited AI use is unambiguous.', protocol: 'Test the instructions and rubric with sample work before learner use.', status: 'scheduled' },
  { slug: 'builder-failure-week', track: 'builders', title: 'Find failures before features', month: 'September 2026', prompt: 'Create ten adversarial or boundary cases for one AI workflow.', protocol: 'Freeze the cases, version the system, classify failures, and define a rollback gate.', status: 'scheduled' },
];

export const benchmarkDefinitions = [
  { slug: 'support-triage', track: 'business', task: 'AI-assisted support triage', sampleCount: 0, reviewStatus: 'collecting', metric: 'median minutes per reviewed case' },
  { slug: 'portfolio-proof', track: 'careers', task: 'Weekly portfolio proof cycle', sampleCount: 0, reviewStatus: 'collecting', metric: 'rubric score change' },
  { slug: 'declared-ai-assessment', track: 'teaching', task: 'Assessment with declared AI roles', sampleCount: 0, reviewStatus: 'collecting', metric: 'rubric alignment score' },
  { slug: 'rag-change-gate', track: 'builders', task: 'RAG change evaluation', sampleCount: 0, reviewStatus: 'collecting', metric: 'case pass rate' },
];

export function isBenchmarkPublishable(snapshot) {
  return Number(snapshot?.sampleCount) >= MIN_BENCHMARK_SAMPLE && snapshot?.reviewStatus === 'reviewed';
}

export function quantile(sorted, probability) {
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index); const remainder = index - lower;
  return sorted[lower + 1] === undefined ? sorted[lower] : sorted[lower] + remainder * (sorted[lower + 1] - sorted[lower]);
}

export function aggregateBenchmark(reports = [], metadata = {}) {
  const values = reports.map((item) => Number(item.value)).filter(Number.isFinite).sort((a, b) => a - b);
  const sampleCount = values.length;
  const reviewed = metadata.reviewStatus === 'reviewed';
  if (sampleCount < MIN_BENCHMARK_SAMPLE || !reviewed) return { ...metadata, sampleCount, publishable: false, suppressionReason: sampleCount < MIN_BENCHMARK_SAMPLE ? `At least ${MIN_BENCHMARK_SAMPLE} reviewed reports are required.` : 'Editorial review is required.' };
  return { ...metadata, sampleCount, publishable: true, median: quantile(values, .5), q1: quantile(values, .25), q3: quantile(values, .75) };
}

export function buildRunReport(project, playbookSlug) {
  if (!project?.id || !playbookSlug) throw new Error('A project and playbook are required');
  return { schemaVersion: 1, playbookSlug, projectId: project.id, track: project.track, evaluationCount: project.evaluations?.length ?? 0, outcomeCount: project.outcomes?.length ?? 0, status: 'private-draft', containsRawInputs: false, createdAt: new Date().toISOString() };
}

export const playbookBySlug = Object.fromEntries(playbooks.map((item) => [item.slug, item]));
