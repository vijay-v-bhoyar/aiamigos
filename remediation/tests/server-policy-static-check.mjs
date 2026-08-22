#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const POLICY_DIR = path.resolve(TEST_DIR, '..', 'server-policy');
const POLICY_PATH = path.join(POLICY_DIR, 'aiamigos-origin-policy.htaccess');
const README_PATH = path.join(POLICY_DIR, 'README.md');
const MANIFEST_PATH = path.join(POLICY_DIR, 'policy-manifest.json');

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const countLiteral = (text, value) => text.split(value).length - 1;

function verifyPolicy({ policyBuffer, readme, manifest, enforceIntegrity = true }) {
  const policy = policyBuffer.toString('utf8');
  const lines = policy.split(/\r?\n/);
  const errors = [];
  let checks = 0;

  const assert = (condition, message) => {
    checks += 1;
    if (!condition) errors.push(message);
  };
  const hasLine = (value) => lines.some((line) => line.trim() === value);
  const lineIndex = (predicate) => lines.findIndex(predicate);

  assert(manifest.schemaVersion === 1, 'manifest schemaVersion must be 1');
  assert(manifest.status === 'dormant-not-deployed', 'manifest must remain dormant-not-deployed');
  assert(manifest.productionAuthorized === false, 'manifest must not authorize production');
  assert(manifest.originPublicCacheEnabled === false, 'origin public cache must remain disabled');
  assert(manifest.cspDisposition === 'report-only', 'manifest CSP disposition must be report-only');
  assert(Number.isInteger(manifest.maxBytes) && manifest.maxBytes > 0 && manifest.maxBytes <= 8192, 'manifest maxBytes must be a positive bound no larger than 8192');
  assert(policyBuffer.length <= manifest.maxBytes, `policy exceeds byte bound ${manifest.maxBytes}`);
  assert(!policy.includes('\u0000'), 'policy contains a NUL byte');
  if (enforceIntegrity) {
    assert(policyBuffer.length === manifest.actualBytes, 'policy byte length differs from manifest');
    assert(sha256(policyBuffer) === manifest.sha256, 'policy SHA-256 differs from manifest');
  }

  const begin = manifest.markers?.begin;
  const end = manifest.markers?.end;
  assert(typeof begin === 'string' && countLiteral(policy, begin) === 1, 'policy must contain exactly one begin marker');
  assert(typeof end === 'string' && countLiteral(policy, end) === 1, 'policy must contain exactly one end marker');
  assert(policy.trimStart().startsWith(begin), 'policy must start with its begin marker');
  assert(policy.trimEnd().endsWith(end), 'policy must end with its end marker');
  assert(!/^\s*#\s*(?:BEGIN|END) WordPress\s*$/im.test(policy), 'policy must not contain WordPress managed markers');
  assert(!/^\s*Rewrite(?:Rule|Cond)\b/im.test(policy), 'policy must not add rewrite rules or conditions');

  assert(/<IfModule\s+mod_setenvif\.c>/i.test(policy), 'mod_setenvif guard is missing');
  assert(/<IfModule\s+LiteSpeed>/i.test(policy), 'LiteSpeed guard is missing');
  assert(/<IfModule\s+mod_headers\.c>/i.test(policy), 'mod_headers guard is missing');
  assert(hasLine('CacheDisable public /'), 'LiteSpeed public cache must be disabled at /');
  assert(!/^\s*CacheEnable\s+public\s+\/\s*$/im.test(policy), 'unsafe CacheEnable public / is forbidden');
  assert(!/^\s*Cache(?:StorePrivate|StoreNoStore|IgnoreCacheControl)\s+On\s*$/im.test(policy), 'cache controls must not override private/no-store intent');
  assert(!/E\s*=\s*cache-control\s*:\s*public/i.test(policy), 'wildcard LiteSpeed public cache environment rule is forbidden');

  const exactPublicHtmlRule = 'SetEnvIfNoCase Request_URI "^/(?:$|(?:blog|about-us|contact|privacy-policy-2|team/member-name-01)/?$)" AIAMIGOS_PUBLIC_HTML=1';
  assert(hasLine(exactPublicHtmlRule), 'exact public HTML allowlist is missing or changed');
  assert(hasLine('SetEnvIfNoCase Request_URI "^/(?:robots\\.txt|(?:[a-z0-9_-]+-)?sitemap(?:_index)?\\.xml)$" AIAMIGOS_PUBLIC_DISCOVERY=1'), 'bounded robots/sitemap discovery rule is missing');
  assert(hasLine('SetEnvIfNoCase Request_URI "\\.(?:css|js|mjs|map)$" AIAMIGOS_PUBLIC_CODE=1'), 'CSS/JavaScript public class is missing');
  assert(hasLine('SetEnvIfNoCase Request_URI "\\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp|woff2?|ttf|otf|eot)$" AIAMIGOS_PUBLIC_MEDIA=1'), 'image/font public class is missing');
  assert(!/SetEnvIfNoCase\s+Request_URI\s+"(?:\.\*|\^\/\.\*)"\s+AIAMIGOS_PUBLIC_/i.test(policy), 'catch-all public URI classification is forbidden');

  assert(hasLine('SetEnvIfExpr "%{REQUEST_METHOD} != \'GET\' && %{REQUEST_METHOD} != \'HEAD\'" AIAMIGOS_PRIVATE=1'), 'non-GET/HEAD private boundary is missing');
  assert(hasLine('SetEnvIfExpr "-n %{QUERY_STRING}" AIAMIGOS_PRIVATE=1'), 'query-string private boundary is missing');
  assert(hasLine('SetEnvIfNoCase Cookie ".+" AIAMIGOS_PRIVATE=1'), 'cookie private boundary is missing');
  assert(hasLine('SetEnvIfNoCase Authorization ".+" AIAMIGOS_PRIVATE=1'), 'authorization private boundary is missing');
  const privateRouteLine = lines.find((line) => /AIAMIGOS_PRIVATE=1/.test(line) && /wp-admin/.test(line) && /wp-json/.test(line));
  assert(Boolean(privateRouteLine), 'WordPress login/admin/REST/mutation private route boundary is missing');
  for (const token of ['wp-login\\.php', 'wp-json', 'xmlrpc\\.php', 'wp-cron\\.php', 'wp-comments-post\\.php', 'wp-signup\\.php', 'wp-activate\\.php']) {
    assert(privateRouteLine?.includes(token), `private route boundary is missing ${token}`);
  }

  const ownedHeaders = [
    ['Strict-Transport-Security', 'Header always set Strict-Transport-Security'],
    ['X-Content-Type-Options', 'Header always set X-Content-Type-Options "nosniff"'],
    ['X-Frame-Options', 'Header always set X-Frame-Options "SAMEORIGIN"'],
    ['Referrer-Policy', 'Header always set Referrer-Policy "strict-origin-when-cross-origin"'],
    ['Permissions-Policy', 'Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()"']
  ];
  for (const [name, setPrefix] of ownedHeaders) {
    assert(hasLine(`Header unset ${name}`), `${name} onsuccess-table unset is missing`);
    assert(hasLine(`Header always unset ${name}`), `${name} always-table unset is missing`);
    assert(lines.some((line) => line.trim().startsWith(setPrefix)), `${name} authoritative set is missing`);
  }
  const hstsLine = lines.find((line) => /^\s*Header always set Strict-Transport-Security\b/i.test(line));
  assert(hstsLine?.includes('max-age=15552000'), 'HSTS max-age must be 15552000');
  assert(hstsLine?.includes("%{HTTPS} == 'on'") && hstsLine?.includes("X-Forwarded-Proto"), 'HSTS must be HTTPS/proxy-HTTPS conditional');
  assert(!/includeSubDomains|preload/i.test(hstsLine ?? ''), 'HSTS must not commit includeSubDomains or preload');
  assert(hasLine('Header unset X-Powered-By') && hasLine('Header always unset X-Powered-By'), 'X-Powered-By must be removed from both header tables');
  assert(!/^\s*Header\s+(?:always\s+)?(?:set|setifempty|append|add|merge)\s+X-Powered-By\b/im.test(policy), 'X-Powered-By must never be set');

  assert(hasLine('Header unset Content-Security-Policy') && hasLine('Header always unset Content-Security-Policy'), 'enforcing CSP must be removed from both header tables');
  assert(hasLine('Header unset Content-Security-Policy-Report-Only') && hasLine('Header always unset Content-Security-Policy-Report-Only'), 'report-only CSP must be deduplicated in both header tables');
  const enforcingCsp = lines.filter((line) => /^\s*Header\s+(?:always\s+)?(?:set|setifempty|append|add|merge)\s+Content-Security-Policy(?:\s|$)/i.test(line));
  assert(enforcingCsp.length === 0, 'enforcing Content-Security-Policy is forbidden in this candidate');
  const reportOnlyLines = lines.filter((line) => /^\s*Header always set Content-Security-Policy-Report-Only\b/i.test(line));
  assert(reportOnlyLines.length === 1, 'exactly one CSP Report-Only setter is required');
  const reportOnly = reportOnlyLines[0] ?? '';
  for (const directive of ["default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'self'", "form-action 'self'", 'script-src ', 'style-src ', 'img-src ', 'font-src ', 'connect-src ', 'frame-src ']) {
    assert(reportOnly.includes(directive), `CSP Report-Only is missing ${directive.trim()}`);
  }
  assert(!/\breport-(?:uri|to)\b/i.test(reportOnly), 'CSP must not invent an unapproved reporting endpoint');

  const cacheLines = lines.filter((line) => /^\s*Header always set Cache-Control\b/i.test(line));
  const defaultCacheIndex = lineIndex((line) => line.trim() === 'Header always set Cache-Control "private, no-store, max-age=0, must-revalidate"');
  const publicCacheIndexes = lines.map((line, index) => ({ line, index })).filter(({ line }) => /^\s*Header always set Cache-Control\s+"public,/i.test(line));
  const privateCacheIndex = lineIndex((line, index) => index > defaultCacheIndex && /env=AIAMIGOS_PRIVATE\s*$/.test(line));
  const setCookieIndex = lineIndex((line) => /Cache-Control .*expr=-n resp\('Set-Cookie'\)/.test(line));
  const errorIndex = lineIndex((line) => /Cache-Control .*REQUEST_STATUS.*>= 400/.test(line));
  assert(hasLine('Header unset Cache-Control') && hasLine('Header always unset Cache-Control'), 'Cache-Control must be removed from both header tables');
  assert(defaultCacheIndex >= 0, 'unconditional dynamic private/no-store default is missing');
  assert(publicCacheIndexes.length === 4, 'exactly four bounded public Cache-Control classes are required');
  assert(publicCacheIndexes.every(({ line }) => /env=AIAMIGOS_PUBLIC_(?:HTML|DISCOVERY|CODE|MEDIA)\s*$/.test(line)), 'every public Cache-Control setter must have a known public-class environment guard');
  assert(publicCacheIndexes.every(({ index }) => index > defaultCacheIndex), 'public cache setters must follow the private default');
  assert(hasLine('Header always merge Vary "Cookie" env=AIAMIGOS_PUBLIC_HTML'), 'public HTML must vary on Cookie');
  assert(hasLine('Header always merge Vary "Authorization" env=AIAMIGOS_PUBLIC_HTML'), 'public HTML must vary on Authorization');
  assert(privateCacheIndex > Math.max(...publicCacheIndexes.map(({ index }) => index)), 'state-bearing private override must run after every public cache setter');
  assert(setCookieIndex > privateCacheIndex, 'Set-Cookie private override must run after public/private request classification');
  assert(errorIndex > setCookieIndex, 'error private override must be the final cache decision');
  assert(cacheLines.every((line) => !/"public,[^"]*"\s*$/.test(line)), 'unguarded public Cache-Control setter is forbidden');

  const expectedAllowlist = ['/', '/blog/', '/about-us/', '/contact/', '/privacy-policy-2/', '/team/member-name-01/'];
  assert(JSON.stringify(manifest.publicHtmlAllowlist) === JSON.stringify(expectedAllowlist), 'manifest public HTML allowlist differs from the reviewed exact routes');
  assert(manifest.placement?.afterLastCompletedProviderOrCacheBlock === true, 'manifest must require placement after completed provider/cache blocks');
  assert(manifest.placement?.immediatelyBefore === '# BEGIN WordPress', 'manifest must require immediate placement before # BEGIN WordPress');
  assert(manifest.placement?.insideWordPressManagedBlock === false, 'manifest must forbid placement inside WordPress markers');
  assert(manifest.placement?.requiresExactlyOneWordPressMarkerPair === true, 'manifest must require exactly one WordPress marker pair');
  assert(manifest.placement?.abortWhenAmbiguous === true, 'manifest must abort on ambiguous placement');

  assert(readme.includes('**Status:** DORMANT / NOT DEPLOYED'), 'README must state dormant/not deployed');
  assert(readme.includes('after the last complete provider/cache block'), 'README placement instruction must follow completed provider/cache blocks');
  assert(readme.includes('immediately before the first `# BEGIN WordPress`'), 'README placement instruction must be immediately before the first WordPress marker');
  assert(readme.includes('exactly one `# BEGIN WordPress`') && readme.includes('exactly one later `# END WordPress`'), 'README must require exactly one ordered WordPress marker pair');
  assert(readme.includes('SHA-256') && readme.includes('byte length'), 'README must require a byte/hash preimage');
  assert(readme.includes('byte-identical'), 'README must preserve non-inserted preimage bytes');
  assert(readme.includes('Exact rollback') && readme.includes('byte-for-byte atomic restore'), 'README must define exact preimage rollback');
  assert(readme.includes('Applying this is a separate, authorized change'), 'README must not imply deployment authority');

  return { errors, checks };
}

async function main() {
  let policyBuffer;
  let readme;
  let manifest;
  try {
    [policyBuffer, readme, manifest] = await Promise.all([
      readFile(POLICY_PATH),
      readFile(README_PATH, 'utf8'),
      readFile(MANIFEST_PATH, 'utf8').then(JSON.parse)
    ]);
  } catch (error) {
    console.error(`server-policy-static-check: FAIL\n- required artifact cannot be read: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const result = verifyPolicy({ policyBuffer, readme, manifest });
  if (result.errors.length > 0) {
    console.error(`server-policy-static-check: FAIL (${result.errors.length}/${result.checks} assertions failed)`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  const mutationCases = [
    {
      name: 'missing required directive',
      expected: 'HSTS max-age',
      policy: policyBuffer.toString('utf8').replace('max-age=15552000', 'max-age=60'),
      readme
    },
    {
      name: 'unsafe wildcard cache enable',
      expected: 'CacheEnable public /',
      policy: `${policyBuffer.toString('utf8')}\nCacheEnable public /\n`,
      readme
    },
    {
      name: 'unguarded public response cache',
      expected: 'exactly four bounded public',
      policy: `${policyBuffer.toString('utf8')}\nHeader always set Cache-Control "public, max-age=3600"\n`,
      readme
    },
    {
      name: 'CSP enforcement',
      expected: 'enforcing Content-Security-Policy',
      policy: `${policyBuffer.toString('utf8')}\nHeader always set Content-Security-Policy "default-src 'self'"\n`,
      readme
    },
    {
      name: 'missing cookie boundary',
      expected: 'cookie private boundary',
      policy: policyBuffer.toString('utf8').replace('    SetEnvIfNoCase Cookie ".+" AIAMIGOS_PRIVATE=1\n', ''),
      readme
    },
    {
      name: 'ambiguous rewrite placement',
      expected: 'immediately before the first WordPress marker',
      policy: policyBuffer.toString('utf8'),
      readme: readme.replace('immediately before the first `# BEGIN WordPress`', 'somewhere before a WordPress marker')
    }
  ];

  const mutationFailures = [];
  for (const mutation of mutationCases) {
    const mutated = verifyPolicy({
      policyBuffer: Buffer.from(mutation.policy, 'utf8'),
      readme: mutation.readme,
      manifest,
      enforceIntegrity: false
    });
    if (!mutated.errors.some((error) => error.includes(mutation.expected))) {
      mutationFailures.push(`${mutation.name}: expected a failure containing "${mutation.expected}"`);
    }
  }
  if (mutationFailures.length > 0) {
    console.error(`server-policy-static-check: FAIL (${mutationFailures.length} negative self-tests did not fail closed)`);
    for (const failure of mutationFailures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log('server-policy-static-check: PASS');
  console.log(`policy-bytes: ${policyBuffer.length}/${manifest.maxBytes}`);
  console.log(`policy-sha256: ${sha256(policyBuffer)}`);
  console.log(`positive-assertions: ${result.checks}`);
  console.log(`negative-self-tests: ${mutationCases.length}/${mutationCases.length}`);
  console.log('deployment-state: dormant-not-deployed');
}

await main();
