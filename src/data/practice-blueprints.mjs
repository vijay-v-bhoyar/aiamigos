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
  },
  careers: {
    label: 'Careers and students 15+',
    promise: 'Build evidence of skill instead of collecting unverified AI claims.',
    starterArtifact: 'Proof-of-work case study',
    metricLabel: 'Quality of work, time, or demonstrated competency',
    evidencePrompt: 'What can you show that proves your contribution and judgment?',
    questions: ['What role or capability are you targeting?', 'What can you practice on a real problem?', 'How will someone review your work?'],
  },
  teaching: {
    label: 'Teaching and training',
    promise: 'Use AI inside a learning cycle that keeps reasoning and assessment visible.',
    starterArtifact: 'AI-aware lesson plan',
    metricLabel: 'Learning evidence, transfer, or assessment quality',
    evidencePrompt: 'What would demonstrate independent understanding after AI use?',
    questions: ['What learning objective must remain human-owned?', 'What AI role is permitted?', 'How will privacy and disclosure be checked?'],
  },
  builders: {
    label: 'AI builders',
    promise: 'Turn prompts, RAG, agents, and local models into testable release decisions.',
    starterArtifact: 'Evaluation and rollback pack',
    metricLabel: 'Correctness, grounding, safety, latency, or cost',
    evidencePrompt: 'Which cases would make you stop or roll back this system?',
    questions: ['What is the expected behavior?', 'Which failures matter most?', 'Who approves release and rollback?'],
  },
};

export const blueprintList = Object.entries(TRACK_BLUEPRINTS).map(([slug, blueprint]) => ({ slug, ...blueprint }));
