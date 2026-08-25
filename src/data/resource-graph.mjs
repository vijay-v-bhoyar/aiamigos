import { tracks } from './tracks.mjs';
import { tools } from './tools.mjs';
import { templates } from './templates.mjs';
import { PROJECT_STAGES } from './practice-blueprints.mjs';
import { playbooks, benchmarkDefinitions, challenges } from './outcome-network.mjs';
import { endeavor, methods } from './evidence-platform.mjs';
import { methodExamples, pilotPackages, pilotReadyRelease } from './pilot-ready-release.mjs';

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
    ...tracks.map((item) => ({ id:`project:${item.slug}`, type:'project', route:`/app/?track=${item.slug}` })),
    ...tracks.map((item) => ({ id:`experiment:${item.slug}`, type:'experiment', route:'/app/#experiment' })),
    ...tracks.map((item) => ({ id:`evaluation:${item.slug}`, type:'evaluation', route:'/app/#evaluate' })),
    ...tracks.map((item) => ({ id:`outcome:${item.slug}`, type:'outcome', route:'/app/#follow-up' })),
    ...tracks.map((item) => ({ id:`proof-pack:${item.slug}`, type:'proof-pack', route:'/app/#publish' })),
    ...playbooks.map((item) => ({ id:`playbook:${item.track}`, type:'playbook', route:`/playbooks/${item.slug}/` })),
    ...tracks.map((item) => ({ id:`fork:${item.slug}`, type:'playbook-fork', route:`/app/?playbook=${playbooks.find((playbook)=>playbook.track===item.slug)?.slug}` })),
    ...tracks.map((item) => ({ id:`run-report:${item.slug}`, type:'run-report', route:'/app/#publish' })),
    ...benchmarkDefinitions.map((item) => ({ id:`benchmark:${item.track}`, type:'benchmark', route:'/benchmarks/' })),
    ...challenges.map((item) => ({ id:`challenge:${item.track}`, type:'challenge', route:`/challenges/#${item.slug}` })),
    ...PROJECT_STAGES.map((stage) => ({ id:`stage:${stage}`, type:'project-stage', route:`/app/#${stage}` })),
    ...[...new Set(Object.values(categoriesByTrack).flat())].map((slug) => ({ id:`guide-category:${slug}`, type:'guide-category', route:`/topics/${slug}/` })),
    { id:`endeavor:${endeavor.slug}`, type:'endeavor', route:'/endeavor/' },
    { id:'participation:governed-pilots', type:'participation-hub', route:'/participate/' },
    ...pilotPackages.map((pilot) => ({ id:`pilot-package:${pilot.slug}`, type:'pilot-package', route:`/participate/#${pilot.slug}` })),
    { id:'proof-pack-template:v0.1.1', type:'proof-pack-template', route:'/pilot-kit/proof-pack-submission.template.json' },
    { id:'reviewer-kit:v0.1.1', type:'reviewer-kit', route:'/reviews/kit/' },
    { id:`release:${pilotReadyRelease.id}`, type:'release-manifest', route:`/releases/${pilotReadyRelease.id}/` },
    ...methodExamples.map((example) => ({ id:`synthetic-example:${example.methodSlug}`, type:'synthetic-example', route:`/methods/examples/${example.slug}/` })),
    ...methods.flatMap((method) => [
      { id:`contribution:${method.slug}`, type:'contribution', route:`/methods/${method.slug}/` },
      { id:`contribution-version:${method.slug}:${method.version}`, type:'contribution-version', route:`/methods/${method.slug}/#version` },
      { id:`adoption:${method.slug}`, type:'adoption-registry', route:`/adoption/?method=${method.slug}` },
      { id:`implementation:${method.slug}`, type:'implementation-registry', route:`/field-studies/?method=${method.slug}` },
      { id:`evidence-outcome:${method.slug}`, type:'verified-outcome-registry', route:`/outcomes/?method=${method.slug}` },
      { id:`independent-review:${method.slug}`, type:'independent-review-registry', route:`/reviews/?method=${method.slug}` },
      { id:`citation:${method.slug}`, type:'external-citation-registry', route:`/research/?method=${method.slug}` },
    ]),
  ];
  const edges = [];
  for (const track of tracks) {
    const slug=track.slug;
    edges.push({ from:`track:${slug}`, to:`project:${slug}`, relation:'starts-project' });
    edges.push({ from:`track:${slug}`, to:`tool:${track.toolSlug}`, relation:'uses-instrument' });
    edges.push({ from:`track:${slug}`, to:`challenge:${slug}`, relation:'runs-challenge' });
    for (const templateSlug of track.templateSlugs) edges.push({ from:`track:${slug}`, to:`template:${templateSlug}`, relation:'uses-record' });
    for (const category of categoriesByTrack[slug]) edges.push({ from:`track:${slug}`, to:`guide-category:${category}`, relation:'uses-guides' });
    edges.push({ from:`project:${slug}`, to:`experiment:${slug}`, relation:'records-experiment' });
    edges.push({ from:`experiment:${slug}`, to:`evaluation:${slug}`, relation:'evaluated-by' });
    edges.push({ from:`evaluation:${slug}`, to:`outcome:${slug}`, relation:'supports-outcome' });
    edges.push({ from:`outcome:${slug}`, to:`proof-pack:${slug}`, relation:'included-in-proof' });
    edges.push({ from:`proof-pack:${slug}`, to:`playbook:${slug}`, relation:'approved-as' });
    edges.push({ from:`playbook:${slug}`, to:`fork:${slug}`, relation:'forked-as' });
    edges.push({ from:`fork:${slug}`, to:`run-report:${slug}`, relation:'produces-report' });
    edges.push({ from:`run-report:${slug}`, to:`benchmark:${slug}`, relation:'aggregates-when-reviewed' });
  }
  for (const tool of tools) for (const templateSlug of tool.templateSlugs) edges.push({ from:`tool:${tool.slug}`, to:`template:${templateSlug}`, relation:'produces-with' });
  PROJECT_STAGES.forEach((stage, index) => { if (index > 0) edges.push({ from:`stage:${PROJECT_STAGES[index - 1]}`, to:`stage:${stage}`, relation:'next-stage' }); });
  for (const method of methods) {
    edges.push({ from:`endeavor:${endeavor.slug}`, to:`contribution:${method.slug}`, relation:'produces-contribution' });
    edges.push({ from:`contribution:${method.slug}`, to:`contribution-version:${method.slug}:${method.version}`, relation:'versioned-as' });
    edges.push({ from:`contribution-version:${method.slug}:${method.version}`, to:`synthetic-example:${method.slug}`, relation:'demonstrated-by-non-evidence-fixture' });
    edges.push({ from:`synthetic-example:${method.slug}`, to:'participation:governed-pilots', relation:'prepares-governed-participation' });
    edges.push({ from:`release:${pilotReadyRelease.id}`, to:`adoption:${method.slug}`, relation:'eligible-for-independent-adoption' });
    edges.push({ from:`adoption:${method.slug}`, to:`implementation:${method.slug}`, relation:'verified-in-implementation' });
    edges.push({ from:`implementation:${method.slug}`, to:`evidence-outcome:${method.slug}`, relation:'measures-outcome' });
    edges.push({ from:`evidence-outcome:${method.slug}`, to:`independent-review:${method.slug}`, relation:'reviewed-outside-author' });
    edges.push({ from:`independent-review:${method.slug}`, to:`citation:${method.slug}`, relation:'documented-by-external-record' });
  }
  edges.push({ from:'participation:governed-pilots', to:'proof-pack-template:v0.1.1', relation:'uses-sanitized-proof-pack' });
  edges.push({ from:'proof-pack-template:v0.1.1', to:'reviewer-kit:v0.1.1', relation:'submitted-for-external-review' });
  edges.push({ from:'reviewer-kit:v0.1.1', to:`release:${pilotReadyRelease.id}`, relation:'verifies-release-artifacts' });
  for (const pilot of pilotPackages) edges.push({ from:'participation:governed-pilots', to:`pilot-package:${pilot.slug}`, relation:'offers-pilot-package' });

  const nodeIds = nodes.map((node) => node.id); const ids = new Set(nodeIds); const findings=[]; const seen=new Set(); const pairs=new Set();
  for (const node of nodes) if (nodeIds.filter((id)=>id===node.id).length > 1 && !findings.includes(`duplicate node: ${node.id}`)) findings.push(`duplicate node: ${node.id}`);
  for (const edge of edges) {
    const key=`${edge.from}|${edge.relation}|${edge.to}`; const pair=`${edge.from}|${edge.to}`;
    if (!ids.has(edge.from) || !ids.has(edge.to)) findings.push(`missing endpoint: ${key}`);
    if (edge.from === edge.to) findings.push(`self-loop: ${key}`);
    if (seen.has(key)) findings.push(`duplicate edge: ${key}`); seen.add(key);
    if (pairs.has(pair)) findings.push(`collapsed endpoint pair: ${pair}`); pairs.add(pair);
  }
  for (const track of tracks) {
    const slug=track.slug; const required=[`project:${slug}`,`experiment:${slug}`,`evaluation:${slug}`,`outcome:${slug}`,`proof-pack:${slug}`,`playbook:${slug}`,`fork:${slug}`,`run-report:${slug}`,`benchmark:${slug}`];
    required.forEach((id)=>{if(!ids.has(id)) findings.push(`${slug}: missing ${id}`);});
    if (edges.filter((edge)=>edge.from===`track:${slug}`&&edge.relation==='uses-record').length<5) findings.push(`track:${slug}: insufficient templates`);
  }
  for (const method of methods) {
    const required=[`contribution:${method.slug}`,`contribution-version:${method.slug}:${method.version}`,`synthetic-example:${method.slug}`,`adoption:${method.slug}`,`implementation:${method.slug}`,`evidence-outcome:${method.slug}`,`independent-review:${method.slug}`,`citation:${method.slug}`];
    required.forEach((id)=>{if(!ids.has(id)) findings.push(`${method.slug}: missing ${id}`);});
  }
  return { nodes, edges, findings };
}

