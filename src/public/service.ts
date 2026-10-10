import type { DecodedEvent, RootEvent } from '../domain/events/types.ts';
import { reconstruct } from '../domain/events/reconstruct.ts';
import { decodeEvent } from '../protocol/accountability/codec.ts';
import { encodePublic } from '../protocol/nips/19/identifiers.ts';
import { parsePublicInput, parsePublicRoute, publicPath } from '../protocol/nips/21/links.ts';
import { authorWriteRelays } from '../protocol/nips/65/relay-list.ts';
import { latestReplaceable, profileFrom } from '../protocol/nips/01/profiles.ts';
import { boundedRelays, DEFAULT_RELAYS, relayUrl } from '../infrastructure/relays/urls.ts';
import type { ObservedEvent, PublicCard, PublicSnapshot, PublicTarget, ReadResult, RelayFilter, RelayInfoPort, RelayReaderPort } from './types.ts';

export { DEFAULT_RELAYS };
export function openPublicPath(input: string, hexType: 'profile' | 'event'): string { return publicPath(parsePublicInput(input, hexType)); }
export function dayPath(id: string, author: string, hints: string[] = []): string { return publicPath({ type: 'event', id, author, hints: boundedRelays(hints, 4) }); }
export function profilePath(pubkey: string, hints: string[] = []): string { return publicPath({ type: 'profile', pubkey, hints: boundedRelays(hints, 4) }); }
export function publicKey(pubkey: string): string { return encodePublic('npub', pubkey); }
export function nostrEvent(id: string): string { return 'nostr:' + encodePublic('note', id); }
export function validateRelayLines(value: string): string[] {
    const values = value.split(/\s+/).filter(Boolean);
    if (!values.length || values.length > 8 || values.some(v => !relayUrl(v))) throw new Error('Enter 1–8 public wss:// relay URLs, without credentials, query strings or private addresses.');
    return boundedRelays(values);
}
const empty = (): PublicSnapshot => ({ phase: 'idle', cards: [], profiles: {}, targetProfile: null, observations: [], info: [], warnings: [], error: '', missingIds: [], rejected: 0, canLoadMore: false, cursor: null, inspected: [], relays: [], routedRelays: [], windowDays: 7 });
const descending = (a: ObservedEvent, b: ObservedEvent) => b.event.created_at - a.event.created_at || a.event.id.localeCompare(b.event.id);

