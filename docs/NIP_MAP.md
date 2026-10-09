# Protocol coverage

Stage 1 implements **no live NIP adapter**. It implements application rules and local Practice storage. All protocol features below are planned and remain separate from the app-defined day schema.

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
| 09 | Own deletion requests and author validation | 7 |
| 57 / 47 | Zaps and independent wallet adapter | P1 |
| 78 | Encrypted preference sync candidate | P1 |
| 22 / 51 / 56 / 58 | Other-kind comments, synced moderation, badges | Extensions |

Official specifications: [nostr-protocol/nips](https://github.com/nostr-protocol/nips). Reviewed revisions must be recorded before adapters are written. Advertised relay NIP support does not establish signer capabilities or guarantee acceptance/history.

The planned custom tag `['accountability','1',type,payloadJson]` is an app convention, not a NIP or assumed multi-letter relay index. Live kind 1 content must remain readable in ordinary clients. Signatures establish key approval and content integrity, not proven task completion.
