# Goalstr verification ledger

Stage 3 adds read-path evidence below; Stage 1 coverage remains the baseline.

Verified in Node 24.19.0: clean dependency install from pinned cached artifacts, independent domain/application type-check, boundary lint, production build, and 23 passing domain/storage tests.

| PRD scenario | Stage 1 evidence | Status |
| --- | --- | --- |
| A01–A05 | Original completion, distinct slots, cancellation denominator, bonus exclusion, revised fulfillment | Domain tests passed; UI pending |
| A12 | Zero-completion closure and no auto-close at 100% | Domain tests passed; UI pending |
| A13 | Pinned date/timezone, next midnight, Late review, DST gap/ambiguity | Domain tests passed; UI midnight check pending |
| A18 | Isolated Practice namespace; no signer/relay/automatic publication code | Local boundary implemented; live switch scenario later |
| A20 | Semantic labels, native modal, focus styles, 44px controls, reduced motion, text progress | Implemented; browser/screen-reader/manual check pending |
| A22 | Correction reason, original review/close preserved, ring recalculation | Domain tests passed; UI pending |
| A23 | Rest without percentage; distinct empty calendar dates | Domain rest test passed; calendar UI pending |
| A24 | Storage denial/quota, retained memory state, queued saves, recovered latest draft | Service tests passed; browser denied-storage scenario pending |
| Draft/backup recovery | Structured saved data with snapshot replay validates a complete round trip | Domain/storage tests passed; real IndexedDB reload/export/import pending |

Browser checks are supplied in `tests/browser.mjs`, and GitHub CI installs the browser tooling and runs them. They could not be executed in the build environment because browser download was blocked and the cloud browser could not reach the local preview. No passing browser, visual, full accessibility, Safari/Firefox, hosted CSP, or mobile device result is claimed yet.

## First hosted review

1. On a 360px mobile viewport, complete a practice plan/update/review/correction/carry-forward.
2. Refresh a partially typed plan and an unsent update; verify both recover.
3. Create a rest day in a separate browser profile/session; inspect History and counts.
4. Open direct `/today`, `/history`, `/profile`, `/settings`, `/learn` URLs and refresh.
5. Try keyboard-only navigation, modal Escape/close, focus return, reduced motion, text zoom, and screen-reader labels.
6. Print `/learn`; check code/table wrapping and light backgrounds.
7. Export/restore a backup and test temporary storage behavior without clearing the user's main browser store.

Resolve those checks before calling M1's UI exit gate complete. Later milestones retain all remaining PRD scenarios and the real Nostr acceptance gates from the full build plan.

## Stage 2 verified evidence

49 tests pass: existing 23 Practice domain/storage scenarios plus 26 protocol scenarios. The latter include all 19 official BIP-340 vectors; hash/signature tampering; all seven codec types; shuffled/duplicate arrivals; A06 author isolation; A07/A08 deterministic replay; A15 branching/resolution/new conflicts; missing roots/parents; future-clock re-evaluation; A17 deletion authorization/incomplete ancestry; A21 duplicate roots; closure/bonus invariants; malformed/unsupported payloads; UTF-8/code-point limits; unsigned Practice previews; and bounded public imports/redaction. Type checks include the new pure event domain. Boundary lint, vendored checksum verification, and Vite production build pass.

`tests/browser.mjs` adds inspector mobile flows and screenshots. Those checks remain unexecuted here; full browser/screen-reader/Safari/Firefox/hosted checks are not claimed. Read `docs/STAGE_02.md` for the deployed review sequence. M2 contract behavior is implemented and verified in Node; hosted UI acceptance remains pending. The full P0 prototype still needs later live read/signing/social/reliability milestones.

## Stage 3 verified read evidence

75 tests pass: 23 domain/storage, 26 protocol, 26 identifier/relay/read-service scenarios. Type checks, import boundaries, vendor checksums and production build pass. Deterministic signed fixtures cover shared sockets, duplicate/reordered arrivals, requested-filter rejection, EOSE verification drain, one bounded retry, timeout, cancellation/teardown, eight-relay/event/frame caps, metadata failure, profile fallback, author-write routing, missing roots/parents, deletion and branch warnings, unsupported readable fallback, same-second overlap/stall, deep links and no secret-key flow. Tests assert session-only reads and preserve the unchanged Practice store/schema/service baseline.

CI browser scenarios now test signed mocked public feed and links, reload, partial ancestry, metadata failure, public/Practice separation and safe identifier errors. Source syntax is checked here; execution/visual/accessibility results remain pending because the browser executable is absent. Five-second direct pilot probes failed with 403/timeouts. Real public pilot ingestion, hosted CSP/WSS, Safari/Firefox/mobile and human accessibility review remain release-review gates. M3 implementation is delivered; its full live/browser exit evidence is not claimed complete. Signing/outbox/auth/social gates remain later milestones.
