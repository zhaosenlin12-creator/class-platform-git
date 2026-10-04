#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${1:-/www/wwwroot/teaching-platform}"
CONTAINER_NAME="${CONTAINER_NAME:-teaching-backend}"
LOCAL_BASE_URL="${LOCAL_BASE_URL:-http://127.0.0.1:8081}"
MYSQL_SERVICE=""

log() {
  printf '[recover-backend-503] %s\n' "$*"
}

warn() {
  printf '[recover-backend-503][warn] %s\n' "$*" >&2
}

detect_mysql_service() {
  local candidate
  for candidate in mysqld mysql mariadb; do
    if systemctl status "$candidate" >/dev/null 2>&1; then
      MYSQL_SERVICE="$candidate"
      return
    fi
  done
}

show_mysql_listener() {
  if command -v ss >/dev/null 2>&1; then
    ss -lntp | grep ':3306' || true
    return
  fi

  if command -v netstat >/dev/null 2>&1; then
    netstat -lntp 2>/dev/null | grep ':3306' || true
  fi
}

mysql_is_listening() {
  if command -v ss >/dev/null 2>&1; then
    ss -lnt | grep -q ':3306'
    return
  fi

  if command -v netstat >/dev/null 2>&1; then
    netstat -lnt 2>/dev/null | grep -q ':3306'
    return
  fi

  return 1
}

log "project_root=${PROJECT_ROOT}"
log "container_name=${CONTAINER_NAME}"
log "local_base_url=${LOCAL_BASE_URL}"

cd "$PROJECT_ROOT"

log 'current backend health'
curl -sS -i "${LOCAL_BASE_URL}/health" || true
printf '\n'

log 'backend container status'
docker ps -a --filter "name=^/${CONTAINER_NAME}$" || true

log 'mysql listener status'
show_mysql_listener

detect_mysql_service
if [[ -n "$MYSQL_SERVICE" ]]; then
  log "mysql service status (${MYSQL_SERVICE})"
  systemctl status "$MYSQL_SERVICE" --no-pager -l || true
else
  warn 'unable to detect mysql service name from systemd'
fi

if ! mysql_is_listening; then
  if [[ -z "$MYSQL_SERVICE" ]]; then
    warn 'mysql is not listening on 3306 and no systemd service was detected'
    exit 1
  fi

  log "mysql is not listening on 3306, restarting ${MYSQL_SERVICE}"
  systemctl restart "$MYSQL_SERVICE"
  sleep 5

  log 'mysql listener status after restart'
  show_mysql_listener
fi

log 'backend health after mysql recovery'
if curl -fsS "${LOCAL_BASE_URL}/health" >/dev/null 2>&1; then
  curl -sS -i "${LOCAL_BASE_URL}/health"
  printf '\n'
  log 'backend health recovered without container restart'
  exit 0
fi

log "restarting backend container ${CONTAINER_NAME}"
docker restart "$CONTAINER_NAME" >/dev/null
sleep 8

log 'final backend health'
curl -sS -i "${LOCAL_BASE_URL}/health" || true
printf '\n'

log 'recent backend logs'
docker logs --tail 120 "$CONTAINER_NAME" || true
