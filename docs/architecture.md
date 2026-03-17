# CCC Architecture

## Overview

Claude Command Center (CCC) is a Kanban-based AI agent orchestration dashboard. It manages tasks through a pipeline, routes them to specialized AI agents, and provides planning, execution, and review workflows.

## Stack

- **Frontend**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: Claude API (Anthropic) for planning, Claude CLI for execution
- **Terminal**: WebSocket + node-pty (optional), HTTP fallback

## Data Model

```
tasks ──────────── The core work items
task_log ────────── Audit trail for task changes
agents ──────────── AI agent configurations
agent_executions ── Execution history and observability
task_planning_messages ── Planning Q&A conversations
```

## Task Pipeline

```
backlog → planning → assigned → working → review → approved → done
```

- **backlog**: New tasks land here
- **planning**: AI asks clarifying questions before execution
- **assigned**: Routed to an agent, waiting to start
- **working**: Agent is actively executing
- **review**: Work complete, awaiting review
- **approved**: Reviewed and approved
- **done**: Released and complete

## Agent Routing

The routing engine (`src/lib/routing.ts`) scores agents by:
1. Department match (+10)
2. Business match (+5)
3. Generalist fallback (+1)
4. Standby preference (+100)

Agents must be `enabled` and in `standby` status to be selected.

## Execution Backends

| Backend | File | Description |
|---------|------|-------------|
| Claude CLI | `executors/claude-cli.ts` | Spawns `claude` CLI process |
| HTTP | `executors/http.ts` | POST to arbitrary endpoint |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/tasks` | GET, POST | List/create tasks |
| `/api/tasks/[id]` | GET, PATCH, DELETE | Task CRUD |
| `/api/tasks/[id]/plan` | GET, POST | Planning Q&A |
| `/api/tasks/[id]/dispatch` | POST | Dispatch to agent |
| `/api/agents` | GET, POST | List/create agents |
| `/api/agents/[id]` | GET, PATCH, DELETE | Agent CRUD |
| `/api/orchestrate` | POST | Auto-claim + dispatch |
| `/api/webhooks/agent-completion` | POST | Completion callback |
| `/api/terminal/exec` | POST | HTTP terminal fallback |

## Frontend Views

| View | Component | Description |
|------|-----------|-------------|
| Dashboard | `page.tsx` | Stats + business overview + feed |
| Pipeline | `KanbanBoard.tsx` | Kanban board with drag-and-drop |
| Agents | `AgentsPanel.tsx` | Agent list, config, execution history |
| Terminal | `TerminalPanel.tsx` | In-browser shell |
| Businesses | `BusinessCard.tsx` | Business/department overview |
| Governance | `GovernanceView.tsx` | SOUL/GOALS editor |
| Live Feed | `LiveFeed.tsx` | Real-time task log |
| Owner | `OwnerPanel.tsx` | Owner settings |