export function outcomePathForTrack(track) {
  const graph=buildResourceGraph(); const start=`track:${track}`; const target=`benchmark:${track}`; const path=[start]; let cursor=start;
  while(cursor!==target) { const edge=graph.edges.find((item)=>item.from===cursor && ['starts-project','records-experiment','evaluated-by','supports-outcome','included-in-proof','approved-as','forked-as','produces-report','aggregates-when-reviewed'].includes(item.relation)); if(!edge) return []; path.push(edge.to); cursor=edge.to; }
  return path;
}

export function evidencePathForMethod(methodSlug) {
  const method=methods.find((item)=>item.slug===methodSlug); if(!method) return [];
  const graph=buildResourceGraph(); const start=`endeavor:${endeavor.slug}`; const target=`citation:${method.slug}`; const path=[start]; let cursor=start;
  const allowed=['produces-contribution','versioned-as','demonstrated-by-non-evidence-fixture','prepares-governed-participation','uses-sanitized-proof-pack','submitted-for-external-review','verifies-release-artifacts','eligible-for-independent-adoption','verified-in-implementation','measures-outcome','reviewed-outside-author','documented-by-external-record'];
  while(cursor!==target) {
    const edge=graph.edges.find((item)=>item.from===cursor && allowed.includes(item.relation)
      && (cursor!==start || item.to===`contribution:${method.slug}`)
      && (cursor!==`release:${pilotReadyRelease.id}` || item.to===`adoption:${method.slug}`));
    if(!edge) return [];
    path.push(edge.to);
    cursor=edge.to;
  }
  return path;
}

export const resourceGraph = buildResourceGraph();
