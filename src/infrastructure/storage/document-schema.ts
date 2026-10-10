import { z } from 'zod';
import type { AppDocument } from '../../practice/document.ts';
import { appendSnapshot, validatePreferences } from '../../domain/accountability/rules.ts';
import { validDate, validTimezone } from '../../domain/accountability/time.ts';
import { validateCategories } from '../../domain/accountability/categories.ts';
const text = z.string().max(5000);
const status = z.enum(['not_started', 'in_progress', 'done', 'changed_plans']);
const commitment = z.object({ id: z.string().min(1), title: text, category: z.enum(['', 'work', 'learning', 'health', 'personal']) }).strict();
const task = z.object({ id: z.string(), currentTitle: text, status, originalFulfilled: z.boolean(), revisionReason: text }).strict();
const bonus = z.object({ id: z.string(), title: text, status }).strict();
const reflection = z.object({ wentWell: text, gotInWay: text, carryForward: text }).strict();
const update = z.object({ type: z.enum(['checkin', 'revision', 'close', 'correction']), tasks: z.array(task).max(15), bonus: z.array(bonus).max(10), slotId: z.string(), note: text, reflection, correctionReason: text }).strict();
const snapshot = update.extend({ id: z.string(), createdAt: z.number().int().nonnegative(), closed: z.boolean() });
const draft = z.object({ date: z.string(), timezone: z.string(), commitments: z.array(commitment).min(1).max(15), note: text }).strict();
const day = z.object({ id: z.string(), date: z.string(), timezone: z.string(), offsetMinutes: z.number().int(), nextMidnightAt: z.number().int(), createdAt: z.number().int(), mode: z.enum(['plan', 'rest']), commitments: z.array(commitment).max(15), openingNote: text, slots: z.array(z.object({ id: z.string(), localTime: z.string(), dueAt: z.number().int() }).strict()).max(4), reviewDueAt: z.number().int().nullable(), snapshots: z.array(snapshot).max(5000) }).strict();
const schema = z.object({ schemaVersion: z.union([z.literal(1), z.literal(2)]), started: z.boolean(), days: z.record(day), drafts: z.record(draft), updateDrafts: z.record(update), preferences: z.object({ timezone: z.string(), checkinTimes: z.array(z.string()).max(4), reviewTime: z.string() }).strict() }).strict();
function stable(value: unknown): string { if (Array.isArray(value))
    return `[${value.map(stable).join(',')}]`; if (value !== null && typeof value === 'object')
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => `${JSON.stringify(key)}:${stable(val)}`).join(',')}}`; return JSON.stringify(value); }
export function parseDocument(value: unknown): AppDocument {
    const document = schema.parse(value);
    // Explicit, lossless v1 → v2 migration. Keep the existing database and key.
    if (document.schemaVersion === 1 && (Object.values(document.days).some(d => d.commitments.length > 3 || d.snapshots.some(s => s.tasks.length > 3)) || Object.values(document.drafts).some(d => d.commitments.length > 3) || Object.values(document.updateDrafts).some(d => d.tasks.length > 3))) throw new Error('A schema 1 backup cannot contain expanded plans.');
    validatePreferences(document.preferences);
    for (const [date, record] of Object.entries(document.days)) {
        validateCategories(record.commitments);
        if (date !== record.date || !validDate(date) || !validTimezone(record.timezone))
            throw new Error('Invalid saved day date/timezone.');
        if ((record.mode === 'rest' && (record.commitments.length || record.snapshots.length || record.slots.length)) || (record.mode === 'plan' && !record.commitments.length))
            throw new Error('Invalid saved day mode.');
        if (record.commitments.some(t => !t.title.trim() || Array.from(t.title).length > 160) || new Set(record.commitments.map(t => t.id)).size !== record.commitments.length)
            throw new Error('Invalid saved commitments.');
        let replay = { ...record, snapshots: [] as typeof record.snapshots };
        for (const event of record.snapshots) {
            const next = appendSnapshot(replay, event, { now: event.createdAt, id: () => event.id });
            if (stable(next.snapshots.at(-1)) !== stable(event))
                throw new Error('Saved history does not satisfy day rules.');
            replay = next;
        }
    }
    for (const [date, d] of Object.entries(document.drafts)) {
        validateCategories(d.commitments);
        if (date !== d.date || !validDate(date) || !validTimezone(d.timezone))
            throw new Error('Invalid saved draft.');
    }
    return { ...document, schemaVersion: 2 };
}
