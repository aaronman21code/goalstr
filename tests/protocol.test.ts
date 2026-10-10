import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { schnorr } from '../vendor/noble-secp256k1/compiled/index.js';
import { verifySignedEvent, eventHash, hexToBytes, serializedBytes, assertUnsignedSize } from '../src/protocol/nips/01/events.ts';
import { decodeEvent, encodeRoot, encodeState, readableContent } from '../src/protocol/accountability/v1/codec.ts';
import { rootSchema, stateSchema } from '../src/protocol/accountability/v1/schema.ts';
import { reconstruct, outgoingTime } from '../src/domain/events/reconstruct.ts';
import { progress, current, usedSlots } from '../src/domain/accountability/rules.ts';
import { inspectEvents, parsePublicEvents, previewResolution, previewPractice, safeDiagnosticText } from '../src/learning/protocol-service.ts';
import { readThread, stateThread } from '../src/protocol/nips/10/tags.ts';
import type { SignedEvent } from '../src/domain/ports/index.ts';
import type { RootPayload, StatePayload } from '../src/domain/events/types.ts';

const corpus = JSON.parse(fs.readFileSync('src/learning/fixtures/corpus.json', 'utf8'));
const events = corpus.events as Record<string, SignedEvent>;
const now = corpus.referenceNow as number;
const decoded = await Promise.all(Object.values(events).map(decodeEvent));
const records = Object.fromEntries(Object.keys(events).map((key, i) => [key, decoded[i]]));
const projection = (names: string[], at = now, root = events.plan.id) => reconstruct(names.map(n => records[n]), at, root);
const payload = (name: string) => JSON.parse(events[name].tags.find(t => t[0] === 'accountability')![3]);
const complete = ['plan','checkin','revision','close','correction','conversation','foreignState','unsupported'];

