import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const inputArg = process.argv[2] || 'private-evidence/records.json';
const outputArg = process.argv[3] || `counsel-exports/evidence-pack-${new Date().toISOString().slice(0,10)}.json`;
const input = path.resolve(root, inputArg);
const output = path.resolve(root, outputArg);

const staysInside = (candidate, parent) => candidate === parent || candidate.startsWith(`${parent}${path.sep}`);
const privateRoot = path.resolve(root, 'private-evidence');
const exportRoot = path.resolve(root, 'counsel-exports');
if (!staysInside(input, privateRoot)) throw new Error('Input must remain under private-evidence/.');
if (!staysInside(output, exportRoot)) throw new Error('Output must remain under counsel-exports/.');
if (!fs.existsSync(input)) throw new Error(`Missing ${inputArg}. Copy the public schema fields into a local private-evidence/records.json file. This directory is gitignored.`);

const records = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!Array.isArray(records) || !records.length) throw new Error('Counsel evidence input must be a non-empty JSON array.');
const failures = [];
for (const [index, record] of records.entries()) {
  for (const field of ['claimId','exactClaim','factDate','possibleMappings','primaryEvidence','independence','strengths','weaknesses','counselStatus']) {
    if (record[field] === undefined || record[field] === null || record[field] === '') failures.push(`record ${index + 1}: missing ${field}`);
  }
  if (!Array.isArray(record.primaryEvidence) || !record.primaryEvidence.length) failures.push(`record ${index + 1}: primaryEvidence must not be empty`);
  if (typeof record.legalConclusion !== 'undefined') failures.push(`record ${index + 1}: remove legalConclusion; counsel, not the exporter, determines legal sufficiency`);
}
if (failures.length) throw new Error(`Counsel evidence validation failed:\n- ${failures.join('\n- ')}`);

const sorted = [...records].sort((a,b) => String(a.claimId).localeCompare(String(b.claimId)));
const payload = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  purpose: 'Private counsel review; never deploy to the public site.',
  legalBoundary: 'Possible mappings are organizational labels, not conclusions that any criterion or prong is satisfied.',
  recordCount: sorted.length,
  records: sorted,
};
const canonical = JSON.stringify(payload, null, 2) + '\n';
payload.packSha256 = crypto.createHash('sha256').update(canonical).digest('hex');
fs.mkdirSync(path.dirname(output), { recursive:true });
fs.writeFileSync(output, JSON.stringify(payload, null, 2) + '\n');
console.log(`Private counsel evidence pack written to ${path.relative(root, output)} (${sorted.length} records, SHA-256 ${payload.packSha256}).`);
