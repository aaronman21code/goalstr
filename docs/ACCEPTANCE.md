# Goalstr · Stage 1 verification ledger

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
