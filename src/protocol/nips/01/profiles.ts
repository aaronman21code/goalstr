import type { SignedEvent } from '../../../domain/ports/index.ts';
import type { PublicProfile } from '../../../public/types.ts';
export function latestReplaceable(events: SignedEvent[], kind: number, author: string, now: number): SignedEvent | null {
    return events.filter(e => e.kind === kind && e.pubkey === author && e.created_at <= now + 300).sort((a,b) => b.created_at - a.created_at || a.id.localeCompare(b.id))[0] ?? null;
}
export function profileFrom(event: SignedEvent | null, pubkey: string): PublicProfile {
    const fallback = { pubkey, name: `${pubkey.slice(0, 8)}…${pubkey.slice(-6)}`, about: '', eventId: event?.id ?? null };
    if (!event || event.kind !== 0 || event.pubkey !== pubkey) return fallback;
    try {
        const value: unknown = JSON.parse(event.content);
        if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
        const data = value as Record<string, unknown>;
        const text = (v: unknown, limit: number) => typeof v === 'string' ? [...v].slice(0, limit).join('') : '';
        return { ...fallback, name: text(data.display_name, 80) || text(data.name, 80) || fallback.name, about: text(data.about, 500) };
    } catch { return fallback; }
}
