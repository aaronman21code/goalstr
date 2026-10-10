# Goalstr — Stage 4

**Small goals. Honest progress.**

Goalstr is a React + TypeScript prototype for daily accountability on Nostr. Stage 4 adds external browser signing and reliable publication, alongside a Fitness-inspired interface with category rings. Practice, Live, and People have distinct, visible scopes.

## New in this release

- Up to **three categories per day**, with **five original goals per category** (15 total).
- Pink, lime, and cyan concentric rings; category labels and counts explain each ring. The overall percentage weights individual originals, rather than averaging category percentages.
- Dark surfaces, a ring-based week strip, larger controls, and tap selectors for categories, task/bonus status, check-in slots, identifier type, and discovery windows.
- `/live`: NIP-07 browser signer connection, actual public-key discovery, exact public preview, first-publication visibility acknowledgment, plan/rest/check-in/revision/review/correction/resolution.
- Account-scoped drafts and a durable signed outbox. Matching relay OK facts are distinct from signatures, timeouts, and later verified read-back. Retries reuse the signed event.
- Guardrails for missing history, duplicate roots, competing versions, stale editor drafts, storage failures, and account/session changes.

Existing Practice data is preserved through an explicit schema 1 → 2 migration. New public roots use Goalstr v2; v1 reads and updates to v1 days remain supported. Practice goals are never copied or published automatically.

[Stage 4 notes and preview checks](docs/STAGE_04.md) · [browser upload instructions](UPDATING.md) · [exact changed files](CHANGES_STAGE_04.md) · [write architecture](docs/WRITE_PATH.md) · [v2 contract](docs/contracts/GOALSTR_V2.md).

Owner-supplied deployment: [goalstr.vercel.app](https://goalstr.vercel.app/) · repository: [aaronman21code/goalstr](https://github.com/aaronman21code/goalstr).

## Upload this stage using the GitHub website

Use `Goalstr_Stage_04_Browser_Update.zip` on top of the merged Stage 3 branch. It contains only added/modified files, with their original paths. Use the complete `Goalstr_Stage_04_GitHub.zip` for a fresh source snapshot or backup. Do not upload a ZIP itself.

1. Open the repository, select **main**, and create **stage-04** from main.
2. Extract the browser update ZIP. On stage-04 choose **Add file → Upload files**. Drag the extracted contents, including folders, into the repository root. Do not drag their enclosing folder.
3. Commit directly to stage-04: `Goalstr Stage 4: browser signing and category rings`.
4. Create a pull request with **base: main**, **compare: stage-04**. Review Files changed, Actions, and the Vercel preview.
5. Complete the checks in `docs/STAGE_04.md`, then merge the PR. The existing Vercel integration deploys main automatically.

No removals are required. Existing unchanged files stay in the repository. GitHub shows actual line/content differences, not every file as changed simply because an archive was downloaded. Compare custom edits before replacing their files. A full source upload exceeds GitHub's 100-file browser batch limit: upload folders in separate batches to the same stage branch if using the full ZIP.

## Local development and checks

Use Node **24.x**. Dependencies are pinned; no new production dependency was added in Stage 4.

```sh
npm ci
npm run dev
```

Verification:

```sh
npm run lint
npm run vendor:verify
npm test
npm run build
```

`build` runs both app and pure-domain type checks. To run the browser scenarios:

```sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
npm run test:e2e
```

GitHub Actions installs Chromium and runs the browser scenarios automatically. They cover Practice recovery, the protocol lab, public reads, and a mocked NIP-07 plan/check-in/review with denial and reload. Mock signer tests are not evidence of compatibility with a real extension.

## Vercel settings

Keep the existing project and Git integration. Framework **Vite**; root **repository root**; build **npm run build**; output **dist**; install **npm ci**; Node **24.x**. No environment variables are required. `vercel.json` supplies SPA rewrites and the existing secure-relay CSP. Check `/live`, `/people`, and direct day URLs in the preview. Browser extension behavior under hosted CSP remains a manual check.

## Architecture and persistence

Views invoke services. Pure accountability rules and graph reconstruction are separate from scoped NIP modules, browser signing, relay transport, and IndexedDB. See [architecture](docs/ARCHITECTURE.md), [NIP map](docs/NIP_MAP.md), and [decisions](docs/DECISIONS.md).

Practice keeps database `daily-accountability-practice`, store `documents`, key `practice-v1`; the document migrates to schema 2 on load and is saved on the next edit. Live uses a separate `goalstr-live` database, account-scoped documents, transactional intent/signature/fact writes, and no identity secrets. Preview origins have separate data. Export a Practice backup before updating: older builds cannot read schema 2 backups/data.

The existing maintained noble Schnorr source is checksummed and tested against all 19 official BIP-340 vectors. Web Crypto supplies hashing. Native WebSocket, IndexedDB, history, and Node test adapters are isolated behind ports; no new cryptographic primitives are written. The earlier SDK/tooling substitutions remain documented in DECISIONS.md.

## Verification and remaining stages

**107 unit tests, type checks, boundary lint, vendor integrity, and the production build pass locally.** Browser test source passes syntax checks, but local execution is blocked by the missing Chromium executable. Visual, screen-reader, real browser-extension/relay, and hosted CSP acceptance remain pending. See the verification ledger for the exact distinction.

Stage 5 adds NIP-46 mobile remote signing and NIP-42 selected-relay authentication. Following, reactions, and deletion publication remain later milestones. Practice needs no network once loaded; cold-start offline loading is not guaranteed.

Open `/learn` for explanations of category math, signer approval, EVENT/OK delivery, read-back recovery, and the modular NIP architecture. The accepted PRD/build plan and Stage 4 amendments are included under `docs/reference/`.
