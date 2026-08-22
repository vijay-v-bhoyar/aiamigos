const clean = (value, fallback = '') => String(value ?? fallback).trim();
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function containsSensitiveInput(value) {
  return /\b(password|passcode|secret|api[-_ ]?key|social security|ssn|credit card|patient|medical record)\b/i.test(clean(value));
}

export function buildWorkflow(input = {}) {
  const role = clean(input.role, 'Professional');
  const goal = clean(input.goal, 'Complete the task');
  const sensitivity = clean(input.sensitivity, 'internal');
  const quality = clean(input.quality, 'medium');
  const highCare = sensitivity === 'confidential' || quality === 'high';
  return {
    title: `AI workflow for ${goal}`,
    summary: `${role} uses AI as a draft-and-check assistant for a ${clean(input.frequency, 'recurring')} task.`,
    workflow: ['Define the desired outcome and acceptance criteria', 'Prepare the minimum necessary context', 'Generate a first draft', 'Check the result against the criteria', 'Approve, revise, or reject before use'],
    promptScaffold: `You are assisting a ${role}. Goal: ${goal}. Use only the supplied context. State assumptions, flag missing evidence, and return a result that can be checked against explicit criteria.`,
    evaluationChecklist: ['Factual claims are supported', 'Output matches the requested format', 'Sensitive details were excluded or approved', 'A person checked consequential decisions'],
    humanGates: highCare ? ['Approve data before entry', 'Review every material claim', 'Approve the final action'] : ['Review material claims', 'Approve the final action'],
    privacyNote: sensitivity === 'confidential' ? 'Use only an organization-approved environment and minimize confidential data.' : 'Use the minimum data needed and remove personal details.',
    assumptions: ['AI may produce plausible errors', 'A human remains responsible for the final use'],
  };
}

export function scoreBusinessUseCase(input = {}) {
  const repeatability = Math.max(1, Math.min(5, number(input.repeatability, 1)));
  const readiness = Math.max(1, Math.min(5, number(input.dataReadiness, 1)));
  const risk = Math.max(1, Math.min(5, number(input.risk, 3)));
  const score = Math.round(((repeatability * 8) + (readiness * 8) + ((6 - risk) * 4)) / 100 * 100);
  const hours = Math.max(0, number(input.monthlyHours));
  const rate = Math.max(0, number(input.hourlyCost));
  const saved = Math.max(0, Math.min(100, number(input.expectedTimeSavedPercent))) / 100;
  const gross = hours * rate * saved;
  return {
    title: `Use-case scorecard: ${clean(input.task, 'Proposed process')}`,
    score,
    band: score >= 70 ? 'Strong pilot candidate' : score >= 50 ? 'Test with tight controls' : 'Improve readiness before piloting',
    explanations: [`Repeatability contributes ${repeatability * 8} points.`, `Data readiness contributes ${readiness * 8} points.`, `Risk adjustment contributes ${(6 - risk) * 4} points.`],
    risks: risk >= 4 ? ['High consequence if the output is wrong', 'Require human approval and a rollback path'] : ['Measure error cost', 'Keep a human exception path'],
    pilotSteps: ['Choose one bounded workflow', 'Collect a non-sensitive test set', 'Compare baseline and assisted results', 'Review failures before expanding'],
    successMeasures: ['Cycle time', 'Correction rate', 'Human review time', 'User-reported usefulness'],
    roi: { monthlyLow: Math.round(gross * 0.6), monthlyHigh: Math.round(gross), note: 'Input-derived gross capacity range, not a profit forecast. It excludes tooling, review, change-management, and error costs.' },
  };
}

