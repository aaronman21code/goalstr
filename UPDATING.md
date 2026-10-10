# Updating Goalstr in your browser

Current release: **Stage 4 / 0.4.0**, based on the Stage 3 / 0.3.0 source delivered in this conversation. No GitHub Desktop is required.

## Recommended upload

1. Ensure the Stage 3 PR has been merged into **main**. Open your [Goalstr repository](https://github.com/aaronman21code/goalstr).
2. Select **main** in the branch dropdown. Type **stage-04** and click **Create branch: stage-04 from main**. If that name already exists from another attempt, use a new name such as stage-04-review.
3. Download and extract **Goalstr_Stage_04_Browser_Update.zip** outside the repository. It contains only the added and changed files from this release, preserving their paths.
4. On the stage-04 branch choose **Add file → Upload files**. Drag the **contents inside** the extracted folder into the upload area: `src/`, `tests/`, `docs/`, and the root files. Upload all files in this update ZIP together. Do not upload the ZIP or its enclosing folder.
5. Check that paths such as `src/live/service.ts`, `package.json`, and `README.md` appear correctly. Commit directly to stage-04 with `Goalstr Stage 4: browser signing and category rings`.
6. Choose **Compare & pull request**, or **Pull requests → New pull request**. Set **base: main** and **compare: stage-04**. Title the PR with the same Stage 4 description, then create it.
7. Open **Files changed**. Confirm the files match `CHANGES_STAGE_04.md`; no unexpected deletions or custom-code overwrites. Wait for GitHub Actions and open the Vercel preview from the PR deployment/checks area.
8. Test the preview using `docs/STAGE_04.md`. Merge the PR after checks pass. Confirm the merge; Vercel deploys the production branch through the existing integration. The next stage should branch from the updated main again.

The stage branch contains your new changes; main is the destination. Do not create the Stage 4 PR from the old Stage 2/3 branch after those stages were merged.

## Change tracking

GitHub compares actual content and lines. Unchanged files are not modified just because they were copied again. The browser update ZIP avoids uploading them entirely. `CHANGES_STAGE_04.md` lists exact added/modified/deleted paths against the shipped Stage 3 ZIP; `release.json` hashes the complete source snapshot. This is a local release comparison, not a claim that your remote repo was checked. Preserve any edits you made outside this conversation before overwriting their files.

Each stage gets its own branch and PR. Keep the merged PR as the review record; optionally create a GitHub release/tag `v0.4.0` after merge. Do not delete the repository or replace its history.

## Complete ZIP and browser limits

`Goalstr_Stage_04_GitHub.zip` contains every source/configuration/documentation file and can recreate the project without earlier downloads. Its contents belong at the repository root. GitHub's browser upload accepts at most 100 files per batch: upload `src/` first, then the remaining folders/root files, committing each batch to the same stage-04 branch before making one PR. Include configuration files from the complete ZIP when creating a fresh repo. Existing unchanged configuration files remain when using the browser update ZIP.

`REMOVED_FILES.txt` contains no removed paths for this stage. Future updates that list removals require deleting those exact paths on the stage branch before opening its PR. Neither archive contains dependencies, build output, git metadata, or local credentials.

## Browser data and rollback

Export Practice data before reviewing a migration. Stage 4 reads schema 1 and migrates to schema 2 without deleting days or drafts, keeping the same database/key. Stage 3 cannot read the newer schema 2: rolling back code does not roll back data. Preserve your pre-upgrade export if a rollback is needed; do not overwrite your only backup.

Live drafts/outbox use a separate account database. Signing sessions reconnect after refresh; saved drafts, signed events, and relay facts remain. Vercel preview and production URLs have separate browser stores. Nothing in a source ZIP backs up your browser data.

If you change code elsewhere, attach your current source ZIP or patch before continuing the build here.
