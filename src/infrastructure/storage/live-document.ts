import { z } from 'zod';
import type { LiveDocument, LiveStorePort } from '../../live/types.ts';
import { emptyLiveDocument } from '../../live/types.ts';
import { DEFAULT_RELAYS } from '../relays/urls.ts';
import { parseDocument } from './document-schema.ts';
import { initialDocument } from '../../practice/document.ts';
const hex = z.string().regex(/^[0-9a-f]{64}$/);
const unsigned = z.object({ pubkey: hex, created_at: z.number().int().nonnegative(), kind: z.number().int().min(0).max(65535), tags: z.array(z.array(z.string()).min(1)).max(128), content: z.string().max(16384) }).strict();
const signed = unsigned.extend({ id: hex, sig: z.string().regex(/^[0-9a-f]{128}$/) });
const fact = z.object({ relay: z.string(), status: z.enum(['accepted','rejected','timed_out','disconnected','auth_required','cancelled']), sent: z.boolean(), at: z.number().int().nonnegative(), reason: z.string().max(160) }).strict();
const operation = z.object({ id: z.string().uuid(), date: z.string(), type: z.enum(['plan','rest','checkin','revision','close','correction','resolve']), rootId: hex.nullable(), expectedHead: hex.nullable(), intent: unsigned, destinations: z.array(z.string()).min(1).max(4), createdAt: z.number().int(), event: signed.nullable(), facts: z.array(fact).max(4), observedOn: z.array(z.string()).max(8), error: z.string().max(240) }).strict();
const schema = z.object({ schemaVersion: z.literal(1), account: hex, publicAcknowledged: z.boolean(), drafts: z.record(z.unknown()), updateDrafts: z.record(z.unknown()), updateDraftHeads: z.record(hex).default({}), outbox: z.array(operation).max(1000), cache: z.array(signed).max(1000), relays: z.array(z.string()).min(1).max(4) }).strict();
export function parseLiveDocument(raw: unknown, account: string): LiveDocument {
    const doc = schema.parse(raw);
    if (doc.account !== account || doc.outbox.some(o => o.intent.pubkey !== account || o.event && o.event.pubkey !== account) || doc.cache.some(e => e.pubkey !== account && e.kind !== 5)) throw new Error('Stored account does not match the connected signer.');
    const local = parseDocument({ ...initialDocument('UTC'), drafts: doc.drafts, updateDrafts: doc.updateDrafts });
    return { ...doc, drafts: local.drafts, updateDrafts: local.updateDrafts };
}
/** Separate account store; no Practice database access. Changes are atomic across tabs. */
export class IndexedLiveStore implements LiveStorePort {
    private database: IDBDatabase | null = null;
    private opening: Promise<IDBDatabase> | null = null;
    private open(): Promise<IDBDatabase> {
        if (this.database) return Promise.resolve(this.database);
        if (this.opening) return this.opening;
        this.opening = new Promise((resolve, reject) => {
            if (!globalThis.indexedDB) { reject(new Error('Durable browser storage is required before signing.')); return; }
            const request = indexedDB.open('goalstr-live', 1); let done = false;
            const timer = setTimeout(() => { done = true; reject(new Error('Live storage did not open. No signature was requested.')); }, 2500);
            request.onupgradeneeded = () => request.result.createObjectStore('accounts');
            request.onerror = () => { clearTimeout(timer); reject(new Error('Live storage is unavailable. No signature was requested.')); };
            request.onsuccess = () => { clearTimeout(timer); if (done) { request.result.close(); return; } this.database = request.result; this.database.onversionchange = () => this.close(); resolve(this.database); };
        });
        return this.opening;
    }
    async load(account: string): Promise<LiveDocument | null> {
        const db = await this.open();
        const raw = await new Promise<unknown>((resolve,reject) => { const tx = db.transaction('accounts','readonly'), request = tx.objectStore('accounts').get(account); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
        return raw == null ? null : parseLiveDocument(raw, account);
    }
    async change(account: string, edit: (document: LiveDocument) => LiveDocument): Promise<LiveDocument> {
        const db = await this.open();
        return new Promise((resolve,reject) => {
            const tx = db.transaction('accounts','readwrite'), store = tx.objectStore('accounts'), request = store.get(account); let next: LiveDocument;
            request.onsuccess = () => { try { next = parseLiveDocument(edit(request.result == null ? emptyLiveDocument(account, DEFAULT_RELAYS) : parseLiveDocument(request.result, account)), account); store.put(next, account); } catch (error) { tx.abort(); reject(error); } };
            tx.oncomplete = () => resolve(next!); tx.onerror = tx.onabort = () => reject(new Error('Live data could not be saved. Publication was stopped; keep this tab open.'));
        });
    }
    close(): void { this.database?.close(); this.database = null; this.opening = null; }
}
