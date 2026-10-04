#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="/www/wwwroot/teaching-platform"
CONTAINER_NAME="teaching-backend"
PUBLIC_BASE_URL="https://class.codebn.cn"
LOCAL_BASE_URL="http://127.0.0.1:8081"
TAIL_LOGS=80
USERNAME=""
PASSWORD=""
CAPTCHA_SKIP=0
SKIP_UPLOADS_CHECK=0

print_help() {
  cat <<'EOF'
Usage:
  ./scripts/server/verify-release.sh [options]

Options:
  --project-root PATH     Project root. Default: /www/wwwroot/teaching-platform
  --container-name NAME   Container name. Default: teaching-backend
  --base-url URL          Public base URL. Default: https://class.codebn.cn
  --local-url URL         Local backend URL. Default: http://127.0.0.1:8081
  --tail-logs N           Docker logs tail size. Default: 80
  --username USER         Optional functional smoke username.
  --password PASS         Optional functional smoke password.
  --captcha-skip          Pass through to ops/functional-verify.sh.
  --skip-uploads-check    Skip the public /uploads/test.txt 404 check.
  -h, --help              Show help.

Examples:
  ./scripts/server/verify-release.sh
  ./scripts/server/verify-release.sh --username admin --password 'your-password'
  ./scripts/server/verify-release.sh --username admin --password 'your-password' --captcha-skip
EOF
}

log() {
  printf '[verify-release] %s\n' "$*"
}

warn() {
  printf '[verify-release][warn] %s\n' "$*" >&2
}

fail() {
  printf '[verify-release][error] %s\n' "$*" >&2
  exit 1
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Missing required command: $1"
  fi
}

require_option_value() {
  local option_name="$1"
  local option_value="${2-}"
  if [[ -z "$option_value" || "$option_value" == --* ]]; then
    fail "Option ${option_name} requires a value."
  fi
}

check_container_running() {
  local running
  running="$(docker ps --format '{{.Names}}' | grep -x "$CONTAINER_NAME" || true)"
  if [[ -z "$running" ]]; then
    docker ps -a --filter "name=^/${CONTAINER_NAME}$"
    fail "Container ${CONTAINER_NAME} is not running."
  fi
}

check_local_health() {
  log "Checking local health endpoint: ${LOCAL_BASE_URL}/health"
  curl -fsS "${LOCAL_BASE_URL}/health"
  printf '\n'
}

check_public_health() {
  log "Checking public health endpoint: ${PUBLIC_BASE_URL}/health"
  curl -fsS -I "${PUBLIC_BASE_URL}/health" | head -n 1
}

check_uploads_boundary() {
  if [[ "$SKIP_UPLOADS_CHECK" -eq 1 ]]; then
    warn "Skipping uploads 404 boundary check."
    return
  fi

  log "Checking public uploads boundary: ${PUBLIC_BASE_URL}/uploads/test.txt"
  local status
  status="$(curl -sS -o /dev/null -w '%{http_code}' "${PUBLIC_BASE_URL}/uploads/test.txt")"
  printf 'HTTP %s\n' "$status"
  if [[ "$status" != "404" ]]; then
    fail "Expected /uploads/test.txt to return 404, got ${status}."
  fi
}

show_container_logs() {
  log "Recent container logs (${TAIL_LOGS} lines)"
  docker logs --tail "$TAIL_LOGS" "$CONTAINER_NAME"
}

run_functional_smoke_if_requested() {
  if [[ -z "$USERNAME" && -z "$PASSWORD" ]]; then
    log "Functional smoke credentials not provided. Skipping login/upload smoke."
    return
  fi

  if [[ -z "$USERNAME" || -z "$PASSWORD" ]]; then
    fail "Both --username and --password are required when running functional smoke."
  fi

  local functional_script="${PROJECT_ROOT}/ops/functional-verify.sh"
  if [[ ! -f "$functional_script" ]]; then
    fail "Functional verification script not found: ${functional_script}"
  fi

  chmod +x "$functional_script"

  log "Running functional smoke for ${USERNAME}"
  if [[ "$CAPTCHA_SKIP" -eq 1 ]]; then
    "$functional_script" \
      --base-url "$PUBLIC_BASE_URL" \
      --local-url "$LOCAL_BASE_URL" \
      --username "$USERNAME" \
      --password "$PASSWORD" \
      --captcha-skip
    return
  fi

  "$functional_script" \
    --base-url "$PUBLIC_BASE_URL" \
    --local-url "$LOCAL_BASE_URL" \
    --username "$USERNAME" \
    --password "$PASSWORD"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root)
      require_option_value "$1" "${2-}"
      PROJECT_ROOT="$2"
      shift 2
      ;;
    --container-name)
      require_option_value "$1" "${2-}"
      CONTAINER_NAME="$2"
      shift 2
      ;;
    --base-url)
      require_option_value "$1" "${2-}"
      PUBLIC_BASE_URL="$2"
      shift 2
      ;;
    --local-url)
      require_option_value "$1" "${2-}"
      LOCAL_BASE_URL="$2"
      shift 2
      ;;
    --tail-logs)
      require_option_value "$1" "${2-}"
      TAIL_LOGS="$2"
      shift 2
      ;;
    --username)
      require_option_value "$1" "${2-}"
      USERNAME="$2"
      shift 2
      ;;
    --password)
      require_option_value "$1" "${2-}"
      PASSWORD="$2"
      shift 2
      ;;
    --captcha-skip)
      CAPTCHA_SKIP=1
      shift
      ;;
    --skip-uploads-check)
      SKIP_UPLOADS_CHECK=1
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
done

require_command docker
require_command curl

if [[ ! -d "$PROJECT_ROOT" ]]; then
  fail "Project root not found: ${PROJECT_ROOT}"
fi

log "Project root: ${PROJECT_ROOT}"
log "Container name: ${CONTAINER_NAME}"
log "Public base URL: ${PUBLIC_BASE_URL}"
log "Local base URL: ${LOCAL_BASE_URL}"

check_container_running
check_local_health
check_public_health
check_uploads_boundary
show_container_logs
run_functional_smoke_if_requested

log "Verification completed."
