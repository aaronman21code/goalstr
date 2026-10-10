# Goalstr v2 application contract

Version 2 extends the frozen [v1 contract](GOALSTR_V1.md) only to support larger categorized original plans. It is an application convention, not a NIP. All signature, kind-1 readable content, marked-root author threading, immutable originals, bonus, closure, correction, resolution, causality, deletion and future-time rules retain the v1 semantics.

## Changes from v1

| Field / behavior | v1 | v2 |
| --- | --- | --- |
| Application tag version | `1` | `2` |
| Discovery tags | `goalstr`, `goalstr-v1` | `goalstr`, `goalstr-v2` |
| Plan commitments | 1–3 total | 1–15 total, at most 3 categories, at most 5 per category |
| State tasks | 1–3 | 1–15, exactly the root's immutable original IDs |
| Carry-forward references | Up to 3 | Up to 15, distinct new originals |
| Category values | General (`''`), work, learning, health, personal | Same values; General counts as a category |

Rest has zero commitments and no percentage. Plan mode requires at least one original. Empty categories produce no ring. A root fixes the original category; updates cannot change it. The overall completion percentage is rounded fulfilled-original count / total-original count, with each category ring computed from its own original count. It is not the mean of category percentages. Bonus tasks, canceled/revised-unfulfilled originals, check-in slots, and closing never inflate the rings.

Seven event types remain plan, rest, checkin, revision, close, correction, resolve. New Live roots use v2. Updates/resolutions use the version of their root. A v2 state is rejected against a v1 root/parent even if its shape otherwise fits. Old v1 events remain readable; their three-goal schema is never widened. Unknown future versions are readable text without state effects.

The complete signed envelope remains capped at **16 KiB**, including readable content and metadata. Fifteen goals are allowed by shape; maximum-length titles, reflection, revision reasons and notes together may exceed the byte cap and must be shortened before signing. Drafts remain stored on preview validation failure.

Executable validation lives in `src/protocol/accountability/schema.ts` with scoped v1/v2 exports. `codec.ts` dispatches by explicit application version. `goalstr-v2.schema.json` documents the decoded event type/payload shape; executable checks additionally enforce trimming, code points, category cardinality, unique IDs, resolved date/timezone/offset, byte limits, exact readable content and causal semantics. JSON Schema is descriptive and is not the relay signature validator.
