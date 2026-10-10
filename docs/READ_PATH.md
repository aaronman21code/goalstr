# Goalstr public read architecture

`src/app/public-service.ts` composes `PublicService`, the native finite-query `RelayPool`, and `RelayInformation`. The lazy Public view calls the application service and subscribes to immutable snapshots; it never opens sockets or calls fetch.

| Module | Contract |
| --- | --- |
| `public/types.ts` | Plain-data query, observation, profile, card and read ports |
| `infrastructure/relays/pool.ts` | NIP-01 WSS envelope transport; bounded shared sockets; fresh signature and requested-filter validation |
| `protocol/nips/01/profiles.ts` | Latest replaceable kind-0 selection; deterministic tie; bounded plaintext fallback |
| `protocol/nips/11/information.ts` | Parse optional relay advertisements |
| `infrastructure/relays/information.ts` | Bounded credential-free HTTPS information fetch; missing metadata is independent of transport |
| `protocol/nips/19/identifiers.ts` | Bech32/TLV public-ID encoding and validation; no private-key support |
| `protocol/nips/21/links.ts` | Validated public routes and nostr: URI input |
| `protocol/nips/65/relay-list.ts` | Read the latest verified kind-10002 list; use author write relays |
| `public/service.ts` | Discovery, batching, routing, session cache, cursor overlap, dependency/deletion retrieval, status and projection |
| `domain/events/reconstruct.ts` | Existing pure deterministic author/ancestry/domain validation |

## Verification pipeline

The pool accepts only bounded text frames for active subscription IDs. It parses a fresh event, verifies its canonical hash and Schnorr signature, then checks that it matches a requested filter. Duplicates merge relay sightings by event ID. Pending verification drains before a matching EOSE resolves; cancellation/deadlines stop ingestion and close the subscription. A relay EOSE is an observation, not proof of global completeness.

The service invokes the existing Goalstr codec before graph reconstruction. A signed malformed payload is rejected; an unsupported version may show its readable text but cannot change progress. Profile metadata is self-described and has no NIP-05 or real-world verification badge. Future replacement metadata is ignored until eligible.

Visible known roots receive batched thread/profile reads before extra history. Recent updates can supply root IDs for targeted retrieval outside the discovery window. An update-ID link resolves the real root rather than treating the snapshot as an independent day. Deleted roots suppress the reconstructed day; deleted ancestors retain only the last connected valid state and an incomplete-record warning.

There is no durable public cache in this stage. Leaving the route aborts service work and closes the pool. React StrictMode's setup/cleanup creates a fresh service per effect setup. Practice namespace/schema are untouched.

## Protocol review

Reviewed the following primary specifications on 10 October 2026. These are retrieved branch URLs, not a claimed Git commit pin; exact signer SDK/release/revision compatibility remains a gate for the write stages.

- [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md): filters, requested subscription IDs, replaceable events, EOSE/CLOSED.
- [NIP-11](https://github.com/nostr-protocol/nips/blob/master/11.md): Accept header, optional fields, CORS and advertised limits.
- [NIP-19](https://github.com/nostr-protocol/nips/blob/master/19.md): public prefixes, Bech32 (not Bech32m), TLV, ignored unknown TLV and official vectors.
- [NIP-21](https://github.com/nostr-protocol/nips/blob/master/21.md): nostr: links.
- [NIP-65](https://github.com/nostr-protocol/nips/blob/master/65.md): download an author's events from advertised write relays.

Registry retrieval remains blocked, so Stage 3 uses the browser's native WebSocket API behind the read port instead of claiming an installed SDK. No cryptographic algorithm is added; the existing maintained verifier remains unchanged. Bech32 is an identifier encoding/checksum with official NIP-19 examples in tests. A later SDK replacement can implement the same read port without changing product/domain/view code.
