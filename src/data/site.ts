export const site = {
  name: 'AI Amigos',
  url: 'https://www.aiamigos.org',
  description: 'Test AI in real work, preserve the evidence, and publish only what verification supports.',
  email: 'contact@aiamigos.org',
  navigation: [
    { href: '/app/', label: 'Workbench' },
    { href: '/methods/', label: 'Methods' },
    { href: '/evidence/', label: 'Evidence' },
    { href: '/benchmarks/', label: 'Benchmarks' },
    { href: '/research/', label: 'Research' }
  ],
  topics: [
    { slug: 'foundations', label: 'AI foundations', description: 'Core concepts, terminology, history, and limits.' },
    { slug: 'ai-engineering', label: 'AI engineering', description: 'Practical workflows, evaluation, retrieval, and deployment.' },
    { slug: 'tools-and-models', label: 'Tools and models', description: 'Dated, sourced guides to products, models, and open projects.' },
    { slug: 'responsible-ai', label: 'Responsible AI', description: 'Fairness, privacy, safety, governance, and human oversight.' },
    { slug: 'industry-applications', label: 'Industry applications', description: 'How AI is used in real work, with limits and evidence.' },
    { slug: 'careers', label: 'Careers and implementation', description: 'Role paths, portfolios, learning plans, and delivery practice.' }
  ]
};

export const topicBySlug = Object.fromEntries(site.topics.map((topic) => [topic.slug, topic]));
