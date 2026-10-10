# Goalstr — Stage 3

**Small goals. Honest progress.**

Goalstr is a mobile-first app for daily goals and accountability, built in stages on Nostr. **Make a small plan, check in, review your day.** Stage 3 adds real public relay reads alongside the complete local Practice flow and protocol lab. Browsing needs no account or signer.

## New in Stage 3

Open **People** or `/people` for a bounded Public feed. Look up an npub/nprofile or note/nevent, inspect signed events and relay observations, and open public profile/day links without signing in. Profiles, author write-relay routing, missing-root/parent retrieval, deletion handling, and partial/disconnected/unsupported states are modular read adapters.

Public reads are session-only and never publish or alter Practice. Signing, relay authentication, follows and reactions remain later stages. The feed may be empty while Goalstr is early; the protocol lab remains an explicit local signed-example experience.

Read [Stage 3 update notes](docs/STAGE_03.md), [exact changed files](CHANGES_STAGE_03.md), [read architecture](docs/READ_PATH.md), and the [v1 event contract](docs/contracts/GOALSTR_V1.md).

Current deployment and repository, supplied by the project owner: [goalstr.vercel.app](https://goalstr.vercel.app/) · [aaronman21code/goalstr](https://github.com/aaronman21code/goalstr).

## What works

- One to three commitments; categories and an optional note.
- A single completion ring based only on fulfilled original commitments.
- Check-ins, schedule markers, changed plans, revisions, and bonus accomplishments.
- Explicit review, correction with a reason, and preserved earlier history.
- Tomorrow's selected carry-forward draft with fresh task IDs.
- Rest days, calendar/list History, and separate closed/rest-day counts.
- Draft recovery, including unsent update/review forms, through IndexedDB.
- Honest temporary-session behavior if storage is denied or a save fails.
- Timezone and schedule settings, open-app prompts, backup export/import.
- Read-only fictional example, optional explanations, printable learning guide.

People now reads real public relay data. Browser signing arrives in Stage 4, mobile remote signing in Stage 5, and the social loop after that. No Practice plan is published automatically.

## First upload to GitHub

1. Open [github.com/new](https://github.com/new). Choose your personal account as Owner, name the repository `goalstr`, and choose Private for initial development or Public if you want to share the source. Description: `Daily goals and accountability, built on Nostr`. Leave README, .gitignore, license, template, and Copilot setup unselected; the source already contains its README and ignore rules. Create the repository.
2. Extract `Goalstr_Stage_03_GitHub.zip` into a folder on your computer.
3. Click **uploading an existing file** on the empty repository page (or **Add file → Upload files** on an existing repo). Put **the extracted contents** in your GitHub repo, so `package.json`, `index.html`, `src/`, and `vercel.json` are at its root. Uploading the ZIP itself will not build the application.
4. Include the dotfiles, especially `.github/workflows/ci.yml`, `.gitignore`, and `.nvmrc`. GitHub Desktop is convenient for copying all files and reviewing changes; the GitHub website also works.
5. Commit to the default branch `main`. Suggested message: `Goalstr Stage 3: public relay reads and day links`. No additional repository settings are required. For the existing deployed repo, use the stage-03 branch and pull request workflow in docs/STAGE_03.md.

No generated `dist/` or `node_modules/` is included or needed in GitHub. Vercel installs and builds the source.

## Deploy to Vercel

1. On Vercel choose **New Project**, connect GitHub, authorize access to `goalstr`, import that repository, name the Vercel project `goalstr`, and select the **Vite** framework preset.
2. Keep Root Directory at the repository root. Build command: `npm run build`. Output Directory: `dist`. Install command: `npm ci`.
3. Use **Node 24.x** in the project settings. No environment variables or paid integrations are needed for this stage.
4. Deploy. Open Today, create a practice plan, then reload it to verify local recovery. Also open `/history`, `/learn`, `/protocol`, and `/people` directly: `vercel.json` supplies the SPA rewrite.
5. Check the GitHub Actions result. It verifies the release and runs the included browser scenarios on a GitHub runner.

After connecting the GitHub repo, pushes deploy through the same Vercel project. A push to the configured production branch updates production; other branches provide previews. See [Vercel Git documentation](https://vercel.com/docs/git) and [Vite deployment documentation](https://vercel.com/docs/frameworks/frontend/vite).

## Run locally

Use Node 24.x and npm. The committed lockfile pins dependencies.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To verify:

```sh
npm run typecheck
npm run lint
npm run vendor:verify
npm test
npm run build
npm run preview
```

If a restricted environment cannot enumerate network interfaces, use `npm run dev -- --host 127.0.0.1` or the equivalent `preview` flag.

### Optional browser checks

Browser tooling is a separate pinned test dependency, not part of the shipped app. The CI workflow installs it automatically.

```sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
npm run test:e2e
```

The test runner starts its own built preview on port 4175. Stage 3 scenarios mock real signed WSS reads, duplicate arrivals, public day/profile links and reload, missing ancestry, failed metadata, and Practice isolation; they do not contact live relays. It also checks the Stage 2 inspector, conflicts, unsigned resolution preview, future-clock re-evaluation, missing history, and rest. It exercises the mobile ritual, local refresh recovery, revisions, bonus tasks, review/correction, carry-forward, rest, denied storage, direct routes, and printable guide. It writes screenshots and a test PDF under ignored `test-results/`.

## Next-stage updates

Each stage is a **complete source snapshot** with a release manifest, changelog, and exact removed-file list. Download it, copy its contents over the same local repo, apply any listed removals, commit, and push. Keep the same GitHub repo and Vercel project. Read [UPDATING.md](UPDATING.md) for the exact workflow.

If you edit code outside this conversation, attach your current ZIP or changes before the next stage so we can keep them. A release ZIP contains app source, not your browser's practice data.

## Architecture

`src/domain/accountability` is plain TypeScript. Screens call `PracticeService`, which applies those rules and delegates persistence through a typed store port. `IndexedDocumentStore` is the concrete local adapter. React views do not sign events, open sockets, or write IndexedDB themselves.

The internal database name `daily-accountability-practice`, document key `practice-v1`, and schema version are stable migration contracts. The database retains its pre-Goalstr identifier so renaming the app preserves earlier Practice data; new exports use `goalstr-practice-backup.json` and existing exports still import. Later live event/outbox stores must remain separate. Protocol interfaces are defined in `src/domain/ports`; The scoped NIP-01 verifier, NIP-10 thread codec, explicit-target NIP-09 deletion reader, and application codec now live under `src/protocol`. The pure graph reducer lives under `src/domain/events`; finite read transport lives under `src/infrastructure/relays` and read orchestration under `src/public`. Signers/publication begin later. See [architecture](docs/ARCHITECTURE.md) and [NIP map](docs/NIP_MAP.md).

## Tooling decisions and verification limits

The core stack is Vite + React + strict TypeScript with CSS Modules/tokens. This stage uses a tiny native history router, a native IndexedDB adapter, and Node's test runner. React Router, `idb`, and Vitest remain planned tooling: their install artifacts were unavailable in the restricted build environment. These choices are isolated behind services/modules and do not change product rules. No custom cryptography exists.

The NIP-01 verifier uses a frozen, checksummed vendored upstream noble source/compiled artifact with Web Crypto, MIT notice, and all 19 official BIP-340 vectors. No Goalstr cryptography is written. Package-registry access was blocked, so this is an explicitly documented source snapshot rather than a claimed npm install. The read port currently uses native bounded WebSocket queries because registry access remains blocked. The full signer SDK/package/API compatibility spike and exact spec revision pins remain gates before write stages. See [vendor provenance](vendor/noble-secp256k1/README.md) and [implementation decisions](docs/DECISIONS.md).

Practice requires no network after the application has loaded; this release does not install a service worker or guarantee cold-start loading offline. Browser storage is device/origin-local and can be removed by the browser. Export a backup when you want one. Deploying a new stage on the same origin does not intentionally clear the database. A different preview URL has a different storage origin.

The source, 23 domain/storage tests, 26 protocol tests, 26 read-path tests (75 total), and official cryptographic vectors were verified in the build environment, and the production build succeeds. Browser automation cannot run here because its browser executable is absent. Short repo/package/pilot probes failed with 403/timeouts; no real pilot read or hosted WSS/CSP success is claimed. **Browser scenarios are supplied but remain unverified until CI or your deployed check runs them.** This is an early-stage review release, not a claim that the full P0 prototype has passed its final acceptance gate.

## Learn and continue

Open `/learn` and choose Print guide for a light, printable overview. `docs/LEARN.md` includes exercises and checkpoints for Stages 1–3. The full PRD and build plan are included under `docs/reference/`. See `docs/ACCEPTANCE.md` for verified coverage and outstanding checks.

Goalstr is the chosen product name. The app wordmark, G progress-ring mark, favicon, metadata, exports, and project package use this name. Live Nostr discovery uses the frozen contract around `goalstr` / `goalstr-v1` tags; the generic `accountability` payload tag and domain modules remain application conventions.
