# The Layered Cake

The Layered Cake is a `~/.claude/` directory structure that makes CCC most useful. It's the design Ryan uses to manage multiple businesses, shared protocols, and agent configuration from one place.

You don't need the full structure to use CCC — but the more of it you adopt, the more the dashboard becomes your actual command center.

---

## The structure

```
~/.claude/
├── CLAUDE.md                    # Your global Claude Code instructions
├── GOVERNANCE.md                # File placement rules (where things go)
│
├── _owner/                      # Read-only identity layer
│   ├── RYAN.md                  # Who you are, decision filter, voice
│   ├── BUSINESSES.md            # Registry of all businesses + status
│   ├── APPROVALS.md             # What needs your sign-off vs. autonomous
│   └── DIGEST.md                # Standup digest config
│
├── _shared/                     # Cross-business resources
│   ├── protocols/
│   │   ├── escalation.md        # How agents escalate blockers
│   │   └── digest-format.md     # Standup format spec
│   └── templates/
│       ├── SOUL-template.md     # Agent identity template
│       ├── GOALS-template.md    # Goals doc template
│       └── OKRs-template.md     # OKR tracking template
│
├── businesses/                  # One folder per company
│   ├── bizzycar/
│   │   ├── marketing/
│   │   ├── product/
│   │   └── ops/
│   ├── bookd/
│   ├── lifeos/
│   └── automotive-intelligence/
│
├── skills/                      # Claude Code skills (slash commands)
├── agents/                      # Agent configs and prompts
├── commands/                    # Custom slash commands
└── hooks/                       # Automation hooks
```

---

## The layers

### `_owner/` — Identity layer
This is read-only context that every Claude session inherits. It answers "who am I working for and what do they care about?" Put your identity doc, business registry, and approval rules here. Claude reads this first.

### `_shared/` — Cross-cutting resources
Protocols (how to handle escalations, how to format digests) and templates (SOUL docs, OKRs) that apply across all businesses. Agents reference these instead of duplicating logic.

### `businesses/` — Per-company folders
One folder per business, organized by department. Strategy docs, OKRs, product specs, and operational notes all live here. CCC's Layered Cake viewer makes it easy to browse without digging through Finder.

---

## Why this structure

- **CCC reads it all** — every file shows up in the dashboard sidebar
- **Agents inherit context** — Claude Code sessions pick up `CLAUDE.md` and `_owner/` automatically
- **Clear ownership** — you always know where something lives (GOVERNANCE.md is the rule book)
- **Scales across businesses** — adding a new business is just `mkdir businesses/new-company/`

---

## Getting started

You don't have to build it all at once. Start with:

1. Create `~/.claude/CLAUDE.md` with your basic preferences
2. Create `~/.claude/_owner/RYAN.md` (or whatever your name is) with your identity
3. Add your first business: `mkdir -p ~/.claude/businesses/my-company/ops`

CCC will show whatever's there. Build the structure as you go.

---

## Templates

The `_shared/templates/` folder contains starter docs for:

- **SOUL-template.md** — Agent identity and personality
- **GOALS-template.md** — Business goals document
- **OKRs-template.md** — Quarterly OKR tracking

Copy these into your business folders and fill them in.
