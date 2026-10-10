import type { DecodedEvent, DayProjection, RootEvent, StateEvent, StateNode, StatePayload } from './types.ts';
import type { DayRecord, UpdateInput } from '../accountability/types.ts';
import { appendSnapshot, current } from '../accountability/rules.ts';
import { addDays, localParts, resolveLocal } from '../accountability/time.ts';

const byRoot = (a: RootEvent, b: RootEvent) => a.event.created_at - b.event.created_at || a.event.id.localeCompare(b.event.id);
const byChild = (a: StateNode, b: StateNode) => b.record.event.created_at - a.record.event.created_at || a.record.event.id.localeCompare(b.record.event.id);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export const outgoingTime = (now: number, parentTime: number): number => Math.max(Math.floor(now), parentTime + 1);

export function resolutionPayload(projection: DayProjection, chosenId: string, note: string, now: number): StatePayload {
    const root = projection.root, parent = projection.head;
    if (!root || !parent || !projection.branches.length || projection.branches.length > 16) throw new Error('Choose a reconstructed day with one to sixteen competing versions.');
    const selected = [parent, ...projection.branches].find(n => n.record.event.id === chosenId);
    if (!selected || !note.trim()) throw new Error('Choose a known version and explain the resolution.');
    const snapshot = current(selected.day);
    const payload: StatePayload = { root_id: root.event.id, prev_id: parent.record.event.id, sequence: parent.sequence + 1,
        tasks: snapshot.tasks.map(t => ({ id: t.id, current_title: t.currentTitle, status: t.status, original_fulfilled: t.originalFulfilled, revision_reason: t.revisionReason })),
        bonus: snapshot.bonus, slot_id: '', note: note.trim(), closed: current(parent.day).closed,
        reflection: { went_well: snapshot.reflection.wentWell, got_in_way: snapshot.reflection.gotInWay, carry_forward: snapshot.reflection.carryForward }, correction_reason: '', resolves: projection.branches.map(n => n.record.event.id).sort() };
    applyState(parent, { category: 'state', type: 'resolve', payload, event: { id: '0'.repeat(64), sig: '0'.repeat(128), pubkey: root.event.pubkey, created_at: outgoingTime(now, parent.record.event.created_at), kind: 1, tags: [], content: '' } });
    return payload;
}

