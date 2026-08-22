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
  assert.match(quality, /graph:update/);
  assert.match(deploy, /environment:\s*production/);
  assert.match(deploy, /HOSTINGER/);
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

test('resource graph covers every track, tool, and template without malformed edges', async () => {
  const { buildResourceGraph } = await import('../src/data/resource-graph.mjs');
  const graph = buildResourceGraph();
  assert.equal(graph.nodes.filter((node) => node.type === 'track').length, 4);
  assert.equal(graph.nodes.filter((node) => node.type === 'tool').length, 5);
  assert.equal(graph.nodes.filter((node) => node.type === 'template').length, 20);
  assert.equal(graph.findings.length, 0, graph.findings.join('\n'));
  for (const track of graph.nodes.filter((node) => node.type === 'track')) {
    assert.ok(graph.edges.some((edge) => edge.from === track.id && edge.relation === 'uses-tool'));
    assert.ok(graph.edges.filter((edge) => edge.from === track.id && edge.relation === 'uses-template').length >= 5);
  }
});
