import { parseRelayInfo } from '../../protocol/nips/11/information.ts';
import { relayUrl } from './urls.ts';
import type { RelayInfo, RelayInfoPort } from '../../public/types.ts';
export class RelayInformation implements RelayInfoPort {
    private fetcher: typeof fetch;
    private timeout: number;
    constructor(fetcher: typeof fetch = fetch, timeout = 3500) { this.fetcher = fetcher; this.timeout = timeout; }
    async read(relay: string, signal: AbortSignal): Promise<RelayInfo> {
        const empty = { relay, available: false, name: '', description: '', supportedNips: [], maxMessageLength: null, authRequired: false, paymentRequired: false, reason: 'Information unavailable; relay transport can still work.' };
        if (!relayUrl(relay)) return empty;
        const controller = new AbortController(), abort = () => controller.abort();
        signal.addEventListener('abort', abort, { once: true }); if (signal.aborted) abort();
        const timer = setTimeout(abort, this.timeout);
        try {
            const response = await this.fetcher(relay.replace(/^wss:/, 'https:'), { headers: { Accept: 'application/nostr+json' }, signal: controller.signal, credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer' });
            if (!response.ok || !response.body) return empty;
            const reader = response.body.getReader(); let size = 0, content = ''; const decoder = new TextDecoder();
            try { for (;;) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > 64 * 1024) { await reader.cancel(); return empty; } content += decoder.decode(chunk.value, { stream: true }); } } finally { reader.releaseLock(); }
            content += decoder.decode(); return parseRelayInfo(JSON.parse(content), relay);
        } catch { return empty; }
        finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
    }
}
