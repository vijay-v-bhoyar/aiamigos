import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.');
const graphPath = path.join(root, 'graphify-out', 'graph.json');

if (!fs.existsSync(graphPath)) {
  throw new Error(`Graphify artifact is missing: ${graphPath}`);
}

const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
const links = Array.isArray(graph.links) ? graph.links : [];
const findings = [];

if (nodes.length === 0) findings.push('graph has no nodes');
if (links.length === 0) findings.push('graph has no links');

const nodeIds = new Set();
for (const [index, node] of nodes.entries()) {
  if (!node || typeof node.id !== 'string' || node.id.length === 0) {
    findings.push(`node ${index} has no string id`);
    continue;
  }
  if (nodeIds.has(node.id)) findings.push(`duplicate node id: ${node.id}`);
  nodeIds.add(node.id);
}

const endpointPairs = new Set();
const exactEdges = new Set();
for (const [index, link] of links.entries()) {
  if (!link || typeof link.source !== 'string' || typeof link.target !== 'string') {
    findings.push(`link ${index} has a missing endpoint`);
    continue;
  }

  const { source, target } = link;
  if (!nodeIds.has(source) || !nodeIds.has(target)) {
    findings.push(`link ${index} has a dangling endpoint: ${source} -> ${target}`);
  }
  if (source === target) findings.push(`self-loop: ${source}`);

  const pair = graph.directed
    ? `${source}\u0000${target}`
    : [source, target].sort().join('\u0000');
  if (endpointPairs.has(pair)) findings.push(`collapsed endpoint pair: ${source} -> ${target}`);
  endpointPairs.add(pair);

  const exact = [
    pair,
    link.relation ?? '',
    link.context ?? '',
    link.source_file ?? '',
    link.source_location ?? '',
  ].join('\u0000');
  if (exactEdges.has(exact)) findings.push(`duplicate edge: ${source} -> ${target}`);
  exactEdges.add(exact);
}

if (findings.length > 0) {
  throw new Error(`Graphify integrity failed (${findings.length}):\n${findings.slice(0, 25).join('\n')}`);
}

console.log(`Graphify integrity: ${nodes.length} nodes, ${links.length} links, zero missing, dangling, duplicate, collapsed, or self-loop edges.`);