function rootDay(root: RootEvent): DayRecord {
    const p = root.payload;
    return { id: root.event.id, date: p.local_date, timezone: p.timezone, offsetMinutes: p.utc_offset_minutes,
        createdAt: root.event.created_at, nextMidnightAt: resolveLocal(addDays(p.local_date, 1), '00:00', p.timezone), mode: p.mode,
        commitments: p.commitments, slots: [...p.slots].sort((a, b) => a.due_at - b.due_at).map(s => ({ id: s.id, dueAt: s.due_at, localTime: localParts(s.due_at, p.timezone).time })),
        reviewDueAt: p.review_due_at, openingNote: p.opening_note, snapshots: [] };
}
function applyState(parent: StateNode, record: StateEvent): DayRecord {
    const p = record.payload, before = current(parent.day);
    if (p.sequence !== parent.sequence + 1) throw new Error('Sequence must follow the actual parent.');
    if (record.event.created_at <= parent.record.event.created_at) throw new Error('Update time must increase after its parent.');
    if (p.root_id !== parent.day.id) throw new Error('Parent belongs to a different root.');
    if (p.closed !== (before.closed || record.type === 'close')) throw new Error('Closure flag does not match this transition.');
    if (record.type === 'close' && p.tasks.some(t => before.tasks.find(old => old.id === t.id)?.currentTitle !== t.current_title)) throw new Error('Close retains the current task wording.');
    // Reuse the Practice invariants without writing into its store. Resolve has its own
    // network type; this internal adapter treats its full snapshot as a revision/correction.
    const input: UpdateInput = { type: record.type === 'resolve' ? before.closed ? 'correction' : 'revision' : record.type,
        tasks: p.tasks.map(t => ({ id: t.id, currentTitle: t.current_title, status: t.status, originalFulfilled: t.original_fulfilled, revisionReason: t.revision_reason })),
        bonus: p.bonus, slotId: p.slot_id, note: p.note,
        reflection: { wentWell: p.reflection.went_well, gotInWay: p.reflection.got_in_way, carryForward: p.reflection.carry_forward },
        correctionReason: record.type === 'resolve' && before.closed ? p.note : p.correction_reason };
    const day = appendSnapshot(parent.day, input, { now: record.event.created_at, id: () => record.event.id });
    const result = current(day);
    for (const task of input.tasks) if (!same(task, result.tasks.find(t => t.id === task.id))) throw new Error('Task fulfillment or revision history is inconsistent.');
    if (!same(input.reflection, result.reflection)) throw new Error('Reflection must retain the parent outside review/correction.');
    if (record.type === 'resolve') result.correctionReason = '';
    return day;
}
/** Arrival-order-independent projection over signature/schema-checked records. */
export function reconstruct(records: DecodedEvent[], now: number, requestedRootId?: string): DayProjection {
    const out: DayProjection = { root: null, day: null, mainRootId: null, alternateRoots: [], timeline: [], head: null, branches: [], discussion: [], pending: [], missingIds: [], rejected: [], quarantined: [], deletedIds: [], warnings: [] };
    const invalid = records.filter((r): r is Extract<DecodedEvent, { category: 'invalid' }> => r.category === 'invalid');
    out.rejected = invalid.map(r => ({ id: r.id, reason: r.reason })).sort((a, b) => (a.id ?? '').localeCompare(b.id ?? '') || a.reason.localeCompare(b.reason));
    const unique = new Map<string, Exclude<DecodedEvent, { category: 'invalid' }>>();
    for (const record of records) if (record.category !== 'invalid') unique.set(record.event.id, record);
    const all = [...unique.values()].sort((a, b) => a.event.id.localeCompare(b.event.id));
    const eligible = all.filter(r => { if (r.event.created_at > now + 300) { out.quarantined.push(r.event.id); return false; } return true; });
    if (out.quarantined.length) out.warnings.push('Future-dated events are quarantined. Advancing the clock re-evaluates them.');
    const deleted = new Set<string>();
    for (const record of eligible) if (record.category === 'deletion') for (const id of record.targetIds) {
        const target = unique.get(id);
        if (target?.event.kind === 1 && target.event.pubkey === record.event.pubkey) deleted.add(id);
    }
    out.deletedIds = [...deleted].sort();
    const roots = eligible.filter((r): r is RootEvent => r.category === 'root' && !deleted.has(r.event.id)).sort(byRoot);
    const requested = requestedRootId ? roots.find(r => r.event.id === requestedRootId) : roots[0];
    if (!requested) {
        const missing = requestedRootId ? [requestedRootId] : eligible.filter((r): r is StateEvent => r.category === 'state').map(r => r.payload.root_id);
        out.missingIds = [...new Set(missing)].filter(id => !deleted.has(id)).sort();
        out.warnings.push(deleted.has(requestedRootId ?? '') ? 'The author requested deletion of this root. No day is reconstructed.' : 'A compatible root is missing. Updates cannot reconstruct the day alone.');
        return out;
    }
    const group = roots.filter(r => r.event.pubkey === requested.event.pubkey && r.payload.local_date === requested.payload.local_date).sort(byRoot);
    out.mainRootId = group[0].event.id; out.root = requested; out.alternateRoots = group.filter(r => r.event.id !== requested.event.id);
    if (group.length > 1) out.warnings.push('Other plan found for this author and date. Roots remain separate; the earliest known nondeleted root is the main card.');
    let day: DayRecord;
    try { day = rootDay(requested); } catch { out.rejected.push({ id: requested.event.id, reason: 'This root calendar cannot be reconstructed.' }); return out; }
    const nodes = new Map<string, StateNode>([[requested.event.id, { record: requested, day, sequence: 0 }]]);
    const relevant = eligible.filter((r): r is StateEvent => r.category === 'state' && r.payload.root_id === requested.event.id && !deleted.has(r.event.id));
    const candidates: StateEvent[] = [];
    for (const r of relevant) {
        if (r.event.pubkey !== requested.event.pubkey) { out.discussion.push({ event: r.event, reason: 'Different author: state tags are conversation only.' }); continue; }
        if (r.event.tags.find(t => t[0] === 'e' && t[3] === 'root')?.[4] !== requested.event.pubkey) { out.rejected.push({ id: r.event.id, reason: 'Root author reference does not match.' }); continue; }
        candidates.push(r);
    }
    let remaining = candidates.sort((a, b) => a.event.created_at - b.event.created_at || a.event.id.localeCompare(b.event.id));
    // Monotonic parent times forbid cycles. Iterate for resolutions referencing a branch
    // that was not yet admitted; missing dependencies never become confirmed snapshots.
    for (let pass = 0; pass <= candidates.length && remaining.length; pass++) {
        const next: StateEvent[] = []; let advanced = false;
        for (const r of remaining) {
            const parent = nodes.get(r.payload.prev_id);
            if (!parent || r.type === 'resolve' && r.payload.resolves.some(id => !nodes.has(id))) { next.push(r); continue; }
            try {
                if (r.type === 'resolve') {
                    const ancestors = new Set<string>(); let cursor: StateNode | undefined = parent;
                    while (cursor) { ancestors.add(cursor.record.event.id); cursor = cursor.record.category === 'state' ? nodes.get(cursor.record.payload.prev_id) : undefined; }
                    if (r.payload.resolves.some(id => ancestors.has(id) || nodes.get(id)!.record.category !== 'state' || nodes.get(id)!.record.event.created_at >= r.event.created_at)) throw new Error('Resolution must name earlier competing versions of this root.');
                }
                nodes.set(r.event.id, { record: r, day: applyState(parent, r), sequence: r.payload.sequence }); advanced = true;
            } catch (e) { out.rejected.push({ id: r.event.id, reason: e instanceof Error ? e.message : 'Invalid transition.' }); advanced = true; }
        }
        remaining = next; if (!advanced) break;
    }
    const missing = new Set<string>();
    for (const r of remaining) {
        const dependencyIds = [r.payload.prev_id, ...(r.type === 'resolve' ? r.payload.resolves : [])];
        const deletedParent = dependencyIds.some(id => deleted.has(id));
        out.pending.push({ id: r.event.id, reason: deletedParent ? 'An ancestor/version was deleted.' : 'A parent or referenced version is unavailable or invalid.' });
        for (const id of dependencyIds) if (!nodes.has(id) && !deleted.has(id) && !unique.has(id)) missing.add(id);
    }
    out.missingIds = [...missing].sort();
    if (remaining.length || relevant.some(r => deleted.has(r.payload.prev_id)) || all.some(r => r.category === 'state' && r.payload.root_id === requested.event.id && deleted.has(r.event.id))) out.warnings.push('Incomplete record. The displayed state is the last reconstructable state, not a complete final account.');
    const children = new Map<string, StateNode[]>();
    for (const node of nodes.values()) if (node.record.category === 'state') {
        const list = children.get(node.record.payload.prev_id) ?? []; list.push(node); children.set(node.record.payload.prev_id, list);
    }
    let head = nodes.get(requested.event.id)!; const canonical = new Set([head.record.event.id]);
    while (children.get(head.record.event.id)?.length) { head = children.get(head.record.event.id)!.sort(byChild)[0]; out.timeline.push(head); canonical.add(head.record.event.id); }
    out.head = head; out.day = head.day;
    const covered = new Set<string>();
    for (const node of out.timeline) if (node.record.category === 'state' && node.record.type === 'resolve') for (const id of node.record.payload.resolves) {
        let cursor = nodes.get(id);
        while (cursor && !canonical.has(cursor.record.event.id)) { covered.add(cursor.record.event.id); cursor = cursor.record.category === 'state' ? nodes.get(cursor.record.payload.prev_id) : undefined; }
    }
    out.branches = [...nodes.values()].filter(n => !canonical.has(n.record.event.id) && !covered.has(n.record.event.id) && !children.get(n.record.event.id)?.length).sort(byChild);
    if (out.branches.length) out.warnings.push('Conflicting updates. One branch is selected deterministically; competing versions remain available.');
    for (const r of eligible) {
        if (deleted.has(r.event.id)) continue;
        if (r.category === 'conversation' && r.rootId === requested.event.id) out.discussion.push({ event: r.event, reason: 'Ordinary reply: no application state.' });
        if (r.category === 'unsupported' && r.rootId === requested.event.id) { out.discussion.push({ event: r.event, reason: r.reason }); out.warnings.push('Unsupported day format is readable but does not change progress.'); }
    }
    out.discussion.sort((a, b) => a.event.created_at - b.event.created_at || a.event.id.localeCompare(b.event.id));
    out.pending.sort((a, b) => a.id.localeCompare(b.id)); out.rejected.sort((a, b) => (a.id ?? '').localeCompare(b.id ?? '') || a.reason.localeCompare(b.reason));
    out.warnings = [...new Set(out.warnings)]; return out;
}
