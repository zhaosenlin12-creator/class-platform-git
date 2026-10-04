#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="/www/wwwroot/teaching-platform"
COMPOSE_FILE="docker-compose.prod.yml"
CONTAINER_NAME="teaching-backend"
APP_UID="10001"
APP_GID="10001"
PRUNE_UNUSED=0
REFRESH_SWAP=0
DROP_CACHE=0
TAIL_LOGS=80
RUN_RESOURCE_TAXONOMY_MIGRATION=0

print_help() {
  cat <<'EOF'
Usage:
  ./scripts/server/update-backend-docker.sh [options]

Options:
  --project-root PATH     Project root. Default: /www/wwwroot/teaching-platform
  --compose-file PATH     Compose file relative to project root or absolute path.
                          Default: docker-compose.prod.yml
  --prune-unused          Prune exited containers, dangling images and builder cache.
  --refresh-swap          Run swapoff -a && swapon -a after deploy. Requires root.
  --drop-cache            Run sync && echo 3 > /proc/sys/vm/drop_caches. Requires root.
  --tail-logs N           Docker logs tail size. Default: 80
  --run-resource-taxonomy-migration
                          Execute backend/scripts/ensure-resource-taxonomy-fields.js
                          inside the container after rebuild.
  -h, --help              Show help.

Examples:
  ./scripts/server/update-backend-docker.sh
  ./scripts/server/update-backend-docker.sh --prune-unused
  ./scripts/server/update-backend-docker.sh --run-resource-taxonomy-migration
  sudo ./scripts/server/update-backend-docker.sh --prune-unused --refresh-swap --drop-cache
EOF
}

log() {
  printf '[update-backend] %s\n' "$*"
}

warn() {
  printf '[update-backend][warn] %s\n' "$*" >&2
}

show_db_context() {
  local env_file="$PROJECT_ROOT/backend/.env"
  local production_env_file="$PROJECT_ROOT/backend/.env.production"

  if [[ -f "$env_file" ]]; then
    log "Current backend DB env (.env, non-secret fields):"
    grep -E '^(NODE_ENV|DB_HOST|DB_PORT|DB_NAME|DB_USER)=' "$env_file" || true
  else
    warn "Environment file not found: ${env_file}"
  fi

  if [[ -f "$production_env_file" ]]; then
    warn "Found ${production_env_file}. Verify it is not stale and conflicting with backend/.env."
    grep -E '^(NODE_ENV|DB_HOST|DB_PORT|DB_NAME|DB_USER)=' "$production_env_file" || true
  fi

  if command -v ss >/dev/null 2>&1; then
    log "Listening TCP ports related to MySQL:"
    ss -lnt | grep ':3306' || warn "No process is currently listening on TCP 3306."
  elif command -v netstat >/dev/null 2>&1; then
    log "Listening TCP ports related to MySQL:"
    netstat -lnt 2>/dev/null | grep ':3306' || warn "No process is currently listening on TCP 3306."
  fi

  if command -v docker >/dev/null 2>&1; then
    log "Docker containers exposing MySQL-like ports:"
    docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep -i '3306\|mysql' || warn "No running Docker container exposes MySQL on 3306."
  fi
}

