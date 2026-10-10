// Test-only, deliberately public identities. This file is never imported by the app.
import fs from 'node:fs';
import { schnorr } from '../vendor/noble-secp256k1/compiled/index.js';
import { bytesToHex, hexToBytes, eventHash } from '../src/protocol/nips/01/events.ts';
import { encodeRoot, encodeState, readableContent } from '../src/protocol/accountability/v1/codec.ts';
import { resolveLocal } from '../src/domain/accountability/time.ts';
import type { RootPayload, StatePayload, StateType } from '../src/domain/events/types.ts';
import type { SignedEvent, UnsignedEvent } from '../src/domain/ports/index.ts';

const testKey = hexToBytes('0'.repeat(63) + '3');
const otherTestKey = hexToBytes('0'.repeat(63) + '5');
const author = bytesToHex(schnorr.getPublicKey(testKey));
const other = bytesToHex(schnorr.getPublicKey(otherTestKey));
const at = (time: string) => resolveLocal('2026-10-09', time, 'Asia/Kolkata');
const ids = ['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
async function sign(unsigned: UnsignedEvent, key = testKey): Promise<SignedEvent> {
    const id = await eventHash(unsigned);
    return { ...unsigned, id, sig: bytesToHex(await schnorr.signAsync(hexToBytes(id), key, new Uint8Array(32))) };
}
const payload: RootPayload = { local_date: '2026-10-09', timezone: 'Asia/Kolkata', utc_offset_minutes: 330, mode: 'plan',
    commitments: [{ id: ids[0], title: 'Publish the landing page', category: 'work' }, { id: ids[1], title: 'Walk for 30 minutes', category: 'health' }, { id: ids[2], title: 'Read chapter four', category: 'learning' }],
    slots: [{ id: 'slot-1', due_at: at('11:00') }, { id: 'slot-2', due_at: at('14:30') }, { id: 'slot-3', due_at: at('18:00') }],
    review_due_at: at('21:30'), opening_note: 'Keep the plan small enough to finish.', carry_forward_from: [] };
const fixtures: Record<string, SignedEvent> = {};
fixtures.plan = await sign(encodeRoot('plan', payload, author, at('08:15')));
const initial: StatePayload = { root_id: fixtures.plan.id, prev_id: fixtures.plan.id, sequence: 1,
    tasks: payload.commitments.map(t => ({ id: t.id, current_title: t.title, status: 'not_started', original_fulfilled: false, revision_reason: '' })),
    bonus: [], slot_id: '', note: '', closed: false, reflection: { went_well: '', got_in_way: '', carry_forward: '' }, correction_reason: '', resolves: [] };
const state = async (name: string, type: StateType, p: StatePayload, time: string, key = testKey) => {
    const pub = bytesToHex(schnorr.getPublicKey(key));
    fixtures[name] = await sign(encodeState(type, p, pub, at(time)), key); return fixtures[name];
};
const checkin = structuredClone(initial); checkin.tasks[1].status = 'done'; checkin.tasks[1].original_fulfilled = true; checkin.tasks[0].status = 'in_progress'; checkin.slot_id = 'slot-1'; checkin.note = 'The walk is done. The page needs another pass.';
await state('checkin', 'checkin', checkin, '11:10');
const revision = structuredClone(checkin); revision.prev_id = fixtures.checkin.id; revision.sequence = 2; revision.slot_id = ''; revision.tasks[0].current_title = 'Finish the landing-page draft'; revision.tasks[0].status = 'done'; revision.tasks[0].revision_reason = 'Publishing needs someone else’s review.'; revision.tasks[2].status = 'done'; revision.tasks[2].original_fulfilled = true; revision.note = 'The draft is ready. It has not been published.';
revision.bonus = [{ id: '44444444-4444-4444-8444-444444444444', title: 'Helped review a CV', status: 'done' }];
await state('revision', 'revision', revision, '14:40');
const close = structuredClone(revision); close.prev_id = fixtures.revision.id; close.sequence = 3; close.closed = true; close.note = ''; close.reflection = { went_well: 'Made time for a walk and finished the chapter.', got_in_way: 'The page needs a review.', carry_forward: 'Publish the page after review.' };
await state('close', 'close', close, '21:45');
const correction = structuredClone(close); correction.prev_id = fixtures.close.id; correction.sequence = 4; correction.tasks[0].original_fulfilled = true; correction.correction_reason = 'The page was also published after review.';
await state('correction', 'correction', correction, '22:00');
const branchA = structuredClone(initial); branchA.tasks[0].status = 'done'; branchA.tasks[0].original_fulfilled = true; branchA.note = 'Laptop version: the page is published.';
await state('branchA', 'checkin', branchA, '11:30');
const branchB = structuredClone(initial); branchB.tasks[1].status = 'done'; branchB.tasks[1].original_fulfilled = true; branchB.tasks[2].status = 'done'; branchB.tasks[2].original_fulfilled = true; branchB.note = 'Phone version: the walk and chapter are done.';
await state('branchB', 'checkin', branchB, '11:31');
const resolved = structuredClone(branchA); resolved.prev_id = fixtures.branchB.id; resolved.sequence = 2; resolved.resolves = [fixtures.branchA.id]; resolved.note = 'I checked both versions and chose the laptop outcomes. This does not close the day.';
await state('resolution', 'resolve', resolved, '11:35');
const later = structuredClone(branchA); later.prev_id = fixtures.branchA.id; later.sequence = 2; later.note = 'Another update arrives from the earlier branch.';
await state('laterBranch', 'checkin', later, '11:40');
await state('tieBranch', 'checkin', { ...branchA, note: 'Same-second competing version.' }, '11:31');
const orphan = structuredClone(initial); orphan.prev_id = 'a'.repeat(64); orphan.sequence = 2; orphan.tasks[0].status = 'done'; orphan.tasks[0].original_fulfilled = true;
await state('missingParent', 'checkin', orphan, '12:00');
await state('future', 'checkin', { ...branchA, note: 'This event is more than five minutes ahead of the demo clock.' }, '22:30');
await state('foreignState', 'checkin', { ...branchA, note: 'Another author cannot mark your tasks complete.' }, '12:05', otherTestKey);
await state('badSequence', 'checkin', { ...initial, sequence: 7 }, '12:10');
const wrongFulfillment = structuredClone(initial); wrongFulfillment.tasks[0].status = 'in_progress'; wrongFulfillment.tasks[0].original_fulfilled = true;
await state('wrongFulfillment', 'checkin', wrongFulfillment, '12:15');
const removed = structuredClone(initial); removed.tasks.pop();
await state('removedOriginal', 'checkin', removed, '12:20');
const reopened = structuredClone(close); reopened.prev_id = fixtures.close.id; reopened.sequence = 4; reopened.closed = false; reopened.note = 'Attempt to reopen a reviewed day.';
await state('reopened', 'checkin', reopened, '22:05');
const removedBonus = structuredClone(close); removedBonus.prev_id = fixtures.close.id; removedBonus.sequence = 4; removedBonus.bonus = []; removedBonus.correction_reason = 'Attempt to remove a bonus.';
await state('removedBonus', 'correction', removedBonus, '22:06');
fixtures.rest = await sign(encodeRoot('rest', { ...payload, local_date: '2026-10-10', mode: 'rest', commitments: [], slots: [], review_due_at: null, opening_note: 'A deliberate break.', carry_forward_from: [] }, author, at('08:16')));
fixtures.duplicateRoot = await sign(encodeRoot('plan', { ...payload, opening_note: 'A second device created another plan.', commitments: [{ id: '55555555-5555-4555-8555-555555555555', title: 'A different original commitment', category: 'work' }] }, author, at('08:20')));
fixtures.conversation = await sign({ pubkey: other, created_at: at('15:00'), kind: 1, tags: [['e', fixtures.plan.id, '', 'root', author], ['e', fixtures.revision.id, '', 'reply', author], ['p', author]], content: 'Nice progress. <img src=x onerror=alert(1)> is plain text here.' }, otherTestKey);
fixtures.unsupported = await sign({ ...encodeState('checkin', initial, author, at('15:05')), tags: [['e', fixtures.plan.id, '', 'root', author], ['accountability', '3', 'checkin', '{}']], content: 'A future Goalstr format. Keep this note readable; do not apply its tasks.' });
fixtures.deleteClose = await sign({ pubkey: author, created_at: at('22:10'), kind: 5, tags: [['e', fixtures.close.id], ['k', '1']], content: 'Remove this review.' });
fixtures.foreignDeletion = await sign({ pubkey: other, created_at: at('22:11'), kind: 5, tags: [['e', fixtures.plan.id], ['k', '1']], content: 'A different key cannot delete this plan.' }, otherTestKey);
fixtures.deleteRoot = await sign({ pubkey: author, created_at: at('22:12'), kind: 5, tags: [['e', fixtures.plan.id], ['k', '1']], content: 'Remove this plan.' });
fixtures.tamperedContent = { ...fixtures.checkin, content: 'Altered after signing.' };
fixtures.badSignature = { ...fixtures.checkin, sig: '0'.repeat(128) };
const base = encodeState('checkin', initial, author, at('12:25'));
fixtures.duplicateAppTag = await sign({ ...base, tags: [...base.tags, base.tags.at(-1)!] });
fixtures.badJson = await sign({ ...base, tags: [...base.tags.slice(0, -1), ['accountability', '1', 'checkin', '{broken']] });
fixtures.contradictoryText = await sign({ ...base, content: 'All three originals are done.' });
// Assert generator uses the same readable contract; do not silently hand-edit snapshots.
if (readableContent('plan', payload) !== fixtures.plan.content) throw new Error('Fixture text drift.');
const corpus = { format: 'goalstr-signed-fixtures-v1', referenceNow: at('22:20'), author, ids: Object.fromEntries(Object.entries(fixtures).map(([name, event]) => [name, event.id])), events: fixtures };
fs.mkdirSync('src/learning/fixtures', { recursive: true });
fs.writeFileSync('src/learning/fixtures/corpus.json', JSON.stringify(corpus, null, 2) + '\n');
console.log(`Generated ${Object.keys(fixtures).length} public fixture events. Test keys stay in scripts only.`);