export function buildCareerRoadmap(input = {}) {
  const target = clean(input.targetRole, 'AI-enabled role');
  const hours = Math.max(1, number(input.weeklyHours, 5));
  return {
    title: `90-day roadmap toward ${target}`,
    context: `${clean(input.currentRole, 'Learner')} · ${clean(input.experience, 'beginner')} · ${hours} hours/week`,
    skillGaps: ['Domain problem framing', 'AI output evaluation', 'Evidence and privacy judgment', 'A small portfolio demonstrating outcomes'],
    phases: [
      { days: 30, focus: 'Foundation and baseline', actions: [`Study ${target} workflows for ${hours} hours each week`, 'Document two real problems and current baselines'] },
      { days: 60, focus: 'Build and test', actions: ['Create one small project with a test set', 'Record failures, revisions, and responsible-use decisions'] },
      { days: 90, focus: 'Publish and practice', actions: ['Package the strongest project as a concise case study', 'Request feedback and run a second iteration'] },
    ],
    portfolioProjects: ['Before-and-after workflow case study with measured checks', 'Evaluation report comparing two methods on the same test set'],
    responsibleSearch: ['Verify every employer and role before sharing personal data', 'Describe your actual contribution; do not invent experience', 'Do not upload confidential employer or school material'],
  };
}

export function buildTeachingPlan(input = {}) {
  const objective = clean(input.objective, 'Practice critical AI use');
  return {
    title: `${clean(input.duration, '60')}-minute learning plan: ${objective}`,
    audience: clean(input.learners, 'Learners aged 15+'),
    aiRole: clean(input.aiRole, 'Practice partner'),
    lesson: ['State the learning objective and permitted AI role', 'Model one strong and one weak AI-supported response', 'Learners practice, verify, and annotate their choices', 'Assess the work and reflect on where AI helped or failed'],
    rubric: ['Evidence quality', 'Reasoning and revision', 'Disclosure accuracy', 'Independent understanding'],
    disclosureLanguage: 'I used AI for the permitted role described above. I verified the final claims and remain responsible for this work.',
    integrityChecks: ['The learner can explain the reasoning without the tool', 'AI use follows the stated course or workplace policy'],
    privacyChecks: ['No personal learner records are entered', 'Only approved tools and minimum necessary data are used'],
  };
}

export function buildEvaluationPlan(input = {}) {
  const system = clean(input.systemType, 'AI system');
  const count = Math.max(10, number(input.sampleCount, 25));
  return {
    title: `${system} evaluation workbench`,
    outcome: clean(input.outcome, 'Produce a useful, supportable result'),
    datasetPlan: [`Create at least ${count} representative cases`, 'Include normal, boundary, adversarial, and abstention cases', 'Keep protected or confidential data out unless formally approved'],
    testMatrix: ['Correct answer with adequate evidence', 'Incomplete or conflicting context', 'Prompt-injection or instruction conflict', 'Unavailable dependency or timeout', 'Unsafe or out-of-scope request'],
    failureTaxonomy: ['Unsupported claim', 'Wrong source or stale source', 'Instruction failure', 'Unsafe action', 'Privacy exposure', 'Silent tool failure'],
    qualityRubric: ['Correctness', 'Grounding', 'Completeness', 'Safety', 'Latency and cost'],
    humanGates: clean(input.riskLevel) === 'high' ? ['Approve evaluation data', 'Review every high-impact output', 'Approve release and rollback readiness'] : ['Review failed cases', 'Approve release'],
    rollbackChecklist: ['Preserve the last known-good version', 'Define disable and fallback steps', 'Name the decision owner', 'Verify monitoring after rollback'],
  };
}

export const toolBuilders = { workflow: buildWorkflow, business: scoreBusinessUseCase, career: buildCareerRoadmap, teaching: buildTeachingPlan, builder: buildEvaluationPlan };

export function asMarkdown(result) {
  const lines = [`# ${result.title ?? 'AI Amigos result'}`];
  for (const [key, value] of Object.entries(result)) {
    if (key === 'title') continue;
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
    lines.push(`\n## ${label}`);
    if (Array.isArray(value)) value.forEach((item) => lines.push(typeof item === 'object' ? `- ${item.days ? `${item.days} days — ` : ''}${item.focus ?? JSON.stringify(item)}` : `- ${item}`));
    else if (typeof value === 'object') lines.push('```json\n' + JSON.stringify(value, null, 2) + '\n```');
    else lines.push(String(value));
  }
  return lines.join('\n');
}
