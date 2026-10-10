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
