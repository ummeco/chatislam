# Security headers for chatislam.org

`vercel.json` is validated against a strict schema that rejects any unknown key,
including a comment key, so the reasoning behind its `headers` blocks lives here.

## The `frame-ancestors` rule, and why it is separate

A live probe of all eight Ummeco zones on 2026-09-05 found chatislam.org serving
no `Content-Security-Policy` on ordinary pages. Its only clickjacking control
was `X-Frame-Options: SAMEORIGIN`, while `frame-ancestors` — the control the
org's own `infra/cloudflare/security/security-headers.json` calls *primary*,
with XFO as mere defence in depth — was absent.

It is **not** added to the existing `/(.*)` catch-all, and that matters:
`/widget(.*)` deliberately allows framing by `ummat.app`. When two CSP headers
apply to one response, browsers **intersect** them, and `'none'` intersected
with `https://ummat.app` is nothing. Putting `frame-ancestors 'none'` on the
catch-all would have silently killed the widget's embed policy.

Hence the negative-lookahead source `"/:path((?!widget).*)"`. It was verified
locally against `path-to-regexp` 6.3.0 before being committed:

| Path | Matches |
|---|---|
| `/`, `/about`, `/chat` | yes |
| `/api/health`, `/api/widget/send` | yes |
| `/widget`, `/widget/embed.js`, `/widget/foo/bar` | **no** |

`frame-ancestors` on an API response is harmless — those are not documents.

## Two things deliberately left alone

- `/widget(.*)` is also **permanently redirected** to `/chat` further down the
  same file, so no widget document is currently served and that header block may
  be vestigial. It is left in place: if the redirect is ever removed, the embed
  policy must still be correct.
- `X-Frame-Options: ALLOW-FROM` in that block is obsolete and honoured by no
  current browser. The widget's real protection is its CSP `frame-ancestors`,
  which is correct and present.

## Do not put comments in vercel.json

A `_comment` key was tried here and removed. On `ummat.dev` the identical
approach broke the production deploy outright:

    The `vercel.json` schema validation failed with the following message:
    should NOT have additional property `_comment`

`packages/ui/vercel.json` in the ummat repo contains a `_comment` key and its
project deploys, which looked like precedent. It is not: grepping for a key
proves the key exists somewhere, not that a deploying project reads that file.
`$schema` is accepted; nothing outside the documented schema is.

Refs: P13-E03-T10.
