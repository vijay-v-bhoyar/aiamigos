import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const deployRoot = path.join(root, 'deploy');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('dist/index.html is missing; run npm run build first');

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const artifactDir = path.join(deployRoot, `aiamigos-static-${stamp}`);
fs.mkdirSync(deployRoot, { recursive: true });
fs.cpSync(dist, artifactDir, { recursive: true });

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push({ path: path.relative(artifactDir, full).replaceAll(path.sep, '/'), sha256: crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex'), bytes: fs.statSync(full).size });
  }
}
walk(artifactDir);
const manifest = {
  generatedAt: new Date().toISOString(),
  site: 'https://www.aiamigos.org',
  artifactDir: path.relative(root, artifactDir).replaceAll(path.sep, '/'),
  fileCount: files.length,
  files,
  hostingerAuthorityRequired: true,
  productionMutationPerformed: false,
  launchStrategy: 'direct-replacement',
  rollback: 'Preserve the prior Hostinger document root as a timestamped backup before copying this artifact. Restore that backup to roll back.'
};
fs.writeFileSync(path.join(artifactDir, 'DEPLOYMENT_MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Prepared Hostinger artifact at ${path.relative(root, artifactDir)} (${files.length} files). No upload or production mutation was performed.`);
