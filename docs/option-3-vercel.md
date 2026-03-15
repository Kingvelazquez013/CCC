# Option 3: Deploy to Vercel + Supabase

Ryan's personal setup. CCC runs in the cloud — accessible from any device, edits sync back to your local machine, and the task board survives reboots.

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- A **Supabase** account — [supabase.com](https://supabase.com) (free tier works)
- A **Vercel** account — [vercel.com](https://vercel.com) (free tier works)
- A `~/.claude/` directory on your local machine

---

## Step 1: Set up Supabase

### Create a project

1. Go to [supabase.com](https://supabase.com) → New project
2. Give it a name (e.g. `ccc`) and a strong database password
3. Wait for it to provision (~1 min)

### Create the `claude_files` table

In your Supabase project, go to **SQL Editor** and run:

```sql
create table claude_files (
  id uuid default gen_random_uuid() primary key,
  path text not null unique,
  content text,
  updated_at timestamp with time zone default now()
);

create index on claude_files (path);
```

### Get your credentials

In Supabase: **Settings → API**

Copy:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public key** → `SUPABASE_ANON_KEY`

---

## Step 2: Deploy to Vercel

### Fork or clone the repo

Fork `github.com/ryanvelazquez/ccc` on GitHub, then connect it to Vercel:

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your forked repo
3. Framework: **Next.js** (auto-detected)
4. Before deploying, add environment variables (next step)

### Add environment variables in Vercel

In the Vercel project → **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |
| `USE_SUPABASE_FILES` | `true` |

Then deploy.

---

## Step 3: Seed Supabase from your local files

Clone the repo locally (if you haven't):

```bash
git clone https://github.com/YOUR_HANDLE/ccc.git
cd ccc
npm install
```

Create `.env.local` with your credentials:

```bash
cp .env.example .env.local
# Edit .env.local and fill in your Supabase values
```

Push your `~/.claude/` files to Supabase:

```bash
node scripts/sync-claude-files.mjs push
```

Refresh your Vercel deployment — your files should now appear in the dashboard.

---

## Step 4: Set up bidirectional sync (optional but recommended)

To keep your local files and Supabase in sync automatically, add a crontab entry:

```bash
crontab -e
```

Add this line (syncs every 5 minutes):

```
*/5 * * * * cd /path/to/ccc && node scripts/sync-claude-files.mjs sync >> ~/logs/ccc-sync.log 2>&1
```

Replace `/path/to/ccc` with your actual repo path.

**Sync modes:**
- `push` — local → Supabase (seed or overwrite)
- `pull` — Supabase → local (apply cloud edits to disk)
- `sync` — bidirectional, newest file wins

---

## What you get

- CCC accessible from any browser, any device
- Edit governance docs in the dashboard → changes sync back to your Mac
- Task board data lives in Vercel's serverless storage (persists across deploys)
- Zero maintenance after setup

---

## Troubleshooting

**Files not showing after deploy?** Run `node scripts/sync-claude-files.mjs push` locally — Supabase starts empty.

**Env vars not working?** In Vercel, check that vars are set for the **Production** environment (not just Preview).

**Sync conflicts?** The `sync` mode uses `updated_at` timestamps — most recent write wins. Check `~/logs/ccc-sync.log` for details.
