import type { SignedEvent } from '../../../domain/ports/index.ts';
import { boundedRelays } from '../../../infrastructure/relays/urls.ts';
export function authorWriteRelays(event: SignedEvent): string[] {
    if (event.kind !== 10002) return [];
    return boundedRelays(event.tags.filter(t => t[0] === 'r' && t[1] && (t.length === 2 || t[2] === 'write')).map(t => t[1]), 4);
}
