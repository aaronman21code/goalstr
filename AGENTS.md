# Goalstr staged build rules

- Continue from the latest source release or a user-supplied newer baseline. Preserve unrelated repo edits; never claim a remote comparison that did not run.
- Keep each stage scoped to the accepted build plan and deliver a complete runnable ZIP. User owns GitHub upload, pull request review, and Vercel deployment.
- During active work, give a useful progress update at least every minute. Report blockers and verification gaps as soon as they are known.
- Remote build-environment probes must have an explicit deadline of at most 30 seconds. Stop after one failure/retry and use local evidence where possible. Do not use a browser tool that previously stalled for this project. Never silently wait on an unavailable service.
- Keep pure domain rules separate from NIP adapters, relay infrastructure, application services, and views. Network calls belong behind ports. Do not write cryptographic primitives.
- Preserve Practice database/backup schema unless an explicit migration is included. Public reads never mutate Practice or publish its drafts.
- Run checks appropriate to the change; report passing, failed, and unavailable checks honestly. After required checks pass, do not repeat them without a new change or unresolved concern.
- Include a changelog, versioned manifest, exact added/modified/deleted file report against the prior release, and removed-file list. Avoid unrelated reformatting. Exclude dependencies, build output, local secrets, and git metadata from releases.
