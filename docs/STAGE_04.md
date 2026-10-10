# Stage 4 — Browser signing and category rings

Version 0.4.0, based on the shipped Stage 3 / 0.3.0 source. Remote repository contents were not compared in this run. The user owns upload, PR review, and deployment.

## Delivered

NIP-07 connection/key discovery and signing; public acknowledgment and exact note/metadata preview; verified signed events; isolated account drafts; durable intent → signature → per-relay facts; EVENT/OK publication, immutable-event retry, and event-ID recovery. Public plan, rest, check-in, revision, close, correction, and conflict resolution use the real write path. No app-owned identity key, private-key import, automatic Practice publication, or AUTH signing is introduced.

The UI follows the supplied Fitness references through a black canvas, bright concentric arcs, compact week rings, rounded cards, clear counts, and tap selectors. Up to three active categories, five original goals each; General is a category too. Choices remain General, Work, Learning, Health, and Personal. Empty categories have no ring. Category colors identify the three displayed ring positions, with adjacent text labels. Overall percentage counts individual originals; bonus work, slots, and closure remain separate.

The app retains its own Goalstr identity and does not use Apple assets. Normal task/category/status/slot/feed-window choices use tap buttons. The protocol lab retains dropdowns for its longer diagnostic scenario/version lists. Controls have pressed state, keyboard focus, and reduced-motion behavior; observed visual/accessibility acceptance is still pending.

## Migration and format

Practice schema 1 → 2 is explicit and lossless. Existing DB/store/key names remain. Reads migrate in memory; the next edit saves schema 2. Imports accept valid schema 1/2; exports use schema 2. Older releases cannot read new schema 2, so export before updating.

New public roots use accountability version 2 and `goalstr-v2`. Version 1's three-goal contract is unchanged. Shared decoding supports both; updates to an old v1 day use v1. State cannot cross format versions. Original categories are pinned in the root and cannot be revised or hidden to improve a ring. Longer plans still obey the full signed 16-KiB byte limit; shorten text if a preview exceeds it.

## Verified locally

107 unit tests pass: 23 existing Practice, 26 existing protocol, 26 existing relay read, and 32 Stage 4 tests. Stage 4 includes migration and 5/3 limits; weighted category math; v1/v2 compatibility; absent/denied/timed-out/mutating/account-changing signers; failed intent/signature/fact persistence; duplicate approval and cross-tab atomic staging; stale draft/head protection; one accepted/two failed destinations; unknown-delivery exact retry; refresh/event-ID recovery; account isolation; full public revision/review/correction; v2 conflict resolution; matching/wrong/missing OK; AUTH-needed; cancellation; shared read/write socket.

App/pure-domain type checks, boundary lint, vendor checksums, browser test-source syntax, and Vite production build pass. **Browser execution is unavailable here: Chromium is missing.** No passing screenshot, real extension, real pilot relay, hosted CSP, screen-reader, Safari/Firefox, or mobile-device test is claimed. CI includes mocked browser scenarios. M4's real-extension whole-day exit remains a preview/pilot gate, and this does not claim completion of the full prototype.

## Preview checks before merging

1. Use the browser update ZIP and stage-04 → main PR workflow in `UPDATING.md`. Wait for Actions and open the Vercel preview.
2. In Practice, create Work, Learning, and Health goals. Add five in one category: a sixth is disabled. A fourth category is disabled. Finish some originals and a bonus; compare each category and overall counts. A revised Done needs explicit original credit. Rest has no percentage.
3. On mobile-width and desktop, check ring/label legibility, no horizontal overflow, week/history navigation, tap controls, keyboard focus, dialog dismissal, reduced motion, and text zoom.
4. Open Live with an actual NIP-07 extension on an HTTPS preview. Connect and verify the returned public key. Deny the first signing prompt: no publication, saved draft remains. Then preview and approve a small non-sensitive plan, noting public visibility and destinations.
5. Verify at least one matching OK and per-relay replication detail. Complete a check-in, revision, review, and correction with separate external approvals. Open the public thread in another browser/client and reload the direct URL.
6. Disconnect/reconnect and reload: signer session requires reconnect, saved outbox/drafts remain. Verify Practice is untouched. If an event has no acceptance, use Look up event ID or Retry exact signed event; it must not create another signature/root.
7. For a safe pilot, test a selected failed relay and observe limited distribution; do not confuse timeout with rejection. Authentication-required relays remain unsupported until Stage 5. If an unsigned intent survived interruption, close its old signer prompt before explicitly releasing it.
8. Before production migration, export Practice from the existing production origin. Preview data and production data are separate.

## Operational bounds

Four configured write destinations; six-second relay deadlines; 45-second signer deadline; 25-second account-refresh deadline; verified read budgets and eight read sockets; 30-day initial discovery; up to 128 relevant roots/deletion IDs per refresh, three missing-dependency passes, and 1,000 account events/outbox records. Caps or unfinished observations block new/updated public work while preserving drafts. Exact signed-event retry remains possible. Successful bounded reads establish observations on checked relays, never global absence/currentness.

Write destinations are explicitly configured and frozen in each operation preview. NIP-65 author write relays supplement history reads; automatic publication routing, selected-relay authentication, and mobile remote signing remain Stage 5. A recovery observation is recorded separately from a matching acceptance response. Accepted events may later become unavailable.
