const template = (slug, title, track, purpose, sections) => ({ slug, title, track, purpose, sections });
export const templates = [
  template('ai-pilot-charter','AI pilot charter','business','Define a bounded, measurable AI pilot.',['Problem and baseline','In scope / out of scope','Owner and human approvals','Test data and privacy','Success and stop criteria','Rollback plan']),
  template('vendor-scorecard','AI vendor scorecard','business','Compare vendors against evidence and operating needs.',['Use case','Evidence supplied','Data handling','Security and access','Evaluation results','Cost and exit plan']),
  template('workplace-ai-policy','Workplace AI policy starter','business','Set clear permitted and prohibited uses.',['Purpose','Permitted uses','Prohibited data','Human accountability','Disclosure','Incident reporting']),
  template('workflow-risk-register','AI workflow risk register','business','Name risks, controls, owners, and residual risk.',['Workflow step','Failure mode','Impact','Control','Owner','Residual risk']),
  template('ai-roi-assumptions','AI capacity and cost assumptions','business','Keep AI business-case math transparent.',['Current baseline','Input assumptions','Expected capacity','New costs','Error and review costs','Validation date']),
  template('career-skill-gap-map','Career skill-gap map','careers','Compare evidence you have with skills a role requires.',['Target role','Current evidence','Required skills','Gap','Practice activity','Proof of progress']),
  template('portfolio-project-brief','AI portfolio project brief','careers','Scope a credible project with measurable work.',['User and problem','Baseline','Approach','Evaluation set','Results','Limits and next step']),
  template('ai-case-study','AI case study outline','careers','Explain your real contribution without inflated claims.',['Context','Your responsibility','Constraints','Method','Evidence','Reflection']),
  template('responsible-job-search','Responsible AI job-search checklist','careers','Use AI in applications without misrepresentation.',['Employer verification','Permitted AI use','Personal-data boundary','Claim verification','Interview preparation','Submission record']),
  template('learning-sprint-plan','Four-week learning sprint','careers','Turn a broad goal into weekly practice and proof.',['Outcome','Week 1 baseline','Week 2 practice','Week 3 project','Week 4 review','Evidence produced']),
  template('ai-lesson-plan','AI-supported lesson plan','teaching','Define how AI supports rather than replaces learning.',['Objective','Learner group','Permitted AI role','Activity sequence','Evidence checks','Reflection']),
  template('assessment-rubric','AI-aware assessment rubric','teaching','Assess reasoning, evidence, disclosure, and mastery.',['Criterion','Beginning','Developing','Proficient','Advanced','AI-use evidence']),
  template('learner-ai-disclosure','Learner AI-use disclosure','teaching','Make tool use and human work visible.',['Tools used','Purpose','Prompts or methods','What was accepted or rejected','Verification','Student responsibility']),
  template('course-ai-policy','Course AI policy worksheet','teaching','Clarify permitted uses before assignments begin.',['Learning rationale','Always permitted','Permission required','Prohibited','Privacy','Consequences and appeals']),
  template('training-evaluation','AI training evaluation','teaching','Measure whether learners can apply and verify skills.',['Target behavior','Baseline task','Practice task','Scoring rubric','Transfer check','Follow-up date']),
  template('prompt-experiment-log','Prompt experiment log','builders','Make prompt changes reproducible.',['Version','Hypothesis','Prompt and context','Test set','Results','Decision']),
  template('rag-test-matrix','RAG test matrix','builders','Test retrieval and answer grounding systematically.',['Case ID','Question','Expected evidence','Retrieved evidence','Answer result','Failure class']),
  template('agent-human-gates','Agent human-gate map','builders','Place approvals around consequential actions.',['Action','Trigger','Required context','Approver','Timeout behavior','Audit evidence']),
  template('deployment-checklist','AI deployment and rollback checklist','builders','Release with monitoring and a known-safe fallback.',['Version and owner','Pre-release tests','Secrets and access','Monitoring','Disable path','Rollback verification']),
  template('ai-incident-review','AI incident review','builders','Learn from failures without hiding uncertainty.',['Incident timeline','User impact','Detection','Contributing conditions','Containment','Corrective actions']),
];

export const templateBySlug = Object.fromEntries(templates.map((item) => [item.slug, item]));
export function templateMarkdown(item) {
  return [`# ${item.title}`, '', `Purpose: ${item.purpose}`, '', ...item.sections.flatMap((section) => [`## ${section}`, '', '- ', ''])].join('\n');
}
