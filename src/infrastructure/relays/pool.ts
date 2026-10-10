import { verifySignedEvent, serializedBytes } from '../../protocol/nips/01/events.ts';
import { safeDiagnosticText } from '../../learning/protocol-service.ts';
import { boundedRelays, MAX_RELAYS } from './urls.ts';
import type { SignedEvent, PublicationFact, PublisherPort, CancellationSignal } from '../../domain/ports/index.ts';
import type { RelayFilter, RelayReaderPort, ReadResult, ReadStatus } from '../../public/types.ts';

export interface SocketPort {
    readonly readyState: number;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
    send(data: string): void; close(): void;
}
interface Task { open(): void; message(value: unknown): void; fail(): void; cancel(): void; }
interface Peer { url: string; socket: SocketPort; tasks: Map<string, Task>; cleanup(): void; }
export interface PoolOptions {
    socket?: (url: string) => SocketPort; timeoutMs?: number; maxEvents?: number;
    verify?: typeof verifySignedEvent; random?: () => number;
}
export function matchesFilter(event: SignedEvent, f: RelayFilter): boolean {
    return (!f.ids || f.ids.includes(event.id)) && (!f.authors || f.authors.includes(event.pubkey)) &&
        (!f.kinds || f.kinds.includes(event.kind)) && (f.since === undefined || event.created_at >= f.since) &&
        (f.until === undefined || event.created_at <= f.until) &&
        (['#t','#e'] as const).every(key => !f[key] || event.tags.some(t => t[0] === key.slice(1) && f[key]!.includes(t[1])));
}
export function validateFilters(filters: RelayFilter[]): void {
    if (!filters.length || filters.length > 4) throw new Error('Use one to four bounded filters.');
    for (const f of filters) {
        if (!Number.isSafeInteger(f.limit) || f.limit < 1 || f.limit > 128) throw new Error('Filter limit must be 1–128.');
        if (Object.keys(f).some(k => !['ids','authors','kinds','since','until','limit','#t','#e'].includes(k))) throw new Error('Unsupported filter field.');
        for (const key of ['ids','authors','#e'] as const) if (f[key] && (!f[key]!.length || f[key]!.length > 128 || f[key]!.some(v => !/^[0-9a-f]{64}$/.test(v)))) throw new Error('Filters require exact public hex IDs.');
        if (f.kinds && (!f.kinds.length || f.kinds.length > 8 || f.kinds.some(k => !Number.isSafeInteger(k) || k < 0 || k > 65535))) throw new Error('Invalid kind filter.');
        if (f['#t'] && (!f['#t'].length || f['#t'].length > 4 || f['#t'].some(t => !t || t.length > 80))) throw new Error('Invalid tag filter.');
        for (const key of ['since','until'] as const) if (f[key] !== undefined && (!Number.isSafeInteger(f[key]) || f[key]! < 0)) throw new Error('Invalid query time.');
    }
}
/** Read-only NIP-01 transport. One socket/relay, verified finite queries, no publishing or AUTH. */
export class RelayPool implements RelayReaderPort, PublisherPort {
    private peers = new Map<string, Peer>();
    private sequence = 0;
    private disposed = false;
    private options: Required<PoolOptions>;
    constructor(options: PoolOptions = {}) {
        this.options = { socket: url => new WebSocket(url), timeoutMs: 6000, maxEvents: 128, verify: verifySignedEvent, random: Math.random, ...options };
    }
    private peer(url: string): Peer {
        const old = this.peers.get(url);
        if (old && old.socket.readyState < 2) return old;
        old?.cleanup(); this.peers.delete(url);
        if (this.peers.size >= MAX_RELAYS) {
            const idle = [...this.peers.values()].find(p => !p.tasks.size);
            if (!idle) throw new Error('Active relay cap reached.');
            idle.cleanup(); idle.socket.close(); this.peers.delete(idle.url);
        }
        const socket = this.options.socket(url), tasks = new Map<string, Task>();
        const open: EventListener = () => { for (const task of tasks.values()) task.open(); };
        const message: EventListener = event => {
            const data = (event as MessageEvent<unknown>).data;
            // Refuse binary/oversized frames before JSON parsing or crypto work.
            if (typeof data !== 'string' || data.length > 96 * 1024) return;
            let frame: unknown; try { if (new TextEncoder().encode(data).length > 96 * 1024) return; frame = JSON.parse(data); } catch { return; }
            if (!Array.isArray(frame)) return;
            if (frame[0] === 'AUTH') { for (const task of tasks.values()) task.message(['AUTH']); return; }
            if (typeof frame[1] === 'string') tasks.get(frame[1])?.message(frame);
        };
        const fail: EventListener = () => { for (const task of [...tasks.values()]) task.fail(); };
        const cleanup = () => { socket.removeEventListener('open', open); socket.removeEventListener('message', message); socket.removeEventListener('error', fail); socket.removeEventListener('close', fail); };
        socket.addEventListener('open', open); socket.addEventListener('message', message); socket.addEventListener('error', fail); socket.addEventListener('close', fail);
        const peer = { url, socket, tasks, cleanup }; this.peers.set(url, peer); return peer;
    }
    private attempt(filters: RelayFilter[], relay: string, signal: AbortSignal, timeout: number): Promise<ReadResult> {
        return new Promise(resolve => {
            const events = new Map<string, SignedEvent>(); let rejected = 0, frames = 0, done = false, accepting = true;
            let peer: Peer | null = null; const id = `goalstr-${++this.sequence}`; let queue = Promise.resolve();
            const finish = (status: ReadStatus, reason = '') => {
                if (done) return; done = true; accepting = false; clearTimeout(timer); signal.removeEventListener('abort', abort);
                peer?.tasks.delete(id);
                if (peer?.socket.readyState === 1) try { peer.socket.send(JSON.stringify(['CLOSE', id])); } catch { /* already closed */ }
                resolve({ events: [...events.values()].map(event => ({ event, relays: [relay] })), observations: [{ relay, status, received: events.size, rejected, reason: safeDiagnosticText(reason).slice(0, 160) }] });
            };
            const abort = () => finish('cancelled', 'Query cancelled.');
            const timer = setTimeout(() => finish('timeout', 'No complete response before the query deadline.'), timeout);
            if (signal.aborted || this.disposed) { abort(); return; }
            signal.addEventListener('abort', abort, { once: true });
            try { peer = this.peer(relay); }
            catch { finish('disconnected', 'Could not connect within the relay pool bounds.'); return; }
            const task: Task = {
                open: () => { if (!done) try { peer!.socket.send(JSON.stringify(['REQ', id, ...filters])); } catch { finish('disconnected', 'Relay send failed.'); } },
                fail: () => { accepting = false; void queue.then(() => finish('disconnected', 'Relay connection ended before EOSE.')); },
                cancel: abort,
                message: value => {
                    if (done || !accepting || !Array.isArray(value)) return;
                    if (value[0] === 'AUTH') { accepting = false; void queue.then(() => finish('auth_required', 'This relay requires authentication. Signing arrives in a later stage.')); return; }
                    if (value[0] === 'CLOSED') { accepting = false; void queue.then(() => finish('closed', typeof value[2] === 'string' ? value[2] : 'Relay ended the subscription.')); return; }
                    if (value[0] === 'EOSE') { accepting = false; void queue.then(() => finish('eose')); return; }
                    if (value[0] !== 'EVENT' || value.length !== 3) return;
                    if (++frames > this.options.maxEvents * 4) { accepting = false; void queue.then(() => finish('capped', 'Incoming event budget reached.')); return; }
                    const raw = value[2];
                    queue = queue.then(async () => {
                        if (done) return;
                        try {
                            if (serializedBytes(raw) > 16 * 1024) { rejected++; return; }
                            const result = await this.options.verify(raw);
                            if (done) return;
                            if (!result.event || !filters.some(f => matchesFilter(result.event!, f))) { rejected++; return; }
                            if (events.has(result.event.id)) return;
                            events.set(result.event.id, result.event);
                            if (events.size >= this.options.maxEvents) finish('capped', 'Verified event budget reached; history may be incomplete.');
                        } catch { rejected++; }
                    });
                }
            };
            peer.tasks.set(id, task); if (peer.socket.readyState === 1) task.open();
        });
    }
    async query(filters: RelayFilter[], values: string[], signal: AbortSignal): Promise<ReadResult> {
        validateFilters(filters);
        const relays = boundedRelays(values);
        if (!relays.length) throw new Error('Choose at least one valid public WSS relay.');
        const results = await Promise.all(relays.map(async relay => {
            const start = Date.now(); const first = await this.attempt(filters, relay, signal, this.options.timeoutMs);
            if (first.observations[0].status !== 'disconnected' || signal.aborted || this.disposed) return first;
            // At most one retry, jittered, inside the original total deadline.
            const delay = Math.min(240, 120 + this.options.random() * 120), remaining = this.options.timeoutMs - (Date.now() - start) - delay;
            if (remaining < 50) return first;
            await new Promise<void>(resolve => { const stop = () => { clearTimeout(timer); signal.removeEventListener('abort', stop); resolve(); }; const timer = setTimeout(stop, delay); signal.addEventListener('abort', stop, { once: true }); });
            if (signal.aborted || this.disposed) return first;
            const peer = this.peers.get(relay); peer?.socket.close(); peer?.cleanup(); this.peers.delete(relay);
            const next = await this.attempt(filters, relay, signal, remaining);
            const events = new Map([...first.events, ...next.events].map(e => [e.event.id, e]));
            return { events: [...events.values()], observations: [next.observations[0]] };
        }));
        const events = new Map<string, { event: SignedEvent; relays: string[] }>();
        for (const result of results) for (const observed of result.events) {
            const old = events.get(observed.event.id); events.set(observed.event.id, { event: observed.event, relays: [...new Set([...(old?.relays ?? []), ...observed.relays])] });
        }
        return { events: [...events.values()].sort((a,b) => b.event.created_at - a.event.created_at || a.event.id.localeCompare(b.event.id)), observations: results.flatMap(r => r.observations) };
    }
    async publish(raw: SignedEvent, values: string[], signal: CancellationSignal, observed?: (fact: PublicationFact) => Promise<void>): Promise<PublicationFact[]> {
        const verified = await this.options.verify(raw);
        if (!verified.event) throw new Error('Only freshly verified signed events can be sent.');
        const event = verified.event, relays = boundedRelays(values, 4);
        if (!relays.length) throw new Error('Choose at least one write relay.');
        return Promise.all(relays.map(async relay => {
            const fact = await new Promise<PublicationFact>(resolve => {
                let peer: Peer | null = null, done = false, sent = false;
                const finish = (status: PublicationFact['status'], reason = '') => {
                    if (done) return; done = true; clearTimeout(timer); signal.removeEventListener('abort', abort);
                    peer?.tasks.delete(event.id);
                    resolve({ relay, status, sent, at: Math.floor(Date.now() / 1000), reason: safeDiagnosticText(reason).slice(0, 160) });
                };
                const abort = () => finish('cancelled', 'Publication stopped; delivery may have occurred if sent.');
                const timer = setTimeout(() => finish('timed_out', 'No matching relay acknowledgment. Delivery is not confirmed.'), this.options.timeoutMs);
                if (signal.aborted || this.disposed) { abort(); return; }
                signal.addEventListener('abort', abort, { once: true });
                try { peer = this.peer(relay); } catch { finish('disconnected', 'Could not open this relay.'); return; }
                if (peer.tasks.has(event.id)) { peer = null; finish('disconnected', 'This exact event already has an active publication.'); return; }
                const task: Task = {
                    open: () => { if (done || sent) return; try { sent = true; peer!.socket.send(JSON.stringify(['EVENT', event])); } catch { finish('disconnected', 'Relay send failed.'); } },
                    fail: () => finish('disconnected', 'Connection ended without acceptance. Delivery is not confirmed.'), cancel: abort,
                    message: value => {
                        if (done || !Array.isArray(value)) return;
                        if (value[0] === 'AUTH') { finish('auth_required', 'Relay authentication is supported in Stage 5. Try another configured write relay.'); return; }
                        if (value.length === 4 && value[0] === 'OK' && value[1] === event.id && typeof value[2] === 'boolean' && typeof value[3] === 'string') finish(value[2] ? 'accepted' : 'rejected', value[3]);
                    }
                };
                peer.tasks.set(event.id, task); if (peer.socket.readyState === 1) task.open();
            });
            await observed?.(fact); return fact;
        }));
    }
    reset(): void { for (const peer of this.peers.values()) { for (const task of [...peer.tasks.values()]) task.cancel(); peer.cleanup(); peer.socket.close(); } this.peers.clear(); }
    dispose(): void { this.disposed = true; this.reset(); }
}
