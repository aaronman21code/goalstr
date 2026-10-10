import { decodeEvent } from '../protocol/accountability/v1/codec.ts';
import { reconstruct, resolutionPayload, outgoingTime } from '../domain/events/reconstruct.ts';
import type { DecodedEvent, DayProjection } from '../domain/events/types.ts';
import { encodeRoot, encodeState } from '../protocol/accountability/v1/codec.ts';
import { eventHash } from '../protocol/nips/01/events.ts';
import type { DayRecord } from '../domain/accountability/types.ts';
import type { RootPayload, StatePayload } from '../domain/events/types.ts';
import type { UnsignedEvent } from '../domain/ports/index.ts';

export const INSPECTOR_LIMIT = 128;
export async function inspectEvents(events: unknown[], now: number, rootId?: string): Promise<{ records: DecodedEvent[]; projection: DayProjection }> {
    if (events.length > INSPECTOR_LIMIT) throw new Error(`Inspect at most ${INSPECTOR_LIMIT} events at once.`);
    if (!Number.isSafeInteger(now) || now < 0) throw new Error('Use a valid Unix-second clock.');
    const records = await Promise.all(events.map(decodeEvent));
    return { records, projection: reconstruct(records, now, rootId) };
}
export function parsePublicEvents(text: string): unknown[] {
    if (new TextEncoder().encode(text).byteLength > 512 * 1024) throw new Error('Use a file smaller than 512 KiB.');
    if (/nsec1|bunker:\/\/|nostrconnect:\/\/|"(?:private_key|session_key|secret)"/i.test(text)) throw new Error('The inspector accepts public events only. Remove private keys or signer connection data.');
    const parsed: unknown = JSON.parse(text);
    if (/nsec1|bunker:\/\/|nostrconnect:\/\/|private_key|session_key|"secret"/i.test(JSON.stringify(parsed))) throw new Error('Only public event data belongs in this inspector.');
    if (!Array.isArray(parsed) || !parsed.length || parsed.length > INSPECTOR_LIMIT) throw new Error(`Paste a nonempty JSON array of at most ${INSPECTOR_LIMIT} public events.`);
    return parsed;
}
export function safeDiagnosticText(value: string): string {
    return value.replace(/nsec1[0-9a-z]+/gi, '[private key redacted]').replace(/(?:bunker|nostrconnect):\/\/\S+/gi, '[signer connection redacted]');
}
export function previewResolution(projection: DayProjection, chosenId: string, note: string, now: number): UnsignedEvent {
    const payload = resolutionPayload(projection, chosenId, note, now);
    return encodeState('resolve', payload, projection.root!.event.pubkey, outgoingTime(now, projection.head!.record.event.created_at));
}
/** Explicit, unsigned local preview only. The supplied key is a fictional public key. */
export async function previewPractice(day: DayRecord, examplePublicKey: string): Promise<UnsignedEvent[]> {
    const p: RootPayload = { local_date: day.date, timezone: day.timezone, utc_offset_minutes: day.offsetMinutes, mode: day.mode,
        commitments: day.commitments, slots: day.slots.map(s => ({ id: s.id, due_at: s.dueAt })), review_due_at: day.reviewDueAt, opening_note: day.openingNote, carry_forward_from: [] };
    const root = encodeRoot(day.mode, p, examplePublicKey, day.createdAt);
    const events = [root]; const rootId = await eventHash(root); let parentId = rootId;
    for (const [index, snapshot] of day.snapshots.entries()) {
        const payload: StatePayload = { root_id: rootId, prev_id: parentId, sequence: index + 1,
            tasks: snapshot.tasks.map(t => ({ id: t.id, current_title: t.currentTitle, status: t.status, original_fulfilled: t.originalFulfilled, revision_reason: t.revisionReason })), bonus: snapshot.bonus, slot_id: snapshot.slotId, note: snapshot.note, closed: snapshot.closed,
            reflection: { went_well: snapshot.reflection.wentWell, got_in_way: snapshot.reflection.gotInWay, carry_forward: snapshot.reflection.carryForward }, correction_reason: snapshot.correctionReason, resolves: [] };
        const event = encodeState(snapshot.type, payload, examplePublicKey, snapshot.createdAt);
        events.push(event); parentId = await eventHash(event);
    }
    return events;
}
