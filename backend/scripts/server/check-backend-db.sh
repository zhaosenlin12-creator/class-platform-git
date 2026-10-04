#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${1:-/www/wwwroot/teaching-platform}"
CONTAINER_NAME="${CONTAINER_NAME:-teaching-backend}"
LOCAL_BASE_URL="${LOCAL_BASE_URL:-http://127.0.0.1:8081}"
TAIL_LINES="${TAIL_LINES:-120}"

log() {
  printf '[check-backend-db] %s\n' "$*"
}

warn() {
  printf '[check-backend-db][warn] %s\n' "$*" >&2
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '[check-backend-db][error] missing command: %s\n' "$1" >&2
    exit 1
  fi
}

require_command docker
require_command curl

if [[ ! -d "$PROJECT_ROOT" ]]; then
  printf '[check-backend-db][error] project root not found: %s\n' "$PROJECT_ROOT" >&2
  exit 1
fi

log "project_root=${PROJECT_ROOT}"
log "container_name=${CONTAINER_NAME}"
log "local_base_url=${LOCAL_BASE_URL}"

cd "$PROJECT_ROOT"

log 'docker container status'
docker ps -a --filter "name=^/${CONTAINER_NAME}$"

log 'local health endpoint'
if ! curl -sS -i "${LOCAL_BASE_URL}/health"; then
  warn 'local health endpoint is unreachable'
fi
printf '\n'

running_container="$(docker ps --format '{{.Names}}' | grep -x "${CONTAINER_NAME}" || true)"
if [[ -z "$running_container" ]]; then
  warn "container ${CONTAINER_NAME} is not running, skip docker exec checks"
  exit 2
fi

log 'backend env summary inside container'
docker exec "$CONTAINER_NAME" sh -lc 'printf "NODE_ENV=%s\nDB_HOST=%s\nDB_PORT=%s\nDB_NAME=%s\nDB_USER=%s\n" "$NODE_ENV" "$DB_HOST" "$DB_PORT" "$DB_NAME" "$DB_USER"'

log 'database runtime ping inside container'
docker exec "$CONTAINER_NAME" node scripts/check-database-runtime.js || true

log "recent backend logs (${TAIL_LINES} lines)"
docker logs --tail "$TAIL_LINES" "$CONTAINER_NAME" || true

log 'database services on host'
systemctl list-units --type=service --all | grep -Ei 'mysql|mysqld|mariadb' || true
