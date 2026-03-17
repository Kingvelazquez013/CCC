#!/bin/bash
# CCC Orchestrator — Community Version
# Targets a local CCC instance (localhost:4000 via Docker).
# For Ryan's personal version, orchestration runs via Claude Code CronCreate.
#
# Setup:
#   chmod +x orchestrator/tick.sh
#   Add to crontab: */5 * * * * /path/to/ccc/orchestrator/tick.sh >> /tmp/ccc-orchestrator.log 2>&1
#
# Telegram notifications (optional):
#   Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in your environment or in ~/.ccc-config

set -euo pipefail

CCC_URL="${CCC_URL:-http://localhost:4000}"

# Load optional local config
[ -f "${HOME}/.ccc-config" ] && source "${HOME}/.ccc-config"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# ── 1. Claim next backlog task (atomic) ───────────────────────────────────────
HTTP_CODE=$(curl -s -o /tmp/ccc-task.json -w "%{http_code}" -X POST "${CCC_URL}/api/tasks/next")

if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "000" ]; then
  log "No backlog tasks. Exiting."
  exit 0
fi

TASK_ID=$(jq -r '.id // empty' /tmp/ccc-task.json)
if [ -z "$TASK_ID" ]; then
  log "No task ID in response. Exiting."
  exit 0
fi

TASK_TITLE=$(jq -r '.title' /tmp/ccc-task.json)
TASK_DESC=$(jq -r '.description' /tmp/ccc-task.json)
TASK_BUSINESS=$(jq -r '.business' /tmp/ccc-task.json)
TASK_DEPT=$(jq -r '.department' /tmp/ccc-task.json)
TASK_PRIORITY=$(jq -r '.priority' /tmp/ccc-task.json)

log "Claimed: \"${TASK_TITLE}\" (${TASK_ID}, priority=${TASK_PRIORITY})"

# ── 2. Patch helper ───────────────────────────────────────────────────────────
patch_task() {
  curl -s -X PATCH "${CCC_URL}/api/tasks/${TASK_ID}" \
    -H "Content-Type: application/json" \
    -d "$1" > /dev/null
}

# ── 3. Build agent prompt ─────────────────────────────────────────────────────
read -r -d '' WORK_PROMPT << PROMPT || true
You are an autonomous agent completing a task from the Claude Command Center.

TASK ID: ${TASK_ID}
TITLE: ${TASK_TITLE}
DESCRIPTION: ${TASK_DESC}
BUSINESS: ${TASK_BUSINESS}
DEPARTMENT: ${TASK_DEPT}
PRIORITY: ${TASK_PRIORITY}
CCC API: ${CCC_URL}

Instructions:
1. Immediately mark the task as working:
   curl -s -X PATCH '${CCC_URL}/api/tasks/${TASK_ID}' -H 'Content-Type: application/json' -d '{"stage":"working"}'
2. Complete the task fully and autonomously using all tools available to you.
3. When done, update with your result:
   curl -s -X PATCH '${CCC_URL}/api/tasks/${TASK_ID}' -H 'Content-Type: application/json' -d '{"stage":"done","description":"RESULT: <your summary>"}'
4. If you cannot complete the task, output exactly: AGENT_FAILED: <reason>
   Do NOT update the stage yourself on failure.
PROMPT

# ── 4. Route to the right agent based on department ──────────────────────────
#
# Engineering tasks (engineering, dev, development, infra, platform) start at
# Sonnet with Opus fallback — they need strong reasoning + code generation.
#
# All other tasks (marketing, sales, ops, support, etc.) start at Haiku with
# Sonnet → Opus escalation — cheaper and fast enough for non-code work.
#
# Override: set CCC_FORCE_MODEL in your env to skip routing entirely.

route_agent() {
  local dept
  dept=$(echo "$TASK_DEPT" | tr '[:upper:]' '[:lower:]')

  case "$dept" in
    engineering|dev|development|infra|platform|backend|frontend|devops|data)
      echo "engineering"
      ;;
    *)
      echo "general"
      ;;
  esac
}

AGENT_TYPE=$(route_agent)

if [ -n "${CCC_FORCE_MODEL:-}" ]; then
  MODELS=("$CCC_FORCE_MODEL")
  MODEL_NAMES=("${CCC_FORCE_MODEL}")
  AGENT_LABEL="custom"
elif [ "$AGENT_TYPE" = "engineering" ]; then
  MODELS=("claude-sonnet-4-6" "claude-opus-4-6")
  MODEL_NAMES=("Sonnet" "Opus")
  AGENT_LABEL="eng-agent"
else
  MODELS=("claude-haiku-4-5-20251001" "claude-sonnet-4-6" "claude-opus-4-6")
  MODEL_NAMES=("Haiku" "Sonnet" "Opus")
  AGENT_LABEL="general-agent"
fi

log "Routed as ${AGENT_TYPE} → agent=${AGENT_LABEL}, models=[${MODEL_NAMES[*]}]"

SUCCESS=false
LAST_ERROR=""

for i in "${!MODELS[@]}"; do
  MODEL="${MODELS[$i]}"
  MODEL_NAME="${MODEL_NAMES[$i]}"
  log "Trying ${MODEL_NAME}..."

  patch_task "{\"assigned_agent\":\"${AGENT_LABEL} (${MODEL_NAME})\"}"

  RESULT=$(claude --model "$MODEL" -p "$WORK_PROMPT" --dangerously-skip-permissions 2>&1) || true

  if echo "$RESULT" | grep -q "^AGENT_FAILED:"; then
    LAST_ERROR="$RESULT"
    log "${MODEL_NAME} reported failure. Escalating..."
    continue
  fi

  SUCCESS=true
  log "${MODEL_NAME} completed task ${TASK_ID}."
  break
done

# ── 5. Hard fail → review + Telegram ─────────────────────────────────────────
if [ "$SUCCESS" = false ]; then
  log "All models failed. Moving to review."
  ERROR_SNIPPET=$(echo "$LAST_ERROR" | head -3 | tr '"' "'")
  patch_task "{\"stage\":\"review\",\"description\":\"ESCALATED: All models failed. Last error: ${ERROR_SNIPPET}\"}"

  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    MSG="🚨 *Task Escalated*

*Task:* ${TASK_TITLE}
*Business:* ${TASK_BUSINESS}
*Priority:* ${TASK_PRIORITY}
*ID:* \`${TASK_ID}\`

All 3 models (Haiku → Sonnet → Opus) failed.
Review at: ${CCC_URL}"

    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "parse_mode=Markdown" \
      --data-urlencode "text=${MSG}" > /dev/null

    log "Telegram alert sent."
  else
    log "No Telegram credentials — skipping notification."
  fi
fi
