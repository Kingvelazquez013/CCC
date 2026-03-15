# Option 2: Run with Docker

Docker keeps CCC running in the background and restarts it automatically when your machine reboots. Good for a "set it and forget it" local setup.

## Prerequisites

- **Docker Desktop** — install from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
- A `~/.claude/` directory (created automatically when you use Claude Code)

No env vars needed. Docker mounts your `~/.claude/` directly.

## Steps

### 1. Clone the repo

```bash
git clone https://github.com/ryanvelazquez/ccc.git
cd ccc
```

### 2. Start the container

```bash
docker compose up -d
```

This will:
- Build the CCC image
- Mount `~/.claude/` as read-only inside the container
- Create a persistent volume for the task board database
- Start the server on port 4000
- Set it to restart automatically unless you stop it manually

### 3. Open the dashboard

Visit [http://localhost:4000](http://localhost:4000)

---

## Managing the container

**Check if it's running:**
```bash
docker compose ps
```

**View logs:**
```bash
docker compose logs -f
```

**Stop CCC:**
```bash
docker compose down
```

**Restart after updating the repo:**
```bash
git pull
docker compose up -d --build
```

---

## What's mounted where

| Local path | Container path | Access |
|---|---|---|
| `~/.claude/` | `/home/nextjs/.claude` | Read-only |
| `ccc-data` volume | `/app/data` | Read/write (task DB) |

The `~/.claude/` mount is read-only by design — CCC can browse your files but won't modify them from this setup. For two-way sync (edit from the dashboard and have it write back), see [Option 3: Vercel](option-3-vercel.md).

---

## Troubleshooting

**Port 4000 already in use?** Edit `docker-compose.yml` and change `"4000:4000"` to `"4001:4000"`, then restart.

**Changes to `~/.claude/` not showing?** Hard refresh the browser — CCC reads files on each request.

---

Want to access CCC from your phone or another device? That requires [Option 3: Vercel](option-3-vercel.md).
