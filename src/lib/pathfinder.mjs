export const pathfinderPaths = {
  business: { label: 'Business and operations', tool: ['Business AI Use-Case Scorecard', '/tools/business-use-case-scorecard/'], template: ['AI pilot charter', '/templates/ai-pilot-charter/'], guide: ['Business track method', '/tracks/business/'] },
  careers: { label: 'Careers and students 15+', tool: ['Career Roadmap Builder', '/tools/career-roadmap-builder/'], template: ['Portfolio project brief', '/templates/portfolio-project-brief/'], guide: ['Career track method', '/tracks/careers/'] },
  teaching: { label: 'Teaching and training', tool: ['Teaching and Training Planner', '/tools/teaching-training-planner/'], template: ['AI-supported lesson plan', '/templates/ai-lesson-plan/'], guide: ['Teaching track method', '/tracks/teaching/'] },
  builders: { label: 'AI builders', tool: ['Builder Evaluation Workbench', '/tools/builder-evaluation-workbench/'], template: ['RAG test matrix', '/templates/rag-test-matrix/'], guide: ['Builder track method', '/tracks/builders/'] },
};

const experienceNotes = {
  'Starting out': 'Begin with one bounded example and make the human check explicit.',
  'Some practical use': 'Bring one repeated task and compare the result with your current baseline.',
  'Building or leading': 'Name the owner, stop criteria, evaluation set, and approval boundary before expanding use.',
};

export function recommendPath(input = {}) {
  const area = pathfinderPaths[input.area] ? input.area : 'business';
  const mode = ['tool', 'template', 'guide'].includes(input.mode) ? input.mode : 'tool';
  const experience = experienceNotes[input.experience] ? input.experience : 'Starting out';
  const path = pathfinderPaths[area];
  const primary = path[mode];
  const secondary = ['tool', 'template', 'guide'].filter((key) => key !== mode).map((key) => ({ type: key, label: path[key][0], href: path[key][1] }));
  return {
    area,
    mode,
    experience,
    label: path.label,
    primary: { type: mode, label: primary[0], href: primary[1] },
    secondary,
    note: experienceNotes[experience],
    ownerNote: `Pathfinder experience: ${experience}. Preferred starting resource: ${mode}.`,
  };
}
