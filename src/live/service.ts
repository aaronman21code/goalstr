import type { ClockPort, PublisherPort, SignerPort, SignedEvent, UnsignedEvent } from '../domain/ports/index.ts';
import type { PlanDraft, Preferences, UpdateInput } from '../domain/accountability/types.ts';
import { appendSnapshot, current, makeDay } from '../domain/accountability/rules.ts';
import { localParts } from '../domain/accountability/time.ts';
import { outgoingTime, reconstruct, resolutionPayload } from '../domain/events/reconstruct.ts';
import type { DayProjection, DecodedEvent, StatePayload, EventType } from '../domain/events/types.ts';
import { decodeEvent, encodeStateVersion } from '../protocol/accountability/codec.ts';
import { encodeRoot } from '../protocol/accountability/v2/codec.ts';
import { assertUnsignedSize, verifySignedEvent } from '../protocol/nips/01/events.ts';
import { authorWriteRelays } from '../protocol/nips/65/relay-list.ts';
import { latestReplaceable } from '../protocol/nips/01/profiles.ts';
import { boundedRelays, relayUrl } from '../infrastructure/relays/urls.ts';
import { safeDiagnosticText } from '../learning/protocol-service.ts';
import type { RelayFilter, RelayReaderPort, ReadResult } from '../public/types.ts';
import type { LiveDocument, LiveSnapshot, LiveStorePort, Operation } from './types.ts';
import { confirmed } from './types.ts';

