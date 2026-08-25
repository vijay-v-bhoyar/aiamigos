export const evidenceTiers = [
  { id: 'independent', label: 'Independent', description: 'Issued and controlled by an outside organization, publisher, reviewer, or adopter.' },
  { id: 'jointly-verified', label: 'Jointly verified', description: 'Prepared with AI Amigos and explicitly verified by an outside participant.' },
  { id: 'author-controlled', label: 'Author controlled', description: 'Published by AI Amigos. Useful for provenance, but not independent recognition or adoption.' },
];

export const endeavor = {
  slug: 'measurable-responsible-ai-adoption',
  title: 'Measurable, responsible AI adoption in real work',
  status: 'working-endeavor',
  evidenceTier: 'author-controlled',
  owner: 'Vijay Bhoyar',
  statement: 'Develop, validate, and disseminate privacy-preserving methods that help U.S. organizations, educators, workforce programs, professionals, and technical teams test generative-AI workflows, measure real outcomes, and implement appropriate human oversight.',
  problem: 'AI teams can produce demonstrations quickly, but often lack comparable baselines, fixed evaluation cases, follow-up measurements, privacy-safe reporting, and an auditable record of human decisions.',
  publicBenefit: 'Reusable evaluation records can help practitioners distinguish a promising demo from an accountable workflow and make adoption decisions using measured quality, cost, risk, and human-oversight evidence.',
  nonClaims: [
    'This working statement is not evidence of national impact by itself.',
    'AI Amigos currently publishes no independently verified adoption or outcome claim.',
    'The four practice tracks are application settings for one evidence method, not four unrelated endeavors.',
  ],
  milestones: [
    { window: '0–90 days', target: 'Release three working specifications, their schemas, examples, tests, and public correction process.', status: 'completed' },
    { window: '3–6 months', target: 'Complete governed pilots with independently verifiable U.S. participants and publish both positive and negative results.', status: 'not-started' },
    { window: '6–12 months', target: 'Publish reviewed replications and the first privacy-safe benchmark only after cohort gates pass.', status: 'not-started' },
    { window: '12–24 months', target: 'Document external derivative use, citations, reviewer feedback, corrections, and sustained method development.', status: 'not-started' },
  ],
  sources: [
    { title: 'NIST AI Risk Management Framework', publisher: 'National Institute of Standards and Technology', url: 'https://www.nist.gov/itl/ai-risk-management-framework', sourceClass: 'government' },
    { title: 'Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile', publisher: 'National Institute of Standards and Technology', url: 'https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf', sourceClass: 'government' },
    { title: 'Artificial Intelligence: An Accountability Framework for Federal Agencies and Other Entities', publisher: 'U.S. Government Accountability Office', url: 'https://www.gao.gov/products/gao-21-519sp', sourceClass: 'government' },
  ],
};

