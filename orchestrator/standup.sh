#!/bin/bash
# CCC Daily Stand-Up — sends a task board digest to Telegram
# Runs 3x/day: 7am, 12pm, 7pm

set -euo pipefail

[ -f "${HOME}/.ccc-config" ] && source "${HOME}/.ccc-config"

CCC_URL="${CCC_URL:-https://ccc-ten-weld.vercel.app}"
PERIOD="${1:-update}"  # morning | midday | evening | update

# Fetch all tasks
TASKS=$(curl -s "${CCC_URL}/api/tasks")

summarize() {
  local stage="$1"
  echo "$TASKS" | python3 -c "
import sys, json
tasks = json.load(sys.stdin)
filtered = [t for t in tasks if t.get('stage') == '$stage']
if not filtered:
    print('  _none_')
else:
    for t in filtered[:5]:
        pri = t.get('priority','?')[0].upper()
        biz = t.get('business','?')[:12]
        title = t.get('title','?')[:40]
        agent = t.get('assigned_agent','')
        suffix = f' → {agent}' if agent else ''
        print(f'  [{pri}] {title} ({biz}){suffix}')
    if len(filtered) > 5:
        print(f'  ... +{len(filtered)-5} more')
"
}

count_stage() {
  echo "$TASKS" | python3 -c "
import sys, json
tasks = json.load(sys.stdin)
print(len([t for t in tasks if t.get('stage') == '$1']))
"
}

BACKLOG=$(count_stage backlog)
WORKING=$(count_stage working)
REVIEW=$(count_stage review)
DONE=$(count_stage done)

case "$PERIOD" in
  morning)  HEADER="☀️ *Morning Stand-Up*" ;;
  midday)   HEADER="🌤 *Midday Check-In*" ;;
  evening)  HEADER="🌙 *Evening Wrap-Up*" ;;
  *)        HEADER="📋 *CCC Status Update*" ;;
esac

MSG="${HEADER}

📊 *Board Summary*
• Backlog: ${BACKLOG}  |  Working: ${WORKING}  |  Review: ${REVIEW}  |  Done: ${DONE}

🔧 *In Progress*
$(summarize working)

📥 *Up Next (Backlog)*
$(summarize backlog)

🔍 *Needs Review*
$(summarize review)

🔗 [Open CCC](${CCC_URL})"

curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -d "chat_id=${TELEGRAM_CHAT_ID}" \
  -d "parse_mode=Markdown" \
  -d "disable_web_page_preview=true" \
  --data-urlencode "text=${MSG}" > /dev/null

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Stand-up sent (${PERIOD})"
