import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import SftpClient from 'ssh2-sftp-client';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('dist/index.html is missing; run npm run build and npm test first');

const required = ['HOSTINGER_HOST', 'HOSTINGER_USER', 'HOSTINGER_PASSWORD'];
for (const name of required) if (!process.env[name]) throw new Error(`${name} is required. Keep it in the protected production environment, never in the repository.`);

export function safeRelativePath(value) {
  const normalized = String(value).replaceAll('\\', '/').replace(/^\/+/, '');
  if (!normalized || normalized.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error(`Unsafe managed path: ${value}`);
  return normalized;
}

const remoteRoot = (process.env.HOSTINGER_REMOTE_ROOT || 'public_html').replace(/\/$/, '');
const releaseRoot = (process.env.HOSTINGER_RELEASE_ROOT || '.aiamigos-releases').replace(/\/$/, '');
const remotePath = (base, relative) => `${base}/${safeRelativePath(relative)}`;
const releaseId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

function localFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes:true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? localFiles(full) : [full];
  });
}

const files = localFiles(dist).map((full) => {
  const relative = safeRelativePath(path.relative(dist, full));
  return { path:relative, full, bytes:fs.statSync(full).size, sha256:crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex') };
});
const nextPaths = new Set(files.map((file)=>file.path));
const sftp = new SftpClient('aiamigos-hostinger-deploy');

async function readJson(remote) {
  if (!(await sftp.exists(remote))) return null;
  return JSON.parse((await sftp.get(remote)).toString('utf8'));
}

try {
  await sftp.connect({ host:process.env.HOSTINGER_HOST, port:Number(process.env.HOSTINGER_PORT || 22), username:process.env.HOSTINGER_USER, password:process.env.HOSTINGER_PASSWORD, readyTimeout:20000 });
  const manifestPath = remotePath(remoteRoot, '.aiamigos-manifest.json');
  const priorManifest = await readJson(manifestPath);
  const rollbackRoot = remotePath(releaseRoot, `rollback-${releaseId}`);
  if (priorManifest?.files?.length) {
    await sftp.mkdir(rollbackRoot, true);
    for (const prior of priorManifest.files) {
      const relative = safeRelativePath(prior.path);
      const current = remotePath(remoteRoot, relative);
      if (!(await sftp.exists(current))) continue;
      const backup = remotePath(rollbackRoot, relative);
      await sftp.mkdir(path.posix.dirname(backup), true);
      await sftp.put(await sftp.get(current), backup);
    }
    await sftp.put(Buffer.from(JSON.stringify(priorManifest, null, 2)+'\n'), remotePath(rollbackRoot, 'DEPLOYMENT_MANIFEST.json'));
  }

  for (const file of files) {
    const remote = remotePath(remoteRoot, file.path);
    await sftp.mkdir(path.posix.dirname(remote), true);
    await sftp.put(file.full, remote);
  }

  for (const prior of priorManifest?.files ?? []) {
    const relative = safeRelativePath(prior.path);
    if (nextPaths.has(relative)) continue;
    const stale = remotePath(remoteRoot, relative);
    if (await sftp.exists(stale)) await sftp.delete(stale);
  }

  const manifest = { releaseId, deployedAt:new Date().toISOString(), site:'https://www.aiamigos.org', fileCount:files.length, files:files.map(({path,bytes,sha256})=>({path,bytes,sha256})), priorReleaseId:priorManifest?.releaseId ?? null, rollback:priorManifest?.files?.length ? rollbackRoot : null };
  await sftp.put(Buffer.from(JSON.stringify(manifest, null, 2)+'\n'), manifestPath);
  console.log(`Hostinger release ${releaseId} deployed: ${files.length} managed files. Rollback: ${manifest.rollback ?? 'first managed release; existing WordPress backup remains separate'}.`);
} finally {
  await sftp.end().catch(()=>{});
}
