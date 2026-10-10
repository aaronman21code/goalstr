export const DEFAULT_RELAYS = ['wss://relay.damus.io', 'wss://nos.lol'];
export const MAX_RELAYS = 8;
/** Public secure endpoints only. Never carry credentials, query strings or fragments to a relay. */
export function relayUrl(raw: string): string | null {
    try {
        if (raw.length > 300 || /[^\x21-\x7e]/.test(raw)) return null;
        const url = new URL(raw);
        if (url.protocol !== 'wss:' || url.username || url.password || url.search || url.hash || (url.port && url.port !== '443')) return null;
        const host = url.hostname.toLowerCase();
        if (!host.includes('.') || host.endsWith('.') || host.includes(':') || host.startsWith('[') || host.endsWith('.home.arpa') || /(?:^|\.)(?:localhost|local|internal|lan|test|invalid|example)$/.test(host)) return null;
        if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
            const [a,b] = host.split('.').map(Number);
            if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) return null;
        }
        return url.pathname === '/' ? url.origin : url.toString();
    } catch { return null; }
}
export function boundedRelays(values: string[], cap = MAX_RELAYS): string[] {
    return [...new Set(values.map(relayUrl).filter((r): r is string => r !== null))].slice(0, Math.min(cap, MAX_RELAYS));
}
