#!/usr/bin/env bash
set -euo pipefail

# Apply a backend deployment zip on the production host without requiring rsync.
# The package intentionally does not contain .env, runtime uploads, logs, SQL
# backups, or node_modules, so those server-side files remain untouched.

PROJECT_ROOT="${PROJECT_ROOT:-/www/wwwroot/teaching-platform}"
PACKAGE_PATH="${1:-}"
if [[ -z "$PACKAGE_PATH" ]]; then
  PACKAGE_PATH="$(ls -1t /tmp/class-platform-backend-docker-*.zip 2>/dev/null | head -n 1 || true)"
fi

if [[ -z "$PACKAGE_PATH" || ! -f "$PACKAGE_PATH" ]]; then
  echo "Backend package not found. Pass the zip path explicitly." >&2
  echo "Usage: $0 /tmp/class-platform-backend-docker-YYYYMMDD-HHMMSS.zip" >&2
  exit 1
fi

for command_name in unzip cp mkdir chown chmod; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "Missing required command: $command_name" >&2
    exit 1
  }
done

TMP_RELEASE="$(mktemp -d /tmp/class-platform-backend-apply.XXXXXX)"
cleanup() {
  rm -rf "$TMP_RELEASE"
}
trap cleanup EXIT

echo "[backend-package] package: $PACKAGE_PATH"
echo "[backend-package] project: $PROJECT_ROOT"

unzip -q -o "$PACKAGE_PATH" -d "$TMP_RELEASE"
test -f "$TMP_RELEASE/docker-compose.prod.yml" || {
  echo "Invalid backend package: docker-compose.prod.yml is missing." >&2
  exit 1
}
test -f "$TMP_RELEASE/backend/package.json" || {
  echo "Invalid backend package: backend/package.json is missing." >&2
  exit 1
}

mkdir -p "$PROJECT_ROOT/backend" "$PROJECT_ROOT/scripts/server"

if command -v rsync >/dev/null 2>&1; then
  echo "[backend-package] syncing with rsync"
  rsync -a --delete \
    --exclude='.env' \
    --exclude='.env.*' \
    --exclude='node_modules/' \
    --exclude='uploads/' \
    --exclude='logs/' \
    --exclude='*.sql' \
    --exclude='*.log' \
    "$TMP_RELEASE/backend/" "$PROJECT_ROOT/backend/"
else
  echo "[backend-package] rsync unavailable; using forced cp fallback"
  # command cp bypasses interactive shell aliases such as cp='cp -i'.
  command cp -a -f "$TMP_RELEASE/backend/." "$PROJECT_ROOT/backend/"
fi

command cp -f "$TMP_RELEASE/docker-compose.prod.yml" "$PROJECT_ROOT/docker-compose.prod.yml"
command cp -f "$TMP_RELEASE/BACKEND_DOCKER_RUNBOOK.md" "$PROJECT_ROOT/BACKEND_DOCKER_RUNBOOK.md"
command cp -a -f "$TMP_RELEASE/scripts/server/." "$PROJECT_ROOT/scripts/server/"

mkdir -p "$PROJECT_ROOT/uploads/classroom" "$PROJECT_ROOT/logs"
chown -R 10001:10001 "$PROJECT_ROOT/uploads" "$PROJECT_ROOT/logs"
chmod -R 775 "$PROJECT_ROOT/uploads" "$PROJECT_ROOT/logs"

cd "$PROJECT_ROOT"
bash ./scripts/server/update-backend-docker.sh
