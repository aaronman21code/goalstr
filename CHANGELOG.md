# Goalstr releases

## 0.3.0 — Stage 3 — 10 October 2026

Replaces the People placeholder with a lazy public read-only feed, verified finite WSS relay queries, profile hydration, public day/profile/nostr: links, NIP-11 information, NIP-65 author-write routing, missing-root/parent/deletion retrieval, overlap pagination and partial/disconnected/unsupported states. Adds scoped NIP-19/21 modules, resource deadlines/caps/cancellation, read diagnostics and lessons.

Includes 26 new read-path tests (75 total), CI browser scenarios, exact changed-file report, LF normalization and persistent build-progress/timeout rules. Node tests, type checks, boundary lint, vendor integrity and production build pass. Browser and real pilot/hosted checks remain pending. No new npm dependency, environment variable, signer or publishing capability is added.

No files removed from 0.2.0. Practice schema/database/backup remain version 1 with no migration.

## 0.2.0 — Stage 2 — 9 October 2026

Adds an opt-in, lazy-loaded protocol lab; exact v1 schema/codec and plaintext generation; real event hash/Schnorr verification; deterministic reconstruction, duplicate-root/branch selection, resolution previews, pending dependencies, future-time quarantine, conversation isolation, and authorized deletion handling. Includes 30 public fixtures, checksum-pinned licensed upstream cryptography, official BIP-340 vectors, 26 protocol tests, expanded browser scenarios, and exact update/contract documentation.

All 49 Node tests, domain/application type checks, boundary lint, vendor integrity, and the production build pass. Browser execution remains pending in this environment. No live relay traffic, signer, or publication capability is added.

No files removed from Goalstr 0.1.1. Storage schema and backup format remain version 1; no migration or automatic publication occurs.

## 0.1.1 — Stage 1 naming update — 9 October 2026

Adopts Goalstr throughout the header, welcome screen, profile, learning guide, printable guide, browser/social metadata, backup filename, package/lockfile, CI, README, and reference documents. Adds a G progress-ring mark and matching favicon. README now includes new-repository setup for `goalstr` and Vercel import settings. Future discovery examples use `goalstr` / `goalstr-v1`.

Practice rules, stored data schema, and the legacy database identifier are unchanged. Earlier practice backups remain importable. No new live Nostr capability is implied by the rename.

Renamed the two reference documents; their old paths are listed in `REMOVED_FILES.txt` for anyone updating 0.1.0. New repositories need no removals.

## 0.1.0 — Stage 1 — 9 October 2026

First portable source release. Implements the local Practice ritual and foundation: planning, progress, snapshots, revisions, bonus tasks, review/correction, History/rest, carry-forward drafts, persistence/fallback, local settings, backup/restore, optional learning panels, and printable guide.

Includes Vite/Vercel configuration, pinned dependency lockfile, independent domain type-check, import-boundary lint, 23 passing domain/storage tests, browser scenarios, and GitHub CI.

Live Nostr features remain planned. Browser scenarios are not yet verified in this environment; run CI/deployed checks before treating this stage's UI gate as passed. The SDK compatibility spike, real signer/relay tests, full accessibility check, and later-stage acceptance remain outstanding.

No files removed: this is the initial baseline.
