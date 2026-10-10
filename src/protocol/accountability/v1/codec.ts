import type { DecodedEvent, EventType, RootPayload, StatePayload } from '../../../domain/events/types.ts';
import type { UnsignedEvent, AccountabilityCodec } from '../../../domain/ports/index.ts';
import { offsetAt } from '../../../domain/accountability/time.ts';
import { rootSchema, stateSchema } from './schema.ts';
import { assertUnsignedSize, verifySignedEvent } from '../../nips/01/events.ts';
import { readThread, stateThread } from '../../nips/10/tags.ts';
import { deletionTargets } from '../../nips/09/deletions.ts';

const stateTypes = ['checkin', 'revision', 'close', 'correction', 'resolve'] as const;
const labels = { not_started: 'Not started', in_progress: 'In progress', done: 'Done', changed_plans: 'Changed plans' };
export function readableContent(type: EventType, payload: RootPayload | StatePayload): string {
    if ('local_date' in payload) {
        if (type === 'rest') return [`Rest day — ${payload.local_date}`, `Timezone: ${payload.timezone}`, 'No commitments. No completion score.', payload.opening_note].filter(Boolean).join('\n');
        return [`Plan — ${payload.local_date}`, `Timezone: ${payload.timezone}`, ...payload.commitments.map((t, i) => `${i + 1}. ${t.title}`), payload.slots.length ? `Check-ins (UTC): ${payload.slots.map(s => new Date(s.due_at * 1000).toISOString()).join(', ')}` : 'Check-ins: unscheduled', payload.review_due_at === null ? '' : `Review (UTC): ${new Date(payload.review_due_at * 1000).toISOString()}`, payload.opening_note].filter(Boolean).join('\n');
    }
    const title = { checkin: 'Check-in', revision: 'Plan revised', close: 'Day reviewed', correction: 'Review corrected', resolve: 'Conflicting updates resolved' }[type as typeof stateTypes[number]];
    return [title, ...payload.tasks.map(t => `${labels[t.status]}: ${t.current_title}${t.original_fulfilled ? ' (original fulfilled)' : ''}`), `Original commitments fulfilled: ${payload.tasks.filter(t => t.original_fulfilled).length} of ${payload.tasks.length}`, ...payload.bonus.map(t => `Bonus — ${labels[t.status]}: ${t.title}`), payload.closed ? 'Day is closed.' : 'Day remains open.', payload.slot_id ? `Check-in slot: ${payload.slot_id}` : '', payload.note, ...Object.entries(payload.reflection).filter(([, v]) => v).map(([k, v]) => `${k === 'went_well' ? 'Went well' : k === 'got_in_way' ? 'Got in the way' : 'Carry forward'}: ${v}`), payload.correction_reason ? `Correction: ${payload.correction_reason}` : ''].filter(Boolean).join('\n');
}
export function encodeRoot(type: 'plan' | 'rest', payload: RootPayload, pubkey: string, createdAt: number, destinationLimit?: number): UnsignedEvent {
    const p = rootSchema.parse(payload);
    if (p.mode !== type || offsetAt(createdAt, p.timezone) !== p.utc_offset_minutes) throw new Error('Root mode or planning offset does not match.');
    const event = { pubkey, created_at: createdAt, kind: 1, tags: [['t', 'goalstr'], ['t', 'goalstr-v1'], ['accountability', '1', type, JSON.stringify(p)]], content: readableContent(type, p) };
    assertUnsignedSize(event, destinationLimit); return event;
}
export function encodeState(type: typeof stateTypes[number], payload: StatePayload, pubkey: string, createdAt: number, relayHint = '', destinationLimit?: number): UnsignedEvent {
    const p = stateSchema.parse(payload);
    const event = { pubkey, created_at: createdAt, kind: 1, tags: [...stateThread(p.root_id, pubkey, relayHint), ['t', 'goalstr'], ['t', 'goalstr-v1'], ['accountability', '1', type, JSON.stringify(p)]], content: readableContent(type, p) };
    assertUnsignedSize(event, destinationLimit); return event;
}
export async function decodeEvent(raw: unknown): Promise<DecodedEvent> {
    const verification = await verifySignedEvent(raw);
    if (!verification.event) return { category: 'invalid', event: null, id: null, reason: verification.reason };
    const event = verification.event;
    try {
        if (event.kind === 5) return { category: 'deletion', event, targetIds: deletionTargets(event) };
        if (event.kind !== 1) return { category: 'invalid', event, id: event.id, reason: 'This stage interprets kind 1 notes and explicit kind 5 deletions.' };
        const thread = readThread(event.tags);
        const appTags = event.tags.filter(t => t[0] === 'accountability');
        if (!appTags.length) return { category: 'conversation', event, ...thread };
        if (appTags.length !== 1) throw new Error('An event must have exactly one application tag.');
        const [name, version, type, serialized, ...extra] = appTags[0];
        if (name !== 'accountability' || !version || !type || serialized === undefined || extra.length) throw new Error('Malformed application tag.');
        if (version !== '1') return { category: 'unsupported', event, rootId: thread.rootId, version, reason: 'Unsupported day format; readable text only.' };
        if (!event.tags.some(t => t[0] === 't' && t[1] === 'goalstr-v1')) throw new Error('Missing versioned discovery tag.');
        const rawPayload: unknown = JSON.parse(serialized);
        if (type === 'plan' || type === 'rest') {
            const payload = rootSchema.parse(rawPayload);
            if (thread.rootId || event.tags.some(t => t[0] === 'e')) throw new Error('A day root cannot be a reply.');
            if (payload.mode !== type || offsetAt(event.created_at, payload.timezone) !== payload.utc_offset_minutes) throw new Error('Root mode or planning offset does not match.');
            if (event.content !== readableContent(type, payload)) throw new Error('Readable text contradicts the application payload.');
            return { category: 'root', event, type, payload };
        }
        if (!stateTypes.includes(type as typeof stateTypes[number])) return { category: 'unsupported', event, rootId: thread.rootId, version, reason: 'Unsupported event type; readable text only.' };
        const stateType = type as typeof stateTypes[number];
        const payload = stateSchema.parse(rawPayload);
        const roots = event.tags.filter(t => t[0] === 'e' && t[3] === 'root');
        if (roots.length !== 1 || roots[0][1] !== payload.root_id || event.tags.filter(t => t[0] === 'e').length !== 1 || !/^[0-9a-f]{64}$/.test(roots[0][4] ?? '') || !event.tags.some(t => t[0] === 'p' && t[1] === roots[0][4])) throw new Error('State requires one matching marked root and author reference.');
        if ((stateType !== 'checkin' && payload.slot_id) || (stateType === 'correction' ? !payload.correction_reason : payload.correction_reason) || (stateType === 'resolve' ? !payload.resolves.length || !payload.note : payload.resolves.length)) throw new Error('Invalid fields for this state type.');
        if (event.content !== readableContent(stateType, payload)) throw new Error('Readable text contradicts the application payload.');
        return { category: 'state', event, type: stateType, payload };
    } catch (error) { return { category: 'invalid', event, id: event.id, reason: error instanceof Error ? error.message.slice(0, 180) : 'Invalid day payload.' }; }
}
export const goalstrV1Codec: AccountabilityCodec = { encodeRoot, encodeState, decode: decodeEvent };
