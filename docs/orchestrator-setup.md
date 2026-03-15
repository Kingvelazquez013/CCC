# Orchestrator & Stand-Up Setup

Automate CCC task execution and get Telegram digest updates 3x/day.

## Prerequisites

- CCC running (any option — local, Docker, or Vercel)
- A Telegram bot token ([create one with @BotFather](https://t.me/BotFather))
- Your Telegram chat ID (send any message to your bot, then check: `https://api.telegram.org/bot<TOKEN>/getUpdates`)

---

## Mac / Linux

### 1. Save your credentials

Create `~/.ccc-config`:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
CCC_URL=https://your-ccc-url.vercel.app   # or http://localhost:4000
```

### 2. Make scripts executable

```bash
chmod +x /path/to/ccc/orchestrator/tick.sh
chmod +x /path/to/ccc/orchestrator/standup.sh
```

### 3. Add to crontab

```bash
crontab -e
```

Paste these lines (update the path to your CCC repo):

```
# CCC Orchestrator — drain backlog every 5 min
*/5 * * * * source ~/.ccc-config && /path/to/ccc/orchestrator/tick.sh >> /tmp/ccc-orchestrator.log 2>&1

# CCC Stand-Ups — 7am, 12pm, 7pm
0 7  * * * /path/to/ccc/orchestrator/standup.sh morning >> /tmp/ccc-standup.log 2>&1
0 12 * * * /path/to/ccc/orchestrator/standup.sh midday  >> /tmp/ccc-standup.log 2>&1
0 19 * * * /path/to/ccc/orchestrator/standup.sh evening >> /tmp/ccc-standup.log 2>&1
```

### 4. Verify

Check logs anytime:
```bash
tail -f /tmp/ccc-orchestrator.log
tail -f /tmp/ccc-standup.log
```

---

## Windows

### 1. Save your credentials

Create `%USERPROFILE%\.ccc-config.ps1` (e.g. `C:\Users\YourName\.ccc-config.ps1`):

```powershell
$env:TELEGRAM_BOT_TOKEN = "your_bot_token_here"
$env:TELEGRAM_CHAT_ID   = "your_chat_id_here"
$env:CCC_URL            = "https://your-ccc-url.vercel.app"
```

### 2. Allow PowerShell scripts (one-time)

Open PowerShell **as Administrator**:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 3. Set up Task Scheduler

Open **Task Scheduler** → Create Basic Task for each entry below.

**Orchestrator (every 5 min):**
- Name: `CCC Orchestrator`
- Trigger: Daily, repeat every 5 minutes, indefinitely
- Action: Start a program
  - Program: `powershell.exe`
  - Arguments: `-NonInteractive -File "C:\path\to\ccc\orchestrator\tick.ps1"`

> Note: `tick.ps1` (Windows version of the orchestrator) uses the same logic as `tick.sh` but via PowerShell. If you have WSL installed, you can point Task Scheduler at `wsl.exe` and run `tick.sh` directly.

**Morning Stand-Up (7am daily):**
- Name: `CCC Morning Stand-Up`
- Trigger: Daily at 7:00 AM
- Action: `powershell.exe`
- Arguments: `-NonInteractive -File "C:\path\to\ccc\orchestrator\standup.ps1" -Period morning`

**Midday Check-In (12pm daily):**
- Name: `CCC Midday Check-In`
- Trigger: Daily at 12:00 PM
- Arguments: `-NonInteractive -File "C:\path\to\ccc\orchestrator\standup.ps1" -Period midday`

**Evening Wrap-Up (7pm daily):**
- Name: `CCC Evening Wrap-Up`
- Trigger: Daily at 7:00 PM
- Arguments: `-NonInteractive -File "C:\path\to\ccc\orchestrator\standup.ps1" -Period evening`

### 4. Test manually

```powershell
cd C:\path\to\ccc
.\orchestrator\standup.ps1 -Period morning
```

You should receive a Telegram message within seconds.

---

## What you'll get

Every morning, midday, and evening, Telegram sends you a digest like:

```
☀️ Morning Stand-Up

📊 Board Summary
• Backlog: 3  |  Working: 1  |  Review: 0  |  Done: 12

🔧 In Progress
  [H] Draft BizzyCar outreach email (bizzycar) → Sonnet

📥 Up Next (Backlog)
  [M] Research competitor pricing (bookd)
  [L] Update SOUL doc (lifeos)

🔗 Open CCC
```

The orchestrator runs in the background, claiming tasks from the board and executing them via Claude. Escalations (when all models fail) are sent as immediate alerts.
