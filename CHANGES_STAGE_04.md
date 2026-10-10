# Goalstr Stage 4 — exact source changes

Version **0.4.0**, compared byte-for-byte with the shipped **0.3.0 Stage 3 ZIP**. Remote GitHub content was not compared. Preserve any custom edits you made outside this conversation.

- Added: 19 files
- Modified: 43 files
- Removed: 0 files
- Unchanged: 54 files
- Browser update ZIP: 62 added/modified files, preserving paths; no unchanged files

The complete ZIP contains all 116 source/config/docs files. The browser update ZIP applies only to a complete merged Stage 3 baseline. Changes keep the same dependency versions and deployment configuration. Practice schema 1 migrates to 2; back up before production update. Older code cannot read new schema 2.

## Added

- `CHANGES_STAGE_04.md`
- `docs/STAGE_04.md`
- `docs/WRITE_PATH.md`
- `docs/contracts/GOALSTR_V2.md`
- `docs/contracts/goalstr-v2.schema.json`
- `src/app/live-context.tsx`
- `src/app/live-service.ts`
- `src/domain/accountability/categories.ts`
- `src/features/live/LiveView.tsx`
- `src/infrastructure/storage/live-document.ts`
- `src/live/service.ts`
- `src/live/types.ts`
- `src/protocol/accountability/codec.ts`
- `src/protocol/accountability/schema.ts`
- `src/protocol/accountability/v2/codec.ts`
- `src/protocol/accountability/v2/schema.ts`
- `src/protocol/nips/07/browser-signer.ts`
- `src/ui/fitness.css`
- `tests/live.test.ts`

## Modified

- `CHANGELOG.md`
- `README.md`
- `REMOVED_FILES.txt`
- `UPDATING.md`
- `docs/ACCEPTANCE.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `docs/LEARN.md`
- `docs/NIP_MAP.md`
- `docs/reference/Goalstr_Prototype_Build_Plan.md`
- `docs/reference/Goalstr_Prototype_PRD.md`
- `index.html`
- `package-lock.json`
- `package.json`
- `public/favicon.svg`
- `release.json`
- `scripts/generate-fixtures.ts`
- `scripts/release-manifest.mjs`
- `src/app/App.tsx`
- `src/domain/accountability/rules.ts`
- `src/domain/events/reconstruct.ts`
- `src/domain/ports/index.ts`
- `src/features/history/HistoryView.tsx`
- `src/features/public/PublicView.module.css`
- `src/features/public/PublicView.tsx`
- `src/features/today/DayView.tsx`
- `src/features/today/PlanComposer.tsx`
- `src/features/today/UpdateComposer.tsx`
- `src/infrastructure/relays/pool.ts`
- `src/infrastructure/storage/document-schema.ts`
- `src/learning/LearnView.tsx`
- `src/learning/fixtures/corpus.json`
- `src/learning/protocol-service.ts`
- `src/main.tsx`
- `src/practice/document.ts`
- `src/practice/service.ts`
- `src/protocol/accountability/v1/codec.ts`
- `src/protocol/accountability/v1/schema.ts`
- `src/public/service.ts`
- `src/public/types.ts`
- `src/ui/components.tsx`
- `tests/browser.mjs`
- `tests/relay.test.ts`

## Removed

None.

