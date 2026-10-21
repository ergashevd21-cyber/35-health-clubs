# 35 Health Clubs — Interview Bot

Standalone Telegram interview-tracking bot. This app is isolated in `telegram-interview-bot/` and uses its own Supabase project (`wspomgqzbsdkfiqsfcdw`). It does not use the survey site's database.

## Runtime
- Vercel Functions for the Telegram webhook and scheduled reminder worker.
- Supabase PostgreSQL for candidate, interview, role, audit and reminder data.
- Time zone: `Asia/Tashkent`.

## Required Vercel environment variables
- `TELEGRAM_BOT_TOKEN` — secret token from BotFather.
- `TELEGRAM_WEBHOOK_SECRET` — random secret used to verify webhook requests.
- `SUPABASE_URL` — URL of the dedicated interview-bot Supabase project.
- `SUPABASE_SERVICE_ROLE_KEY` — service-role key for server-side use only; never expose it to clients or commit it to Git.
- `CRON_SECRET` — secret for the scheduled reminder endpoint.

Do not set the Telegram webhook until these variables are configured. Never put secrets in source control.

## Current status
Database schema is provisioned. The bot still requires Telegram credentials, Vercel environment variables, webhook registration, and end-to-end tests before production use.
