// Implementations are introduced by later stages. No SDK objects cross these interfaces.
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
