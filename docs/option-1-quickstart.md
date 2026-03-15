# Option 1: Run Locally with npm

The fastest way to get CCC running. No env vars, no accounts — just clone and go.

## Prerequisites

- **Claude Code** installed ([claude.ai/code](https://claude.ai/code))
- **Node.js 18+** — check with `node --version`, install from [nodejs.org](https://nodejs.org) if needed
- A `~/.claude/` directory (created automatically when you use Claude Code)

## Steps

### 1. Clone the repo

```bash
git clone https://github.com/ryanvelazquez/ccc.git
cd ccc
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the data directory

CCC uses a local SQLite database for the task board. Create the folder it expects:

```bash
mkdir -p data
```

### 4. Start the dev server

```bash
npm run dev
```

### 5. Open the dashboard

Visit [http://localhost:4000](http://localhost:4000)

You should see your `~/.claude/` directory loaded in the sidebar.

---

## Notes

- CCC reads your `~/.claude/` files directly from disk — no sync setup needed
- The task board data lives in `data/` (gitignored, stays local)
- Stop the server anytime with `Ctrl+C`
- The server won't restart automatically after a reboot — run `npm run dev` again when you need it

## Troubleshooting

**Port already in use?**
```bash
PORT=4001 npm run dev
```

**Can't see your files?** Make sure Claude Code has been run at least once so `~/.claude/` exists.

---

Ready for something more permanent? Try [Option 2: Docker](option-2-docker.md) or [Option 3: Vercel](option-3-vercel.md).
