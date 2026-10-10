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
  stage: 3, previousStage: 2, previousVersion: '0.2.0', created: '2026-10-10',
  storageSchemaVersion: 1, protocolContract: 'goalstr-v1', removedFiles: [],
  changeReport: 'CHANGES_STAGE_03.md',
  compatibility: { practiceData: 'preserved; no migration', practiceBackups: 'schema 1 retained', publicCache: 'session-only', livePublication: 'not implemented; Stage 4' },
  baseline: { source: 'Shipped Goalstr Stage 2 version 0.2.0, confirmed deployed by user', sourceZipSha256: '8abd9c715a04aa647d8024f5bcff67466e3e3b6c9917dc789b8d2e00e22ee80f', repository: 'https://github.com/aaronman21code/goalstr', upstreamComparison: 'unavailable: bounded remote probe failed' },
  verification: { typecheck: 'passed', boundaryLint: 'passed', vendorIntegrity: 'passed', domainAndStorageTests: '23 passed', protocolTests: '26 passed', readPathTests: '26 passed', totalTests: 75, officialBip340Vectors: '19 passed inside protocol suite', productionBuild: 'passed', browserScenarios: 'pending: executable absent; CI scenarios supplied', realPilotReads: 'pending: bounded probes failed with 403/timeouts', hostedDeployment: 'user reviews stage branch/PR and deploys through existing GitHub/Vercel project' },
  files
};
fs.writeFileSync('release.json', JSON.stringify(release, null, 2) + '\n');
console.log(`Release manifest: ${files.length} source/config/documentation files (manifest itself excluded from hashes).`);