on_error() {
  warn "Backend Docker update failed."
  warn "A common cause in this rollout is the backend container being unable to reach MySQL."
  show_db_context
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

resolve_compose_path() {
  if [[ "$COMPOSE_FILE" = /* ]]; then
    printf '%s\n' "$COMPOSE_FILE"
    return
  fi

  printf '%s/%s\n' "$PROJECT_ROOT" "$COMPOSE_FILE"
}

detect_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    printf 'docker compose\n'
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    printf 'docker-compose\n'
    return
  fi

  printf '\n'
}

run_compose() {
  if [[ "$COMPOSE_CMD" = "docker compose" ]]; then
    docker compose -f "$COMPOSE_PATH" "$@"
    return
  fi

  docker-compose -f "$COMPOSE_PATH" "$@"
}

ensure_runtime_dirs() {
  local uploads_dir="$PROJECT_ROOT/uploads"
  local classroom_dir="$PROJECT_ROOT/uploads/classroom"
  local logs_dir="$PROJECT_ROOT/logs"

  mkdir -p "$uploads_dir" "$classroom_dir" "$logs_dir"
  chown -R "${APP_UID}:${APP_GID}" "$uploads_dir" "$logs_dir"
  chmod -R 775 "$uploads_dir" "$logs_dir"
}

cleanup_existing_container() {
  local container_ids
  container_ids="$(docker ps -aq --filter "name=^/${CONTAINER_NAME}$")"

  if [[ -z "$container_ids" ]]; then
    log "No existing container named ${CONTAINER_NAME}."
    return
  fi

  log "Removing existing container ${CONTAINER_NAME}."
  docker rm -f $container_ids >/dev/null
}

rebuild_backend() {
  log "Rebuilding backend image and recreating container."
  (
    cd "$PROJECT_ROOT"
    run_compose up -d --build backend
  )
}

run_resource_taxonomy_migration_if_requested() {
  if [[ "$RUN_RESOURCE_TAXONOMY_MIGRATION" -ne 1 ]]; then
    return
  fi

  log "Running resource taxonomy migration inside ${CONTAINER_NAME}."
  docker exec "$CONTAINER_NAME" node scripts/ensure-resource-taxonomy-fields.js
}

prune_unused_artifacts() {
  if [[ "$PRUNE_UNUSED" -ne 1 ]]; then
    return
  fi

  log "Pruning exited containers."
  docker container prune -f >/dev/null || true

  log "Pruning dangling images."
  docker image prune -f >/dev/null || true

  log "Pruning builder cache."
  docker builder prune -f >/dev/null || true
}

refresh_swap_if_requested() {
  if [[ "$REFRESH_SWAP" -ne 1 ]]; then
    return
  fi

  if [[ "$(id -u)" -ne 0 ]]; then
    warn "--refresh-swap requested but script is not running as root. Skipped."
    return
  fi

  if ! command -v swapon >/dev/null 2>&1 || ! command -v swapoff >/dev/null 2>&1; then
    warn "swap utilities not available. Skipped."
    return
  fi

  if ! swapon --noheadings --show=NAME 2>/dev/null | grep -q .; then
    log "No active swap detected."
    return
  fi

  log "Refreshing swap."
  swapoff -a
  swapon -a
}

drop_cache_if_requested() {
  if [[ "$DROP_CACHE" -ne 1 ]]; then
    return
  fi

  if [[ "$(id -u)" -ne 0 ]]; then
    warn "--drop-cache requested but script is not running as root. Skipped."
    return
  fi

  if [[ ! -w /proc/sys/vm/drop_caches ]]; then
    warn "/proc/sys/vm/drop_caches is not writable. Skipped."
    return
  fi

  log "Dropping filesystem cache."
  sync
  echo 3 > /proc/sys/vm/drop_caches
}

run_health_checks() {
  log "Container status:"
  docker ps --filter "name=^/${CONTAINER_NAME}$"

  if command -v curl >/dev/null 2>&1; then
    log "Local health endpoint:"
    curl -fsS http://127.0.0.1:8081/health || warn "Local health check failed."
  else
    warn "curl not available. Skipping local health check."
  fi

  log "Recent container logs:"
  docker logs --tail "$TAIL_LOGS" "$CONTAINER_NAME" || warn "Unable to read container logs."
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root)
      PROJECT_ROOT="$2"
      shift 2
      ;;
    --compose-file)
      COMPOSE_FILE="$2"
      shift 2
      ;;
    --prune-unused)
      PRUNE_UNUSED=1
      shift
      ;;
    --refresh-swap)
      REFRESH_SWAP=1
      shift
      ;;
    --drop-cache)
      DROP_CACHE=1
      shift
      ;;
    --tail-logs)
      TAIL_LOGS="$2"
      shift 2
      ;;
    --run-resource-taxonomy-migration)
      RUN_RESOURCE_TAXONOMY_MIGRATION=1
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      warn "Unknown option: $1"
      print_help
      exit 1
      ;;
  esac
done

require_command docker
trap on_error ERR
COMPOSE_CMD="$(detect_compose_cmd)"
if [[ -z "$COMPOSE_CMD" ]]; then
  printf 'Missing docker compose support. Install docker compose plugin or docker-compose.\n' >&2
  exit 1
fi

COMPOSE_PATH="$(resolve_compose_path)"
if [[ ! -f "$COMPOSE_PATH" ]]; then
  printf 'Compose file not found: %s\n' "$COMPOSE_PATH" >&2
  exit 1
fi

if [[ ! -d "$PROJECT_ROOT" ]]; then
  printf 'Project root not found: %s\n' "$PROJECT_ROOT" >&2
  exit 1
fi

log "Project root: $PROJECT_ROOT"
log "Compose file: $COMPOSE_PATH"
log "Compose command: $COMPOSE_CMD"

ensure_runtime_dirs
cleanup_existing_container
rebuild_backend
run_resource_taxonomy_migration_if_requested
prune_unused_artifacts
refresh_swap_if_requested
drop_cache_if_requested
run_health_checks
