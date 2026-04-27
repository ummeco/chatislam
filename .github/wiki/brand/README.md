# ChatIslam Brand Assets

Public repo brand documentation. See Ummeco PPI for multi-repo context.

## Colors

| Token | Hex | Use |
|---|---|---|
| Primary | `#79C24C` | Buttons, send button, links |
| Accent | `#C9F27A` | Highlights, AI typing indicator |
| Background | `#07180d` | Chat background |
| User bubble | `#1E5E2F` | Outgoing message bubbles |
| AI bubble | `#0f2418` | Incoming message bubbles |
| Foreground | `#f0fce8` | Message text |

## Theme File

`chatislam/web/app/theme.css` — import in `layout.tsx`.

## Required Asset Sizes

| Asset | Size | Location |
|---|---|---|
| favicon.ico | multi-size | `web/public/favicon.ico` |
| apple-touch-icon.png | 180x180 | `web/public/apple-touch-icon.png` |
| android-chrome-192.png | 192x192 | `web/public/android-chrome-192x192.png` |
| android-chrome-512.png | 512x512 | `web/public/android-chrome-512x512.png` |
| og-image.png | 1200x630 | `web/public/og-image.png` |

## Typography

- Latin: Inter (Google Fonts, Variable)
- Arabic: Noto Naskh Arabic (Google Fonts, MIT) — for Arabic Q&A responses
- Urdu: Noto Nastaliq Urdu (Google Fonts, MIT) — load only on Urdu routes

## Source

Master icon and logo source files are maintained in the private `ummeco/ummat` repo under `.docs/brand/source/`.
