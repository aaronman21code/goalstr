import { z } from 'zod';
import { validDate, validTimezone, localParts } from '../../../domain/accountability/time.ts';
import type { RootPayload, StatePayload } from '../../../domain/events/types.ts';
import { eventHex } from '../../nips/01/events.ts';

const text = (maximum: number, required = false) => z.string().refine(s => Array.from(s).length <= maximum && s === s.trim() && (!required || s.length > 0), `Use trimmed text of at most ${maximum} characters.`);
const uuid = z.string().uuid();
const seconds = z.number().int().nonnegative().safe().max(253402300799);
const status = z.enum(['not_started', 'in_progress', 'done', 'changed_plans']);
const distinct = (records: { id: string }[]) => new Set(records.map(r => r.id)).size === records.length;
export const rootSchema: z.ZodType<RootPayload> = z.object({
    local_date: z.string().refine(validDate), timezone: z.string().refine(validTimezone),
    utc_offset_minutes: z.number().int().min(-840).max(840), mode: z.enum(['plan', 'rest']),
    commitments: z.array(z.object({ id: uuid, title: text(160, true), category: z.enum(['', 'work', 'learning', 'health', 'personal']) }).strict()).max(3).refine(distinct),
    slots: z.array(z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/), due_at: seconds }).strict()).max(4).refine(distinct),
    review_due_at: seconds.nullable(), opening_note: text(1000),
    carry_forward_from: z.array(z.object({ root_id: eventHex, commitment_id: uuid, new_commitment_id: uuid }).strict()).max(3),
}).strict().superRefine((p, ctx) => {
    const bad = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (p.mode === 'plan' ? !p.commitments.length : p.commitments.length || p.slots.length || p.review_due_at !== null || p.carry_forward_from.length) bad('Invalid plan/rest fields.');
    if (p.slots.some(s => localParts(s.due_at, p.timezone).date !== p.local_date) || p.review_due_at !== null && localParts(p.review_due_at, p.timezone).date !== p.local_date) bad('Reminders must fall on the pinned local date.');
    if (new Set(p.slots.map(s => s.due_at)).size !== p.slots.length) bad('Reminder instants must be distinct.');
    if (p.carry_forward_from.some(r => !p.commitments.some(c => c.id === r.new_commitment_id)) || new Set(p.carry_forward_from.map(r => r.new_commitment_id)).size !== p.carry_forward_from.length) bad('Carry-forward references must point to distinct new originals.');
});
export const stateSchema: z.ZodType<StatePayload> = z.object({
    root_id: eventHex, prev_id: eventHex, sequence: z.number().int().positive().safe(),
    tasks: z.array(z.object({ id: uuid, current_title: text(160, true), status, original_fulfilled: z.boolean(), revision_reason: text(500) }).strict()).min(1).max(3).refine(distinct),
    bonus: z.array(z.object({ id: uuid, title: text(160, true), status }).strict()).max(10).refine(distinct),
    slot_id: z.string().max(64), note: text(1000), closed: z.boolean(),
    reflection: z.object({ went_well: text(1000), got_in_way: text(1000), carry_forward: text(1000) }).strict(),
    correction_reason: text(500), resolves: z.array(eventHex).max(16).refine(ids => new Set(ids).size === ids.length),
}).strict();
