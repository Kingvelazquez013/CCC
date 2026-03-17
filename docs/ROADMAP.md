# CCC Product Roadmap

> Living document. Updated as decisions are made.

---

## Legend

- **NOW** — Currently building or using
- **NEXT** — Up next, planned
- **LATER** — Needs a dedicated planning session
- **PARKED** — Noted, not prioritized yet

---

## The Three Layers

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│         Next.js 14 / React / Tailwind               │
│   Dashboard, Pipeline, Agents, Terminal, Live Feed   │
│                    ✅ NOW                            │
├─────────────────────────────────────────────────────┤
│                    BACKEND                           │
│            Next.js API Routes (for now)              │
│     Auth, CRUD, Orchestration, WebSocket gateway     │
│                  🔶 NEXT / LATER                     │
├─────────────────────────────────────────────────────┤
│                     DATA                             │
│               Supabase (PostgreSQL)                  │
│    tasks, agents, executions, planning, logs         │
│                    ✅ NOW                            │
└─────────────────────────────────────────────────────┘
```

---

## Frontend — NOW

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard with stats | ✅ Done | Workspace overview, department counts |
| Pipeline (Kanban) | ✅ Done | Drag-and-drop task board |
| Agent panel + creator | ✅ Done | 12 built-in roles, model picker, executor selector |
| Sidebar navigation | ✅ Done | Collapsible, all views |
| Terminal dock | ✅ Done | Mock UI — no real backend yet |
| Light/dark theme | ✅ Done | Toggle in header + user menu |
| Live Feed | ✅ Done | Real-time task log |
| Governance view | ✅ Done | SOUL/GOALS editor |
| Workspaces view | ✅ Done | Replaces "Businesses" |

---

## Backend — NEXT

> **Current approach:** Next.js API routes (`src/app/api/`)
> **Decision:** Start here. Revisit when we hit scaling or long-running process limits.

| Feature | Status | Notes |
|---------|--------|-------|
| Connect frontend to Supabase | 🔶 Next | Wire up real data to dashboard, pipeline, agents |
| Auth (Supabase Auth) | 🔶 Next | Login page, session management, protected routes |
| Task CRUD API | 🔶 Next | Create/read/update/delete tasks via API routes |
| Agent CRUD API | 🔶 Next | Manage agent configs |
| Orchestrator API | 🔶 Next | Auto-claim + dispatch tasks to agents |
| WebSocket gateway | 🔶 Next | Live feed, agent status, terminal streams |
| Terminal backend | 🔶 Next | Real PTY via server.js or HTTP fallback |

---

## Backend — LATER (needs dedicated planning session)

> ⚠️ **REVISIT:** The executor runtime is the biggest architectural decision remaining.
> When agents actually run tasks, where does the code execute?

| Decision | Options | Notes |
|----------|---------|-------|
| **Executor runtime** | Docker containers, Supabase Edge Functions, OpenClaw, cloud VMs | How/where agent code actually runs. Security, isolation, cost, latency all matter. |
| **Separate backend server** | Express/Fastify vs. keep API routes | If API routes hit limits (long-running tasks, WebSocket complexity), break out to a standalone server |
| **Queue / job system** | BullMQ, Supabase Realtime, custom | How tasks get queued and distributed to agents |
| **Observability** | Logging, tracing, error tracking | Agent execution monitoring at scale |

---

## Data — NOW (Supabase)

| Table | Status | Notes |
|-------|--------|-------|
| tasks | ✅ Schema exists | Core work items |
| task_log | ✅ Schema exists | Audit trail |
| agents | ✅ Schema exists | Agent configurations |
| agent_executions | ✅ Schema exists | Execution history |
| task_planning_messages | ✅ Schema exists | Planning Q&A |

---

## Feature Ideas — PARKED

| Idea | Notes |
|------|-------|
| Login / signup page | Supabase Auth, protected routes |
| OpenClaw executor | Community agent execution runtime |
| Agent marketplace | Share/import agent configs |
| Mobile responsive | Dashboard on phone/tablet |
| Notification system | Email/Slack alerts on task state changes |
| Multi-user / RBAC | Role-based access for teams |
| Billing / usage tracking | Per-agent token usage, cost monitoring |

---

## Journey Map

```
WHERE WE ARE                          WHERE WE'RE GOING
─────────────                         ─────────────────

 ✅ Frontend UI ──────────┐
                          │
 ✅ Supabase schema ──────┼──▶ 🔶 Wire frontend ──▶ 🔶 Auth ──▶ 🔶 Orchestrator
                          │       to real data        login       auto-dispatch
                          │
 ✅ API route stubs ──────┘
                                                          │
                                                          ▼
                                                   ⚠️ EXECUTOR RUNTIME
                                                   (dedicated planning session)
                                                          │
                                                          ▼
                                                   🔮 Agents actually
                                                      running tasks
```

---

*Last updated: 2026-03-17*
