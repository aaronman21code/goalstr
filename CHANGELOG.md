# Goalstr releases

## 0.1.1 — Stage 1 naming update — 9 October 2026

Adopts Goalstr throughout the header, welcome screen, profile, learning guide, printable guide, browser/social metadata, backup filename, package/lockfile, CI, README, and reference documents. Adds a G progress-ring mark and matching favicon. README now includes new-repository setup for `goalstr` and Vercel import settings. Future discovery examples use `goalstr` / `goalstr-v1`.

Practice rules, stored data schema, and the legacy database identifier are unchanged. Earlier practice backups remain importable. No new live Nostr capability is implied by the rename.

Renamed the two reference documents; their old paths are listed in `REMOVED_FILES.txt` for anyone updating 0.1.0. New repositories need no removals.

## 0.1.0 — Stage 1 — 9 October 2026

First portable source release. Implements the local Practice ritual and foundation: planning, progress, snapshots, revisions, bonus tasks, review/correction, History/rest, carry-forward drafts, persistence/fallback, local settings, backup/restore, optional learning panels, and printable guide.

Includes Vite/Vercel configuration, pinned dependency lockfile, independent domain type-check, import-boundary lint, 23 passing domain/storage tests, browser scenarios, and GitHub CI.

Live Nostr features remain planned. Browser scenarios are not yet verified in this environment; run CI/deployed checks before treating this stage's UI gate as passed. The SDK compatibility spike, real signer/relay tests, full accessibility check, and later-stage acceptance remain outstanding.

No files removed: this is the initial baseline.
