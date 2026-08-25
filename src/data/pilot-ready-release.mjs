export const pilotReadyRelease = {
  id: 'v0.1.1',
  releasedAt: '2026-08-25',
  title: 'Pilot-ready evidence kit',
  status: 'author-controlled-release',
  manifestPath: '/releases/v0.1.1/manifest.json',
  nonClaim: 'This release documents methods, synthetic fixtures, and participation controls. It is not evidence of adoption, outcomes, independent review, recognition, or immigration eligibility.',
};

export const methodExamples = [
  {
    slug: 'workflow-evidence-protocol-synthetic-example',
    methodSlug: 'ai-workflow-evidence-protocol',
    title: 'Synthetic support-triage workflow record',
    label: 'Workflow record example',
    scenario: 'A fictional operations team compares a human-only baseline with an AI-assisted drafting experiment using invented, non-sensitive cases.',
    summary: 'Shows how to record a baseline, fixed cases, system version, failures, human overrides, and a stop/revise/pilot decision without presenting a real result.',
    jsonPath: '/examples/workflow-evidence-protocol.synthetic.json',
    schemaPath: '/schemas/workflow-evidence-record.schema.json',
    expectedValidation: 'Valid against Workflow Evidence Record schema v1',
    lessons: ['Use the same unit and sample definition for baseline and follow-up.', 'Retain failures and overrides; do not publish only successful cases.', 'A pilot decision is not a deployment or outcome claim.'],
  },
  {
    slug: 'proof-pack-synthetic-example',
    methodSlug: 'proof-pack-specification',
    title: 'Synthetic privacy-safe proof pack',
    label: 'Proof-pack example',
    scenario: 'A fictional contributor packages one bounded author-controlled method-version claim with a public source, consent state, privacy decision, limitations, and an illustrative digest.',
    summary: 'Shows the fields needed to review a sanitized claim while keeping raw prompts, artifacts, people, and organization identifiers outside the public record.',
    jsonPath: '/examples/proof-pack.synthetic.json',
    schemaPath: '/schemas/public-evidence-record.schema.json',
    expectedValidation: 'Valid against Public Evidence Record schema v1',
    lessons: ['The evidence tier must say who controls the source.', 'A checksum supports integrity, not truthfulness.', 'Schema approval does not turn a synthetic fixture into independent evidence.'],
  },
  {
    slug: 'benchmark-method-suppressed-example',
    methodSlug: 'comparable-outcome-benchmark-method',
    title: 'Synthetic benchmark suppression decision',
    label: 'Benchmark example',
    scenario: 'Eight fictional reports from two fictional organizations are tested against the cohort, organization-count, concentration, and comparability gates.',
    summary: 'Demonstrates a correct non-publication decision when a synthetic cohort is too small, too concentrated, and insufficiently independent.',
    jsonPath: '/examples/benchmark-method.synthetic.json',
    schemaPath: '/schemas/benchmark-demonstration.schema.json',
    expectedValidation: 'Valid against Benchmark Demonstration schema v1; publicationEligible must remain false',
    lessons: ['Suppression is a valid method output, not a failed product.', 'No summary statistics should be presented as a public benchmark below the gates.', 'Synthetic organization codes are not adopter records.'],
  },
];

export const pilotPackages = [
  {
    slug: 'business-workflow-pilot',
    track: 'Business',
    title: 'Business workflow measurement pilot',
    eligible: 'U.S.-based small businesses, nonprofit operations teams, or public-interest programs with a bounded, repeatable, non-high-stakes workflow and a human decision owner.',
    sample: 'At least 30 comparable, non-sensitive historical or simulated cases; a pre-AI baseline using the same metric and unit.',
    responsibility: 'The participant owns authorization, source-data handling, baseline accuracy, staff notice, operational decisions, and external verification under its own control.',
    forbidden: ['Customer secrets or credentials', 'Regulated health or financial records', 'Fully automated employment, credit, housing, legal, or safety decisions'],
  },
  {
    slug: 'career-proof-of-work-pilot',
    track: 'Careers and students 15+',
    title: 'Career proof-of-work pilot',
    eligible: 'U.S. workforce programs, colleges, adult learners, and professionals aged 15+ testing a clearly defined portfolio or skill-development workflow.',
    sample: 'A dated starting rubric, at least four work samples or weekly observations, and the same assessment criteria at follow-up.',
    responsibility: 'Participants verify authorship, disclose permitted AI use, retain source material, and never represent generated work as an employer or institution endorsement.',
    forbidden: ['Minor data for people under 15', 'Employer-confidential applications', 'Fabricated credentials, references, job offers, or hiring outcomes'],
  },
  {
    slug: 'teaching-assessment-pilot',
    track: 'Teaching',
    title: 'Teaching and training assessment pilot',
    eligible: 'U.S. secondary 15+, higher-education, adult-learning, or workforce instructors with institutional permission and a documented human grading or review process.',
    sample: 'A pre-registered rubric, permitted AI role, accessibility/privacy check, and an aggregate or de-identified baseline and follow-up.',
    responsibility: 'The institution or educator controls consent, notices, assessment integrity, accessibility, records retention, and any required ethics or legal review.',
    forbidden: ['Student names, IDs, disability, discipline, or grade records', 'Covert monitoring', 'Sole-source automated grading or consequential student decisions'],
  },
  {
    slug: 'builder-evaluation-pilot',
    track: 'Builders',
    title: 'AI system evaluation pilot',
    eligible: 'U.S.-based product, engineering, research, or civic-tech teams evaluating a prompt, RAG, agent, or local-model workflow with fixed test cases and rollback ownership.',
    sample: 'At least 30 versioned non-sensitive evaluation cases, a current-system baseline, pass/fail rubric, latency/cost measure, and failure taxonomy.',
    responsibility: 'The participant controls system access, licensing, security testing, production approval, incident response, and externally hosted verification.',
    forbidden: ['API keys, proprietary prompts, production logs, or exploit details', 'Unapproved personal data', 'Unsupervised high-stakes deployment'],
  },
];

export const reviewerDecisionOptions = [
  { id: 'approve-scope', label: 'Approve within stated scope' },
  { id: 'changes-required', label: 'Changes required before approval' },
  { id: 'reject', label: 'Reject: method or claim not supported' },
  { id: 'withdraw', label: 'Withdraw a prior decision' },
];

export const exampleBySlug = Object.fromEntries(methodExamples.map((item) => [item.slug, item]));

export function validatePilotReadyRelease() {
  const findings = [];
  if (methodExamples.length !== 3) findings.push('pilot release requires exactly three method examples');
  if (pilotPackages.length !== 4) findings.push('pilot release requires four audience pilot packages');
  const methodSlugs = new Set(methodExamples.map((item) => item.methodSlug));
  if (methodSlugs.size !== 3) findings.push('each working method requires its own example');
  for (const item of methodExamples) {
    if (!item.jsonPath.endsWith('.json') || !item.schemaPath.endsWith('.json')) findings.push(`${item.slug}: example and schema must be downloadable JSON`);
    if (!/synthetic|fictional|non-publication/i.test(`${item.title} ${item.scenario} ${item.summary}`)) findings.push(`${item.slug}: synthetic boundary is not explicit`);
  }
  return findings;
}
