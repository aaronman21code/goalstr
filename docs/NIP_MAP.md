# Goalstr protocol coverage

Stage 2 implements local verification/codec subsets for NIP-01, NIP-10, and NIP-09 plus the Goalstr v1 application schema. Network transport, signers, profiles, and social integrations remain later-stage work. The table shows milestone ownership; the working subsets are listed below.

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
