#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="/www/wwwroot/teaching-platform"
PUBLIC_BASE_URL="https://class.codebn.cn"
NGINX_CONF=""
RUN_PRUNE=1

print_help() {
  cat <<'EOF'
Usage:
  bash ./scripts/server/finalize-online-hardening.sh [options]

Options:
  --project-root PATH   Default: /www/wwwroot/teaching-platform
  --base-url URL        Default: https://class.codebn.cn
  --nginx-conf PATH     Optional explicit nginx site config path
  --skip-prune          Skip docker prune during backend rebuild
  -h, --help            Show help
EOF
}

log() {
  printf '[finalize-hardening] %s\n' "$*"
}

warn() {
  printf '[finalize-hardening][warn] %s\n' "$*" >&2
}

fail() {
  printf '[finalize-hardening][error] %s\n' "$*" >&2
  exit 1
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Missing required command: $1"
  fi
}

detect_nginx_conf() {
  if [[ -n "$NGINX_CONF" ]]; then
    return
  fi

  if [[ -f /www/server/panel/vhost/nginx/class.codebn.cn.conf ]]; then
    NGINX_CONF="/www/server/panel/vhost/nginx/class.codebn.cn.conf"
    return
  fi

  if [[ -f /etc/nginx/conf.d/class.codebn.cn.conf ]]; then
    NGINX_CONF="/etc/nginx/conf.d/class.codebn.cn.conf"
    return
  fi

  fail "Could not detect Nginx site config for class.codebn.cn. Pass --nginx-conf explicitly."
}

backup_file() {
  local source_file="$1"
  local backup_root="$PROJECT_ROOT/backup/finalize-online-hardening"
  mkdir -p "$backup_root"
  local target_file="${backup_root}/$(basename "$source_file").$(date +%Y%m%d-%H%M%S).bak"
  cp -a "$source_file" "$target_file"
  log "Backup created: $target_file"
}

patch_nginx_teacher_spa_routes() {
  export TARGET_NGINX_CONF="$NGINX_CONF"
  python - <<'PY'
from pathlib import Path
import os
import sys

target = Path(os.environ['TARGET_NGINX_CONF'])
text = target.read_text(encoding='utf-8')

required = [
    "location = /teacher/dashboard { try_files $uri $uri/ /index.html; }",
    "location = /teacher/course-management { try_files $uri $uri/ /index.html; }",
    "location = /teacher/course-content { try_files $uri $uri/ /index.html; }",
    "location = /teacher/resource-library { try_files $uri $uri/ /index.html; }",
    "location = /teacher/student-management { try_files $uri $uri/ /index.html; }",
    "location = /teacher/student-analytics { try_files $uri $uri/ /index.html; }",
    "location = /teacher/homework-review { try_files $uri $uri/ /index.html; }",
    "location = /teacher/classroom { try_files $uri $uri/ /index.html; }",
]

if all(item in text for item in required):
    print("Teacher exact-match SPA routes already present.")
    sys.exit(0)

insert_block = (
    "    location = /teacher/dashboard { try_files $uri $uri/ /index.html; }\n"
    "    location = /teacher/course-management { try_files $uri $uri/ /index.html; }\n"
    "    location = /teacher/course-content { try_files $uri $uri/ /index.html; }\n"
    "    location = /teacher/resource-library { try_files $uri $uri/ /index.html; }\n"
    "    location = /teacher/student-management { try_files $uri $uri/ /index.html; }\n"
    "    location = /teacher/student-analytics { try_files $uri $uri/ /index.html; }\n"
    "    location = /teacher/homework-review { try_files $uri $uri/ /index.html; }\n"
    "    location = /teacher/classroom { try_files $uri $uri/ /index.html; }\n\n"
)

server_markers = [
    "server_name class.codebn.cn;",
    "server_name class.codebn.cn www.class.codebn.cn;",
    "server_name www.class.codebn.cn class.codebn.cn;"
]

inserted = False
for marker in server_markers:
    if marker in text:
        text = text.replace(marker, marker + "\n" + insert_block)
        inserted = True

if not inserted:
    print("Could not find server_name marker for class.codebn.cn in nginx config.", file=sys.stderr)
    sys.exit(1)

target.write_text(text, encoding='utf-8')
print("Inserted teacher exact-match SPA routes after server_name block.")
PY
}

verify_teacher_route() {
  local route="$1"
  local response_headers
  response_headers="$(curl -sS -I "${PUBLIC_BASE_URL}${route}")"
  local status_line
  status_line="$(printf '%s\n' "$response_headers" | head -n 1)"
  local content_type
  content_type="$(printf '%s\n' "$response_headers" | grep -i '^Content-Type:' | head -n 1 || true)"
  printf '%s\n' "$status_line"
  printf '%s\n' "$content_type"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root)
      PROJECT_ROOT="$2"
      shift 2
      ;;
    --base-url)
      PUBLIC_BASE_URL="$2"
      shift 2
      ;;
    --nginx-conf)
      NGINX_CONF="$2"
      shift 2
      ;;
    --skip-prune)
      RUN_PRUNE=0
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

require_command curl
require_command python
require_command nginx

if [[ ! -d "$PROJECT_ROOT" ]]; then
  fail "Project root not found: $PROJECT_ROOT"
fi

if [[ ! -f "$PROJECT_ROOT/backend/src/app.js" ]]; then
  fail "Backend source file not found: $PROJECT_ROOT/backend/src/app.js"
fi

if [[ ! -f "$PROJECT_ROOT/scripts/server/update-backend-docker.sh" ]]; then
  fail "Backend update script not found: $PROJECT_ROOT/scripts/server/update-backend-docker.sh"
fi

detect_nginx_conf

log "Project root: $PROJECT_ROOT"
log "Nginx config: $NGINX_CONF"
log "Public base URL: $PUBLIC_BASE_URL"

backup_file "$NGINX_CONF"
backup_file "$PROJECT_ROOT/backend/src/app.js"

patch_nginx_teacher_spa_routes

log "Testing and reloading nginx."
nginx -t
nginx -s reload

export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0

log "Rebuilding backend container."
cd "$PROJECT_ROOT"
if [[ "$RUN_PRUNE" -eq 1 ]]; then
  bash ./scripts/server/update-backend-docker.sh --prune-unused
else
  bash ./scripts/server/update-backend-docker.sh
fi

log "Checking local health."
curl -fsS http://127.0.0.1:8081/health
printf '\n'

log "Checking public health."
curl -fsS "${PUBLIC_BASE_URL}/health"
printf '\n'

log "Checking teacher direct-refresh routes."
verify_teacher_route "/teacher/course-content"
verify_teacher_route "/teacher/student-management"
verify_teacher_route "/teacher/homework-review"

log "Completed."