export const methods = [
  {
    slug: 'ai-workflow-evidence-protocol',
    exampleSlug: 'workflow-evidence-protocol-synthetic-example',
    title: 'AI Workflow Evidence Protocol',
    shortTitle: 'Workflow Evidence Protocol',
    version: '0.1.0',
    status: 'working-specification',
    evidenceTier: 'author-controlled',
    author: 'Vijay Bhoyar',
    releasedAt: '2026-08-25',
    nextReviewAt: '2026-11-23',
    originalityStatus: 'Prior-art review in progress; no claim of major significance or independent adoption.',
    summary: 'A seven-stage record for moving from a real job and baseline to a measured follow-up outcome without hiding failures or human decisions.',
    jobToBeDone: 'Create a comparable, auditable record of one AI-assisted workflow experiment.',
    requiredInputs: ['Defined job and owner', 'Pre-AI baseline', 'Data sensitivity boundary', 'Fixed evaluation cases', 'Success and stop criteria'],
    steps: [
      'Define the job, owner, affected people, data boundary, baseline, and stop criteria before running an AI system.',
      'Freeze representative evaluation cases and record what a satisfactory result requires.',
      'Record each approach, model or tool version, prompt or configuration fingerprint, cost, latency, and human intervention.',
      'Score every approach against the same cases and retain failures, overrides, and rejected results.',
      'Choose whether to stop, revise, pilot, or deploy; name the accountable human decision owner.',
      'Measure the real outcome after use rather than substituting an offline score for impact.',
      'Create a sanitized proof pack that excludes raw inputs, confidential artifacts, and unsupported causal claims.',
    ],
    outputs: ['Baseline record', 'Experiment comparison', 'Evaluation matrix', 'Human decision log', 'Follow-up outcome', 'Sanitized proof pack'],
    publicationGate: ['Method version is fixed', 'Baseline and calculation are visible', 'Negative results remain present', 'Privacy review passes', 'Claim scope matches the evidence', 'A human approves publication'],
    limitations: ['The protocol improves traceability; it does not prove causation.', 'Results remain setting-specific until independent replications exist.', 'High-stakes uses require qualified domain and legal review.'],
    sources: endeavor.sources,
    changeLog: [{ date: '2026-08-25', summary: 'Published the author-controlled working specification and explicit non-claims.' }],
  },
  {
    slug: 'proof-pack-specification',
    exampleSlug: 'proof-pack-synthetic-example',
    title: 'AI Proof Pack Specification',
    shortTitle: 'Proof Pack Specification',
    version: '0.1.0',
    status: 'working-specification',
    evidenceTier: 'author-controlled',
    author: 'Vijay Bhoyar',
    releasedAt: '2026-08-25',
    nextReviewAt: '2026-11-23',
    originalityStatus: 'Working synthesis; external review and independent use have not been established.',
    summary: 'A privacy boundary and evidence manifest for turning a private project record into a deliberately sanitized, reviewable public submission.',
    jobToBeDone: 'Share enough evidence to review a workflow claim without publishing private project inputs.',
    requiredInputs: ['Private project snapshot', 'Proposed public claims', 'Consent records', 'Evidence manifest', 'Redaction decisions'],
    steps: [
      'Keep raw prompts, artifacts, employer names, student records, customer data, credentials, and confidential inputs private.',
      'Write each proposed public claim as one bounded factual statement.',
      'Attach the measurement, method version, issuer, observation date, source location, and evidence hash for that claim.',
      'Classify the evidence as independent, jointly verified, or author controlled.',
      'Run direct-identifier, quasi-identifier, consent, confidentiality, and claim-scope checks.',
      'Require a reviewer to approve, request changes, reject, or withdraw the exact hashed version.',
    ],
    outputs: ['Sanitized summary', 'Claim-to-evidence ledger', 'Consent manifest', 'Privacy checklist', 'Version hash', 'Reviewer decision'],
    publicationGate: ['No raw private inputs', 'No secrets or credentials', 'Every claim has a source', 'Evidence independence is labeled', 'Consent is explicit', 'Exact reviewed version is hash-bound'],
    limitations: ['Hashing supports integrity, not truthfulness.', 'Redaction can still leave identifying combinations.', 'A proof pack is not independent merely because a reviewer reads it.'],
    sources: endeavor.sources,
    changeLog: [{ date: '2026-08-25', summary: 'Published the first privacy-safe submission schema and evidence-tier labels.' }],
  },
  {
    slug: 'comparable-outcome-benchmark-method',
    exampleSlug: 'benchmark-method-suppressed-example',
    title: 'Comparable Outcome Benchmark Method',
    shortTitle: 'Outcome Benchmark Method',
    version: '0.1.0',
    status: 'working-specification',
    evidenceTier: 'author-controlled',
    author: 'Vijay Bhoyar',
    releasedAt: '2026-08-25',
    nextReviewAt: '2026-11-23',
    originalityStatus: 'Working method; no public cohort currently qualifies and no benchmark result is claimed.',
    summary: 'A suppression-first method for aggregating comparable, reviewed AI workflow outcomes across multiple independent organizations.',
    jobToBeDone: 'Decide whether a set of outcome reports is comparable and private enough to publish as a benchmark.',
    requiredInputs: ['Reviewed outcome reports', 'Common task and metric', 'Method versions', 'Organization identifiers kept outside the public dataset', 'Date window'],
    steps: [
      'Include only reports using the same task definition, outcome unit, measurement window, and compatible method version.',
      'Require at least 10 reviewed reports from at least three independent organizations.',
      'Suppress a cohort when one organization provides more than half of the reports.',
      'Remove direct and quasi-identifiers and test whether small subgroups can be inferred.',
      'Publish sample size, median, interquartile range, date window, inclusion rules, exclusions, and limitations.',
      'Version every snapshot and retain corrections or withdrawn cohorts without silently overwriting history.',
    ],
    outputs: ['Cohort definition', 'Inclusion/exclusion ledger', 'Median and interquartile range', 'Concentration check', 'Privacy decision', 'Versioned snapshot'],
    publicationGate: ['At least 10 reviewed reports', 'At least three independent organizations', 'No majority contributor', 'Same task and metric', 'Privacy review passes', 'Named reviewer approves the snapshot'],
    limitations: ['A benchmark describes its cohort, not every organization.', 'Selection bias and self-reporting may remain.', 'A median does not establish why an outcome changed.'],
    sources: endeavor.sources,
    changeLog: [{ date: '2026-08-25', summary: 'Added multi-organization and concentration gates to the existing sample threshold.' }],
  },
];

