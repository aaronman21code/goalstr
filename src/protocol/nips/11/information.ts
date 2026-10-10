import type { RelayInfo } from '../../../public/types.ts';
export function parseRelayInfo(value: unknown, relay: string): RelayInfo {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid relay information document.');
    const data = value as Record<string, unknown>, limits = data.limitation && typeof data.limitation === 'object' ? data.limitation as Record<string, unknown> : {};
    const text = (v: unknown, cap: number) => typeof v === 'string' ? [...v].slice(0, cap).join('') : '';
    const length = limits.max_message_length;
    return { relay, available: true, name: text(data.name, 80), description: text(data.description, 500), supportedNips: Array.isArray(data.supported_nips) ? data.supported_nips.filter((v): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0).slice(0, 64) : [], maxMessageLength: typeof length === 'number' && Number.isSafeInteger(length) && length > 0 ? length : null, authRequired: limits.auth_required === true, paymentRequired: limits.payment_required === true, reason: '' };
}
