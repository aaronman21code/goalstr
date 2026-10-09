import { appendSnapshot, current, makeDay } from '../domain/accountability/rules.ts';
import { localParts, resolveLocal } from '../domain/accountability/time.ts';
import { emptyReflection } from '../domain/accountability/types.ts';
export function exampleDay(now: number, timezone: string) {
    const date = localParts(now, timezone).date;
    let id = 0;
    const preferences = { timezone, checkinTimes: ['11:00', '14:30', '18:00'], reviewTime: '21:30' };
    let day = makeDay({ date, timezone, commitments: [{ id: 'example-work', title: 'Publish the landing page', category: 'work' }, { id: 'example-walk', title: 'Walk for 30 minutes', category: 'health' }, { id: 'example-read', title: 'Read chapter four', category: 'learning' }], note: 'Keep the plan small enough to finish.' }, preferences, { now: resolveLocal(date, '08:15', timezone), id: () => 'example-plan' });
    const first = current(day).tasks.map((t, i) => ({ ...t, status: i === 1 ? 'done' as const : i === 0 ? 'in_progress' as const : 'not_started' as const }));
    day = appendSnapshot(day, { type: 'checkin', tasks: first, bonus: [], slotId: 'slot-1', note: 'The walk is done. The page needs another pass.', reflection: emptyReflection(), correctionReason: '' }, { now: resolveLocal(date, '11:10', timezone), id: () => `example-${++id}` });
    const second = current(day).tasks.map((t, i) => i === 0 ? { ...t, currentTitle: 'Finish the landing-page draft', status: 'done' as const, originalFulfilled: false, revisionReason: 'Publishing needs someone else’s review.' } : i === 2 ? { ...t, status: 'done' as const } : t);
    day = appendSnapshot(day, { type: 'checkin', tasks: second, bonus: [{ id: 'example-bonus', title: 'Helped a friend review their CV', status: 'done' }], slotId: 'slot-2', note: 'The draft is ready. It hasn’t been published yet.', reflection: emptyReflection(), correctionReason: '' }, { now: resolveLocal(date, '14:40', timezone), id: () => `example-${++id}` });
    day = appendSnapshot(day, { type: 'close', tasks: current(day).tasks, bonus: current(day).bonus, slotId: '', note: '', reflection: { wentWell: 'Made time for the walk and finished the chapter.', gotInWay: 'The launch needs a review before it can go out.', carryForward: 'Publish the page once the review is done.' }, correctionReason: '' }, { now: resolveLocal(date, '21:45', timezone), id: () => `example-${++id}` });
    return day;
}