/** The read application boundary owns routing, batching, finite retrieval and reconstruction. */
export class PublicService {
    private reader: RelayReaderPort;
    private information: RelayInfoPort;
    private now: () => number;
    private snapshot = empty();
    private listeners = new Set<() => void>();
    private observed = new Map<string, ObservedEvent>();
    private decoded = new Map<string, DecodedEvent>();
    private generation = 0;
    private controller: AbortController | null = null;
    private target: PublicTarget = { type: 'feed' };
    private selectedRoot: string | null = null;
    private hydrated = new Set<string>();
    private pages = 0;
    private disposed = false;
    constructor(reader: RelayReaderPort, information: RelayInfoPort, now: () => number = () => Math.floor(Date.now() / 1000)) { this.reader = reader; this.information = information; this.now = now; }
    getSnapshot = (): PublicSnapshot => this.snapshot;
    subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
    private emit(patch: Partial<PublicSnapshot>): void { if (this.disposed) return; this.snapshot = { ...this.snapshot, ...patch }; for (const listener of this.listeners) listener(); }
    private warn(message: string): void { this.emit({ warnings: [...new Set([...this.snapshot.warnings, message])] }); }
    async start(route: string, relays = DEFAULT_RELAYS, windowDays = 7): Promise<void> {
        this.controller?.abort(); this.generation++;
        this.observed.clear(); this.decoded.clear(); this.hydrated.clear(); this.pages = 0; this.selectedRoot = null;
        this.snapshot = empty();
        try {
            this.target = parsePublicRoute(route);
            if (![1,7,30].includes(windowDays)) throw new Error('Choose a 1, 7 or 30 day window.');
            const bootstrap = boundedRelays(relays); if (!bootstrap.length) throw new Error('Choose at least one valid relay.');
            const hints = this.target.type === 'feed' ? [] : this.target.hints;
            this.emit({ relays: boundedRelays([...bootstrap, ...hints]), windowDays });
            if (hints.length) this.warn('This link includes untrusted relay hints; only validated public WSS endpoints within the eight-relay cap are used.');
            await this.run(false);
        } catch (error) { this.emit({ phase: 'error', error: error instanceof Error ? error.message : 'The public page could not open.' }); }
    }
    async loadMore(): Promise<void> { if (this.snapshot.phase === 'loading' || !this.snapshot.canLoadMore || this.disposed) return; await this.run(true); }
    private async ingest(result: ReadResult, token: number): Promise<void> {
        if (token !== this.generation || this.disposed) return;
        let rejected = this.snapshot.rejected + result.observations.reduce((n,r) => n + r.rejected, 0);
        for (const record of result.events) {
            if (token !== this.generation || this.disposed) return;
            const old = this.observed.get(record.event.id);
            if (old) { this.observed.set(record.event.id, { ...old, relays: [...new Set([...old.relays, ...record.relays])] }); continue; }
            if (this.observed.size >= 800) { this.warn('The session event budget was reached. Results are partial; refresh or use a narrower window.'); break; }
            if (record.event.kind === 1 || record.event.kind === 5) {
                // Defense in depth: transport signature verification is repeated at the codec boundary.
                const decoded = await decodeEvent(record.event);
                if (token !== this.generation || this.disposed) return;
                if (decoded.category === 'invalid') rejected++;
                this.decoded.set(record.event.id, decoded);
            }
            this.observed.set(record.event.id, record);
        }
        this.emit({ rejected, observations: [...this.snapshot.observations, ...result.observations].slice(-96), inspected: [...this.observed.values()].sort(descending).slice(0, 128) });
    }
    private async query(filters: RelayFilter[], relays: string[], signal: AbortSignal, token: number): Promise<ReadResult> {
        if (signal.aborted || token !== this.generation) return { events: [], observations: [] };
        const result = await this.reader.query(filters, relays, signal); await this.ingest(result, token); return result;
    }
    private cards(): PublicCard[] {
        const all = [...this.decoded.values()], now = this.now();
        if (this.target.type === 'event') {
            const record = this.decoded.get(this.selectedRoot ?? this.target.id);
            if (!record?.event) return [];
            const projection = reconstruct(all, now, this.selectedRoot ?? this.target.id);
            return [{ id: record.event.id, event: record.event, author: record.event.pubkey, projection: record.category === 'root' ? projection : null, unsupported: record.category !== 'root', relays: this.observed.get(record.event.id)?.relays ?? [] }];
        }
        const roots = all.filter((r): r is RootEvent => r.category === 'root' && r.event.created_at <= now + 300);
        const seen = new Set<string>(); const cards: PublicCard[] = [];
        for (const root of roots.sort((a,b) => b.event.created_at - a.event.created_at || a.event.id.localeCompare(b.event.id))) {
            const projection = reconstruct(all, now, root.event.id);
            if (!projection.day || projection.mainRootId !== root.event.id) continue;
            const key = root.event.pubkey + ':' + root.payload.local_date; if (seen.has(key)) continue; seen.add(key);
            cards.push({ id: root.event.id, author: root.event.pubkey, event: root.event, projection, unsupported: false, relays: this.observed.get(root.event.id)?.relays ?? [] });
        }
        for (const record of all) if (record.category === 'unsupported' && !record.rootId && record.event.created_at <= now + 300) cards.push({ id: record.event.id, author: record.event.pubkey, event: record.event, projection: null, unsupported: true, relays: this.observed.get(record.event.id)?.relays ?? [] });
        return cards.sort((a,b) => b.event.created_at - a.event.created_at || a.id.localeCompare(b.id)).slice(0, Math.min(this.pages * 20, 100));
    }
    private profiles(): void {
        const events = [...this.observed.values()].map(r => r.event), profiles = { ...this.snapshot.profiles };
        const authors = new Set(this.cards().map(c => c.author)); if (this.target.type === 'profile') authors.add(this.target.pubkey);
        for (const author of authors) profiles[author] = profileFrom(latestReplaceable(events, 0, author, this.now()), author);
        this.emit({ profiles, targetProfile: this.target.type === 'profile' ? profiles[this.target.pubkey] : null });
    }
    private routed(authors: string[]): string[] {
        const events = [...this.observed.values()].map(r => r.event), suggested: string[] = [];
        for (const author of authors) { const list = latestReplaceable(events, 10002, author, this.now()); if (list) suggested.push(...authorWriteRelays(list)); }
        const all = [...new Set([...this.snapshot.relays, ...suggested])], relays = boundedRelays(all);
        this.emit({ routedRelays: relays.filter(r => !this.snapshot.relays.includes(r)) });
        if (all.length > relays.length) this.warn('Some advertised author relays were omitted to keep the pool within eight endpoints.');
        return relays;
    }
    private async hydrate(signal: AbortSignal, token: number): Promise<void> {
        const fresh = this.cards().filter(c => !this.hydrated.has(c.id)).slice(0, 20);
        const authors = [...new Set(fresh.map(c => c.author))];
        if (authors.length) await this.query([{ kinds: [0,10002], authors, limit: Math.min(128, authors.length * 2) }], this.snapshot.relays, signal, token);
        if (token !== this.generation || signal.aborted) return;
        this.profiles();
        const rootIds = fresh.filter(c => c.projection?.root).map(c => c.id);
        const routes = this.routed(authors);
        if (rootIds.length) {
            await this.query([{ kinds: [1,5], '#e': rootIds, limit: 128 }], routes, signal, token);
            for (let pass = 0; pass < 3 && !signal.aborted && token === this.generation; pass++) {
                const ids = [...new Set(this.cards().flatMap(c => c.projection?.missingIds ?? []))].filter(id => !this.observed.has(id)).slice(0, 64);
                if (!ids.length) break;
                const result = await this.query([{ ids, limit: Math.min(128, ids.length) }], routes, signal, token);
                if (!result.events.some(r => ids.includes(r.event.id))) break;
            }
            if (!signal.aborted && token === this.generation) {
                const allIds = [...new Set([...rootIds, ...[...this.decoded.values()].filter(r => r.category === 'state' && rootIds.includes(r.payload.root_id)).map(r => r.event!.id)])];
                const ids = allIds.slice(0, 128);
                if (allIds.length > ids.length) this.warn('Deletion lookups reached the 128-ID budget. Some cached updates may have unseen deletion requests.');
                if (ids.length) await this.query([{ kinds: [5], '#e': ids, limit: 128 }], routes, signal, token);
            }
        }
        if (token !== this.generation || signal.aborted) return;
        fresh.forEach(c => this.hydrated.add(c.id)); this.profiles(); this.emit({ cards: this.cards() });
    }
    private async run(more: boolean): Promise<void> {
        const token = this.generation, controller = new AbortController(); this.controller = controller;
        const deadline = setTimeout(() => controller.abort(), 30000), signal = controller.signal;
        const previousCursor = this.snapshot.cursor; this.emit({ phase: 'loading', error: '' });
        const infoWork = more ? Promise.resolve(this.snapshot.info) : Promise.all(this.snapshot.relays.map(relay => this.information.read(relay, signal)));
        try {
            this.pages++;
            let primary: ReadResult;
            if (this.target.type === 'event') {
                if (this.target.author) await this.query([{ kinds: [0,10002], authors: [this.target.author], limit: 8 }], this.snapshot.relays, signal, token);
                primary = await this.query([{ ids: [this.target.id], limit: 1 }], this.routed(this.target.author ? [this.target.author] : []), signal, token);
                const record = this.decoded.get(this.target.id);
                if (record?.event && this.target.author && record.event.pubkey !== this.target.author) this.warn('The verified event author differs from the untrusted link hint. The signed author is used.');
                if (record?.category === 'state') {
                    this.selectedRoot = record.payload.root_id;
                    await this.query([{ kinds: [0,10002], authors: [record.event.pubkey], limit: 8 }], this.snapshot.relays, signal, token);
                    await this.query([{ ids: [this.selectedRoot], limit: 1 }], this.routed([record.event.pubkey]), signal, token);
                } else this.selectedRoot = this.target.id;
                if (!record?.event) this.warn('This event was not found on the queried relays. That does not prove it does not exist.');
            } else {
                if (!more && this.target.type === 'profile') await this.query([{ kinds: [0,10002], authors: [this.target.pubkey], limit: 8 }], this.snapshot.relays, signal, token);
                const now = this.now(), until = more && previousCursor !== null ? previousCursor : now + 300;
                const filter: RelayFilter = { kinds: [1], '#t': ['goalstr','goalstr-v1','goalstr-v2'], since: now - this.snapshot.windowDays * 86400, until, limit: 20 };
                if (this.target.type === 'profile') filter.authors = [this.target.pubkey];
                primary = await this.query([filter], this.routed(this.target.type === 'profile' ? [this.target.pubkey] : []), signal, token);
                const times = primary.events.filter(r => r.event.created_at <= now + 300).map(r => r.event.created_at), cursor = times.length ? Math.min(...times) : previousCursor;
                const capped = primary.observations.some(r => r.status === 'capped' || r.received >= 20);
                const stalled = more && cursor === previousCursor;
                this.emit({ cursor, canLoadMore: capped && !stalled && this.pages < 5 && this.observed.size < 800 });
                if (capped) this.warn('A relay returned a full page. Same-second limits can omit events; pagination overlaps the boundary and deduplicates IDs.');
                if (stalled) this.warn('Pagination stopped at a crowded timestamp. Older history may be missing; use a profile link or another relay.');
            }
            if (token !== this.generation || this.disposed) return;
            const rootIds = [...new Set([...this.decoded.values()].filter(r => r.category === 'state').map(r => r.payload.root_id))].filter(id => !this.observed.has(id)).slice(0, 64);
            if (rootIds.length) await this.query([{ ids: rootIds, limit: rootIds.length }], this.snapshot.relays, signal, token);
            if (token !== this.generation || this.disposed) return;
            this.emit({ cards: this.cards() }); await this.hydrate(signal, token);
            if (token !== this.generation || this.disposed) return;
            const info = await infoWork; this.profiles();
            const observations = this.snapshot.observations, failed = observations.some(r => r.status !== 'eose'), succeeded = observations.some(r => r.status === 'eose');
            const missingRoots = [...this.decoded.values()].flatMap(r => r.category === 'state' && !this.decoded.has(r.payload.root_id) ? [r.payload.root_id] : []);
            const missingIds = [...new Set([...missingRoots, ...this.cards().flatMap(c => c.projection?.missingIds ?? [])])];
            const incomplete = this.cards().some(c => c.projection?.warnings.some(w => w.startsWith('Incomplete record.')));
            const future = [...this.observed.values()].filter(r => r.event.created_at > this.now() + 300).length;
            if (future) this.warn(`${future} future-dated events are quarantined. Refresh after the clock advances to re-evaluate them.`);
            if (signal.aborted) this.warn('The 30-second operation deadline was reached. Available results are retained.');
            if (missingIds.length) this.warn('Some parent events are still missing after bounded retrieval. Progress uses only reconstructable history.');
            this.emit({ info, missingIds, cards: this.cards(), phase: failed || signal.aborted || missingIds.length || incomplete ? (succeeded || this.observed.size ? 'partial' : 'disconnected') : 'ready' });
        } catch { if (token === this.generation && !this.disposed) this.emit({ phase: this.observed.size ? 'partial' : 'error', error: 'The public query could not complete. Check relay settings and retry.' }); }
        finally { clearTimeout(deadline); if (token === this.generation) this.controller = null; }
    }
    dispose(): void { this.disposed = true; this.generation++; this.controller?.abort(); this.reader.dispose(); this.listeners.clear(); }
}
