# Stage 3 — read real Nostr

Version 0.3.0. Complete source update over Goalstr Stage 2 version 0.2.0. This delivery implements M3's read path; signing and publication are Stage 4.

## What works

- People is now a public, read-only feed of verified Goalstr days from configured relays.
- Public profile and day routes open without signing in. Paste npub, nprofile, note, nevent, nostr: URIs, or an explicitly typed hex key/ID.
- Recent-update discovery can fetch an older missing root; state-note links resolve their root. Visible cards get batched profiles, author-write relay routing, thread queries, up to three missing-dependency passes, and deletion queries covering loaded roots/updates.
- Only valid connected author history changes progress. Missing/deleted ancestors, alternate same-date roots, competing updates, unsupported formats, future events, and failed relay queries remain explicit.
- NIP-11 relay information and NIP-65 write-relay routing are separate adapters. Missing/CORS-blocked information does not disable WSS transport.
- The optional inspector shows actual signed event IDs, fields, and relay sightings. Names/bios are escaped self-described text; avatars use local initials, so reading profiles makes no remote-media requests.
- Change tracking: `CHANGES_STAGE_03.md` lists exact added/modified/deleted files against the shipped 0.2.0 ZIP. `.gitattributes` standardizes text line endings. `AGENTS.md` records scoped delivery, progress updates, bounded probes, and honest verification requirements.

Practice data, drafts, database namespace, backups, and schema remain unchanged. Public data is a session-only read cache. No account, identity private key, signing, publication, authentication, follow editing, or reactions are added.

## Upload using GitHub Desktop

1. Switch to `main`, Fetch origin, and Pull origin if offered. Start from a clean working tree; preserve any independent edits before replacing matching files.
2. Create branch `stage-03` from `main`.
3. Extract `Goalstr_Stage_03_GitHub.zip` outside the repo. Copy its contents into your existing local repo root, replacing matching files. Include configuration dotfiles, the new `AGENTS.md`, and `vendor/`. Preserve `.git/` and local `.env` files.
4. Read `CHANGES_STAGE_03.md` and review the actual Changes tab. There are no removals from 0.2.0; don't delete the existing repo.
5. In Summary enter `Goalstr Stage 3: public relay reads and day links`. Click Commit to stage-03, then Publish branch (or Push origin).
6. Preview Pull Request → base `main` → Create Pull Request. Review Files changed, wait for GitHub Actions, and test the Vercel preview before merging.
7. Merge into the configured production branch. Wait for the Vercel Production deployment to be Ready. Optional release tag: `v0.3.0`.

No new environment variables, server, account, paid service, or manual Vercel settings are required. The included `vercel.json` keeps the SPA rewrite and permits WSS relay/HTTPS information connections while retaining same-origin scripts and local images.

## Bounded reads

| Resource | Bound |
| --- | --- |
| Active relay sockets | 8; one socket per endpoint |
| Default bootstrap | `wss://relay.damus.io`, `wss://nos.lol` |
| Discovery window | 1, 7 or 30 days; default 7 |
| Page | 20 initial events per relay; updates may occupy those slots |
| Pagination | Inclusive overlap, event-ID deduplication, 5 pages / 100 cards |
| Per-query deadline | 6 seconds total, including at most one disconnect retry with jitter |
| Operation deadline | 30 seconds per refresh/page |
| Verified events | 128 per relay query; 800 per page-session cache |
| Frames/events | 96 KiB frame; 16 KiB signed event; bounded verification queue |
| Missing dependency retrieval | At most 3 passes, 64 IDs per pass |
| Relay information | 3.5 seconds; streamed 64 KiB document cap |

Querying older events overlaps the previous timestamp. If a crowded second prevents advancing, pagination stops with a warning instead of silently skipping history. Results always describe the queried relays, not global completeness. Refresh performs a new finite read; this stage does not keep an unbounded live-stream subscription after EOSE.

Relay hints and lists are untrusted. Only normalized public WSS URLs without credentials/query/fragment and within the destination cap are used. Local/private literal addresses are rejected. Network requests omit cookies and referrers. Browser DNS resolution and relay operator behavior remain external dependencies.

## Verification and deployed check

75 Node tests pass: 23 original domain/storage, 26 protocol, and 26 read-path tests. They cover official NIP-19 examples; filter validation; signatures and requested-filter matching; duplicate/reordered arrivals; shared sockets; EOSE draining; disconnect/retry; timeouts; cancellation; caps; NIP-11 failure/size; NIP-65 routing; profile fallback; missing root/parent; deleted ancestry; competing versions; public links; secret rejection; same-second pagination; and teardown. Official BIP-340 vectors, type checks, boundary lint, vendor checksums, and the production build pass.

Browser scenarios now include mocked signed relay reads, duplicate feed arrivals, public day/profile direct links and reload, missing ancestry, failed information requests, no-login browsing, and Practice isolation. They are supplied in CI but remain unexecuted in this environment because the browser executable is absent. No browser/mobile/accessibility success is claimed.

Direct GitHub/package/pilot probes stopped within five seconds each (403/timeouts). The baseline is our shipped 0.2.0 ZIP, which the user confirmed deployed. No remote source comparison or successful real pilot read is claimed. The defaults are bootstrap candidates, not certified pilot endpoints. Real relay/hosted WSS/CSP checks remain a release-review gate.

On the Vercel preview:

1. Open People without starting Practice. Confirm Public / read-only and an honest empty/partial/disconnected state.
2. Open Relays and query window; refresh and inspect each relay's EOSE/failure observations. Metadata failure must not falsely claim a disconnected WSS transport.
3. If you have a published Goalstr-v1 root, paste its note/nevent or hex event ID; check its originals, ring, update history and relay sightings. A public Nostr profile need not have any Goalstr days.
4. Open a real npub/nprofile and reload the URL. Names may fall back to the public key; empty results are expected while no compatible events are published.
5. Check a saved Practice day on the production origin after deployment. Preview origins have separate local storage.
6. Check mobile width, keyboard navigation and error states. Merge after CI and these checks pass; unresolved real-network/UI checks are not a claim that the whole prototype is complete.

## Next stage

Stage 4 adds NIP-07 browser signing, explicit public plan/update/review approval, durable signed outbox persistence, and relay acceptance/retry facts. Reading public data remains available without a signer. Stage 5 brings mobile remote signing and selected-relay authentication.