export const fieldStudies = [];
export const adoptions = [];
export const verifiedOutcomes = [];
export const independentReviews = [];
export const externalCitations = [];
export const publications = [];

export const publicEvidenceClaims = methods.map((method) => ({
  id: `method-${method.slug}-${method.version}`,
  claim: `${method.title} version ${method.version} was published as an author-controlled working specification on ${method.releasedAt}.`,
  subjectType: 'contribution-version',
  subjectId: method.slug,
  tier: method.evidenceTier,
  status: 'published-provenance',
  source: `/methods/${method.slug}/`,
  observedAt: method.releasedAt,
  limitations: method.originalityStatus,
}));

export const publicEvidenceStats = {
  workingMethods: methods.length,
  independentlyVerifiedAdoptions: adoptions.filter((item) => item.status === 'approved').length,
  reviewedOutcomes: verifiedOutcomes.filter((item) => item.status === 'approved').length,
  externalCitations: externalCitations.filter((item) => item.status === 'verified').length,
};

export const methodBySlug = Object.fromEntries(methods.map((method) => [method.slug, method]));
export const evidenceTierById = Object.fromEntries(evidenceTiers.map((tier) => [tier.id, tier]));

export function canPublishAdoption(record) {
  return Boolean(record?.status === 'approved' && record?.consentStatus === 'granted' && record?.externalVerificationUrl?.startsWith('https://') && record?.methodVersion);
}

export function canPublishOutcome(record) {
  return Boolean(record?.status === 'approved' && record?.baseline?.unit && Number.isFinite(Number(record?.baseline?.value)) && record?.result?.unit === record.baseline.unit && Number.isFinite(Number(record?.result?.value)) && record?.methodVersion && record?.reviewerId && record?.privacyStatus === 'passed');
}

export function canPublishIndependentReview(record) {
  return Boolean(record?.status === 'approved' && record?.reviewerName && record?.reviewerQualification && record?.reviewedVersion && record?.conflictDisclosure && record?.externalVerificationUrl?.startsWith('https://'));
}

export function validateEvidencePlatform() {
  const findings = [];
  const slugs = new Set();
  for (const method of methods) {
    if (slugs.has(method.slug)) findings.push(`duplicate method slug: ${method.slug}`);
    slugs.add(method.slug);
    if (!/^\d+\.\d+\.\d+$/.test(method.version)) findings.push(`${method.slug}: version must be semantic`);
    if (method.sources.length < 2) findings.push(`${method.slug}: requires at least two authoritative sources`);
    if (method.steps.length < 5 || method.publicationGate.length < 5) findings.push(`${method.slug}: method is not operational enough`);
    if (method.evidenceTier !== 'author-controlled') findings.push(`${method.slug}: cannot claim independent status without external evidence`);
    if (!method.exampleSlug) findings.push(`${method.slug}: requires a synthetic method example`);
  }
  if (adoptions.some((record) => !canPublishAdoption(record))) findings.push('adoption registry contains an unpublishable record');
  if (verifiedOutcomes.some((record) => !canPublishOutcome(record))) findings.push('outcome registry contains an unpublishable record');
  if (independentReviews.some((record) => !canPublishIndependentReview(record))) findings.push('review registry contains an unpublishable record');
  return findings;
}
