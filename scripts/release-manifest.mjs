import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const excluded = new Set(['node_modules', 'dist', 'test-results', 'playwright-report', '.git']);
const files = [];
function walk(dir = '.') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(entry.name) || entry.name === 'release.json' || entry.name.startsWith('.env')) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else { const bytes = fs.readFileSync(file); files.push({ path: file.replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }); }
  }
}
walk(); files.sort((a, b) => a.path.localeCompare(b.path));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const release = {
  project: pkg.name, displayName: 'Goalstr', version: pkg.version,
  stage: 4, previousStage: 3, previousVersion: '0.3.0', created: '2026-10-10',
  storageSchemaVersion: 2, protocolContract: ['goalstr-v1','goalstr-v2'], removedFiles: [],
  changeReport: 'CHANGES_STAGE_04.md',
  compatibility: { practiceData: 'lossless explicit schema 1 → 2 migration; same database/store/key', practiceBackups: 'reads schema 1 and 2; exports schema 2; older builds cannot read schema 2', publicCache: 'People session-only; Live account-scoped observed cache', livePublication: 'NIP-07, verified public notes, durable account outbox and matching relay facts; real pilot pending' },
  baseline: { source: 'Shipped Goalstr Stage 3 version 0.3.0 generated in this conversation', sourceZipSha256: '8533cb5e215899c4c6e07672475e2c1a645d34982a8586a077be4420f6f8a9b3', repository: 'https://github.com/aaronman21code/goalstr', upstreamComparison: 'not performed; preserve any external custom changes' },
  verification: { typecheck: 'passed', boundaryLint: 'passed', vendorIntegrity: 'passed', domainAndStorageTests: '23 passed', protocolTests: '26 passed', readPathTests: '26 passed', stage4Tests: '32 passed', totalTests: 107, officialBip340Vectors: '19 passed inside protocol suite', productionBuild: 'passed', browserSourceSyntax: 'passed', browserScenarios: 'blocked: Chromium executable missing; CI scenarios supplied', realSignerAndPilot: 'pending: hosted NIP-07 whole-day smoke test required', visualAndAccessibility: 'pending: no observed browser screenshots/device checks', hostedDeployment: 'user reviews stage-04 branch/PR and deploys through existing GitHub/Vercel project' },
  files
};
fs.writeFileSync('release.json', JSON.stringify(release, null, 2) + '\n');
console.log(`Release manifest: ${files.length} source/config/documentation files (manifest itself excluded from hashes).`);
