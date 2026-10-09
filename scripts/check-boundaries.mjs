import fs from 'node:fs';
import path from 'node:path';
let failures = 0;
function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file); else if (/\.tsx?$/.test(file)) { const code = fs.readFileSync(file, 'utf8'); if (file.includes('domain/accountability') && /from\s+['"](?:react|zod|.*infrastructure|.*features|.*protocol)/.test(code)) { console.error('Domain import violation:', file); failures++; } if (file.includes('features') && /\b(?:fetch\s*\(|new\s+WebSocket\b|indexedDB\.)/.test(code)) { console.error('View accesses transport/storage:', file); failures++; } if (/dangerouslySetInnerHTML|eval\s*\(/.test(code)) { console.error('Unsafe rendering:', file); failures++; } } } }
walk('src');
if (failures) process.exit(1);
console.log('Import boundaries and safe-rendering checks passed. Run typecheck for semantic checks.');
