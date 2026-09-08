import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationDirectory = path.join(repositoryRoot, 'supabase', 'migrations');
const migrationFiles = fs.readdirSync(migrationDirectory)
  .filter((name) => name.endsWith('.sql'))
  .sort();

const reviewerId = '11111111-1111-4111-8111-111111111111';
const ordinaryUserId = '22222222-2222-4222-8222-222222222222';
const projectOwnerId = '88888888-8888-4888-8888-888888888888';
const projectEditorId = '99999999-9999-4999-8999-999999999999';
const projectViewerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const projectOutsiderId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const projectId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const contributionId = '33333333-3333-4333-8333-333333333333';
const contributionVersionId = '44444444-4444-4444-8444-444444444444';
const adopterId = '55555555-5555-4555-8555-555555555555';
const attestationId = '66666666-6666-4666-8666-666666666666';
const implementationId = '77777777-7777-4777-8777-777777777777';

let database;

async function setRequestIdentity(role, userId = '', appRole = '') {
  await database.exec(`set role ${role}`);
  await database.query(
    "select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claims', $2, false)",
    [userId, JSON.stringify({ app_metadata: appRole ? { role: appRole } : {} })],
  );
}

async function resetRequestIdentity() {
  await database.exec('reset role');
  await database.query(
    "select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claims', '{}', false)",
  );
}

async function asRole(role, userId, appRole, operation) {
  await setRequestIdentity(role, userId, appRole);
  try {
    return await operation();
  } finally {
    await resetRequestIdentity();
  }
}

