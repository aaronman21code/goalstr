# Goalstr implementation decisions

## D001 — Portable staged delivery

Each stage is a complete ZIP with project files at the archive root, a lockfile, release manifest, changelog, removed-path list, and update instructions. User copies to the same GitHub repo and deploys through the same Vercel Git integration. No app-owned deployment account is provisioned here.

## D002 — Stage 1 scope

Complete M1's local ritual and the runnable frontend/storage portion of M0. The Nostr SDK/crypto/export spike and tested live integrations remain required before implementing protocol adapters. Do not mark the entire P0 or the full M0 compatibility gate complete.

## D003 — Installed tooling

Pinned and installed from available verified package artifacts: React 19.2.8, Vite 8.2.1, TypeScript 6.0.3, React plugin 6.0.5, Zod 3.25.76, Lucide React 1.31.0, and matching types. Node 24.19.0 was used for verification; `.nvmrc`/CI select Node 24.x. Engine floor is 22.13.0.

Direct package downloads were unavailable in the build environment. Stage 1 uses a native history adapter, native IndexedDB transactions, and Node's native TypeScript test runner instead of adding unverified React Router/idb/Vitest dependencies. The substitutions are internal. The build plan's preferred wrappers/test tooling can be introduced at a later stage without changing domain behavior.

The upstream nostr-tools README currently documents `@nostr/tools`/JSR, SimplePool, verification, BunkerSigner, and NIP helpers. None is installed in Stage 1. Verify the released package route, exports, bundling, and reviewed NIP revisions in Stage 2; record exact versions before using it. No identity keys are generated or imported here.

## D004 — Practice persistence

Database `daily-accountability-practice` (legacy identifier deliberately retained for Goalstr data compatibility), version 1; store `documents`, key `practice-v1`; document schema 1. Entire-document writes are queued and transactional. On failure, retain memory state and display Temporary session. Future live identity/event/outbox stores must use a separate namespace.

## D005 — Teaching is optional

Collapsible explanations use hypothetical live behavior and explicitly identify the present local mode. The printable guide teaches actual domain rules and planned NIPs separately. No learning checkpoint blocks the ritual.

## D006 — Verification evidence

Build, type-check, lint, and 23 domain/storage tests passed locally. Actual browser binaries were unavailable and downloading them was blocked; the remote cloud browser could not connect to the local preview. The Playwright test source and CI are included, with browser verification explicitly pending. No screenshots or accessibility results are claimed without observation.

## D007 — Security and hosting

Stage 1 has no external media, analytics, signers, secrets, or relay requests. All task/profile text uses safe React rendering. Vercel configuration includes SPA rewrite, same-origin CSP, no-referrer policy, and disabled geolocation/camera/microphone permissions. Later media/signing capabilities require scoped policy updates and tests.

## D008 — Goalstr naming

Goalstr is the product name; `goalstr` is the package/repository name. Version 0.1.1 is a Stage 1 branding update, not a new protocol milestone. A G shaped progress ring anchors the existing dark/mint design. Product metadata, UI, backup filenames, docs, and future discovery tags use the new name. Preserve the generic domain/payload vocabulary and existing local database identifier; no data migration is required.

## D009 — Stage 2 verification dependency

Package tarball/registry access remained blocked. Stage 2 uses a complete retrieved upstream noble-secp256k1 source snapshot, generated JS/declarations, MIT attribution, checksum pinning, and all 19 official BIP-340 vectors. No cryptographic implementation is written by Goalstr. This is not a claimed release/commit/package install. `vendor/README.md` and `PROVENANCE.json` record exact scope and retrieval. Official nostr-tools repository metadata was reviewed (`nostr-tools` 2.25.2); relay/pool, NIP-44, and NIP-46 package/runtime compatibility remain future integration checks.

## D010 — Stage 2 local inspector

