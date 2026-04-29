# Release chatislam v0.1.0 — 2026-04-27

## Version (locked)
0.1.0

> Note: web/package.json is on 0.1.1 (P1 hotfix tag). v0.1.0 is the P3 release tag for the
> full P2 feature set. The 0.1.1 web artifact is what ships.

## Features included

### P2 Phase 2 closeout
- CI quality gates, admin guard, legal pages, UI baseline (commit e1af920d equivalent — phase2)
- v0.1.1 Phase 1 foundation: rate-limit, CORS, static routes, observability (commit 0c638b0)
- Security: ioredis removed from Edge middleware bundle; moved to deps (commit f651b62)
- Samsung browserslist query fix for Next.js bundler compat (commit 13a5f96)
- Adapter cache reset fix: creates new instance vs. clearing state (commit 529fb3d)
- React Server Components CVE fix (merged #1, commit 1c133d0)
- /cookies route renamed to /cookie-policy (Next.js reserved name conflict, commit 4716f65)
- Missing web app files committed that were never tracked (commit 9c07edd)
- Donate page split into server/client components (commit 06649f3)
- Cross-repo import removal (blocked Vercel builds, commit e01e120)
- Chat route tests updated for inlined code pattern (commit f651b62 area)

### Foundation (P1)
- Rate limiting middleware
- CORS configuration
- Static routes (privacy, terms, about)
- Observability setup (error tracking, logging)
- Initial standalone repo setup (commit d173a87)

### Backend schema
- ChatIslam schema: migration 0034_sprint10_chatislam (ummat backend)

## Migrations
chatislam data is in the ummat shared backend. No standalone migrations.
Requires ummat backend migration 0034 to be applied (included in ummat v0.1.0 release).

## Deploy sequence
1. Verify ummat backend v0.1.0 is deployed (migration 0034 must be live)
2. Deploy web: `vercel deploy --prod` from `chatislam/web/` → ummat-chatislam project
3. Smoke: load `https://chatislam.org`, verify chat interface loads, test a Q&A query
4. Check rate-limit headers on responses
5. Announce

## Rollback plan
- **Web:** `vercel rollback` on ummat-chatislam
- **Git:** `git revert <range>` on hotfix branch

## User communication
- **Channel:** chatislam.org site footer / changelog
- **Message:** ChatIslam is open — Islamic Q&A powered by AI with Quran and hadith grounding.

## Tag command
```
git -C /Volumes/X9/Sites/ummeco/chatislam tag v0.1.0 && git -C /Volumes/X9/Sites/ummeco/chatislam push origin v0.1.0
```

## gh release create command
```
gh release create v0.1.0 \
  --repo ummeco/chatislam \
  --title "chatislam v0.1.0" \
  --notes-file /Volumes/X9/Sites/ummeco/chatislam/.github/wiki/releases/release-chatislam-v0.1.0-2026-04-27.md
```
