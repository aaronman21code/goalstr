import test from 'node:test';
import assert from 'node:assert/strict';
import { appendSnapshot, carryDraft, codePoints, current, isLate, makeDay, progress, suggestedSlot, usedSlots } from '../src/domain/accountability/rules.ts';
import { addDays, localParts, resolveLocal } from '../src/domain/accountability/time.ts';
import { emptyReflection } from '../src/domain/accountability/types.ts';
import type { DayRecord, UpdateInput, UpdateType } from '../src/domain/accountability/types.ts';
import { parseDocument } from '../src/infrastructure/storage/document-schema.ts';
import { initialDocument } from '../src/practice/document.ts';
import type { AppDocument } from '../src/practice/document.ts';
import { PracticeService } from '../src/practice/service.ts';
const prefs = { timezone: 'Asia/Kolkata', checkinTimes: ['11:00', '14:30', '18:00'], reviewTime: '21:30' };
const now = resolveLocal('2026-10-09', '08:00', prefs.timezone);
let serial = 0;
const id = () => `test-${++serial}`;
function plan(count = 3): DayRecord { return makeDay({ date: '2026-10-09', timezone: prefs.timezone, commitments: Array.from({ length: count }, (_, i) => ({ id: id(), title: `Original ${i + 1}`, category: '' })), note: '' }, prefs, { now, id }); }
function input(day: DayRecord, type: UpdateType = 'checkin'): UpdateInput { const s = current(day); return { type, tasks: structuredClone(s.tasks), bonus: structuredClone(s.bonus), slotId: '', note: '', reflection: emptyReflection(), correctionReason: '' }; }
function update(day: DayRecord, value: UpdateInput, time = now + 3600): DayRecord { return appendSnapshot(day, value, { now: time, id }); }
test('A01: two of three originals yields 67%', () => { let d = plan(); const u = input(d); u.tasks[0].status = u.tasks[1].status = 'done'; d = update(d, u); assert.deepEqual(progress(d), { count: 2, total: 3, percent: 67 }); });
test('A02: repeated slot counts once and never changes ring', () => { let d = plan(); for (let i = 0; i < 4; i++) {
    const u = input(d);
    u.slotId = d.slots[0].id;
    d = update(d, u);
} assert.equal(usedSlots(d).size, 1); assert.equal(progress(d).percent, 0); });
test('A03: changed plans preserves denominator', () => { let d = plan(2); const u = input(d); u.tasks[0].status = 'done'; u.tasks[1].status = 'changed_plans'; d = update(d, u); assert.equal(progress(d).percent, 50); assert.equal(progress(d).total, 2); });
test('A04: bonus completion cannot inflate the ring', () => { let d = plan(1); const u = input(d); u.bonus.push({ id: id(), title: 'Extra work', status: 'done' }); d = update(d, u); assert.equal(progress(d).percent, 0); });
test('A05: revised Done needs explicit original fulfillment', () => { let d = plan(1); const u = input(d); u.tasks[0].currentTitle = 'Smaller goal'; u.tasks[0].status = 'done'; d = update(d, u); assert.equal(progress(d).percent, 0); const yes = input(d); yes.tasks[0].originalFulfilled = true; d = update(d, yes); assert.equal(progress(d).percent, 100); assert.equal(d.commitments[0].title, 'Original 1'); });
test('full snapshots cannot remove, duplicate, or invent originals', () => { const d = plan(); const u = input(d); u.tasks.pop(); assert.throws(() => update(d, u), /every original/); const duplicate = input(d); duplicate.tasks[1].id = duplicate.tasks[0].id; assert.throws(() => update(d, duplicate), /every original/); });
test('fulfillment requires Done; revisions keep their reason', () => { let d = plan(1); const u = input(d); u.tasks[0] = { ...u.tasks[0], currentTitle: 'Revised goal', revisionReason: 'Dependency changed', status: 'in_progress', originalFulfilled: true }; d = update(d, u); assert.equal(current(d).tasks[0].originalFulfilled, false); const next = input(d); next.tasks[0].revisionReason = ''; d = update(d, next); assert.equal(current(d).tasks[0].revisionReason, 'Dependency changed'); });
test('A12: a 0% day can close', () => { const original = plan(); const d = update(original, input(original, 'close')); assert.equal(current(d).closed, true); assert.equal(progress(d).percent, 0); });
test('100% completion stays open until an explicit close', () => { let d = plan(1); const u = input(d); u.tasks[0].status = 'done'; d = update(d, u); assert.equal(progress(d).percent, 100); assert.equal(current(d).closed, false); });
test('A13: pinned date/timezone survive midnight and late review', () => { let d = plan(1); d = update(d, input(d, 'close'), resolveLocal('2026-10-10', '00:15', prefs.timezone)); assert.equal(d.date, '2026-10-09'); assert.equal(d.timezone, prefs.timezone); assert.equal(isLate(d), true); assert.equal(localParts(d.nextMidnightAt, prefs.timezone).date, '2026-10-10'); });
test('DST gap moves to next valid local instant', () => { assert.equal(new Date(resolveLocal('2026-03-08', '02:30', 'America/New_York') * 1000).toISOString(), '2026-03-08T07:00:00.000Z'); });
test('DST ambiguity selects the earlier occurrence', () => { assert.equal(new Date(resolveLocal('2026-11-01', '01:30', 'America/New_York') * 1000).toISOString(), '2026-11-01T05:30:00.000Z'); });
test('A22: correction preserves original review and close time', () => { let d = plan(1); const close = input(d, 'close'); close.reflection.wentWell = 'First review'; d = update(d, close); const closeTime = d.snapshots[0].createdAt; const correction = input(d, 'correction'); correction.tasks[0].status = 'done'; correction.correctionReason = 'Forgot to record it'; correction.reflection.wentWell = 'Corrected review'; d = update(d, correction); assert.equal(progress(d).percent, 100); assert.equal(d.snapshots[0].reflection.wentWell, 'First review'); assert.equal(d.snapshots[0].createdAt, closeTime); assert.equal(current(d).closed, true); assert.throws(() => update(d, input(d)), /closed/); });
test('correction requires a reason and cannot apply to an open day', () => { let d = plan(1); assert.throws(() => update(d, input(d, 'correction')), /Close the day/); d = update(d, input(d, 'close')); assert.throws(() => update(d, input(d, 'correction')), /cannot be empty/); });
test('A23: rest has no completion percentage or task updates', () => { const d = makeDay({ date: '2026-10-09', timezone: prefs.timezone, commitments: [], note: '' }, prefs, { now, id }, true); assert.equal(progress(d).percent, null); assert.equal(d.slots.length, 0); assert.throws(() => update(d, input(d)), /rest day/); });
test('carry-forward makes fresh IDs and does not rewrite the old day', () => { const d = plan(2); const before = JSON.stringify(d); const draft = carryDraft(d, [d.commitments[0].id], addDays(d.date, 1), 'UTC', id); assert.notEqual(draft.commitments[0].id, d.commitments[0].id); assert.equal(draft.date, '2026-10-10'); assert.equal(draft.timezone, 'UTC'); assert.equal(JSON.stringify(d), before); });
test('code-point limits count emoji as one and reject empty/oversize titles', () => { assert.equal(codePoints('🙂'), 1); const d = plan(1); const u = input(d); u.tasks[0].currentTitle = '🙂'.repeat(160); assert.doesNotThrow(() => update(d, u)); u.tasks[0].currentTitle += '🙂'; assert.throws(() => update(d, u), /160/); u.tasks[0].currentTitle = '  '; assert.throws(() => update(d, u), /empty/); });
test('suggested slot is latest due unused slot', () => { const d = plan(); assert.equal(suggestedSlot(d, resolveLocal(d.date, '15:00', d.timezone)), 'slot-2'); });
test('persisted/exported data round trips including snapshots and corrections', () => { let d = plan(); d = update(d, input(d, 'close')); const c = input(d, 'correction'); c.correctionReason = 'More context'; d = update(d, c); const doc = initialDocument(prefs.timezone); doc.days[d.date] = d; assert.deepEqual(parseDocument(JSON.parse(JSON.stringify(doc))).days[d.date], d); });
class MemoryStore {
    value: AppDocument | null = null;
    failLoad = false;
    failSave = false;
    async load() { if (this.failLoad)
        throw new Error('denied'); return structuredClone(this.value); }
    async save(v: AppDocument) { if (this.failSave)
        throw new Error('quota'); this.value = structuredClone(v); }
    async clear() { this.value = null; }
    close() { }
}
test('A24: storage denial labels temporary; no false save claim', async () => { const store = new MemoryStore(); store.failLoad = true; const service = new PracticeService(store, { now: () => now, id }, prefs.timezone); await service.initialize(); service.saveDraft(service.blankDraft('2026-10-09')); await service.settled(); assert.equal(service.getSnapshot().persistence, 'temporary'); assert.equal(store.value, null); });
test('quota failure preserves latest local draft and changes save status', async () => { const store = new MemoryStore(); const service = new PracticeService(store, { now: () => now, id }, prefs.timezone); await service.initialize(); store.failSave = true; const draft = service.blankDraft('2026-10-09'); draft.commitments[0].title = 'Still here'; service.saveDraft(draft); await service.settled(); assert.equal(service.getSnapshot().document.drafts[draft.date].commitments[0].title, 'Still here'); assert.equal(service.getSnapshot().persistence, 'temporary'); });
test('queued saves and fresh service recover the newest draft', async () => { const store = new MemoryStore(); const service = new PracticeService(store, { now: () => now, id }, prefs.timezone); await service.initialize(); const draft = service.blankDraft('2026-10-09'); service.saveDraft(draft); service.saveDraft({ ...draft, note: 'Latest text' }); await service.settled(); const reopened = new PracticeService(store, { now: () => now, id }, 'UTC'); await reopened.initialize(); assert.equal(reopened.getSnapshot().document.drafts[draft.date].note, 'Latest text'); });
test('failed plan validation preserves unsent draft', async () => { const store = new MemoryStore(); const service = new PracticeService(store, { now: () => now, id }, prefs.timezone); await service.initialize(); const draft = service.blankDraft('2026-10-09'); service.saveDraft(draft); assert.throws(() => service.startDay(draft), /empty/); assert.equal(service.getSnapshot().document.drafts[draft.date].commitments.length, 1); });
