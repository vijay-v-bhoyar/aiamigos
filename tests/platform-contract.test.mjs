import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('normal development and build never run the legacy importer', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.doesNotMatch(pkg.scripts.dev, /import-snapshot/);
  assert.doesNotMatch(pkg.scripts.build, /import-snapshot/);
  assert.doesNotMatch(pkg.scripts['content:check'], /import-snapshot/);
  assert.match(pkg.scripts['content:import:legacy'], /import-snapshot/);
});

test('platform defines four tracks, five tools, and twenty templates', async () => {
  const { tracks } = await import('../src/data/tracks.mjs');
  const { tools } = await import('../src/data/tools.mjs');
  const { templates } = await import('../src/data/templates.mjs');
  assert.deepEqual(tracks.map((item) => item.slug), ['business', 'careers', 'teaching', 'builders']);
  assert.equal(tools.length, 5);
  assert.equal(templates.length, 20);
  for (const track of tracks) {
    assert.equal(templates.filter((item) => item.track === track.slug).length, 5);
  }
});

test('every utility has evidence, limitations, and a supporting template', async () => {
  const { tools } = await import('../src/data/tools.mjs');
  const { templates } = await import('../src/data/templates.mjs');
  for (const tool of tools) {
    assert.ok(tool.sources.length >= 2, `${tool.slug} needs two sources`);
    assert.ok(tool.limitations.length >= 1, `${tool.slug} needs limitations`);
    assert.ok(tool.templateSlugs.length >= 1, `${tool.slug} needs a template`);
    for (const slug of tool.templateSlugs) {
      assert.ok(templates.some((item) => item.slug === slug), `${tool.slug} links missing template ${slug}`);
    }
  }
});

test('feed sources fail closed until explicitly enabled with a URL', () => {
  const feeds = JSON.parse(read('src/data/feed-sources.json'));
  assert.ok(feeds.length >= 2);
  for (const feed of feeds) {
    if (!feed.url) assert.equal(feed.enabled, false);
  }
});

test('GitHub quality and production-gated deployment workflows exist', () => {
  const quality = read('.github/workflows/quality.yml');
  const deploy = read('.github/workflows/deploy.yml');
  assert.match(quality, /content:check/);
  assert.match(quality, /graph:check/);
  assert.match(deploy, /environment:\s*production/);
  assert.match(deploy, /HOSTINGER/);
});

test('Graphify has separate local refresh and portable CI integrity commands', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts['graph:update'], /graphify update/);
  assert.match(pkg.scripts['graph:check'], /check-graph-artifact/);
});

test('Practice OS workspace, playbook routes, and Supabase security boundary exist', () => {
  const workspace = read('src/pages/app/index.astro');
  const playbooks = read('src/pages/playbooks/index.astro');
  const migration = read('supabase/migrations/202608230001_practice_os.sql');
  const networkMigration = read('supabase/migrations/202608240001_verified_practice_network.sql');
  const modelFunction = read('supabase/functions/run-model/index.ts');
  const publishFunction = read('supabase/functions/publish-playbook/index.ts');
  assert.match(workspace, /PracticeWorkspace/);
  assert.match(playbooks, /reviewed protocol/i);
  assert.match(read('src/pages/playbooks/[slug]/index.astro'), /Fork into workbench/);
  assert.match(read('src/pages/benchmarks/index.astro'), /suppressed/i);
  assert.match(migration, /enable row level security/gi);
  assert.match(migration, /public_playbooks_read_approved/);
  assert.match(networkMigration, /sample_count integer not null check \(sample_count >= 10\)/);
  assert.match(networkMigration, /enable row level security/g);
  assert.match(networkMigration, /privacy_check_status/);
  assert.match(modelFunction, /Cache-Control.*no-store/);
  assert.doesNotMatch(modelFunction, /console\.log/);
  assert.doesNotMatch(modelFunction, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(publishFunction, /SUPABASE_SERVICE_ROLE_KEY/);
});

test('Hostinger deployment is manifest-scoped and creates a rollback copy', () => {
  const pkg = JSON.parse(read('package.json'));
  const deploy = read('scripts/deploy-hostinger.mjs');
  assert.match(pkg.scripts['deploy:hostinger'], /deploy-hostinger/);
  assert.match(deploy, /priorManifest/);
  assert.match(deploy, /rollback/);
  assert.match(deploy, /safeRelativePath/);
  assert.doesNotMatch(deploy, /rmdir\(|rm\([^\n]*recursive/);
});

test('resource graph covers every track and the complete outcome-network path without malformed edges', async () => {
  const { buildResourceGraph, outcomePathForTrack, evidencePathForMethod } = await import('../src/data/resource-graph.mjs');
  const { methods, endeavor } = await import('../src/data/evidence-platform.mjs');
  const graph = buildResourceGraph();
  assert.equal(graph.nodes.filter((node) => node.type === 'track').length, 4);
  assert.equal(graph.nodes.filter((node) => node.type === 'tool').length, 5);
  assert.equal(graph.nodes.filter((node) => node.type === 'template').length, 20);
  assert.equal(graph.nodes.filter((node) => node.type === 'project-stage').length, 7);
  assert.equal(graph.nodes.filter((node) => node.type === 'project').length, 4);
  assert.equal(graph.nodes.filter((node) => node.type === 'playbook').length, 4);
  assert.equal(graph.nodes.filter((node) => node.type === 'benchmark').length, 4);
  assert.equal(graph.nodes.filter((node) => node.type === 'contribution').length, 3);
  assert.equal(graph.nodes.filter((node) => node.type === 'independent-review-registry').length, 3);
  assert.equal(graph.findings.length, 0, graph.findings.join('\n'));
  for (const track of graph.nodes.filter((node) => node.type === 'track')) {
    const slug=track.id.split(':')[1];
    assert.ok(graph.edges.some((edge) => edge.from === track.id && edge.relation === 'uses-instrument'));
    assert.ok(graph.edges.filter((edge) => edge.from === track.id && edge.relation === 'uses-record').length >= 5);
    assert.deepEqual(outcomePathForTrack(slug), [`track:${slug}`,`project:${slug}`,`experiment:${slug}`,`evaluation:${slug}`,`outcome:${slug}`,`proof-pack:${slug}`,`playbook:${slug}`,`fork:${slug}`,`run-report:${slug}`,`benchmark:${slug}`]);
  }
  for (const method of methods) {
    assert.deepEqual(evidencePathForMethod(method.slug), [`endeavor:${endeavor.slug}`,`contribution:${method.slug}`,`contribution-version:${method.slug}:${method.version}`,`synthetic-example:${method.slug}`,'participation:governed-pilots','proof-pack-template:v0.1.1','reviewer-kit:v0.1.1','release:v0.1.1',`adoption:${method.slug}`,`implementation:${method.slug}`,`evidence-outcome:${method.slug}`,`independent-review:${method.slug}`,`citation:${method.slug}`]);
  }
});
