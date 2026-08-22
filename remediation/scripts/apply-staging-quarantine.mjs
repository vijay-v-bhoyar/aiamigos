#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const expectedOrigin = 'https://remediation.aiamigos.org';
const origin = String(process.env.WP_ORIGIN || expectedOrigin).replace(/\/$/, '');
let username = String(process.env.WP_USER || '');
let applicationPassword = String(process.env.WP_APP_PASSWORD || '').replace(/\s+/g, '');
const apply = process.argv.includes('--apply');
const credentialsStdin = process.argv.includes('--credentials-stdin');

const targets = [
  {
    apiType: 'posts',
    id: 1411,
    slug: 'langgraph-5-stunning-secrets-for-building-a-generative-ai-application',
    plan: 'CP-004',
  },
  {
    apiType: 'posts',
    id: 1407,
    slug: 'ways-to-test-a-rag-architecture-based-generative-ai-application',
    plan: 'CP-004',
  },
  {
    apiType: 'posts',
    id: 1421,
    slug: 'building-agentic-ai-saas-a-strategic-roadmap-using-google-gemini-enterprise',
    plan: 'CP-004',
  },
  {
    apiType: 'posts',
    id: 926,
    slug: 'custom-gpt-models',
    plan: 'CP-004',
  },
  { apiType: 'pages', id: 21, slug: 'services', plan: 'CP-011' },
  { apiType: 'pages', id: 22, slug: 'classes', plan: 'CP-011' },
  { apiType: 'pages', id: 877, slug: 'ai-tools-for-kids', plan: 'CP-014' },
  { apiType: 'pages', id: 149, slug: 'ai-books-for-kids', plan: 'CP-014' },
];

function fail(message) {
  throw new Error(message);
}

if (origin !== expectedOrigin) {
  fail(`Refusing origin ${origin}; this utility is locked to ${expectedOrigin}`);
}

if (credentialsStdin) {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  const credentials = JSON.parse(input);
  username = String(credentials.username || '');
  applicationPassword = String(credentials.applicationPassword || '').replace(/\s+/g, '');
}

if (!username || !applicationPassword) {
  fail('WP_USER and WP_APP_PASSWORD are required, or use --credentials-stdin.');
}

const auth = `Basic ${Buffer.from(`${username}:${applicationPassword}`).toString('base64')}`;

async function wpRequest(target, options = {}) {
  const url = `${origin}/wp-json/wp/v2/${target.apiType}/${target.id}?context=edit`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: auth,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    fail(`${options.method || 'GET'} ${url} returned non-JSON HTTP ${response.status}`);
  }
  if (!response.ok) {
    fail(`${options.method || 'GET'} ${url} failed with HTTP ${response.status}: ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

const before = [];
for (const target of targets) {
  const record = await wpRequest(target);
  if (record.id !== target.id || record.slug !== target.slug) {
    fail(
      `Identity mismatch for ${target.apiType}/${target.id}: expected ${target.slug}, received ${record.slug}`,
    );
  }
  before.push({ target, record });
}

const summary = before.map(({ target, record }) => ({
  plan: target.plan,
  apiType: target.apiType,
  id: target.id,
  slug: target.slug,
  status: record.status,
  modified: record.modified_gmt,
}));

if (!apply) {
  process.stdout.write(`${JSON.stringify({ mode: 'dry-run', origin, targets: summary }, null, 2)}\n`);
  process.exit(0);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.resolve('remediation', 'staging-backups', `quarantine-${timestamp}`);
await mkdir(backupDir, { recursive: true });

for (const { target, record } of before) {
  const serialized = `${JSON.stringify(record, null, 2)}\n`;
  await writeFile(path.join(backupDir, `${target.apiType}-${target.id}.before.json`), serialized, {
    flag: 'wx',
  });
}

const changed = [];
for (const { target, record } of before) {
  if (record.status !== 'draft') {
    await wpRequest(target, { method: 'POST', body: JSON.stringify({ status: 'draft' }) });
  }
  const verified = await wpRequest(target);
  if (verified.status !== 'draft' || verified.id !== target.id || verified.slug !== target.slug) {
    fail(`Post-change verification failed for ${target.apiType}/${target.id}`);
  }
  changed.push({
    ...target,
    priorStatus: record.status,
    finalStatus: verified.status,
    modified: verified.modified_gmt,
  });
}

const manifest = {
  schemaVersion: 1,
  action: 'staging_quarantine_to_draft',
  origin,
  appliedAt: new Date().toISOString(),
  targets: changed,
  backupFiles: before.map(({ target, record }) => {
    const serialized = `${JSON.stringify(record, null, 2)}\n`;
    return {
      file: `${target.apiType}-${target.id}.before.json`,
      sha256: sha256(serialized),
    };
  }),
};

await writeFile(path.join(backupDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, {
  flag: 'wx',
});

process.stdout.write(`${JSON.stringify({ mode: 'applied', backupDir, targets: changed }, null, 2)}\n`);
