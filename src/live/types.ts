import type { PlanDraft, UpdateInput } from '../domain/accountability/types.ts';
import type { EventType, DayProjection } from '../domain/events/types.ts';
import type { PublicationFact, SignedEvent, UnsignedEvent } from '../domain/ports/index.ts';
export interface Operation {
    id: string; date: string; type: EventType; rootId: string | null; expectedHead: string | null;
    intent: UnsignedEvent; destinations: string[]; createdAt: number;
    event: SignedEvent | null; facts: PublicationFact[]; observedOn: string[]; error: string;
}
export interface LiveDocument {
    schemaVersion: 1; account: string; publicAcknowledged: boolean;
    drafts: Record<string, PlanDraft>; updateDrafts: Record<string, UpdateInput>;
    updateDraftHeads: Record<string, string>;
    outbox: Operation[]; cache: SignedEvent[]; relays: string[];
}
export interface LiveStorePort {
    load(account: string): Promise<LiveDocument | null>;
    change(account: string, edit: (document: LiveDocument) => LiveDocument): Promise<LiveDocument>;
    close(): void;
}
export function emptyLiveDocument(account: string, relays: string[]): LiveDocument { return { schemaVersion: 1, account, publicAcknowledged: false, drafts: {}, updateDrafts: {}, updateDraftHeads: {}, outbox: [], cache: [], relays }; }
export interface LiveSnapshot {
    account: string | null; document: LiveDocument | null; phase: 'disconnected' | 'connecting' | 'ready';
    busy: boolean; refreshing: boolean; message: string; projections: DayProjection[];
    checked: boolean; completeQuery: boolean;
}
export function publicationStatus(operation: Operation): string {
    if (operation.facts.some(f => f.status === 'accepted')) return `Published · ${new Set(operation.facts.filter(f => f.status === 'accepted').map(f => f.relay)).size}/${operation.destinations.length} relays accepted`;
    if (operation.observedOn.length) return 'Observed on relay · no acceptance recorded';
    if (operation.event) return 'Signed · not confirmed';
    return operation.error ? 'Approval incomplete · draft kept' : 'Unsigned intent · draft kept';
}
export function confirmed(operation: Operation): boolean { return operation.facts.some(f => f.status === 'accepted') || operation.observedOn.length > 0; }
