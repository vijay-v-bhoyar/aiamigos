const sources = {
  risk: ['https://www.nist.gov/itl/ai-risk-management-framework', 'https://www.oecd.org/en/topics/sub-issues/ai-principles.html'],
  business: ['https://www.nist.gov/itl/ai-risk-management-framework', 'https://www.ftc.gov/business-guidance/blog/2023/02/keep-your-ai-claims-check'],
  career: ['https://www.onetonline.org/', 'https://www.bls.gov/ooh/'],
  teaching: ['https://unesdoc.unesco.org/ark:/48223/pf0000386693', 'https://www.ed.gov/laws-and-policy/education-policy/artificial-intelligence'],
  builder: ['https://airc.nist.gov/', 'https://owasp.org/www-project-top-10-for-large-language-model-applications/'],
};

export const tools = [
  { slug: 'ai-task-workflow-planner', engine: 'workflow', title: 'AI Task-to-Workflow Planner', track: 'business', summary: 'Turn a real task into a prompt scaffold, quality checks, privacy boundaries, and human approvals.', outcome: 'A reusable, governed workflow plan', estimatedMinutes: 7, sources: sources.risk, limitations: ['This planner cannot determine whether a specific tool is approved by your employer or school.', 'It does not provide legal, employment, or security advice.'], templateSlugs: ['workflow-risk-register'], fields: [
    { name: 'role', label: 'Your role', type: 'text', required: true, placeholder: 'Operations manager' },
    { name: 'goal', label: 'Task to accomplish', type: 'textarea', required: true, placeholder: 'Summarize weekly customer feedback' },
    { name: 'frequency', label: 'How often?', type: 'select', options: ['once', 'daily', 'weekly', 'monthly'] },
    { name: 'sensitivity', label: 'Data sensitivity', type: 'select', options: ['public', 'internal', 'confidential'] },
    { name: 'quality', label: 'Quality consequence', type: 'select', options: ['low', 'medium', 'high'] },
  ] },
  { slug: 'business-use-case-scorecard', engine: 'business', title: 'Business AI Use-Case Scorecard', track: 'business', summary: 'Score a proposed process, expose assumptions, and create a bounded pilot and capacity range.', outcome: 'An explainable suitability score and pilot outline', estimatedMinutes: 8, sources: sources.business, limitations: ['The range is derived only from visitor inputs and is not an ROI or profit forecast.', 'A high score does not remove privacy, safety, labor, or legal review obligations.'], templateSlugs: ['ai-pilot-charter', 'ai-roi-assumptions'], fields: [
    { name: 'task', label: 'Process or task', type: 'text', required: true },
    { name: 'monthlyHours', label: 'Current monthly hours', type: 'number', min: 0 }, { name: 'hourlyCost', label: 'Loaded hourly cost', type: 'number', min: 0 },
    { name: 'repeatability', label: 'Repeatability (1–5)', type: 'range', min: 1, max: 5, value: 3 }, { name: 'dataReadiness', label: 'Data readiness (1–5)', type: 'range', min: 1, max: 5, value: 3 },
    { name: 'risk', label: 'Consequence of error (1–5)', type: 'range', min: 1, max: 5, value: 3 }, { name: 'expectedTimeSavedPercent', label: 'Estimated time saved (%)', type: 'number', min: 0, max: 100 },
  ] },
  { slug: 'career-roadmap-builder', engine: 'career', title: 'Career and Student Roadmap Builder', track: 'careers', summary: 'Create a practical 30/60/90-day learning and portfolio plan for learners aged 15+.', outcome: 'A focused 90-day plan with portfolio evidence', estimatedMinutes: 6, sources: sources.career, limitations: ['This is a planning aid, not a promise of employment, admission, compensation, or credential recognition.', 'Role requirements differ by employer, country, and experience.'], templateSlugs: ['career-skill-gap-map', 'portfolio-project-brief'], fields: [
    { name: 'currentRole', label: 'Current role or stage', type: 'text', required: true }, { name: 'targetRole', label: 'Target role', type: 'text', required: true },
    { name: 'experience', label: 'AI experience', type: 'select', options: ['beginner', 'some practice', 'experienced'] }, { name: 'weeklyHours', label: 'Hours available each week', type: 'number', min: 1, max: 40, value: 5 },
  ] },
  { slug: 'teaching-training-planner', engine: 'teaching', title: 'Teaching and Training Planner', track: 'teaching', summary: 'Design a lesson with a clear AI role, evidence checks, rubric, disclosure, integrity, and privacy boundaries.', outcome: 'A lesson and assessment plan for learners 15+', estimatedMinutes: 7, sources: sources.teaching, limitations: ['Educators must align the plan with local policy, accessibility needs, and learner context.', 'The tool does not process student records or verify a provider’s privacy terms.'], templateSlugs: ['ai-lesson-plan', 'assessment-rubric'], fields: [
    { name: 'learners', label: 'Learner group', type: 'select', options: ['Secondary learners aged 15+', 'Higher education', 'Workforce training'] },
    { name: 'objective', label: 'Learning objective', type: 'textarea', required: true }, { name: 'duration', label: 'Minutes', type: 'number', min: 15, max: 240, value: 60 },
    { name: 'aiRole', label: 'Permitted AI role', type: 'select', options: ['Brainstorming partner', 'Critique partner', 'Practice simulator', 'Research starting point'] },
  ] },
  { slug: 'builder-evaluation-workbench', engine: 'builder', title: 'AI Builder Evaluation Workbench', track: 'builders', summary: 'Generate an evaluation dataset plan, test matrix, failure taxonomy, human gates, and rollback checklist.', outcome: 'A testable release evaluation plan', estimatedMinutes: 8, sources: sources.builder, limitations: ['Generated tests are a starting set and must be expanded for the actual domain and threat model.', 'The workbench does not run model evaluations or inspect production systems.'], templateSlugs: ['rag-test-matrix', 'deployment-checklist'], fields: [
    { name: 'systemType', label: 'System type', type: 'select', options: ['Prompt workflow', 'RAG', 'Agent', 'Local model'] }, { name: 'outcome', label: 'Required outcome', type: 'textarea', required: true },
    { name: 'riskLevel', label: 'Risk level', type: 'select', options: ['low', 'medium', 'high'] }, { name: 'sampleCount', label: 'Planned test cases', type: 'number', min: 10, max: 1000, value: 25 },
  ] },
];

export const toolBySlug = Object.fromEntries(tools.map((tool) => [tool.slug, tool]));
