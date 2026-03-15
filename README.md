# CCC — Claude Command Center

**A personal dashboard for managing your Claude AI agent infrastructure.**

---

## Ride With Ryan

I'm Ryan — I build AI-powered tools for people who want to move faster without getting lost in the tech. CCC started as something I built for myself: a way to see all my Claude AI files, manage my businesses, and run agent tasks from one clean interface.

I'm sharing it because the hardest part of adopting AI tools isn't the AI — it's organizing the *stuff around it*. CCC gives you a home base. Fork it, run it, make it yours.

Follow along: #ridewithryan Linktree: [3VelazquezAI](https://linktr.ee/3velazquezAI)

---

## What it does

- **Layered Cake viewer** — browse your `~/.claude/` directory: businesses, agents, protocols, templates
- **Business governance** — read and edit your business docs without leaving the dashboard
- **Kanban task board** — create and track tasks with AI agent execution built in
- **File editor** — edit governance docs directly from the UI (local or cloud sync)
- **Sync bridge** — bidirectional sync between your local `~/.claude/` and a Supabase database (cloud option)

---

## Pick your setup

| | Option 1: Local | Option 2: Docker | Option 3: Vercel + Supabase |
|---|---|---|---|
| **Best for** | Trying it out | Always-on, self-hosted | Access from anywhere |
| **Effort** | 5 min | 10 min | 20 min |
| **Env vars** | None | None | 3 vars |
| **Persists across reboots** | No | Yes | Yes |
| **Access from phone/other device** | No | Local network only | Yes |
| **Cost** | Free | Free | Free tier |

### Guides

- [Option 1: Run locally with npm](docs/option-1-quickstart.md)
- [Option 2: Run with Docker](docs/option-2-docker.md)
- [Option 3: Deploy to Vercel + Supabase](docs/option-3-vercel.md) ← Ryan's setup

---

## The Layered Cake

CCC is most useful when your `~/.claude/` directory is organized. The **Layered Cake** is the file structure I use to manage multiple businesses, shared protocols, and agent configurations from one place.

[Read the Layered Cake guide →](docs/layered-cake.md)

---

## Community

If this is useful, star the repo and share it with someone who's trying to get serious about AI tools. PRs welcome — especially around new views, sync targets, or agent integrations.

Built by Ryan Velazquez · [Ride With Ryan](https://twitter.com/ridingwithryan)