test('maintained Schnorr implementation passes every official BIP-340 positive/negative vector', async () => {
    const rows = fs.readFileSync('tests/fixtures/bip340-test-vectors.csv', 'utf8').trim().split('\n').slice(1);
    for (const row of rows) {
        const [index, , publicKey, , message, signature, result] = row.split(',');
        const bytes = message ? hexToBytes(message.toLowerCase()) : new Uint8Array();
        assert.equal(await schnorr.verifyAsync(hexToBytes(signature.toLowerCase()), bytes, hexToBytes(publicKey.toLowerCase())), result === 'TRUE', `BIP-340 vector ${index}`);
    }
});
test('NIP-01 verifies signed fields and never trusts mutated signature cache markers', async () => {
    assert.ok((await verifySignedEvent(events.plan)).event);
    assert.equal(await eventHash(events.plan), events.plan.id);
    assert.equal((await verifySignedEvent({ ...events.plan, content: 'changed', verified: true })).event, null);
    assert.equal((await verifySignedEvent(events.badSignature)).event, null);
    assert.equal((await verifySignedEvent(events.tamperedContent)).event, null);
});
test('all seven event types encode readable content and decode signed fixtures', () => {
    for (const [name, type] of [['plan','plan'],['rest','rest'],['checkin','checkin'],['revision','revision'],['close','close'],['correction','correction'],['resolution','resolve']]) {
        const record = records[name]; assert.ok(record.category === 'root' || record.category === 'state');
        assert.equal(record.type, type); assert.equal(events[name].content, readableContent(record.type, record.payload));
    }
});
test('A07/A08: reordered and duplicated verified arrivals produce exactly the same projection', () => {
    const expected = projection(complete);
    for (let rotation = 0; rotation < complete.length; rotation++) {
        const shuffled = [...complete.slice(rotation), ...complete.slice(0, rotation)].reverse();
        assert.deepEqual(projection([...shuffled, ...shuffled, ...shuffled]), expected);
    }
    assert.equal(expected.timeline.length, 4); assert.equal(progress(expected.day!).percent, 100);
});
test('reconstruction preserves revision, bonus exclusion, review and correction history', () => {
    const beforeCorrection = projection(['plan','checkin','revision','close']);
    assert.equal(progress(beforeCorrection.day!).percent, 67);
    assert.equal(current(beforeCorrection.day!).bonus.length, 1);
    assert.equal(beforeCorrection.day!.commitments[0].title, 'Publish the landing page');
    assert.equal(current(beforeCorrection.day!).tasks[0].currentTitle, 'Finish the landing-page draft');
    const corrected = projection(complete);
    assert.equal(current(corrected.day!).closed, true);
    assert.equal(corrected.day!.snapshots.find(s => s.type === 'close')!.id, events.close.id);
    assert.equal(corrected.day!.snapshots[2].tasks[0].originalFulfilled, false);
    assert.equal(current(corrected.day!).tasks[0].originalFulfilled, true);
    assert.equal(usedSlots(corrected.day!).size, 1);
});
test('A06: another author’s signed state-shaped note is conversation only', () => {
    const p = projection(['plan','foreignState']);
    assert.equal(progress(p.day!).percent, 0); assert.equal(p.timeline.length, 0);
    assert.equal(p.discussion.length, 1); assert.match(p.discussion[0].reason, /Different author/);
});
test('ordinary kind 1 replies and unsupported versions cannot change task state', () => {
    const p = projection(['plan','conversation','unsupported']);
    assert.equal(progress(p.day!).percent, 0); assert.equal(p.discussion.length, 2);
    assert.ok(p.warnings.some(w => /Unsupported/.test(w)));
    assert.equal(records.unsupported.category, 'unsupported');
});
test('A15: newer sibling wins; same-second tie uses lexically lowest event ID', () => {
    const p = projection(['plan','branchA','branchB']);
    assert.equal(p.head!.record.event.id, events.branchB.id); assert.equal(p.branches[0].record.event.id, events.branchA.id);
    const tied = projection(['plan','branchB','tieBranch']);
    assert.equal(tied.head!.record.event.id, [events.branchB.id, events.tieBranch.id].sort()[0]);
});
test('resolution acknowledges named competing versions without closing the day', () => {
    const p = projection(['plan','branchA','branchB','resolution']);
    assert.equal(p.head!.record.event.id, events.resolution.id); assert.equal(p.branches.length, 0);
    assert.equal(progress(p.day!).percent, 33); assert.equal(current(p.day!).closed, false);
    assert.equal(p.timeline.length, 2);
});
test('a later child on an acknowledged branch creates another visible conflict', () => {
    const p = projection(['plan','branchA','branchB','resolution','laterBranch']);
    assert.equal(p.head!.record.event.id, events.resolution.id);
    assert.equal(p.branches[0].record.event.id, events.laterBranch.id);
});
test('unsigned resolution command uses canonical causal parent and named heads', () => {
    const p = projection(['plan','branchA','branchB']);
    const event = previewResolution(p, events.branchA.id, 'I chose the laptop version.', now);
    assert.equal('sig' in event, false);
    const app = JSON.parse(event.tags.find(t => t[0] === 'accountability')![3]) as StatePayload;
    assert.equal(app.prev_id, events.branchB.id); assert.equal(app.sequence, 2);
    assert.deepEqual(app.resolves, [events.branchA.id]); assert.equal(app.closed, false);
    assert.throws(() => previewResolution(p, 'c'.repeat(64), 'unknown version', now));
});
test('missing causal parent cannot create a confirmed snapshot and emits exact fetch intent', () => {
    const p = projection(['plan','missingParent']);
    assert.equal(p.timeline.length, 0); assert.equal(progress(p.day!).percent, 0);
    assert.deepEqual(p.missingIds, ['a'.repeat(64)]); assert.equal(p.pending.length, 1);
    assert.ok(p.warnings.some(w => /Incomplete/.test(w)));
});
test('a missing root is explicit; it cannot be substituted by an update', () => {
    const p = projection(['checkin']); assert.equal(p.day, null);
    assert.deepEqual(p.missingIds, [events.plan.id]);
});
test('five-minute future policy is distinct from signature validity and re-evaluates with clock', () => {
    assert.equal(records.future.category, 'state');
    const before = projection(['plan','future']); assert.equal(progress(before.day!).percent, 0); assert.equal(before.quarantined.length, 1);
    const time = events.future.created_at;
    assert.equal(projection(['plan','future'], time - 301).quarantined.length, 1);
    assert.equal(projection(['plan','future'], time - 300).quarantined.length, 0);
    assert.equal(progress(projection(['plan','future'], time).day!).percent, 33);
    assert.equal(outgoingTime(100, 101), 102);
});
test('A17: author deletion breaks ancestry; another author cannot delete the root', () => {
    const p = projection(['plan','checkin','revision','close','correction','deleteClose','foreignDeletion']);
    assert.equal(p.root!.event.id, events.plan.id); assert.deepEqual(p.deletedIds, [events.close.id]);
    assert.equal(p.head!.record.event.id, events.revision.id); assert.equal(p.pending.length, 1);
    assert.equal(current(p.day!).closed, false); assert.ok(p.warnings.some(w => /Incomplete/.test(w)));
    assert.equal(p.missingIds.includes(events.close.id), false, 'Deleted dependencies are not re-fetched.');
});
test('author deletion of a root suppresses its reconstructed day', () => {
    const p = projection(['plan','checkin','deleteRoot']); assert.equal(p.day, null);
    assert.ok(p.warnings.some(w => /deletion/.test(w)));
});
test('A21: earliest nondeleted root is main; alternate task sets never merge', () => {
    const p = projection(['duplicateRoot','plan']); assert.equal(p.mainRootId, events.plan.id);
    assert.equal(p.alternateRoots[0].event.id, events.duplicateRoot.id); assert.equal(p.day!.commitments.length, 3);
    const alternate = projection(['duplicateRoot','plan'], now, events.duplicateRoot.id);
    assert.equal(alternate.day!.commitments.length, 1); assert.equal(alternate.mainRootId, events.plan.id);
    const afterDelete = reconstruct([records.plan, records.duplicateRoot, records.deleteRoot], now);
    assert.equal(afterDelete.mainRootId, events.duplicateRoot.id);
});
test('rest root has no percentage, task updates, or invented Closed review', () => {
    const p = projection(['rest'], now, events.rest.id); assert.equal(progress(p.day!).percent, null);
    assert.equal(p.timeline.length, 0); assert.equal(p.day!.slots.length, 0);
});
test('invalid sequence, removed originals and false fulfillment are rejected against their parent', () => {
    const p = projection(['plan','badSequence','removedOriginal','wrongFulfillment']);
    assert.equal(p.timeline.length, 0); assert.equal(p.rejected.length, 3);
    assert.equal(progress(p.day!).percent, 0);
});
test('closed day cannot reopen; committed bonus records cannot be removed', () => {
    const p = projection(['plan','checkin','revision','close','reopened','removedBonus']);
    assert.equal(p.head!.record.event.id, events.close.id); assert.equal(p.rejected.length, 2);
    assert.equal(current(p.day!).closed, true);
});
test('duplicate application tags, broken JSON and contradictory readable text are rejected', () => {
    for (const name of ['duplicateAppTag','badJson','contradictoryText']) assert.equal(records[name].category, 'invalid');
});
test('NIP-10 uses a single marked root for direct updates; ordinary nested replies retain parent', () => {
    assert.deepEqual(readThread(stateThread(events.plan.id, corpus.author)), { rootId: events.plan.id, parentId: events.plan.id });
    const reply = records.conversation; assert.equal(reply.category, 'conversation');
    assert.equal(reply.parentId, events.revision.id);
    assert.throws(() => readThread([['e',events.plan.id,'','root'],['e',events.plan.id,'','root']]));
    assert.deepEqual(readThread([['e',events.plan.id],['e',events.checkin.id]]), { rootId: events.plan.id, parentId: events.checkin.id });
});
test('Unicode code-point constraints and whole-event UTF-8 byte ceiling are separate', () => {
    const p = payload('plan') as RootPayload; p.commitments[0].title = '🌱'.repeat(160);
    assert.ok(rootSchema.safeParse(p).success); p.commitments[0].title += '🌱'; assert.equal(rootSchema.safeParse(p).success, false);
    const state = payload('close') as StatePayload; state.note = '🌱'.repeat(1000); state.reflection = { went_well: '🌱'.repeat(1000), got_in_way: '🌱'.repeat(1000), carry_forward: '🌱'.repeat(1000) };
    assert.ok(stateSchema.safeParse(state).success);
    assert.throws(() => encodeState('close', state, corpus.author, now), /byte/);
    const event = encodeRoot('plan', payload('plan'), corpus.author, events.plan.created_at);
    const bytes = serializedBytes({ ...event, id: '0'.repeat(64), sig: '0'.repeat(128) });
    assertUnsignedSize(event, bytes); assert.throws(() => assertUnsignedSize(event, bytes - 1), /byte/);
});
test('root schema rejects duplicate IDs, wrong calendar reminders, invalid date and rest tasks', () => {
    const p = payload('plan') as RootPayload;
    assert.equal(rootSchema.safeParse({ ...p, local_date: '2026-02-30' }).success, false);
    assert.equal(rootSchema.safeParse({ ...p, slots: [{ id: 'slot-1', due_at: 0 }] }).success, false);
    assert.equal(rootSchema.safeParse({ ...p, commitments: [p.commitments[0],p.commitments[0]] }).success, false);
    assert.equal(rootSchema.safeParse({ ...p, mode: 'rest' }).success, false);
});
test('unsigned preview retains Practice state and has no signature or signer capability', async () => {
    const day = projection(['plan','checkin','revision','close']).day!;
    const before = JSON.stringify(day); const templates = await previewPractice(day, corpus.author);
    assert.equal(JSON.stringify(day), before); assert.equal(templates.length, 4);
    assert.equal(templates.some(e => 'sig' in e || 'id' in e), false);
    assert.equal(JSON.parse(templates[1].tags.find(t => t[0] === 'accountability')![3]).prev_id, await eventHash(templates[0]));
});
test('public JSON import is bounded, accepts event arrays, rejects signer secrets', async () => {
    assert.equal(parsePublicEvents(JSON.stringify([events.plan])).length, 1);
    assert.throws(() => parsePublicEvents('{}')); assert.throws(() => parsePublicEvents('[]'));
    assert.throws(() => parsePublicEvents('["bunker://secret"]')); assert.throws(() => parsePublicEvents('["nsec1abc"]'));
    assert.throws(() => parsePublicEvents(JSON.stringify(Array(129).fill(events.plan))));
    await assert.rejects(inspectEvents(Array(129).fill(events.plan), now));
    assert.equal(safeDiagnosticText('nsec1abc bunker://xyz nostrconnect://abc'), '[private key redacted] [signer connection redacted] [signer connection redacted]');
});
