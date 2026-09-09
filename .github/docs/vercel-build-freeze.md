# Vercel build freeze — `ummat-chatislam`

Applied 2026-09-09. **Production builds are disabled.** Pushing to `main` no
longer deploys.

## Why

ASI Policy 9.0:

> We should not be using Vercel until time to deploy finished products or
> versions to prod with my approval. Otherwise it's just wasting money.

A deploy happens when a finished version ships **and** the owner approves *that
specific deploy*. Approval for one release is not approval for the next.

The immediate trigger was narrow and worth stating plainly: a security fix had
to be pushed to `main` (commit `b2f87f3`, the astro/sharp audit finding). The
project's Ignored Build Step was:

```sh
if [ "$VERCEL_ENV" = "production" ]; then exit 1; else exit 0; fi
```

`exit 1` means *build*. So that push would have produced an unapproved
production deployment as a side effect of a CI fix. Freezing first was the
narrower of the two available choices.

## Current state

```sh
exit 0 # ASI Policy 9.0: builds disabled until an Ali-approved ship. Prior value: if [ "$VERCEL_ENV" = "production" ]; then exit 1; else exit 0; fi
```

`exit 0` in an Ignored Build Step means **skip the build**. The prior value is
carried inline in the comment so restoring never depends on this file.

| | |
|---|---|
| Project | `ummat-chatislam` (team `unity-dev`, `--team $VERCEL_TEAM_ID`) |
| Root directory | `web` |
| Framework (as configured) | `nextjs` — **stale, see below** |
| Last production deploy | `8da9e292`, 2026-09-06, READY |

**Nothing went down.** chatislam.org keeps serving that deployment; Vercel does
not unpublish anything when builds stop. What stops is *new* deployments.

**This differs from the ummat freeze in one important way.** The seven `ummat-*`
projects were frozen because they had gone six weeks with no successful
deployment and no domain attached — pure spend, no product. `ummat-chatislam` is
the opposite: a live site on its own domain that had been deploying
successfully. It is frozen for compliance with the approval rule, not because it
is broken. Expect to unfreeze it sooner than the others.

## Known misconfiguration, deliberately not changed

The project is configured with `framework: nextjs`, but `web/` is an Astro app
(migrated from Next.js per D-P2-STACK-CANON). This is stale metadata — the
Astro/Vercel adapter produces the build output directly, which is why
deployments have kept succeeding.

Not corrected here on purpose: changing framework detection alters how Vercel
builds, and there is no way to verify that while builds are frozen. Fix it as
part of the next approved ship, when a real deployment can confirm it. Changing
it now would mean the first post-freeze deploy carries an unverified build
config change — this repo has already lost a production deploy to exactly that
(a stray `vercel.json` key).

## Lifting the freeze

1. Get explicit approval for *that* deploy. Not standing approval.
2. Restore the prior command (it is in the comment above):

   ```bash
   source ~/.claude/vault.env
   curl -X PATCH \
     "https://api.vercel.com/v9/projects/ummat-chatislam?teamId=$VERCEL_TEAM_ID" \
     -H "Authorization: Bearer $VERCEL_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"commandForIgnoringBuildStep":"if [ \"$VERCEL_ENV\" = \"production\" ]; then exit 1; else exit 0; fi"}'
   ```

3. Verify before pushing:

   ```bash
   curl -s "https://api.vercel.com/v9/projects/ummat-chatislam?teamId=$VERCEL_TEAM_ID" \
     -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -c \
     "import json,sys;print(json.load(sys.stdin)['commandForIgnoringBuildStep'])"
   ```

4. Ship, confirm the deployment, then re-freeze unless the project is genuinely
   in continuous release.

Note this is a **project setting**, not a repo file, so it is invisible in
`git`. That is deliberate — a setting is one API call to change and cannot
corrupt a build config the way a `vercel.json` edit can. This document is the
thing that makes it discoverable. Same approach as `ummat`'s
`.github/docs/vercel-build-freeze.md`.
