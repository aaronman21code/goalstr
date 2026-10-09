import type { Bonus, DayRecord, DomainContext, PlanDraft, Preferences, Snapshot, TaskState, UpdateInput } from './types.ts';
import { emptyReflection } from './types.ts';
import { addDays, localParts, offsetAt, resolveLocal, validDate, validTimezone } from './time.ts';
export const codePoints = (s: string) => Array.from(s).length;
export function bounded(s: string, max: number, label: string, required = false): string { const value = s.trim(); if (required && !value)
    throw new Error(`${label} cannot be empty.`); if (codePoints(value) > max)
    throw new Error(`${label} must be ${max} characters or fewer.`); return value; }
export function validatePreferences(p: Preferences): void {
    if (!validTimezone(p.timezone))
        throw new Error('Choose a valid IANA timezone, such as Asia/Kolkata.');
    if (p.checkinTimes.length > 4 || new Set(p.checkinTimes).size !== p.checkinTimes.length)
        throw new Error('Choose up to four different check-in times.');
    if ([...p.checkinTimes, ...(p.reviewTime ? [p.reviewTime] : [])].some(t => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))
        throw new Error('Use a valid time for each reminder.');
}
export function makeDay(draft: PlanDraft, preferences: Preferences, ctx: DomainContext, rest = false): DayRecord {
    if (!validDate(draft.date) || !validTimezone(draft.timezone))
        throw new Error('This plan needs a valid date and timezone.');
    validatePreferences(preferences);
    if (!rest && (draft.commitments.length < 1 || draft.commitments.length > 3))
        throw new Error('Choose one to three commitments.');
    if (!rest && new Set(draft.commitments.map(t => t.id)).size !== draft.commitments.length)
        throw new Error('Commitment IDs must be unique.');
    const commitments = rest ? [] : draft.commitments.map((t, i) => ({ ...t, title: bounded(t.title, 160, `Commitment ${i + 1}`, true) }));
    const slots = rest ? [] : [...preferences.checkinTimes].sort().map((localTime, i) => ({ id: `slot-${i + 1}`, localTime, dueAt: resolveLocal(draft.date, localTime, draft.timezone) }));
    const reviewDueAt = rest || !preferences.reviewTime ? null : resolveLocal(draft.date, preferences.reviewTime, draft.timezone);
    if (slots.some(s => localParts(s.dueAt, draft.timezone).date !== draft.date) || (reviewDueAt !== null && localParts(reviewDueAt, draft.timezone).date !== draft.date))
        throw new Error('A reminder fell outside this calendar date. Choose another reminder time.');
    return { id: ctx.id(), date: draft.date, timezone: draft.timezone, offsetMinutes: offsetAt(ctx.now, draft.timezone), nextMidnightAt: resolveLocal(addDays(draft.date, 1), '00:00', draft.timezone), createdAt: ctx.now, mode: rest ? 'rest' : 'plan', commitments, openingNote: rest ? '' : bounded(draft.note, 1000, 'Opening note'), slots, reviewDueAt, snapshots: [] };
}
export function current(day: DayRecord): Snapshot {
    return day.snapshots.at(-1) ?? { id: day.id, type: 'checkin', createdAt: day.createdAt, tasks: day.commitments.map(t => ({ id: t.id, currentTitle: t.title, status: 'not_started', originalFulfilled: false, revisionReason: '' })), bonus: [], slotId: '', note: '', closed: day.mode === 'rest', reflection: emptyReflection(), correctionReason: '' };
}
export function progress(day: DayRecord): {
    count: number;
    total: number;
    percent: number | null;
} { const total = day.commitments.length; const count = current(day).tasks.filter(t => t.originalFulfilled).length; return { count, total, percent: day.mode === 'rest' ? null : Math.round(100 * count / total) }; }
export function usedSlots(day: DayRecord): Set<string> { return new Set(day.snapshots.filter(s => s.type === 'checkin' && s.slotId).map(s => s.slotId)); }
export function suggestedSlot(day: DayRecord, now: number): string { const used = usedSlots(day); return day.slots.filter(s => s.dueAt <= now && !used.has(s.id)).at(-1)?.id ?? ''; }
export function isLate(day: DayRecord): boolean { const close = day.snapshots.find(s => s.type === 'close'); return !!close && close.createdAt >= day.nextMidnightAt; }
export function appendSnapshot(day: DayRecord, input: UpdateInput, ctx: DomainContext): DayRecord {
    if (day.mode === 'rest')
        throw new Error('A rest day has no task updates.');
    const previous = current(day);
    if (previous.closed && input.type !== 'correction')
        throw new Error('This day is closed. Use a correction to change it.');
    if (!previous.closed && input.type === 'correction')
        throw new Error('Close the day before adding a correction.');
    if (input.tasks.length !== day.commitments.length || new Set(input.tasks.map(t => t.id)).size !== input.tasks.length || day.commitments.some(t => !input.tasks.some(s => s.id === t.id)))
        throw new Error('An update must keep every original commitment.');
    const statuses = new Set(['not_started', 'in_progress', 'done', 'changed_plans']);
    const tasks: TaskState[] = day.commitments.map(original => {
        const task = input.tasks.find(t => t.id === original.id)!;
        if (!statuses.has(task.status))
            throw new Error('Choose a valid task status.');
        const currentTitle = bounded(task.currentTitle, 160, 'Commitment', true);
        const prev = previous.tasks.find(t => t.id === task.id)!;
        const revisionReason = currentTitle === prev.currentTitle ? prev.revisionReason : bounded(task.revisionReason, 500, 'Revision reason');
        return { ...task, currentTitle, revisionReason, originalFulfilled: task.status === 'done' && (currentTitle === original.title || task.originalFulfilled === true) };
    });
    if (input.bonus.length > 10 || new Set(input.bonus.map(t => t.id)).size !== input.bonus.length)
        throw new Error('Keep up to ten distinct bonus accomplishments.');
    const bonus: Bonus[] = input.bonus.map(t => { if (!statuses.has(t.status))
        throw new Error('Choose a valid bonus status.'); return { ...t, title: bounded(t.title, 160, 'Bonus accomplishment', true) }; });
    if (previous.bonus.some(b => !bonus.some(next => next.id === b.id && next.title === b.title)))
        throw new Error('Keep previous bonus records and their original titles.');
    if (input.slotId && (input.type !== 'checkin' || !day.slots.some(s => s.id === input.slotId)))
        throw new Error('Choose a check-in slot from this day.');
    const snapshot: Snapshot = {
        id: ctx.id(), type: input.type, createdAt: Math.max(ctx.now, previous.createdAt + 1), tasks, bonus,
        slotId: input.slotId, note: bounded(input.note, 1000, 'Update note'), closed: input.type === 'close' || previous.closed,
        reflection: input.type === 'close' || input.type === 'correction' ? { wentWell: bounded(input.reflection.wentWell, 1000, 'What went well'), gotInWay: bounded(input.reflection.gotInWay, 1000, 'What got in the way'), carryForward: bounded(input.reflection.carryForward, 1000, 'Carry-forward reflection') } : previous.reflection,
        correctionReason: bounded(input.correctionReason, 500, 'Correction reason', input.type === 'correction'),
    };
    return { ...day, snapshots: [...day.snapshots, snapshot] };
}
export function carryDraft(day: DayRecord, taskIds: string[], date: string, timezone: string, id: () => string): PlanDraft {
    const selected = current(day).tasks.filter(t => taskIds.includes(t.id) && !t.originalFulfilled);
    if (!selected.length)
        throw new Error('Choose at least one unfinished commitment.');
    return { date, timezone, commitments: selected.map(t => ({ id: id(), title: t.currentTitle, category: day.commitments.find(o => o.id === t.id)!.category })), note: '' };
}
