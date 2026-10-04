#!/usr/bin/env bash
set -euo pipefail

# server-guard-alert.sh
# Simple webhook notifier for server-guard.
# Usage: server-guard-alert.sh "message"

MSG="${1:-}"
WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
ALERT_TYPE="${ALERT_TYPE:-dingtalk}" # dingtalk|wecom|generic

if [[ -z "$WEBHOOK_URL" || -z "$MSG" ]]; then
  exit 0
fi

payload=""
case "$ALERT_TYPE" in
  wecom)
    payload=$(printf '{"msgtype":"text","text":{"content":"%s"}}' "[server-guard] ${MSG}")
    ;;
  generic)
    payload=$(printf '{"text":"%s"}' "[server-guard] ${MSG}")
    ;;
  *)
    # dingtalk default
    payload=$(printf '{"msgtype":"text","text":{"content":"%s"}}' "[server-guard] ${MSG}")
    ;;
esac

curl -sS -X POST -H "Content-Type: application/json" -d "$payload" "$WEBHOOK_URL" >/dev/null 2>&1 || true
