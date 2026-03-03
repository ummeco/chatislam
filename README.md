# ChatIslam

AI-powered Islamic knowledge chat and dawah platform. Authentic answers sourced from Quran, Hadith, and classical scholarship.

**Live:** [chatislam.org](https://chatislam.org)

## Features

- AI chat powered by Claude with strict Ahl us-Sunnah wal-Jamaah guidelines
- Audience-adaptive modes:
  - **Muslim mode** -- scholarly, cited answers with source references
  - **New Muslim mode** -- step-by-step guidance, encouraging tone
  - **Dawah mode** -- gentle, bridge-building for non-Muslim audiences
- Source citations from Islam.wiki knowledge base
- Embeddable JS widget for partner websites
- Human escalation to vetted scholars and volunteers

## Tech Stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js, TypeScript, Tailwind CSS |
| AI | Anthropic Claude (Sonnet 4.x) |
| Knowledge | Islam.wiki data integration |

## Project Structure

```
chatislam/
└── web/        chatislam.org — Next.js web app
    └── app/    pages and API routes
```

## Getting Started

```bash
cd web
pnpm install
pnpm dev
```

## Contributing

See the [wiki](https://github.com/ummeco/chatislam/wiki) for architecture docs, theological guidelines, and contribution guidelines.

## License

[MIT](LICENSE)