A lazy-loaded optional route verifies public fixture/imported events and reconstructs them locally. Unsigned Practice/resolution previews are explicitly labeled and never signed or published. No identity keys are handled and no Practice store mutation occurs. Unknown formats remain readable; malformed state cannot mutate progress. Source contracts and validation are frozen before live reads/writes.

## D011 — Baseline and remaining UI evidence

The supplied GitHub/deployed URLs could not be retrieved from this environment, so the update starts from the previously generated Goalstr 0.1.1 source. The user retains deployment ownership. Node/contract/security-boundary checks pass; the actual browser/hosted UI gate remains pending until the included CI browser scenarios or deployed checks run.

## D012 — Stage 3 finite native read port

Blocked registry/pilot probes were limited to five seconds each and not retried indefinitely. Use a native WebSocket finite-query adapter behind RelayReaderPort; do not claim an installed nostr SDK. Keep one socket per relay, eight destinations, six-second queries, one jittered disconnect retry, thirty-second operations, verified event/frame budgets, and route teardown. EOSE closes the read subscription; manual Refresh starts a new observation. No publishing or authentication capability is added.

## D013 — Public identifiers, media and routing

Public IDs use tested NIP-19 Bech32/TLV encoding/error checks and NIP-21 routes, not new cryptographic primitives. Reject private-key/connection identifiers; validate and cap untrusted relay hints/lists. Download author events from advertised write relays. Profiles use escaped bounded names/bios and local initial avatars; no external tracking images. NIP-11 failure is independent of WSS availability. Read caches/config are session-only.

## D014 — Reviewable updates and bounded work

User confirmed Stage 2 deployed; Stage 3 starts from the shipped 0.2.0 source, with remote comparison unavailable. A hash-based changed-file report and LF normalization make ZIP updates reviewable. Use one stage branch/PR and release tag per checkpoint. AGENTS.md persists the active-work progress and bounded-probe rules after the earlier stalled remote-browser check. Browser and real pilot checks remain explicit pending gates, not passing claims.


## D015 — Stage 4 category limits and explicit migration

The owner's Stage 4 request supersedes the original three-total-goal limit: up to three active categories per day and five immutable originals in each, including General as a category. Up to fifteen originals. Category rings count original fulfillment only; the overall number weights goals. The new app format is v2, preserving strict v1 reads and v1 updates. Shared codec/schema code has version-scoped exports; cross-version state is rejected.

Practice document schema becomes 2 through a lossless reader migration from 1; its DB/store/key are unchanged. Older code cannot read new schema 2. Export a pre-upgrade backup before production review; rollback code is not a data rollback.

## D016 — Native browser signer and account outbox

NIP-07's runtime extension surface needs no identity-key implementation. Its small native adapter is behind SignerPort and uses the existing maintained verifier. The account store uses native IndexedDB transactions behind LiveStorePort; the bounded native pool shares WSS sockets for reads and publication. No new dependency or cryptographic primitive is introduced. Native adapter substitutions remain visible rather than claiming an installed Nostr SDK. Primary NIP-07/NIP-01 URLs and review date are recorded in WRITE_PATH.md; immutable specification commit pins and real-extension compatibility remain pilot evidence gaps.

Operation order is durable intent → external approval → exact verification → durable signed event → send → durable per-destination facts. Signing and sending alone are not Published. Verified later sightings are labeled separately. Account-scoped drafts, signed logs and exact retries survive session teardown; no Practice goals are copied. Competing-tab intent checks are atomic. Causal heads are saved with editor drafts to prevent silent overwrites of observed remote progress.

## D017 — Review release and browser delivery

Stage 4 starts from the last shipped Stage 3 / 0.3.0 source; no remote diff is claimed. It includes a complete ZIP and a changed-files-only ZIP for browser upload, one stage-04 branch and a PR into updated main. All 107 deterministic tests pass. Browser launch is blocked by the absent executable, so visual/extension/CSP/device acceptance remains a deployed-preview gate. UI tokens and SVG rings derive from the supplied Fitness references while retaining Goalstr branding. No Apple image assets are shipped.
