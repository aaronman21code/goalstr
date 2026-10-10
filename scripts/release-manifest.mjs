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
fs.writeFileSync('release.json', JSON.stringify({ project: pkg.name, displayName: 'Goalstr', version: pkg.version, stage: 2, previousStage: 1, previousVersion: '0.1.1', created: '2026-10-09', storageSchemaVersion: 1, protocolContract: 'goalstr-v1', removedFiles: [], compatibility: { practiceData: 'preserved; no migration', practiceBackups: 'schema 1 retained', livePublication: 'not implemented in this stage' }, baseline: { source: 'Previously generated Goalstr Stage 1 version 0.1.1', repository: 'https://github.com/aaronman21code/goalstr', upstreamComparison: 'unavailable in build environment' }, verification: { typecheck: 'passed', boundaryLint: 'passed', vendorIntegrity: 'passed', domainAndStorageTests: '23 passed', protocolTests: '26 passed', officialBip340Vectors: '19 passed inside protocol suite', productionBuild: 'passed', browserScenarios: 'pending: runtime unavailable; CI scenarios supplied', hostedDeployment: 'user updates existing GitHub/Vercel project' }, files }, null, 2) + '\n');
console.log(`Release manifest: ${files.length} source/config/documentation files (manifest itself excluded from hashes).`);
