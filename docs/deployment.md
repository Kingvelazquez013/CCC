# CCC Deployment Guide

## Quick Start

### Option 1: Docker (recommended)

```bash
cp .env.example .env.local
# Fill in your Supabase URL, anon key, and Anthropic API key

docker compose up --build
```

Open http://localhost:4000

### Option 2: Local Development

```bash
npm install
cp .env.example .env.local
# Fill in your env vars

npm run dev
```

Open http://localhost:4000

### Option 3: With Terminal PTY Support

```bash
npm install
npm install node-pty ws  # Optional: enables full PTY terminal

# Use custom server instead of next dev
node server.js
```

## Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Copy the project URL and anon key to `.env.local`
3. Run the migration SQL in the Supabase SQL editor:
   - `supabase/migrations/001_agents_and_planning.sql`
4. Optionally run seed data:
   - `scripts/seed.sql`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `ANTHROPIC_API_KEY` | For planning | Claude API key for planning Q&A |
| `WEBHOOK_SECRET` | No | HMAC secret for webhook validation |
| `CCC_FORCE_MODEL` | No | Override agent model selection |

## Cron Setup

To auto-process backlog tasks, set up a cron job:

```bash
# Every 2 minutes, orchestrate next task
*/2 * * * * curl -X POST http://localhost:4000/api/orchestrate
```

## Production

For production deployment:
1. Set `NODE_ENV=production`
2. Run `npm run build` then `npm start`
3. Or use Docker: `docker compose up -d`
4. Set up HTTPS via reverse proxy (nginx, Caddy, etc.)
