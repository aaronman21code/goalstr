import type { SignedEvent } from '../domain/ports/index.ts';
import type { DayProjection } from '../domain/events/types.ts';

export interface RelayFilter {
    ids?: string[]; authors?: string[]; kinds?: number[]; since?: number; until?: number; limit: number;
    '#t'?: string[]; '#e'?: string[];
}
export type ReadStatus = 'eose' | 'timeout' | 'disconnected' | 'closed' | 'auth_required' | 'cancelled' | 'capped';
export interface ReadObservation { relay: string; status: ReadStatus; received: number; rejected: number; reason: string; }
export interface ObservedEvent { event: SignedEvent; relays: string[]; }
export interface ReadResult { events: ObservedEvent[]; observations: ReadObservation[]; }
export interface RelayReaderPort {
    query(filters: RelayFilter[], relays: string[], signal: AbortSignal): Promise<ReadResult>;
    dispose(): void;
}
export interface RelayInfo {
    relay: string; available: boolean; name: string; description: string; supportedNips: number[];
    maxMessageLength: number | null; authRequired: boolean; paymentRequired: boolean; reason: string;
}
export interface RelayInfoPort { read(relay: string, signal: AbortSignal): Promise<RelayInfo>; }
export interface PublicProfile { pubkey: string; name: string; about: string; eventId: string | null; }
export interface PublicCard { id: string; author: string; projection: DayProjection | null; event: SignedEvent; unsupported: boolean; relays: string[]; }
export type PublicTarget = { type: 'feed' } | { type: 'profile'; pubkey: string; hints: string[] } | { type: 'event'; id: string; author?: string; hints: string[] };
export interface PublicSnapshot {
    phase: 'idle' | 'loading' | 'ready' | 'partial' | 'disconnected' | 'error';
    cards: PublicCard[]; profiles: Record<string, PublicProfile>; targetProfile: PublicProfile | null;
    observations: ReadObservation[]; info: RelayInfo[]; warnings: string[]; error: string;
    missingIds: string[]; rejected: number; canLoadMore: boolean; cursor: number | null;
    inspected: ObservedEvent[]; relays: string[]; routedRelays: string[]; windowDays: number;
}
