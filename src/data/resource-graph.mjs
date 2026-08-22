import { tracks } from './tracks.mjs';
import { tools } from './tools.mjs';
import { templates } from './templates.mjs';

const categoriesByTrack = {
  business: ['foundations', 'industry-applications', 'responsible-ai'],
  careers: ['careers'],
  teaching: ['foundations', 'responsible-ai'],
  builders: ['ai-engineering', 'tools-and-models'],
};

export function buildResourceGraph() {
  const nodes = [
    ...tracks.map((item) => ({ id:`track:${item.slug}`, type:'track', route:`/tracks/${item.slug}/` })),
    ...tools.map((item) => ({ id:`tool:${item.slug}`, type:'tool', route:`/tools/${item.slug}/` })),
    ...templates.map((item) => ({ id:`template:${item.slug}`, type:'template', route:`/templates/${item.slug}/` })),
    ...[...new Set(Object.values(categoriesByTrack).flat())].map((slug) => ({ id:`guide-category:${slug}`, type:'guide-category', route:`/topics/${slug}/` })),
  ];
  const edges = [];
  for (const track of tracks) {
    edges.push({ from:`track:${track.slug}`, to:`tool:${track.toolSlug}`, relation:'uses-tool' });
    for (const slug of track.templateSlugs) edges.push({ from:`track:${track.slug}`, to:`template:${slug}`, relation:'uses-template' });
    for (const slug of categoriesByTrack[track.slug]) edges.push({ from:`track:${track.slug}`, to:`guide-category:${slug}`, relation:'uses-guides' });
  }
  for (const tool of tools) for (const slug of tool.templateSlugs) edges.push({ from:`tool:${tool.slug}`, to:`template:${slug}`, relation:'produces-with' });
  const ids = new Set(nodes.map((node) => node.id)); const findings=[]; const seen=new Set(); const pairs=new Set();
  for (const edge of edges) {
    const key=`${edge.from}|${edge.relation}|${edge.to}`; const pair=`${edge.from}|${edge.to}`;
    if (!ids.has(edge.from) || !ids.has(edge.to)) findings.push(`missing endpoint: ${key}`);
    if (edge.from === edge.to) findings.push(`self-loop: ${key}`);
    if (seen.has(key)) findings.push(`duplicate edge: ${key}`); seen.add(key);
    if (pairs.has(pair)) findings.push(`collapsed endpoint pair: ${pair}`); pairs.add(pair);
  }
  for (const track of tracks) {
    const id=`track:${track.slug}`;
    if (!edges.some((edge)=>edge.from===id&&edge.relation==='uses-tool')) findings.push(`${id}: missing tool`);
    if (edges.filter((edge)=>edge.from===id&&edge.relation==='uses-template').length<5) findings.push(`${id}: insufficient templates`);
    if (!edges.some((edge)=>edge.from===id&&edge.relation==='uses-guides')) findings.push(`${id}: missing guide coverage`);
  }
  return { nodes, edges, findings };
}

export const resourceGraph = buildResourceGraph();
