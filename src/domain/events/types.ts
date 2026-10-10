import type { DayRecord } from '../accountability/types.ts';
import type { SignedEvent } from '../ports/index.ts';

export type StateType = 'checkin' | 'revision' | 'close' | 'correction' | 'resolve';
export type EventType = 'plan' | 'rest' | StateType;
export interface RootPayload {
    local_date: string; timezone: string; utc_offset_minutes: number; mode: 'plan' | 'rest';
    commitments: { id: string; title: string; category: '' | 'work' | 'learning' | 'health' | 'personal' }[];
    slots: { id: string; due_at: number }[]; review_due_at: number | null; opening_note: string;
    carry_forward_from: { root_id: string; commitment_id: string; new_commitment_id: string }[];
}
export interface StatePayload {
    root_id: string; prev_id: string; sequence: number;
    tasks: { id: string; current_title: string; status: 'not_started' | 'in_progress' | 'done' | 'changed_plans'; original_fulfilled: boolean; revision_reason: string }[];
    bonus: { id: string; title: string; status: 'not_started' | 'in_progress' | 'done' | 'changed_plans' }[];
    slot_id: string; note: string; closed: boolean;
    reflection: { went_well: string; got_in_way: string; carry_forward: string };
    correction_reason: string; resolves: string[];
}
export type DecodedEvent =
    | { category: 'root'; event: SignedEvent; type: 'plan' | 'rest'; payload: RootPayload }
    | { category: 'state'; event: SignedEvent; type: StateType; payload: StatePayload }
    | { category: 'conversation'; event: SignedEvent; rootId: string | null; parentId: string | null }
    | { category: 'unsupported'; event: SignedEvent; rootId: string | null; version: string; reason: string }
    | { category: 'deletion'; event: SignedEvent; targetIds: string[] }
    | { category: 'invalid'; event: SignedEvent | null; id: string | null; reason: string };
export type RootEvent = Extract<DecodedEvent, { category: 'root' }>;
export type StateEvent = Extract<DecodedEvent, { category: 'state' }>;
export interface StateNode { record: RootEvent | StateEvent; day: DayRecord; sequence: number; }
export interface DayProjection {
    root: RootEvent | null; day: DayRecord | null; mainRootId: string | null; alternateRoots: RootEvent[];
    timeline: StateNode[]; head: StateNode | null; branches: StateNode[];
    discussion: { event: SignedEvent; reason: string }[];
    pending: { id: string; reason: string }[]; missingIds: string[];
    rejected: { id: string | null; reason: string }[];
    quarantined: string[]; deletedIds: string[]; warnings: string[];
}
