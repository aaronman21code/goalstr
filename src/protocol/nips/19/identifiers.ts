// NIP-19's Bech32 checksum is an encoding error check, not event cryptography.
// Event integrity remains the maintained Schnorr/Web Crypto NIP-01 verifier.
const alphabet = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
const hex = /^[0-9a-f]{64}$/;
function polymod(values: number[]): number {
    let check = 1;
    for (const v of values) { const top = check >>> 25; check = ((check & 0x1ffffff) << 5) ^ v; for (let i = 0; i < 5; i++) if ((top >>> i) & 1) check ^= generators[i]; }
    return check >>> 0;
}
function expand(hrp: string): number[] { return [...hrp].map(c => c.charCodeAt(0) >>> 5).concat([0], [...hrp].map(c => c.charCodeAt(0) & 31)); }
function convert(values: number[], from: number, to: number, pad: boolean): number[] {
    let acc = 0, bits = 0; const out: number[] = [], mask = (1 << to) - 1;
    for (const v of values) { if (v < 0 || v >>> from) throw new Error('Invalid identifier data.'); acc = ((acc << from) | v) & ((1 << (from + to - 1)) - 1); bits += from; while (bits >= to) { bits -= to; out.push((acc >>> bits) & mask); } }
    if (pad) { if (bits) out.push((acc << (to - bits)) & mask); }
    else if (bits >= from || ((acc << (to - bits)) & mask)) throw new Error('Invalid identifier padding.');
    return out;
}
export function encodePublic(prefix: 'npub' | 'note', value: string): string {
    if (!hex.test(value)) throw new Error('A public identifier needs 64 lowercase hexadecimal characters.');
    const words = convert(value.match(/../g)!.map(b => parseInt(b, 16)), 8, 5, true);
    const mod = polymod([...expand(prefix), ...words, 0,0,0,0,0,0]) ^ 1;
    return prefix + '1' + [...words, ...Array.from({ length: 6 }, (_, i) => (mod >>> (5 * (5 - i))) & 31)].map(w => alphabet[w]).join('');
}
export type PublicIdentifier = { type: 'profile'; pubkey: string; relays: string[] } | { type: 'event'; id: string; author?: string; kind?: number; relays: string[] };
export function decodePublic(input: string): PublicIdentifier {
    const value = input.trim();
    if (value.length > 5000 || value.length < 8 || (value !== value.toLowerCase() && value !== value.toUpperCase())) throw new Error('Invalid public identifier.');
    const lower = value.toLowerCase(), split = lower.lastIndexOf('1'), prefix = lower.slice(0, split);
    if (!['npub','note','nprofile','nevent'].includes(prefix)) throw new Error('Use npub, nprofile, note or nevent. Never enter a private key or signer connection.');
    const words = [...lower.slice(split + 1)].map(c => alphabet.indexOf(c));
    if (words.length < 7 || words.some(w => w < 0) || polymod([...expand(prefix), ...words]) !== 1) throw new Error('The public identifier checksum is invalid.');
    const bytes = Uint8Array.from(convert(words.slice(0, -6), 5, 8, false));
    const toHex = (v: Uint8Array) => [...v].map(b => b.toString(16).padStart(2, '0')).join('');
    if (prefix === 'npub' || prefix === 'note') {
        if (bytes.length !== 32) throw new Error('Public keys and event IDs must be 32 bytes.');
        return prefix === 'npub' ? { type: 'profile', pubkey: toHex(bytes), relays: [] } : { type: 'event', id: toHex(bytes), relays: [] };
    }
    const tlv = new Map<number, Uint8Array[]>();
    for (let i = 0; i < bytes.length;) {
        if (i + 2 > bytes.length) throw new Error('Truncated identifier metadata.');
        const type = bytes[i++], length = bytes[i++];
        if (i + length > bytes.length) throw new Error('Truncated identifier metadata.');
        const list = tlv.get(type) ?? []; list.push(bytes.slice(i, i + length)); tlv.set(type, list); i += length;
    }
    const special = tlv.get(0);
    if (special?.length !== 1 || special[0].length !== 32) throw new Error('Missing or ambiguous public identifier.');
    const relays = (tlv.get(1) ?? []).slice(0, 8).map(v => { if (v.some(b => b < 33 || b > 126)) return ''; return new TextDecoder().decode(v); }).filter(Boolean);
    if (prefix === 'nprofile') return { type: 'profile', pubkey: toHex(special[0]), relays };
    const author = tlv.get(2), kind = tlv.get(3);
    if (author && (author.length !== 1 || author[0].length !== 32)) throw new Error('Invalid event author hint.');
    if (kind && (kind.length !== 1 || kind[0].length !== 4)) throw new Error('Invalid event kind hint.');
    return { type: 'event', id: toHex(special[0]), relays, ...(author ? { author: toHex(author[0]) } : {}), ...(kind ? { kind: new DataView(kind[0].buffer, kind[0].byteOffset, 4).getUint32(0) } : {}) };
}
