# Rate Limiting

ChatIslam applies per-user rate limits to manage AI API costs and ensure fair access. Limits are enforced at the application layer using Redis.

## Default limits

| Tier | Requests per day | Tokens per day | Notes |
| --- | --- | --- | --- |
| Anonymous | 5 | 5,000 | IP-based, resets at midnight UTC |
| Free account | 20 | 20,000 | User ID-based |
| Ummat+ subscriber | 100 | 100,000 | Priority processing |
| BYO Key | Unlimited | Unlimited | Limited only by your own Anthropic quota |

## Token budgets

Token budgets count total input + output tokens per user per day. Long conversation histories consume budget faster than short ones. The chat interface shows your remaining daily budget in the settings panel.

When a user approaches their limit, a warning is shown: "You have used X of your Y daily messages." When the limit is reached, further messages are blocked until midnight UTC.

## Redis implementation

Rate limits are tracked in Redis with TTL keys:

```
ci_rl:{user_id}:day:{YYYYMMDD}:count      integer, TTL until end of day
ci_rl:{user_id}:day:{YYYYMMDD}:tokens     integer, TTL until end of day
ci_rl:ip:{ip_hash}:day:{YYYYMMDD}:count   integer (anonymous users)
```

If Redis is unavailable, the application falls back to in-memory limits (per-instance, not shared). A Sentry alert fires when Redis falls back.

## Spend alerts

Anthropic API spend is tracked per 24-hour window. Alerts fire at:

- **50% of daily budget** -- informational log only
- **80% of daily budget** -- Slack/PCI alert to admin
- **100% of daily budget** -- API calls are blocked; users see a "Daily AI limit reached" message site-wide

Daily budget is configured in the Vercel environment (`CI_ANTHROPIC_DAILY_BUDGET_USD`).

## BYO Keys

Users with their own Anthropic API key are not subject to platform limits. See [[BYO-Keys]] for setup.

## Admins

Admin accounts bypass all rate limits. Rate limit data is visible in the ChatIslam admin panel.

## See Also

- [[BYO-Keys]] -- using your own API key to bypass limits
- [[AI-Architecture]] -- full AI pipeline overview