export interface PublicationPreview { type: EventType; date: string; rootId: string | null; expectedHead: string | null; expectedBranches: string[]; event: UnsignedEvent; destinations: string[]; }
const initialSnapshot = (): LiveSnapshot => ({ account: null, document: null, phase: 'disconnected', busy: false, refreshing: false, message: '', projections: [], checked: false, completeQuery: false });
const errorText = (error: unknown) => safeDiagnosticText(error instanceof Error ? error.message : 'Operation failed. Your saved draft is kept.').slice(0, 240);
const formatVersion = (projection: DayProjection): '1' | '2' => projection.root?.event.tags.find(t => t[0] === 'accountability')?.[1] === '2' ? '2' : '1';
const sameEvent = (signed: SignedEvent, expected: UnsignedEvent) => signed.pubkey === expected.pubkey && signed.created_at === expected.created_at && signed.kind === expected.kind && signed.content === expected.content && JSON.stringify(signed.tags) === JSON.stringify(expected.tags);
export class LiveService {
    private store: LiveStorePort; private signer: SignerPort; private reader: RelayReaderPort; private publisher: PublisherPort; readonly clock: ClockPort;
    private snapshot = initialSnapshot(); private listeners = new Set<() => void>();
    private generation = 0; private controller = new AbortController(); private refreshPromise: Promise<void> | null = null;
    private decoded = new Map<string, DecodedEvent>();
    constructor(store: LiveStorePort, signer: SignerPort, reader: RelayReaderPort, publisher: PublisherPort, clock: ClockPort) { this.store = store; this.signer = signer; this.reader = reader; this.publisher = publisher; this.clock = clock; }
    getSnapshot = () => this.snapshot;
    subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
    private emit(change: Partial<LiveSnapshot>) { this.snapshot = { ...this.snapshot, ...change }; this.listeners.forEach(f => f()); }
    private requireAccount(): string { if (!this.snapshot.account || this.snapshot.phase !== 'ready') throw new Error('Connect the intended browser signer first.'); return this.snapshot.account; }
    private async edit(change: (doc: LiveDocument) => LiveDocument): Promise<LiveDocument> {
        const account = this.requireAccount(), generation = this.generation;
        const doc = await this.store.change(account, change);
        if (generation === this.generation) this.emit({ document: doc });
        return doc;
    }
    private async rebuild(): Promise<void> {
        const doc = this.snapshot.document, generation = this.generation;
        if (!doc) return;
        const events = new Map([...doc.cache, ...doc.outbox.filter(o => o.event && confirmed(o)).map(o => o.event!)].map(e => [e.id,e]));
        const entries = await Promise.all([...events.values()].map(async e => this.decoded.get(e.id) ?? await decodeEvent(e)));
        if (generation !== this.generation) return;
        entries.forEach(r => { if (r.category !== 'invalid') this.decoded.set(r.event.id,r); });
        const roots = entries.filter((r): r is Extract<DecodedEvent, { category:'root' }> => r.category === 'root' && r.event.pubkey === doc.account);
        const projections = roots.map(r => reconstruct(entries, this.clock.now(), r.event.id)).filter(p => p.day && p.root?.event.id === p.mainRootId).sort((a,b) => b.day!.date.localeCompare(a.day!.date));
        this.emit({ projections });
    }
    async connect(): Promise<void> {
        if (this.snapshot.phase === 'connecting' || this.snapshot.busy) return;
        await this.disconnect(); const generation = this.generation;
        this.emit({ phase: 'connecting', message: '' });
        try {
            await this.signer.connect(); const account = await this.signer.getPublicKey();
            if (generation !== this.generation) return;
            if (!/^[0-9a-f]{64}$/.test(account)) throw new Error('Signer returned an invalid account key.');
            const document = await this.store.load(account) ?? await this.store.change(account, d => d);
            if (generation !== this.generation) return;
            this.emit({ account, document, phase: 'ready' }); await this.rebuild(); await this.refresh();
        } catch (error) { if (generation === this.generation) { await this.signer.disconnect(); this.emit({ phase: 'disconnected', message: errorText(error), account: null, document: null }); } }
    }
    async disconnect(): Promise<void> { this.generation++; this.controller.abort(); this.reader.reset?.(); this.controller = new AbortController(); this.refreshPromise = null; this.decoded.clear(); await this.signer.disconnect(); this.snapshot = initialSnapshot(); this.listeners.forEach(f => f()); }
    blankDraft(date: string, timezone: string): PlanDraft { return { date, timezone, commitments: [{ id: this.clock.id(), title: '', category: 'work' }], note: '' }; }
    async saveDraft(draft: PlanDraft): Promise<void> { try { await this.edit(d => ({ ...d, drafts: { ...d.drafts, [draft.date]: structuredClone(draft) } })); } catch (error) { this.emit({ message: errorText(error) }); } }
    async saveUpdateDraft(rootId: string, draft: UpdateInput, headId: string): Promise<void> { try { await this.edit(d => ({ ...d, updateDrafts: { ...d.updateDrafts, [rootId]: structuredClone(draft) }, updateDraftHeads: { ...d.updateDraftHeads, [rootId]: headId } })); } catch (error) { this.emit({ message: errorText(error) }); } }
    async discardUpdateDraft(rootId: string): Promise<void> { await this.edit(d => { const updateDrafts={...d.updateDrafts},updateDraftHeads={...d.updateDraftHeads}; delete updateDrafts[rootId]; delete updateDraftHeads[rootId]; return {...d,updateDrafts,updateDraftHeads}; }); }
    async setRelays(values: string[]): Promise<void> {
        if (this.snapshot.busy) throw new Error('Wait for the current approval or publication to finish.');
        if (!values.length || values.length > 4 || values.some(v => !relayUrl(v))) throw new Error('Choose one to four public WSS write relays.');
        await this.edit(d => ({ ...d, relays: boundedRelays(values,4) })); this.emit({ checked: false, completeQuery: false }); await this.refresh();
    }
    refresh(): Promise<void> {
        if (this.refreshPromise) return this.refreshPromise;
        const generation = this.generation;
        const task = this.readAccount(generation).finally(() => { if (generation === this.generation) { this.refreshPromise = null; this.emit({ refreshing: false }); } });
        this.refreshPromise = task; return task;
    }
    private async readAccount(generation: number): Promise<void> {
        const account = this.requireAccount(), doc = this.snapshot.document!;
        this.emit({ refreshing: true, message: '' });
        const controller=this.controller, timeout = setTimeout(() => controller.abort(), 25000), signal = controller.signal;
        let complete = true; const received = new Map<string,SignedEvent>(); let truncated = false;
        const query = async (filters: RelayFilter[], relays: string[]): Promise<ReadResult> => {
            const result = await this.reader.query(filters, relays, signal);
            if (generation !== this.generation) throw new Error('Account session ended.');
            complete = complete && result.observations.length > 0 && result.observations.every(o => o.status === 'eose');
            truncated = truncated || result.observations.some(o => o.received >= 128 || o.status === 'capped');
            for (const item of result.events) {
                const checked = await verifySignedEvent(item.event);
                if (checked.event && checked.event.pubkey === account) received.set(checked.event.id,checked.event);
            }
            return result;
        };
        try {
            const first = await query([{ authors: [account], kinds: [1], '#t': ['goalstr','goalstr-v1','goalstr-v2'], since: Math.max(0,this.clock.now()-30*86400), until: this.clock.now()+300, limit: 128 }, { authors: [account], kinds: [10002], until: this.clock.now()+300, limit: 4 }], doc.relays);
            const metadata = latestReplaceable([...received.values()].filter(e => e.kind === 10002), 10002, account, this.clock.now());
            const routing = metadata ? authorWriteRelays(metadata) : [];
            const relays = boundedRelays([...doc.relays,...routing], 8);
            if (routing.some(r => !doc.relays.includes(r))) await query([{ authors: [account], kinds: [1], '#t': ['goalstr','goalstr-v1','goalstr-v2'], since: Math.max(0,this.clock.now()-30*86400), until: this.clock.now()+300, limit: 128 }], routing);
            const known = new Map([...doc.cache, ...doc.outbox.filter(o => o.event).map(o => o.event!), ...received.values()].map(e => [e.id,e]));
            let entries = await Promise.all([...known.values()].map(decodeEvent));
            const roots = [...new Set(entries.flatMap(r => r.category === 'root' ? [r.event.id] : r.category === 'state' ? [r.payload.root_id] : []))];
            // Read threads and author deletion requests. Failures retain the last known state.
            for (let i=0;i<roots.length;i+=32) { if (i>=128) { truncated = true; break; } await query([{ authors: [account], kinds: [1,5], '#e': roots.slice(i,i+32), limit: 128 }],relays); }
            for (let pass=0;pass<3;pass++) {
                entries = await Promise.all([...new Map([...known.values(),...received.values()].map(e => [e.id,e])).values()].map(decodeEvent));
                const missing = [...new Set(roots.flatMap(id => reconstruct(entries,this.clock.now(),id).missingIds))].slice(0,128);
                if (!missing.length) break; const before = received.size; await query([{ ids: missing, limit: 128 }],relays); if (before === received.size) break;
            }
            const deletionTargets = [...new Set([...known.keys(),...received.keys()])];
            if (deletionTargets.length > 128) truncated = true;
            if (deletionTargets.length) await query([{ authors: [account], kinds: [5], '#e': deletionTargets.slice(0,128), limit: 128 }],relays);
            const sightings = new Map<string,string[]>();
            first.events.forEach(e => sightings.set(e.event.id,e.relays));
            // Event-ID recovery queries record actual observed destinations, independently of OK.
            const uncertain = doc.outbox.filter(o => o.event && !confirmed(o));
            for (let i=0;i<uncertain.length;i+=32) {
                if (i>=128) { truncated=true; break; }
                const result = await query([{ ids: uncertain.slice(i,i+32).map(o => o.event!.id), limit: 128 }],relays);
                result.events.forEach(e => sightings.set(e.event.id,e.relays));
            }
            await this.edit(currentDoc => {
                const cache = [...new Map([...currentDoc.cache,...received.values()].filter(e => e.kind !== 10002).map(e => [e.id,e])).values()].sort((a,b) => b.created_at-a.created_at).slice(0,1000);
                return { ...currentDoc, cache, outbox: currentDoc.outbox.map(o => ({ ...o, observedOn: o.event && sightings.has(o.event.id) ? [...new Set([...o.observedOn,...sightings.get(o.event.id)!])].slice(0,8) : o.observedOn })) };
            });
            if (generation !== this.generation) return;
            await this.rebuild();
            const finalEntries=await Promise.all([...this.snapshot.document!.cache,...this.snapshot.document!.outbox.filter(o=>o.event).map(o=>o.event!)].map(decodeEvent));
            const incomplete = roots.some(id=>{const p=reconstruct(finalEntries,this.clock.now(),id);return p.missingIds.length||p.pending.length;}) || this.snapshot.projections.some(p => p.missingIds.length || p.pending.length);
            this.emit({ checked: true, completeQuery: complete && !truncated && !incomplete, message: complete && !truncated && !incomplete ? 'Checked configured relays. Other relays or clients may have more history.' : 'History is partial or a relay did not finish. Drafts are safe. Refresh before creating or updating a public day.' });
        } catch (error) { if (generation === this.generation) this.emit({ checked: true, completeQuery: false, message: errorText(error) }); }
        finally { clearTimeout(timeout); if (generation === this.generation && signal.aborted) this.controller = new AbortController(); }
    }
    private projection(rootId: string): DayProjection { const p = this.snapshot.projections.find(p => p.root?.event.id === rootId); if (!p?.day || !p.head || p.missingIds.length || p.pending.length || p.deletedIds.includes(rootId)) throw new Error('A complete current day is required. Refresh its history.'); return p; }
    private assertReadyToPreview(): string { const account = this.requireAccount(); if (this.snapshot.busy) throw new Error('An approval or publication is already in progress.'); if (!this.snapshot.checked || !this.snapshot.completeQuery) throw new Error('Refresh first. A failed or capped query cannot establish that a day is absent or current.'); return account; }
    async previewPlan(draft: PlanDraft, preferences: Preferences, rest = false): Promise<PublicationPreview> {
        await this.refresh(); const account = this.assertReadyToPreview();
        if (draft.date !== localParts(this.clock.now(),draft.timezone).date) throw new Error('Public plans start on today’s date. Older days remain available for review.');
        if (this.snapshot.projections.some(p => p.day?.date === draft.date) || this.snapshot.document!.outbox.some(o => o.date === draft.date && !o.rootId && o.event)) throw new Error('A public or uncertain signed plan already exists for this date. Open it or recover it in the outbox.');
        const day = makeDay(draft,preferences,{ now: this.clock.now(), id: this.clock.id },rest);
        const event = encodeRoot(day.mode,{ local_date: day.date, timezone: day.timezone, utc_offset_minutes: day.offsetMinutes, mode: day.mode, commitments: day.commitments, slots: day.slots.map(s => ({ id: s.id,due_at:s.dueAt })), review_due_at: day.reviewDueAt, opening_note: day.openingNote, carry_forward_from: [] },account,day.createdAt);
        return { type: day.mode,date:day.date,rootId:null,expectedHead:null,expectedBranches:[],event,destinations:[...this.snapshot.document!.relays] };
    }
    async previewUpdate(rootId: string, input: UpdateInput, editorHeadId?: string): Promise<PublicationPreview> {
        await this.refresh(); const account = this.assertReadyToPreview(), p = this.projection(rootId);
        if (editorHeadId && p.head!.record.event.id !== editorHeadId) throw new Error('The day changed while you were editing. Your draft is kept. Close and reopen the editor to compare with the latest state.');
        if (p.branches.length) throw new Error('Resolve competing updates before adding another snapshot.');
        if (this.snapshot.document!.outbox.some(o => o.rootId === rootId && o.event && !confirmed(o))) throw new Error('Recover the unconfirmed update before adding another.');
        const time = outgoingTime(this.clock.now(),p.head!.record.event.created_at);
        if (input.type === 'close' && input.tasks.some(t => current(p.day!).tasks.find(old => old.id === t.id)?.currentTitle !== t.currentTitle)) throw new Error('Save a revision before closing with different wording.');
        const next = appendSnapshot(p.day!,input,{ now:time,id:this.clock.id }), snapshot = current(next);
        const payload: StatePayload = { root_id:rootId,prev_id:p.head!.record.event.id,sequence:p.head!.sequence+1,tasks:snapshot.tasks.map(t => ({ id:t.id,current_title:t.currentTitle,status:t.status,original_fulfilled:t.originalFulfilled,revision_reason:t.revisionReason })),bonus:snapshot.bonus,slot_id:snapshot.slotId,note:snapshot.note,closed:snapshot.closed,reflection:{ went_well:snapshot.reflection.wentWell,got_in_way:snapshot.reflection.gotInWay,carry_forward:snapshot.reflection.carryForward },correction_reason:snapshot.correctionReason,resolves:[] };
        const event = encodeStateVersion(formatVersion(p),input.type,payload,account,time);
        return { type:input.type,date:p.day!.date,rootId,expectedHead:p.head!.record.event.id,expectedBranches:[],event,destinations:[...this.snapshot.document!.relays] };
    }
    async previewResolution(rootId: string, chosenId: string, note: string): Promise<PublicationPreview> {
        await this.refresh(); const account = this.assertReadyToPreview(),p = this.projection(rootId);
        const payload = resolutionPayload(p,chosenId,note,this.clock.now()),event = encodeStateVersion(formatVersion(p),'resolve',payload,account,outgoingTime(this.clock.now(),p.head!.record.event.created_at));
        return { type:'resolve',date:p.day!.date,rootId,expectedHead:p.head!.record.event.id,expectedBranches:p.branches.map(n=>n.record.event.id).sort(),event,destinations:[...this.snapshot.document!.relays] };
    }
    async approve(preview: PublicationPreview, acknowledged: boolean): Promise<void> {
        const account = this.assertReadyToPreview(), generation = this.generation;
        if (preview.event.pubkey !== account) throw new Error('Preview belongs to another account.');
        assertUnsignedSize(preview.event);
        if (!this.snapshot.document!.publicAcknowledged && !acknowledged) throw new Error('Acknowledge public visibility before the first publication.');
        this.emit({ busy:true,message:'' }); let operationId: string | null = null;
        try {
            // Recheck observations before approval; the preview fields stay exactly as reviewed.
            await this.refresh(); if (!this.snapshot.completeQuery) throw new Error('History refresh was incomplete. The draft was kept.');
            if (preview.rootId && this.projection(preview.rootId).head!.record.event.id !== preview.expectedHead) throw new Error('The day changed since your preview. Review the latest snapshot.');
            if (preview.rootId && JSON.stringify(this.projection(preview.rootId).branches.map(n=>n.record.event.id).sort()) !== JSON.stringify(preview.expectedBranches)) throw new Error('Competing versions changed since your preview. Compare the latest updates.');
            if (!preview.rootId && this.snapshot.projections.some(p => p.day?.date === preview.date)) throw new Error('Another plan was found for this date. Open it first.');
            operationId = this.clock.id(); const op: Operation = { id:operationId,date:preview.date,type:preview.type,rootId:preview.rootId,expectedHead:preview.expectedHead,intent:structuredClone(preview.event),destinations:boundedRelays(preview.destinations,4),createdAt:this.clock.now(),event:null,facts:[],observedOn:[],error:'' };
            await this.edit(d => {
                if (d.outbox.some(o => o.date === op.date && (!op.rootId ? !o.rootId && !!o.event : o.rootId === op.rootId && o.expectedHead === op.expectedHead && !!o.event))) throw new Error('This operation is already signed in this or another tab. Recover the exact event instead.');
                if (d.outbox.some(o => !o.event && !o.error && o.date === op.date)) throw new Error('An unsigned intent exists, possibly in another tab. Release it in the outbox after closing its old signer prompt.');
                return { ...d,publicAcknowledged:true,outbox:[...d.outbox,op] };
            });
            const raw = await this.signer.signEvent(structuredClone(preview.event));
            if (generation !== this.generation) throw new Error('Session ended. Late approval was not sent.');
            const verified = await verifySignedEvent(raw);
            if (!verified.event || !sameEvent(verified.event,preview.event)) throw new Error('Returned signature or event fields did not match the preview. Nothing was sent.');
            const signed = verified.event;
            const doc = await this.edit(d => {
                const staged = d.outbox.find(o => o.id === operationId);
                if (!staged || staged.error) throw new Error('This unsigned intent was released. Late approval was ignored.');
                return { ...d,outbox:d.outbox.map(o => o.id === operationId ? { ...o,event:signed,error:'' } : o) };
            });
            if (generation !== this.generation) return;
            await this.send(doc.outbox.find(o => o.id === operationId)!,generation);
        } catch (error) {
            if (generation === this.generation) {
                if (operationId) try { await this.edit(d => ({ ...d,outbox:d.outbox.map(o => o.id === operationId ? { ...o,error:errorText(error) } : o) })); } catch { /* Keep signed/intent in memory if persistence failed. */ }
                this.emit({ message:errorText(error) });
            }
            throw error;
        } finally { if (generation === this.generation) this.emit({ busy:false }); }
    }
    private async send(op: Operation, generation: number): Promise<void> {
        if (!op.event) throw new Error('No saved signature to send.');
        const verified = await verifySignedEvent(op.event);
        if (!verified.event || !sameEvent(verified.event,op.intent)) throw new Error('Stored signed event failed verification. Nothing was sent.');
        const targets = op.destinations.filter(r => !op.facts.some(f => f.relay === r && f.status === 'accepted'));
        if (!targets.length) return;
        await this.publisher.publish(verified.event,targets,this.controller.signal,async fact => {
            // Persist each destination result, even if a user disconnected while it was sent.
            const doc = await this.store.change(op.intent.pubkey,d => ({ ...d,outbox:d.outbox.map(o => o.id === op.id ? { ...o,facts:[...o.facts.filter(f => f.relay !== fact.relay),fact] } : o) }));
            if (generation === this.generation) this.emit({ document:doc });
        });
        if (generation !== this.generation) return;
        await this.rebuild();
        await this.edit(d => {
            const item = d.outbox.find(o => o.id === op.id)!;
            if (!confirmed(item)) return d;
            const drafts={...d.drafts},updateDrafts={...d.updateDrafts},updateDraftHeads={...d.updateDraftHeads};
            if (op.rootId) { delete updateDrafts[op.rootId]; delete updateDraftHeads[op.rootId]; } else delete drafts[op.date];
            return { ...d,drafts,updateDrafts,updateDraftHeads };
        });
        this.emit({ message:'Publication results saved. Review relay acceptance and replication in the outbox.' });
    }
    async retry(id: string): Promise<void> {
        const account=this.requireAccount(); if (this.snapshot.busy) return;
        const op=this.snapshot.document!.outbox.find(o => o.id===id); if (!op?.event || op.intent.pubkey!==account) throw new Error('Reconnect the author of this saved event.');
        const generation=this.generation; this.emit({ busy:true });
        try { await this.send(op,generation); } catch(error) { this.emit({ message:errorText(error) }); throw error; } finally { if (generation===this.generation) this.emit({ busy:false }); }
    }
    async releaseUnsigned(id: string): Promise<void> {
        if (this.snapshot.busy) throw new Error('Finish or cancel the active signer request first.');
        await this.edit(d => ({ ...d,outbox:d.outbox.map(o => o.id===id && !o.event ? { ...o,error:'Unsigned intent released by user. Draft is preserved.' } : o) }));
    }
}
