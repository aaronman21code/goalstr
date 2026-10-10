# Stage 2 — protocol model

Version 0.2.0. Complete source update over Goalstr Stage 1 version 0.1.1.

## What changed

- `/protocol`: optional signed-event inspector, ten interactive fixture scenarios, public JSON verification, unsigned resolution preview, and explicit unsigned previews of your Practice days.
- Exact v1 payload schema and deterministic readable notes for all seven application event types.
- NIP-01 envelope/hash/Schnorr validation, NIP-10 marked state threads and ordinary reply parsing, and the explicit-event NIP-09 deletion authorization subset.
- Pure reconstruction with duplicate-root selection, branch tie-breaks, known resolution handling, pending dependencies, future-clock quarantine, conversation isolation, and completeness warnings.
- A vendored, checksum-pinned upstream noble source/compiled artifact with MIT license and all 19 official BIP-340 test vectors.
- 26 protocol scenarios plus the existing 23 domain/storage tests: 49 passing tests.

Practice storage, backup format, and database namespace stay at schema 1. This stage performs no migrations or automatic publication. The inspector route is lazy-loaded so the fixture corpus/crypto adapter are not required to open Practice.

## Update your current repository

1. Extract `Goalstr_Stage_02_GitHub.zip`.
2. Upload/copy **all extracted contents** into the root of `aaronman21code/goalstr`, replacing matching files. Include dotfiles and the `vendor/` folder. Do not upload the ZIP itself.
3. There are **no removed files since Goalstr version 0.1.1**. If your repo contains the earlier pre-Goalstr reference filenames, `REMOVED_FILES.txt` lists only those older paths for cleanup.
4. Commit: `Goalstr Stage 2: event model and protocol lab`.
5. Keep the existing Vercel project/settings. No environment variables or new backend are needed.
6. Check GitHub Actions and the deployment. Open `/learn`, then **Open the protocol lab**.

The build environment could not open the hosted site or fetch the GitHub repo, so this release starts from the previously supplied Goalstr Stage 1 source. If you independently edited the repo, review those differences before replacing files.

## Quick deployed check

Try Complete day (100%), Competing updates (67%, one competing version), Resolved conflict (33%, no competing version), Missing parent (0%, incomplete), Deleted ancestor (67%, incomplete), and Rest (no score). Advance the Future timestamp example by ten minutes; it should move from 0% to 33%. Check the alternate root, unsigned resolution preview, JSON fields, and a previously saved Practice day. Your existing plan should still be there.

Source type checks, import-boundary lint, 49 tests, official cryptographic vectors, and the production build pass. Browser scenarios are provided in CI; browser execution/visual/mobile checks remain pending in this environment. Do not call the full P0 prototype complete yet.

## Next stage

Stage 3 adds bounded real relay reads, verified ingestion, profiles, public discovery, day/public-ID links, missing-parent retrieval, relay routing/information, and honest partial/error states. Identity signing/publication remain Stages 4–5.
