import { z } from 'zod';
import { schnorr } from '../../../../vendor/noble-secp256k1/compiled/index.js';
import type { SignedEvent, UnsignedEvent, EventVerifierPort } from '../../../domain/ports/index.ts';

export const EVENT_LIMIT = 16 * 1024;
export const eventHex = z.string().regex(/^[0-9a-f]{64}$/);
const integer = z.number().int().nonnegative().safe();
const signedSchema = z.object({ id: eventHex, pubkey: eventHex, created_at: integer,
    kind: integer.max(65535), tags: z.array(z.array(z.string()).min(1)).max(128),
    content: z.string(), sig: z.string().regex(/^[0-9a-f]{128}$/) }).strict();
export const bytesToHex = (bytes: Uint8Array): string => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
export const hexToBytes = (hex: string): Uint8Array => {
    if (!/^(?:[0-9a-f]{2})+$/.test(hex)) throw new Error('Invalid hexadecimal bytes.');
    return Uint8Array.from(hex.match(/../g)!, pair => parseInt(pair, 16));
};
export const serializedBytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).byteLength;
/** NIP-01 canonical serialization; cryptographic hashing is supplied by Web Crypto. */
export async function eventHash(event: UnsignedEvent): Promise<string> {
    const serialized = JSON.stringify([0, event.pubkey, event.created_at, event.kind, event.tags, event.content]);
    return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized))));
}
export function assertUnsignedSize(event: UnsignedEvent, destinationLimit = EVENT_LIMIT): void {
    signedSchema.omit({ id: true, sig: true }).parse(event);
    const limit = Math.min(EVENT_LIMIT, destinationLimit);
    if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Invalid event byte limit.');
    if (serializedBytes({ ...event, id: '0'.repeat(64), sig: '0'.repeat(128) }) > limit)
        throw new Error(`This complete event exceeds the ${limit}-byte limit. Shorten the text before signing.`);
}
export async function verifySignedEvent(raw: unknown, destinationLimit = EVENT_LIMIT): Promise<{ event: SignedEvent | null; reason: string }> {
    try {
        const limit = Math.min(EVENT_LIMIT, destinationLimit);
        if (!Number.isSafeInteger(limit) || limit < 1 || serializedBytes(raw) > limit) return { event: null, reason: 'The complete signed event exceeds its byte limit.' };
        const parsed = signedSchema.safeParse(raw);
        if (!parsed.success) return { event: null, reason: 'Malformed Nostr event envelope.' };
        // Parse into fresh values every time; never trust a library cache flag on mutable input.
        const event = parsed.data;
        if (await eventHash(event) !== event.id) return { event: null, reason: 'Event ID does not match the signed fields.' };
        if (!await schnorr.verifyAsync(hexToBytes(event.sig), hexToBytes(event.id), hexToBytes(event.pubkey)))
            return { event: null, reason: 'Invalid Schnorr signature.' };
        return { event, reason: '' };
    } catch { return { event: null, reason: 'Event verification failed. Web Crypto and valid signed data are required.' }; }
}
export const nip01Verifier: EventVerifierPort = { verify: verifySignedEvent };
