import type { SignerPort, SignedEvent, UnsignedEvent } from '../../../domain/ports/index.ts';
import { assertUnsignedSize, verifySignedEvent } from '../01/events.ts';
interface BrowserExtension {
    getPublicKey(): Promise<string>;
    signEvent(event: Omit<UnsignedEvent, 'pubkey'>): Promise<unknown>;
}
export class BrowserSigner implements SignerPort {
    private generation = 0;
    private connected = false;
    private source: () => unknown;
    private timeoutMs: number;
    constructor(source: () => unknown = () => (globalThis as typeof globalThis & { nostr?: unknown }).nostr, timeoutMs = 45000) { this.source = source; this.timeoutMs = timeoutMs; }
    private extension(): BrowserExtension {
        const value = this.source() as Partial<BrowserExtension> | undefined;
        if (!value || typeof value.getPublicKey !== 'function' || typeof value.signEvent !== 'function') throw new Error('No browser signer found. Enable a NIP-07 extension, then connect again. Practice and public browsing are available without it.');
        return value as BrowserExtension;
    }
    private async bounded<T>(request: Promise<T>): Promise<T> {
        const generation = this.generation;
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            const value = await Promise.race([request, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Signer approval timed out. Your draft is preserved. Close the old prompt before retrying.')), this.timeoutMs); })]);
            if (!this.connected || generation !== this.generation) throw new Error('Signer session ended. Late approval was ignored.');
            return value;
        } finally { clearTimeout(timer); }
    }
    async connect(): Promise<void> { this.extension(); this.connected = true; this.generation++; }
    async getPublicKey(): Promise<string> {
        if (!this.connected) throw new Error('Connect a browser signer first.');
        const key = await this.bounded(this.extension().getPublicKey());
        if (!/^[0-9a-f]{64}$/.test(key)) throw new Error('Signer returned an invalid public key.');
        return key;
    }
    async signEvent(event: UnsignedEvent): Promise<SignedEvent> {
        assertUnsignedSize(event);
        const expected = structuredClone(event);
        if (await this.getPublicKey() !== expected.pubkey) throw new Error('Signer account changed. Reconnect to the intended account; this draft was kept.');
        const { pubkey: _key, ...request } = structuredClone(expected);
        const raw = await this.bounded(this.extension().signEvent(request));
        const result = await verifySignedEvent(raw);
        if (!result.event) throw new Error(result.reason);
        const signed = result.event;
        if (signed.pubkey !== expected.pubkey || signed.created_at !== expected.created_at || signed.kind !== expected.kind || signed.content !== expected.content || JSON.stringify(signed.tags) !== JSON.stringify(expected.tags)) throw new Error('Signer changed the approved event. Nothing was sent.');
        return signed;
    }
    async disconnect(): Promise<void> { this.connected = false; this.generation++; }
}
