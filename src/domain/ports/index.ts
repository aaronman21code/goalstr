import type { DecodedEvent, RootPayload, StatePayload, StateType } from '../events/types.ts';
// Plain data contracts only; SDK objects never cross these interfaces.
export interface UnsignedEvent {
    pubkey: string;
    created_at: number;
    kind: number;
    tags: string[][];
    content: string;
}
export interface SignedEvent extends UnsignedEvent {
    id: string;
    sig: string;
}
export interface EventVerifierPort {
    verify(raw: unknown, destinationLimit?: number): Promise<{ event: SignedEvent | null; reason: string }>;
}
export interface AccountabilityCodec {
    encodeRoot(type: 'plan' | 'rest', payload: RootPayload, pubkey: string, createdAt: number, destinationLimit?: number): UnsignedEvent;
    encodeState(type: StateType, payload: StatePayload, pubkey: string, createdAt: number, relayHint?: string, destinationLimit?: number): UnsignedEvent;
    decode(raw: unknown): Promise<DecodedEvent>;
}
export interface SignerPort {
    connect(): Promise<void>;
    getPublicKey(): Promise<string>;
    signEvent(event: UnsignedEvent): Promise<SignedEvent>;
    disconnect(): Promise<void>;
}
export interface RelayObservation {
    relay: string;
    status: 'accepted' | 'rejected' | 'timed_out' | 'pending';
    reason?: string;
}
export interface RelayPort {
    publish(event: SignedEvent, relays: string[]): Promise<RelayObservation[]>;
    subscribe(filters: Record<string, unknown>[], relays: string[], onEvent: (event: SignedEvent) => void): () => void;
}
export interface DocumentStore<T> {
    load(): Promise<T | null>;
    save(document: T): Promise<void>;
    clear(): Promise<void>;
    close(): void;
}
export interface ClockPort {
    now(): number;
    id(): string;
}