test.before(async () => {
  database = new PGlite({ extensions: { pgcrypto } });
  await database.waitReady;
  await database.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
    $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
  `);

  for (const migrationFile of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationDirectory, migrationFile), 'utf8');
    assert.match(sql, /set local lock_timeout = '2s';/i, `${migrationFile} must bound lock waits`);
    assert.match(sql, /set local statement_timeout = '60s';/i, `${migrationFile} must bound execution time`);
    await database.exec(`begin;\n${sql}\ncommit;`);
  }

  await database.query('insert into auth.users (id) values ($1), ($2), ($3), ($4), ($5), ($6)', [
    reviewerId,
    ordinaryUserId,
    projectOwnerId,
    projectEditorId,
    projectViewerId,
    projectOutsiderId,
  ]);
});

test.after(async () => {
  await database?.close();
});

test('ordered migrations execute and keep private and verified outcomes distinct', async () => {
  assert.deepEqual(migrationFiles, [
    '202608230001_practice_os.sql',
    '202608240001_verified_practice_network.sql',
    '202608250001_public_evidence_platform.sql',
    '202609050001_project_authorization_hardening.sql',
  ]);

  const result = await database.query(`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('outcome_measurements', 'verified_outcome_measurements')
    order by table_name, ordinal_position
  `);
  const columnsByTable = Object.groupBy(result.rows, ({ table_name }) => table_name);

  assert.ok(columnsByTable.outcome_measurements.some(({ column_name }) => column_name === 'project_id'));
  assert.ok(columnsByTable.outcome_measurements.some(({ column_name }) => column_name === 'measured_value'));
  assert.ok(columnsByTable.verified_outcome_measurements.some(({ column_name }) => column_name === 'implementation_id'));
  assert.ok(columnsByTable.verified_outcome_measurements.some(({ column_name }) => column_name === 'baseline_value'));
  assert.ok(columnsByTable.verified_outcome_measurements.some(({ column_name }) => column_name === 'review_status'));

  const rls = await database.query(`
    select tablename, rowsecurity
    from pg_tables
    where schemaname = 'public'
      and tablename in ('outcome_measurements', 'verified_outcome_measurements')
    order by tablename
  `);
  assert.deepEqual(rls.rows, [
    { tablename: 'outcome_measurements', rowsecurity: true },
    { tablename: 'verified_outcome_measurements', rowsecurity: true },
  ]);
});

test('verified outcomes fail closed and become public only after reviewer approval', async () => {
  await asRole('authenticated', reviewerId, 'reviewer', async () => {
    await database.query(`
      insert into public.contributions
        (id, slug, owner_id, title, contribution_type, summary, originality_status, status, published_at)
      values ($1, 'verified-workflow', $2, 'Verified workflow', 'method', 'A tested method.',
        'Authored method; independent originality not claimed.', 'published', now())
    `, [contributionId, reviewerId]);
    await database.query(`
      insert into public.contribution_versions
        (id, contribution_id, version, author_id, specification, change_summary, evidence_sha256, status, released_at)
      values ($1, $2, '1.0.0', $3, '{}', 'Initial reviewed release.', $4, 'released', now())
    `, [contributionVersionId, contributionId, reviewerId, 'a'.repeat(64)]);
    await database.query(`
      insert into public.adopters
        (id, display_name, sector, country_code, external_url, verification_status, public_consent, verified_by, verified_at)
      values ($1, 'Independent adopter', 'education', 'US', 'https://example.edu/adoption',
        'verified', true, $2, now())
    `, [adopterId, reviewerId]);
    await database.query(`
      insert into public.adoption_attestations
        (id, adopter_id, contribution_version_id, scope, adopted_at, external_verification_url,
         verifier_name, relationship_disclosure, evidence_sha256, review_status, reviewed_by, reviewed_at)
      values ($1, $2, $3, 'Sanitized classroom pilot', current_date, 'https://example.edu/evidence',
        'Independent verifier', 'No relationship declared.', $4, 'approved', $5, now())
    `, [attestationId, adopterId, contributionVersionId, 'b'.repeat(64), reviewerId]);
    await database.query(`
      insert into public.implementations
        (id, adoption_attestation_id, task_slug, sanitized_scope, started_at, ended_at,
         privacy_status, publication_status, reviewed_by, reviewed_at)
      values ($1, $2, 'lesson-planning', 'No learner records or organization identifiers.',
        current_date - 14, current_date, 'passed', 'approved', $3, now())
    `, [implementationId, attestationId, reviewerId]);
    await database.query(`
      insert into public.verified_outcome_measurements
        (implementation_id, metric, unit, baseline_value, result_value, sample_size,
         window_start, window_end, collection_method, limitations, human_decision,
         privacy_status, review_status, reviewed_by, reviewed_at)
      values ($1, 'Preparation time', 'minutes', 60, 42, 12, current_date - 14, current_date,
        'Timestamped work logs', array['Small self-selected cohort'], 'pilot',
        'passed', 'approved', $2, now())
    `, [implementationId, reviewerId]);
    await database.query(`
      insert into public.verified_outcome_measurements
        (implementation_id, metric, unit, baseline_value, result_value, sample_size,
         window_start, window_end, collection_method, limitations, human_decision)
      values ($1, 'Correction rate', 'percent', 8, 7, 12, current_date - 14, current_date,
        'Reviewer worksheet', array['Single workflow'], 'revise')
    `, [implementationId]);
  });

  const publicRows = await asRole('anon', '', '', () => database.query(`
    select metric, baseline_value, result_value
    from public.verified_outcome_measurements
    order by metric
  `));
  assert.deepEqual(publicRows.rows, [{ metric: 'Preparation time', baseline_value: '60', result_value: '42' }]);

  await assert.rejects(
    () => asRole('anon', '', '', () => database.query(`
      insert into public.verified_outcome_measurements
        (implementation_id, metric, unit, baseline_value, result_value, sample_size,
         window_start, window_end, collection_method, limitations, human_decision)
      values ($1, 'Unauthorized', 'count', 1, 1, 1, current_date, current_date,
        'None', array['Unauthorized attempt'], 'stop')
    `, [implementationId])),
    /permission denied|row-level security/i,
  );

  await assert.rejects(
    () => asRole('authenticated', ordinaryUserId, '', () => database.query(`
      insert into public.verified_outcome_measurements
        (implementation_id, metric, unit, baseline_value, result_value, sample_size,
         window_start, window_end, collection_method, limitations, human_decision)
      values ($1, 'Unauthorized', 'count', 1, 1, 1, current_date, current_date,
        'None', array['Unauthorized attempt'], 'stop')
    `, [implementationId])),
    /permission denied|row-level security/i,
  );
});

test('project membership is owner-controlled and child rows enforce project access', async () => {
  await asRole('authenticated', projectOwnerId, '', async () => {
    await database.query(`
      insert into public.projects (id, owner_id, track, title, goal)
      values ($1, $2, 'business', 'Controlled project', 'Measure a bounded workflow')
    `, [projectId, projectOwnerId]);
    await database.query(`
      insert into public.project_members (project_id, user_id, member_role)
      values ($1, $2, 'editor'), ($1, $3, 'viewer')
    `, [projectId, projectEditorId, projectViewerId]);
  });

  const editorProjects = await asRole('authenticated', projectEditorId, '', () => database.query(
    'select id from public.projects where id = $1',
    [projectId],
  ));
  assert.equal(editorProjects.rows.length, 1);

  await asRole('authenticated', projectEditorId, '', () => database.query(`
    insert into public.artifacts (project_id, owner_id, artifact_type, title)
    values ($1, $2, 'experiment-log', 'Editor-owned experiment log')
  `, [projectId, projectEditorId]));

  const viewerArtifacts = await asRole('authenticated', projectViewerId, '', () => database.query(
    'select title from public.artifacts where project_id = $1',
    [projectId],
  ));
  assert.deepEqual(viewerArtifacts.rows, [{ title: 'Editor-owned experiment log' }]);

  await assert.rejects(
    () => asRole('authenticated', projectViewerId, '', () => database.query(`
      insert into public.artifacts (project_id, owner_id, artifact_type, title)
      values ($1, $2, 'experiment-log', 'Viewer write attempt')
    `, [projectId, projectViewerId])),
    /row-level security/i,
  );

  await assert.rejects(
    () => asRole('authenticated', projectOutsiderId, '', () => database.query(`
      insert into public.project_members (project_id, user_id, member_role)
      values ($1, $2, 'editor')
    `, [projectId, projectOutsiderId])),
    /row-level security/i,
  );

  await assert.rejects(
    () => asRole('authenticated', projectEditorId, '', () => database.query(`
      insert into public.project_members (project_id, user_id, member_role)
      values ($1, $2, 'viewer')
    `, [projectId, projectOutsiderId])),
    /row-level security/i,
  );

  const outsiderProjects = await asRole('authenticated', projectOutsiderId, '', () => database.query(
    'select id from public.projects where id = $1',
    [projectId],
  ));
  assert.deepEqual(outsiderProjects.rows, []);

  await assert.rejects(
    () => asRole('authenticated', projectOutsiderId, '', () => database.query(`
      insert into public.outcome_measurements (project_id, owner_id, metric, measured_value, unit)
      values ($1, $2, 'Unauthorized metric', 1, 'count')
    `, [projectId, projectOutsiderId])),
    /row-level security/i,
  );
});
