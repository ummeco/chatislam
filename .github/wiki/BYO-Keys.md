# BYO Keys

ChatIslam lets you use your own Anthropic API key. This bypasses the platform's daily limits and uses your own Anthropic quota instead.

## Who this is for

- Power users who hit the daily message limit
- Developers who want unlimited access for testing
- Organizations deploying ChatIslam for their community

## How it works

When you provide your own key, ChatIslam routes your requests through Anthropic using your key, not the platform key. Your conversations are still stored in ChatIslam (so conversation history works), but the AI API cost comes from your account.

## Setting up your key

1. Create an Anthropic account at [console.anthropic.com](https://console.anthropic.com)
2. Generate an API key
3. In ChatIslam: Settings > API Key > Enter your key
4. Your key is stored encrypted in the database. It is never logged or exposed in API responses.

## Encryption

API keys are encrypted with AES-256 before storage. The encryption key is stored in the Vercel environment, not in the database. Keys are decrypted only in the server-side Route Handler immediately before the API call — they are never decrypted on the client.

Database column: `ci_user_settings.anthropic_api_key_enc` (encrypted), `ci_user_settings.anthropic_api_key_hint` (last 4 chars, plaintext — for display only).

## Removing your key

Settings > API Key > Remove. Your key is deleted from the database immediately. Platform limits resume on your next message.

## What your key is used for

Only for your chat requests on ChatIslam. It is not used for other users, not shared, and not stored in logs.

## Rate limits with BYO key

BYO Key users have no platform-side limits. Your limit is the Anthropic API rate limit on your account (typically 1,000-4,000 requests/minute on standard tier plans).

## See Also

- [[Rate-Limiting]] -- default platform limits
- [[AI-Architecture]] -- how requests are processed
