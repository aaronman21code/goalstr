import type { SignedEvent } from '../../../domain/ports/index.ts';
/** Stage 2 subset: explicit e targets for kind 1; addressable objects come later. */
export function deletionTargets(event: SignedEvent): string[] {
    if (event.kind !== 5) throw new Error('Expected a deletion request.');
    const ids = event.tags.filter(t => t[0] === 'e').map(t => t[1]);
    if (!ids.length || ids.some(id => !/^[0-9a-f]{64}$/.test(id))) throw new Error('Invalid deletion targets.');
    return [...new Set(ids)].sort();
}
