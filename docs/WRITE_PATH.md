# Browser signing and durable publication

The application owns intent and outbox state; NIP modules own protocol interpretation. No SDK or signer object crosses the domain ports.

| Module | Responsibility |
| --- | --- |
| `domain/accountability/categories.ts` | Three-category/five-goal limits and original-credit grouping |
| `protocol/accountability/schema.ts`, `codec.ts` | Shared app payload validation, readable content and version dispatch |
| `protocol/accountability/v1`, `v2` | Frozen three-goal v1 and expanded v2 encoders/schemas |
| `protocol/nips/07/browser-signer.ts` | Runtime extension availability, actual key, timeout/session checks and exact returned-event verification |
| `infrastructure/relays/pool.ts` | Shared read/write WSS sockets; EVENT/OK, deadlines, AUTH-needed, cancel/disconnect facts |
| `infrastructure/storage/live-document.ts` | Separate account store and atomic read/edit/write transactions |
| `live/service.ts` | Preview, public acknowledgment, concurrency, persistence boundaries, dispatch/retry/recovery and projections |
| `features/live/LiveView.tsx` | Connection, public day, exact preview, conflict comparison and delivery UI |
| `app/live-service.ts`, `live-context.tsx` | Concrete adapters and React subscription |

## Transaction order

1. Validate the full snapshot/date/format/byte size and refresh bounded author history. Missing/capped/failed queries cannot be treated as no existing day. Check roots and causal heads; keep stale drafts for explicit comparison.
2. Present the exact readable note, unsigned metadata, author and frozen destinations. Require a public-visibility acknowledgment before this account's first publication.
3. Atomically persist unsigned operation intent. Detect another tab's intent or signed operation for the same date/parent. No save means no signing request.
4. Ask the NIP-07 extension for a signature. Reject account changes, mismatched timestamp/kind/content/tags/pubkey, wrong hash, invalid signature, denial or timeout. Late approvals after disconnect/release are ignored.
5. Persist the exact signed event before EVENT transmission. A failed signed write prevents transmission and retains the original draft/intent. Never regenerate a signed operation on retry.
6. Send to at most four frozen destinations. Only a matching boolean OK can establish acceptance. Persist each result as it arrives. One saved acceptance permits Published with replication count; failures elsewhere stay visible.
7. If no acceptance is recorded, retain Signed · not confirmed. Query the actual event ID to recover verified sightings, labeled Observed on relay separately. Retrying uses the saved signed fields, ID and signature, without the signer.

Disconnect aborts network work, closes session sockets, clears account projections and signing capability; it does not discard stored work. Reconnect loads only the discovered account's document. IndexedDB transactions stage competing-tab intents against the freshest stored document. Distinct remote clients can still publish concurrent branches; deterministic reconstruction retains them, and the user chooses a full version plus explanation for a causal signed resolution.

The signed outbox is distinct from cached observed events. Only accepted/observed outbox events enter the confirmed day projection. Unconfirmed signed roots prevent another root; unconfirmed updates prevent further snapshots. A later author deletion can suppress a cached root or break ancestry. Missing history is never filled in using a guessed original plan.

## Standards and limits

Official primary sources reviewed on 10 October 2026: [NIP-07](https://github.com/nostr-protocol/nips/blob/master/07.md) and [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md). Mutable specification URLs are recorded, not claimed as immutable upstream commit pins. The existing NIP-10/09/65/19/21 read adapters retain their documented subsets. Actual extension compatibility and hosted whole-day publication are pending pilot checks.

Native WebSocket/IndexedDB adapters and the maintained vendored Schnorr verifier retain the project's documented tooling substitutions. No new crypto or secret identity service is introduced. The browser adapter requests only public-key access and event signatures. No NIP-46 session keys, NIP-42 auth events, or signer-encryption APIs are used in this milestone.

Account history is finite: initial 30-day author discovery, 128-event filters, eight read endpoints, four write destinations, bounded roots/deletion queries, three dependency passes, and 1,000 cached events/operations per account. Storage or retrieval caps stop new signatures while keeping existing stored work. Exact recovery/retry is still available. Outbox export/compaction, broader historical retrieval, and automated write routing are future reliability/routing work.
