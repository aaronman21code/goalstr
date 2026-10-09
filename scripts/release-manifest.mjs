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
fs.writeFileSync('release.json', JSON.stringify({ project: 'goalstr', displayName: 'Goalstr', version: '0.1.1', stage: 1, previousStage: null, previousVersion: '0.1.0', created: '2026-10-09', storageSchemaVersion: 1, removedFiles: ['docs/reference/Daily_Accountability_Prototype_PRD.md', 'docs/reference/Daily_Accountability_Prototype_Build_Plan.md'], verification: { typecheck: 'passed', boundaryLint: 'passed', domainAndStorageTests: '23 passed', productionBuild: 'passed', browserScenarios: 'pending: runtime unavailable', hostedDeployment: 'user deploys via GitHub/Vercel' }, files }, null, 2) + '\n');
console.log(`Release manifest: ${files.length} source/config/documentation files (manifest itself excluded from hashes).`);
