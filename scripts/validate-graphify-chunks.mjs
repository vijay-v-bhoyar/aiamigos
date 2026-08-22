import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "graphify-out");
const chunkCount = Number.parseInt(process.argv[3] ?? "6", 10);
const allowedTypes = new Set(["code", "document", "paper", "image", "rationale", "concept"]);
const allowedRelations = new Set(["calls", "implements", "references", "cites", "conceptually_related_to", "shares_data_with", "semantically_similar_to", "rationale_for"]);
const allowedConfidence = new Set(["EXTRACTED", "INFERRED", "AMBIGUOUS"]);
const errors = [];
const summaries = [];
const allNodes = new Map();
const allEdges = [];
const allHyperedges = [];

for (let index = 1; index <= chunkCount; index += 1) {
  const stem = String(index).padStart(2, "0");
  const file = path.join(root, `.graphify_chunk_${stem}.json`);
  const listFile = path.join(root, `.graphify_chunk_list_${stem}.txt`);
  let chunk;
  let fileList;
  try {
    chunk = JSON.parse(await readFile(file, "utf8"));
    fileList = new Set((await readFile(listFile, "utf8")).replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean));
  } catch (error) {
    errors.push(`chunk ${stem}: unreadable or invalid JSON/list: ${error}`);
    continue;
  }
  if (!Array.isArray(chunk.nodes) || !Array.isArray(chunk.edges) || !Array.isArray(chunk.hyperedges)) {
    errors.push(`chunk ${stem}: nodes, edges, and hyperedges must be arrays`);
    continue;
  }
  const localIds = new Set();
  for (const node of chunk.nodes) {
    if (!/^[a-z0-9_]+$/.test(node.id ?? "")) errors.push(`chunk ${stem}: invalid node id ${node.id}`);
    if (localIds.has(node.id)) errors.push(`chunk ${stem}: duplicate local node id ${node.id}`);
    localIds.add(node.id);
    if (!allowedTypes.has(node.file_type)) errors.push(`chunk ${stem}: invalid file_type ${node.file_type}`);
    if (!fileList.has(node.source_file)) errors.push(`chunk ${stem}: node source_file not in exact file list: ${node.source_file}`);
    if (allNodes.has(node.id) && JSON.stringify(allNodes.get(node.id)) !== JSON.stringify(node)) errors.push(`global conflicting node id ${node.id}`);
    else allNodes.set(node.id, node);
  }
  for (const edge of chunk.edges) {
    if (!allowedRelations.has(edge.relation)) errors.push(`chunk ${stem}: invalid relation ${edge.relation}`);
    if (!allowedConfidence.has(edge.confidence)) errors.push(`chunk ${stem}: invalid confidence ${edge.confidence}`);
    if (typeof edge.confidence_score !== "number" || edge.confidence_score < 0.1 || edge.confidence_score > 1) errors.push(`chunk ${stem}: invalid confidence_score for ${edge.source} -> ${edge.target}`);
    if (edge.confidence === "EXTRACTED" && edge.confidence_score !== 1) errors.push(`chunk ${stem}: EXTRACTED edge score must be 1`);
    if (!fileList.has(edge.source_file)) errors.push(`chunk ${stem}: edge source_file not in exact file list: ${edge.source_file}`);
    if (edge.source === edge.target) errors.push(`chunk ${stem}: self edge ${edge.source}`);
    allEdges.push({ ...edge, chunk: stem });
  }
  for (const hyperedge of chunk.hyperedges) {
    if (!fileList.has(hyperedge.source_file)) errors.push(`chunk ${stem}: hyperedge source_file not in exact file list: ${hyperedge.source_file}`);
    allHyperedges.push({ ...hyperedge, chunk: stem });
  }
  summaries.push({ chunk: stem, files: fileList.size, nodes: chunk.nodes.length, edges: chunk.edges.length, hyperedges: chunk.hyperedges.length });
}

for (const edge of allEdges) {
  if (!allNodes.has(edge.source)) errors.push(`chunk ${edge.chunk}: missing edge source node ${edge.source}`);
  if (!allNodes.has(edge.target)) errors.push(`chunk ${edge.chunk}: missing edge target node ${edge.target}`);
}
for (const hyperedge of allHyperedges) {
  for (const node of hyperedge.nodes ?? []) if (!allNodes.has(node)) errors.push(`chunk ${hyperedge.chunk}: missing hyperedge node ${node}`);
}

console.log(JSON.stringify({ ok: errors.length === 0, summaries, totals: { nodes: allNodes.size, edges: allEdges.length, hyperedges: allHyperedges.length }, errors }, null, 2));
if (errors.length > 0) process.exitCode = 1;
