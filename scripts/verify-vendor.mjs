import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const folder = 'vendor/noble-secp256k1';
const provenance = JSON.parse(fs.readFileSync(path.join(folder, 'PROVENANCE.json'), 'utf8'));
for (const [name, expected] of Object.entries(provenance.sha256)) {
    const hash = createHash('sha256').update(fs.readFileSync(path.join(folder, name))).digest('hex');
    if (hash !== expected) throw new Error(`Vendored artifact changed: ${name}. Review and re-pin deliberately.`);
}
console.log('Vendored upstream source and compiled artifacts match their pinned checksums.');
