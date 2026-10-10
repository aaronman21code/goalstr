# Goalstr architecture

The application is a modular monolith. `src/app` assembles the concrete store, clock, and Practice service. React features read a service snapshot and invoke commands. Pure domain functions decide the result; the store port persists it.

| Module | Responsibility |
| --- | --- |
| `domain/accountability/types.ts` | Domain records, immutable originals, complete update snapshots |
| `domain/accountability/rules.ts` | Validation, original credit, progress, transitions, carry-forward |
| `domain/accountability/time.ts` | Pinned date/timezone, DST resolution, calendar arithmetic |
| `domain/ports/index.ts` | Store/clock interfaces and future signer/relay contracts |
| `practice/service.ts` | Mode-isolated operations, queued persistence, save/failure state |
| `infrastructure/storage` | Native IndexedDB transaction adapter and validated restore |
| `features` | Today, History, Profile, Settings, and their forms |
| `app/router.tsx` | Small native history adapter; planned React Router replacement |
| `learning` | Optional guide, cheat sheet, exercise/checkpoint |

The pure domain type-check has no React, DOM, Zod, or SDK types. Zod validates persisted/imported data at the infrastructure boundary. Replaying each stored snapshot checks causal transitions and domain invariants. Storage denial or a failed transaction preserves the latest in-memory state and makes the session visibly temporary.

The Practice service serializes writes. It marks work saved only after the newest write completes. Refresh restores saved plan and update drafts. A corrupt/unavailable saved document is not silently replaced at initialization.

Original commitments are immutable and always stay in the denominator. A snapshot cannot remove IDs. Changed plans gets no original credit. Revised Done requires explicit original fulfillment. Bonus records are separate and their committed titles/IDs remain stable. Closing is explicit; corrections stay closed and retain previous snapshots.

Reminder instants are pinned at plan creation. Ambiguous wall times select the earlier occurrence; nonexistent wall times advance to the next valid local minute. A close after the stored next midnight is Late review. Timezone preference changes apply to new drafts and do not move existing days.

Live stages add `protocol/accountability/v1` and scoped NIP adapters. Verified event reconstruction, causal forks, relay completeness, signing, and outbox transactions are not simulated by the Practice service. The local record ID is a UUID, not a Nostr event ID; Stage 2's codec must map the domain to actual event ancestry.

## Staged deployment

The project is host-portable. Vercel builds `dist` from source, with SPA deep-link rewrites. Stage 3 CSP allows secure WSS relay and HTTPS metadata connections. Scripts remain same-origin, external images stay disabled, and queries carry no connection credentials.

The stable Practice database is separate from future account-scoped live stores. Later releases must include versioned migrations and rollback compatibility notes. A complete source ZIP, hashes, removed paths, and changelog make manual GitHub updates reviewable.

## Stage 2 protocol boundary

`ProtocolView` is lazy-loaded and calls `learning/protocol-service.ts`. The service invokes the versioned codec, which verifies the envelope through the scoped NIP-01 adapter before schema/thread decoding. NIP-10 owns threading and the NIP-09 reader owns deletion target parsing. `domain/events/reconstruct.ts` consumes decoded records and reuses the existing pure accountability rules without writing to Practice storage. Typed `EventVerifierPort` and `AccountabilityCodec` interfaces carry plain data only.

The protocol lab imports public signed fixtures, not their generating identities. It stores imported events and generated unsigned previews in component memory only. Actual relay transport/outbox/signers remain later-stage adapters. The vendored upstream crypto source is isolated under `vendor/`; only the NIP-01 adapter and test generator import it. Domain compilation includes both accountability and event graph modules and forbids SDK/React/Zod imports.

## Stage 3 read boundary

The lazy Public view gets a fresh service from the app composition root. `public/types.ts` defines finite read ports; `public/service.ts` batches discovery, metadata, author relay routing, visible-card threads and targeted dependencies. The infrastructure pool owns shared sockets, deadlines, cancellation, fresh verification and exact filter matching. NIP-11 information, NIP-19 identifiers, NIP-21 links and NIP-65 lists remain scoped adapters. Domain reconstruction is unchanged. See READ_PATH.md for module ownership and STAGE_03.md for explicit bounds.

The public cache is memory-only and separate from Practice. Leaving the route aborts and disposes network work; StrictMode creates a fresh service on each effect setup. Public cards never invoke Practice commands, signers or publication. Snapshots refresh through finite reads; they are not an unbounded live subscription.


## Stage 4 write boundary and category UI

`LiveService` is composed with a scoped `BrowserSigner`, the shared read/write relay pool, and `IndexedLiveStore`. React forms only create/save drafts and request previews. NIP-07 owns extension calls and exact-event checks; the service owns transactional intent/outbox orchestration. `PublisherPort` carries publication facts and a plain cancellation interface so the pure-domain compilation remains free of DOM types. Disconnect cancels work and resets session sockets; persisted account documents remain.

Practice schema 1 migrates losslessly to 2 under the stable database/key. Live has its own account-keyed database and causal-head-tagged drafts. Reopened stale drafts are preserved for comparison until an explicit user choice starts from current state. Atomic stored intent staging prevents another tab from signing a duplicate date/parent operation. New remote conflicts are still possible and remain explicit full-version choices.

Shared app schemas/codec dispatch live in `protocol/accountability/schema.ts` and `codec.ts`, with separate v1/v2 modules. Existing v1 limits remain frozen; v2 allows three categories/five goals each. State versions must match the root. `domain/accountability/categories.ts` provides pure grouping/limits; SVG rings, textual category totals, tap controls, and Fitness tokens remain view-only. Public browsing never calls the write service.

See WRITE_PATH.md and STAGE_04.md for transaction boundaries, finite retrieval limits, compatibility and pending hosted/extension gates.
