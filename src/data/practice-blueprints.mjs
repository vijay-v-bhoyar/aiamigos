export const PROJECT_STAGES = [
  'frame',
  'baseline',
  'experiment',
  'evaluate',
  'decide',
  'follow-up',
  'publish',
];

export const STAGE_LABELS = {
  frame: 'Frame the task',
  baseline: 'Record the baseline',
  experiment: 'Run an experiment',
  evaluate: 'Evaluate the result',
  decide: 'Make a decision',
  'follow-up': 'Measure the outcome',
  publish: 'Share a proof pack',
};

export const TRACK_BLUEPRINTS = {
  business: {
    label: 'Business and operations',
    promise: 'Turn recurring work into a measured, human-approved AI pilot.',
    starterArtifact: 'Pilot charter',
    metricLabel: 'Cycle time, correction rate, or capacity',
    evidencePrompt: 'What evidence would let another person reproduce this decision?',
    questions: ['Who owns the final decision?', 'What is the current baseline?', 'What must never be automated?'],
    baselineFields: [{key:'frequency',label:'Cases per week',placeholder:'e.g. 120'},{key:'humanTime',label:'Human minutes per case',placeholder:'e.g. 8'},{key:'defectRate',label:'Correction or defect rate',placeholder:'e.g. 12%'}],
    evaluationDimensions: ['Process fit','Output quality','Risk control','Human capacity','Cost sensitivity'],
  },
  careers: {
    label: 'Careers and students 15+',
    promise: 'Build evidence of skill instead of collecting unverified AI claims.',
    starterArtifact: 'Proof-of-work case study',
    metricLabel: 'Quality of work, time, or demonstrated competency',
    evidencePrompt: 'What can you show that proves your contribution and judgment?',
    questions: ['What role or capability are you targeting?', 'What can you practice on a real problem?', 'How will someone review your work?'],
    baselineFields: [{key:'targetEvidence',label:'Target role evidence required',placeholder:'e.g. evaluated RAG project'},{key:'currentEvidence',label:'Current verifiable evidence',placeholder:'e.g. one Python project'},{key:'weeklyTime',label:'Hours available per week',placeholder:'e.g. 6'}],
    evaluationDimensions: ['Role relevance','Technical quality','Reproducibility','Judgment and disclosure','Communication'],
  },
  teaching: {
    label: 'Teaching and training',
    promise: 'Use AI inside a learning cycle that keeps reasoning and assessment visible.',
    starterArtifact: 'AI-aware lesson plan',
    metricLabel: 'Learning evidence, transfer, or assessment quality',
    evidencePrompt: 'What would demonstrate independent understanding after AI use?',
    questions: ['What learning objective must remain human-owned?', 'What AI role is permitted?', 'How will privacy and disclosure be checked?'],
    baselineFields: [{key:'learningObjective',label:'Observable learning objective',placeholder:'What learners must demonstrate'},{key:'currentEvidence',label:'Current assessment evidence',placeholder:'What is collected today'},{key:'learnerContext',label:'Learner and accessibility context',placeholder:'Age 15+, setting, accommodations'}],
    evaluationDimensions: ['Objective alignment','Independent reasoning','Assessment integrity','Accessibility','Privacy and disclosure'],
  },
  builders: {
    label: 'AI builders',
    promise: 'Turn prompts, RAG, agents, and local models into testable release decisions.',
    starterArtifact: 'Evaluation and rollback pack',
    metricLabel: 'Correctness, grounding, safety, latency, or cost',
    evidencePrompt: 'Which cases would make you stop or roll back this system?',
    questions: ['What is the expected behavior?', 'Which failures matter most?', 'Who approves release and rollback?'],
    baselineFields: [{key:'currentPassRate',label:'Current evaluation pass rate',placeholder:'e.g. 78%'},{key:'latency',label:'Current P50/P95 latency',placeholder:'e.g. 1.2s / 3.8s'},{key:'cost',label:'Current cost per case',placeholder:'e.g. $0.04'}],
    evaluationDimensions: ['Task correctness','Grounding or evidence','Safety and privacy','Latency and cost','Rollback readiness'],
  },
};

export const blueprintList = Object.entries(TRACK_BLUEPRINTS).map(([slug, blueprint]) => ({ slug, ...blueprint }));
