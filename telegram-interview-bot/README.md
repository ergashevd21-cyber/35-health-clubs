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


## Cloudflare Workers migration

A Worker-compatible entry point is provided in `worker.ts`. It reuses the existing Telegram and reminder handlers and exposes:
- `GET /health` — health check
- `POST /api/telegram` — Telegram webhook (set this path as the bot webhook)
- Scheduled trigger every minute — runs the existing reminder queue handler

### Configure Worker secrets

Set these as encrypted Worker secrets/environment variables in Cloudflare:
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`. Set `HR_TELEGRAM_IDS` as a non-secret variable if needed.

### Git-connected deployment

In Cloudflare Dashboard, open Workers & Pages, create a Worker using Workers Builds, and connect this repository with root directory `telegram-interview-bot`. Use `npm install` as the build command if prompted and `npx wrangler deploy` as the deploy command. Add the variables above before production traffic is switched. Do not configure the Telegram webhook until health check and secret validation have passed.

This migration does not change the existing Vercel deployment or the separate Supabase database. Test in staging first.
