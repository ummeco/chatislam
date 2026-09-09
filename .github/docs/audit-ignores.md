# Audit ignore list — why each advisory is suppressed

`web/package.json` -> `pnpm.auditConfig.ignoreGhsas` suppresses specific
advisories in the `Dependency Security Audit` workflow. This file is the
justification for every entry. `.github/scripts/pnpm-audit-gate.sh` tells a
failing build to "add a justified entry to the audit ignore list" — this is
where the justification goes.

**Rules for this file.** An entry with no section here is a bug, not an ignore.
Every section states: what the advisory is, why it does not apply *to this
repo*, what would make it apply again, and when to re-check. Same principle as
`.github/typecheck-allowlist.json` elsewhere in the org — an exclusion should be
a visible, reviewable decision rather than a silent gap.

**An ignore is never "we accept this risk".** It is "we verified this does not
reach us, and here is the reasoning you can check".

---

## GHSA-26w7-cxv4-gfx2 — Astro: RCE through AVIF image optimization (CRITICAL)

Added 2026-09-09. Advisory published 2026-09-08. Re-check when astro 7 lands.

**The advisory.** A vulnerability in `libheif`, reached through the default
Sharp image service, can lead to remote code execution when a malicious AVIF
image is optimized. Affected: `astro < 7.2.8`. This repo is on `astro ^6.4.6`
(resolved 6.4.8).

**Why it does not apply here — two independent reasons.**

**1. The vulnerable component is already at the fixed version.** The advisory
says: *"The fix was released in Astro 7.2.8, which requires Sharp 0.35.4."* The
vulnerability lives in libheif inside Sharp, not in Astro's own code — Astro
7.2.8 fixes it by raising its Sharp floor. This repo already pins:

```json
"sharp": ">=0.35.4 <0.36"
```

and `pnpm-lock.yaml` resolves `sharp@0.35.4`. So the patched Sharp is installed
regardless of the Astro version. **The floor was raised from `>=0.35.0` to
`>=0.35.4` in the same commit as this entry** — at `>=0.35.0` a future install
could legitimately have resolved a genuinely vulnerable 0.35.0-0.35.3, so the
protection was incidental before and is now guaranteed.

**2. The vulnerable path is not reachable in this app.** The advisory's
condition is "an attacker can cause Astro to process an untrusted AVIF image".
Verified on disk at `8da9e292`:

| check | result |
|---|---|
| `astro:assets` / `<Image>` / `<Picture>` / `getImage` in `web/src` | **zero occurrences** |
| AVIF / HEIC / HEIF files in the repo | **zero** |
| `web/src/assets/` (Astro's processed-image directory) | does not exist |
| `image.domains` / `image.remotePatterns` in `astro.config.ts` | not configured, so remote images are refused |
| API routes accepting an image upload | none — the 20 routes are auth, chat, citation, consent, cron, early-access, feedback, graphql, health, research, seasonal and tutor |
| adapter config | `imageService: true`, which routes optimization to **Vercel's** image service rather than Sharp |

The 80 image files in `web/` are all vendored brand icons under
`web/vendor/brand/assets/*/icons` (PNG/SVG), served statically.

**What would make this apply again.** Any of: adding `astro:assets`/`<Image>`
usage, configuring `image.remotePatterns` or `image.domains`, accepting
user-uploaded images, or the Sharp override floor dropping below 0.35.4.
**If you touch any of those, remove this entry before merging.**

**The real fix is still owed.** Astro 6 is end-of-life for security — 6.4.8 is
the final 6.x release and the fix exists only in >= 7.2.8. Migrating is a
multi-package major (`astro` 6->7 forces `@astrojs/vercel` 10->11, whose peer
is `astro: ^7.0.0`; `@astrojs/react` 5->6). The Node floor does **not** change
(both 6.4.8 and 7.3.2 require `node >=22.12.0`), so that is one less risk.
Tracked by PCI `chatislam-astro-7-migration`. This entry is a stopgap so a
daily scheduled job stops reporting a finding that is provably not exploitable
here; it is not a decision to stay on Astro 6.

---

## GHSA-7pqw-9j4j-h8q3 — extract-zip: arbitrary file write via symlink entries (HIGH)

Added 2026-09-09. Re-check if `lighthouse` moves off `puppeteer-core`, or if a
patched `extract-zip` is ever published.

**No patch exists.** The advisory reports `Patched versions: <0.0.0` — an empty
range, meaning no fixed release. There is nothing to upgrade to.

**Single path, development only:**

```
extract-zip@2.0.1
└─ @puppeteer/browsers@2.13.2
   └─ puppeteer-core@24.43.1
      └─ lighthouse@12.8.2
         └─ chatislam-web (devDependencies)
```

`lighthouse` is a devDependency used for CI performance auditing. It is never
installed in production and never ships to a browser or a serverless function.
Exploitation requires extracting an attacker-controlled zip; the only archives
this path extracts are Chrome builds fetched from Google's servers during a
Lighthouse run.

**Same package, same reasoning, as GHSA-jmr9-qjv8-65gv below** — this is a
second advisory filed against the identical dev-only dependency.

---

## GHSA-jmr9-qjv8-65gv — extract-zip: unvalidated symlink path traversal (HIGH)

Pre-existing entry; **justification backfilled 2026-09-09.** It was added with
no recorded reason anywhere in the repo, which is exactly the failure mode this
file exists to prevent — a bare ID is indistinguishable from a suppression
someone added to get a build green.

Same package, same single dev-only dependency path, and the same reasoning as
GHSA-7pqw-9j4j-h8q3 above. Recorded here so the entry is reviewable rather than
inherited.
