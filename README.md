# Goalstr — Stage 1

**Small goals. Honest progress.**

Goalstr is a mobile-first app for daily goals and accountability, built in stages on Nostr. **Make a small plan, check in, review your day.** This release is a fully local Practice flow: no account, signer, relay traffic, or identity private key.

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

People is a clearly labeled preview of the planned social layer. Live reads arrive in Stage 3, browser signing in Stage 4, and mobile remote signing in Stage 5. There is no pretend publishing or synthetic npub.

## First upload to GitHub

1. Open [github.com/new](https://github.com/new). Choose your personal account as Owner, name the repository `goalstr`, and choose Private for initial development or Public if you want to share the source. Description: `Daily goals and accountability, built on Nostr`. Leave README, .gitignore, license, template, and Copilot setup unselected; the source already contains its README and ignore rules. Create the repository.
2. Extract `Goalstr_Stage_01_GitHub.zip` into a folder on your computer.
3. Click **uploading an existing file** on the empty repository page (or **Add file → Upload files** on an existing repo). Put **the extracted contents** in your GitHub repo, so `package.json`, `index.html`, `src/`, and `vercel.json` are at its root. Uploading the ZIP itself will not build the application.
4. Include the dotfiles, especially `.github/workflows/ci.yml`, `.gitignore`, and `.nvmrc`. GitHub Desktop is convenient for copying all files and reviewing changes; the GitHub website also works.
5. Commit to the default branch `main`. Suggested message: `Goalstr: Stage 1 prototype`. No additional repository settings are required for the first deployment.

No generated `dist/` or `node_modules/` is included or needed in GitHub. Vercel installs and builds the source.

## Deploy to Vercel

1. On Vercel choose **New Project**, connect GitHub, authorize access to `goalstr`, import that repository, name the Vercel project `goalstr`, and select the **Vite** framework preset.
2. Keep Root Directory at the repository root. Build command: `npm run build`. Output Directory: `dist`. Install command: `npm ci`.
3. Use **Node 24.x** in the project settings. No environment variables or paid integrations are needed for this stage.
4. Deploy. Open Today, create a practice plan, then reload it to verify local recovery. Also open `/history` and `/learn` directly: `vercel.json` supplies the SPA rewrite.
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

The test runner starts its own built preview on port 4175. It exercises the mobile ritual, local refresh recovery, revisions, bonus tasks, review/correction, carry-forward, rest, denied storage, direct routes, and printable guide. It writes screenshots and a test PDF under ignored `test-results/`.

## Next-stage updates

Each stage is a **complete source snapshot** with a release manifest, changelog, and exact removed-file list. Download it, copy its contents over the same local repo, apply any listed removals, commit, and push. Keep the same GitHub repo and Vercel project. Read [UPDATING.md](UPDATING.md) for the exact workflow.

If you edit code outside this conversation, attach your current ZIP or changes before the next stage so we can keep them. A release ZIP contains app source, not your browser's practice data.

## Architecture

`src/domain/accountability` is plain TypeScript. Screens call `PracticeService`, which applies those rules and delegates persistence through a typed store port. `IndexedDocumentStore` is the concrete local adapter. React views do not sign events, open sockets, or write IndexedDB themselves.

The internal database name `daily-accountability-practice`, document key `practice-v1`, and schema version are stable migration contracts. The database retains its pre-Goalstr identifier so renaming the app preserves earlier Practice data; new exports use `goalstr-practice-backup.json` and existing exports still import. Later live event/outbox stores must remain separate. Protocol interfaces are defined in `src/domain/ports`; actual SDK/NIP implementations begin in Stage 2. See [architecture](docs/ARCHITECTURE.md) and [NIP map](docs/NIP_MAP.md).

## Stage 1 decisions and limits

The core stack is Vite + React + strict TypeScript with CSS Modules/tokens. This stage uses a tiny native history router, a native IndexedDB adapter, and Node's test runner. React Router, `idb`, and Vitest remain planned tooling: their install artifacts were unavailable in the restricted build environment. These choices are isolated behind services/modules and do not change product rules. No custom cryptography exists.

The nostr-tools package/API spike and reviewed spec revision pins are still outstanding before protocol adapters are implemented. The upstream currently documents `@nostr/tools`/JSR; we have not claimed that dependency is installed or working here. See [implementation decisions](docs/DECISIONS.md).

Practice requires no network after the application has loaded; this release does not install a service worker or guarantee cold-start loading offline. Browser storage is device/origin-local and can be removed by the browser. Export a backup when you want one. Deploying a new stage on the same origin does not intentionally clear the database. A different preview URL has a different storage origin.

The source and 23 domain/storage tests were verified in the build environment, and the production build succeeds. Browser automation could not be run there: browser binaries could not be downloaded and the remote browser could not reach the local preview. **Browser scenarios are supplied but remain unverified until CI or your deployed check runs them.** This is an early-stage review release, not a claim that the full P0 prototype has passed its final acceptance gate.

## Learn and continue

Open `/learn` and choose Print guide for a light, printable overview. `docs/LEARN.md` has the Stage 1 exercise and checkpoint. The full PRD and build plan are included under `docs/reference/`. See `docs/ACCEPTANCE.md` for verified coverage and outstanding checks.

Goalstr is the chosen product name. The app wordmark, G progress-ring mark, favicon, metadata, exports, and project package use this name. Live Nostr discovery is planned around `goalstr` / `goalstr-v1` tags; the generic `accountability` payload tag and domain modules remain application conventions.
