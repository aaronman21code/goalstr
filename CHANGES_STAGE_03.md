# Goalstr Stage 3 file changes

Baseline: shipped Stage 2 / 0.2.0 ZIP. New release: Stage 3 / 0.3.0.

Baseline ZIP SHA-256: `8abd9c715a04aa647d8024f5bcff67466e3e3b6c9917dc789b8d2e00e22ee80f`.

**19 added · 18 modified · 0 deleted · 60 unchanged.**

This is a byte comparison against the previous release, not a remote GitHub comparison. If you independently edited your repository, GitHub Desktop may show additional differences. Git tracks actual contents even when all files are copied from the ZIP. The generated release manifest changes every stage.

## Added

- `.gitattributes`
- `AGENTS.md`
- `CHANGES_STAGE_03.md`
- `docs/READ_PATH.md`
- `docs/STAGE_03.md`
- `src/app/public-service.ts`
- `src/features/public/PublicView.module.css`
- `src/features/public/PublicView.tsx`
- `src/infrastructure/relays/information.ts`
- `src/infrastructure/relays/pool.ts`
- `src/infrastructure/relays/urls.ts`
- `src/protocol/nips/01/profiles.ts`
- `src/protocol/nips/11/information.ts`
- `src/protocol/nips/19/identifiers.ts`
- `src/protocol/nips/21/links.ts`
- `src/protocol/nips/65/relay-list.ts`
- `src/public/service.ts`
- `src/public/types.ts`
- `tests/relay.test.ts`

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
- `package-lock.json`
- `package.json`
- `release.json`
- `scripts/release-manifest.mjs`
- `src/app/App.tsx`
- `src/features/profile/ProfileView.tsx`
- `src/learning/LearnView.tsx`
- `tests/browser.mjs`
- `vercel.json`

## Deleted

None.

## Review points

- Public reads and NIP adapters: src/public, src/infrastructure/relays, src/protocol/nips/01/profiles, 11, 19, 21, 65.
- Lazy Public UI, mode/nav copy and educational pages: src/features/public, src/app, src/learning.
- Hosting connection policy: vercel.json permits WSS/HTTPS only for network reads; scripts/images retain their prior restrictions.
- No npm dependency additions. Version is 0.3.0; browser test runner explicitly enables Node TypeScript stripping.
- Practice service, store, persisted schema, core rules and Stage 2 verifier/codec/reducer are byte-identical to the prior ZIP.
- Browser and live pilot checks remain pending; source/tests and production build pass.
