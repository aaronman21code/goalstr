import { decodePublic, encodePublic } from '../19/identifiers.ts';
import type { PublicTarget } from '../../../public/types.ts';
import { boundedRelays } from '../../../infrastructure/relays/urls.ts';
export function parsePublicInput(raw: string, hexType: 'profile' | 'event' = 'profile'): PublicTarget {
    let input = raw.trim();
    if (/^(?:nostr:)?nsec1|^(?:bunker|nostrconnect):/i.test(input)) throw new Error('Only public identifiers belong here. Never enter a private key or signer connection.');
    if (/^nostr:/i.test(input)) input = input.slice(6);
    if (/^[0-9a-f]{64}$/.test(input)) return hexType === 'profile' ? { type: 'profile', pubkey: input, hints: [] } : { type: 'event', id: input, hints: [] };
    const result = decodePublic(input);
    return result.type === 'profile' ? { type: 'profile', pubkey: result.pubkey, hints: boundedRelays(result.relays) } : { type: 'event', id: result.id, ...(result.author ? { author: result.author } : {}), hints: boundedRelays(result.relays) };
}
export function publicPath(target: PublicTarget): string {
    if (target.type === 'feed') return '/people';
    const id = encodePublic(target.type === 'profile' ? 'npub' : 'note', target.type === 'profile' ? target.pubkey : target.id);
    const query = new URLSearchParams(); target.hints.slice(0, 4).forEach(r => query.append('relay', r));
    if (target.type === 'event' && target.author) query.set('author', target.author);
    return `/public/${target.type === 'profile' ? 'profile' : 'day'}/${id}${query.size ? '?' + query.toString() : ''}`;
}
export function parsePublicRoute(route: string): PublicTarget {
    if (route.split('?')[0] === '/people') return { type: 'feed' };
    const [path, query] = route.split('?'), match = /^\/public\/(profile|day)\/([^/]+)$/.exec(path);
    if (!match) throw new Error('Unknown public page.');
    const target = parsePublicInput(decodeURIComponent(match[2]), match[1] === 'profile' ? 'profile' : 'event');
    if (target.type !== (match[1] === 'profile' ? 'profile' : 'event')) throw new Error('This identifier belongs to a different type of public page.');
    const params = new URLSearchParams(query ?? '');
    target.hints = boundedRelays([...target.hints, ...params.getAll('relay').slice(0, 8)]);
    if (target.type === 'event' && /^[0-9a-f]{64}$/.test(params.get('author') ?? '')) target.author = params.get('author')!;
    return target;
}
