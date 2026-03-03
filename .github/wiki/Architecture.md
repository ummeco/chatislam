# Architecture

## Project Structure

```
chatislam/
└── web/                    chatislam.org (Next.js)
    └── app/                pages and API routes
```

## Planned Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, TypeScript, Tailwind CSS |
| AI | Anthropic Claude (Sonnet 4.x) |
| Knowledge source | Islam.wiki data integration |
| Auth | Hasura Auth (shared SSO) |
| Hosting | Vercel |

## Design Principles

1. **Audience-adaptive** -- detect or let user select their background, adjust tone and depth
2. **Source-grounded** -- every response backed by Quran, Hadith, or classical scholarship
3. **Escalation-aware** -- route complex fiqh questions to human scholars
4. **Embeddable** -- JS widget for partner websites

## Backend Integration

ChatIslam connects to the shared Ummat backend via GraphQL:
- API endpoint: `https://api.chatislam.org/v1/graphql`
- Auth: `https://auth.ummat.dev` (shared SSO)
