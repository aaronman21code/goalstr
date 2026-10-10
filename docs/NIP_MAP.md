# Goalstr protocol coverage

Stages 2–3 implement verified event/codec/reconstruction subsets, finite NIP-01 public queries and profiles, NIP-11 information, public NIP-19/NIP-21 links, and NIP-65 read routing. Stage 4 adds browser signing and publication; authentication and social mutations remain later-stage work. The table shows milestone ownership; the working subsets are listed below.

| NIP | Module / use | Stage |
| --- | --- | --- |
| 01 | Event verification, envelopes, profiles, relay queries and acknowledgments | 2–4 |
| 10 | Kind 1 plan and reply threading | 2, 6 |
| 19 / 21 | Public identifiers and nostr links | 3, 6 |
| 11 / 65 | Relay information and routing | 3, 5 |
| 07 | Browser signer | 4 |
| 44 / 46 | Encrypted remote signer transport and actual identity discovery | 5 |
| 42 | Selected-relay authentication | 5 |
| 02 | Preserve full public follow list | 6 |
| 25 | Encouragement reactions | 6 |
| 09 | Local author validation / own deletion publication | 2 / 7 |
| 57 / 47 | Zaps and independent wallet adapter | P1 |
| 78 | Encrypted preference sync candidate | P1 |
| 22 / 51 / 56 / 58 | Other-kind comments, synced moderation, badges | Extensions |

Official specifications: [nostr-protocol/nips](https://github.com/nostr-protocol/nips). Reviewed revisions must be recorded before adapters are written. Advertised relay NIP support does not establish signer capabilities or guarantee acceptance/history.

The frozen custom tag `['accountability','1',type,payloadJson]` is an app convention, not a NIP or assumed multi-letter relay index. Live kind 1 content must remain readable in ordinary clients. Signatures establish key approval and content integrity, not proven task completion.

## Stage 2 working subsets

| Module | Implemented locally | Remaining live work |
| --- | --- | --- |
| `nips/01` | Strict envelope, full UTF-8 size, canonical hash, maintained Schnorr verifier, plain-data verifier port | Relay transport, profiles, subscriptions, publication facts |
| `nips/10` | Direct-root state threading; marked/legacy ordinary reply parsing | Live conversation retrieval/publication |
| `nips/09` | Explicit kind 5 `e` targets; same-author kind 1 authorization; incomplete-ancestry projection | User deletion publication, addressable objects, relay delivery |
| `accountability/v1` | All seven types, exact schema, readable notes, parent-based invariants, conflicts/resolution/future policy | Live signed command/outbox services |

No NIP integration is called fully complete merely because its Stage 2 parsing/validation subset works. The protocol lab makes these distinctions visible.

## Stage 3 working read subsets

| NIP | Working subset | Remaining scope |
| --- | --- | --- |
| 01 | Shared bounded WSS sockets, finite REQ/CLOSE reads, active-subscription matching, fresh verification, EOSE/CLOSED/auth-needed facts, kind-0 fallback | Publication/OK facts and durable outbox in Stage 4; unbounded live streaming excluded |
| 11 | Bounded HTTPS Accept request and optional information/limits parsing | Runtime policy remains authoritative; advertised limits do not guarantee history or acceptance |
| 19 / 21 | npub/nprofile/note/nevent and nostr: input; checksums, TLV, bounded untrusted hints; public routes | naddr/QR and broader URI rendering remain extensions |
| 65 | Latest verified author list, write-relay reads within cap | List editing, publishing destinations and mention routing in later stages |
| 10 / 09 | Real thread/dependency reads and author-authorized explicit deletion reconstruction | Reply/own-deletion publication later |

Primary specifications were reviewed on 10 October 2026; see READ_PATH.md. Live pilot/hosted/browser checks are pending, despite passing deterministic transport/service tests. No full-NIP or full-prototype completion is implied.


## Stage 4 working write subsets

| NIP / app module | Working subset | Remaining evidence/scope |
| --- | --- | --- |
| 07 | Runtime extension/key discovery, exact event signing verification, timeout/disconnect/account-change guards | Actual extension + hosted CSP pilot; NIP-46 remote signing remains Stage 5 |
| 01 | Shared read/write transport, matching OK facts, per-destination replication, durable retry and ID read-back | Live relay pilot; acceptance is not permanent retention |
| 10 | Public author state notes are direct-root replies; causal prev_id is an app field | Social conversation publication remains Stage 6 |
| 65 / 42 | Verified author write-relay history routing; explicit configured publication destinations | Automated publishing/recipient routing and selected-relay AUTH remain Stage 5 |
| accountability/v1,v2 | Strict v1 preserved, expanded v2, signed roots/state/resolutions, cross-version rejection | Future schema changes need a new version |

NIP-07/NIP-01 official primary specs reviewed 10 October 2026. See WRITE_PATH.md. No full-NIP/full-prototype/real-pilot completion claim follows from mocked tests.
