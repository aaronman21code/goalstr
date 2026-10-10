import type { AccountabilityCodec } from '../../../domain/ports/index.ts';
import { encodeRootVersion, encodeStateVersion, decodeEvent } from '../codec.ts';
export { readableContent, decodeEvent, encodeStateVersion } from '../codec.ts';
export const encodeRoot: AccountabilityCodec['encodeRoot'] = (type, payload, key, time, limit) => encodeRootVersion('1', type, payload, key, time, limit);
export const encodeState: AccountabilityCodec['encodeState'] = (type, payload, key, time, hint, limit) => encodeStateVersion('1', type, payload, key, time, hint, limit);
export const goalstrV1Codec: AccountabilityCodec = { encodeRoot, encodeState, decode: decodeEvent };
