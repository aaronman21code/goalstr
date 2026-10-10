# Updating Goalstr

Keep one `goalstr` GitHub repo and one Vercel project. Current release: Stage 3 / 0.3.0. See `docs/STAGE_03.md` and `CHANGES_STAGE_03.md`; no removals or storage migration are required from 0.2.0.

## First stage

Extract the ZIP and copy its contents to the repository root. `package.json` must be at the root; do not upload a ZIP or nest another project folder inside the repo. Commit all source/configuration files, including dotfiles. Then import that repo into Vercel once.

## Every later stage

1. In GitHub Desktop select main, fetch/pull updates, and create a new stage branch (stage-03 for this release). Start with no unrelated uncommitted changes. Download and extract the next ZIP outside the repo.
2. Read its `CHANGELOG.md`, stage changed-file report, `release.json`, and `REMOVED_FILES.txt`.
3. Copy all release files over the files in the same local GitHub repo. Preserve your repo's `.git/`, local `.env` files, and deployment credentials; those are never release files. Do not copy `node_modules/`, `dist/`, or test screenshots.
4. Remove only the paths listed in `REMOVED_FILES.txt`. Copying files cannot remove an obsolete file, so this step matters when a module is renamed or retired.
5. Review changes with GitHub Desktop or `git status`. If you have local code changes, compare and preserve them before overwriting their files.
6. Run the verification commands in the README when possible. Commit the whole stage to the stage branch and Publish branch (or Push origin). Create a pull request with base main; GitHub retains actual file/line differences even though the ZIP is complete.
7. Check CI and the Vercel preview. Try the new stage and the existing Practice flow. Merge the pull request into your configured production branch after checks pass; Vercel updates production. Create a version tag/release to mark the checkpoint.

You can use GitHub's upload UI instead: upload the extracted folders/files, then separately remove any listed obsolete paths. Include configuration dotfiles. GitHub Desktop is simpler when there are many changes.

## Release contents

`release.json` records the stage, version, schema version, prior-stage baseline, and included files with SHA-256 hashes. Every release is self-contained; you do not have to collect small patches from earlier downloads. `REMOVED_FILES.txt` lists code/configuration paths removed since the previous stage. The original Stage 1 had none. Version 0.1.1 renames the two reference documents; remove their old paths only if you already uploaded version 0.1.0.

## Local data and rollback

App data lives in the browser, not in the code ZIP or GitHub repo. Same-origin deployments keep the stable Practice database unless the user clears it or the browser removes it. Export a backup before trying a storage migration. A new hostname or Vercel preview URL starts with a different browser store.

Each later stage must preserve or migrate existing data explicitly. Its release notes must say whether rolling back can read data written by the newer version. Stage 1 writes schema version 1. Rolling back code does not itself roll back browser data.

## Work between stages

Keep this ZIP as the current source checkpoint. When continuing here after changing the source elsewhere, attach the latest source ZIP or a patch so the next stage starts from your actual code. Otherwise we continue from the last release generated in this conversation.
