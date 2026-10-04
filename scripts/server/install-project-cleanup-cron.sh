#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="/www/wwwroot/teaching-platform"
INSTALL_PATH="/usr/local/bin/teaching-platform-safe-cleanup"
CRON_FILE="/etc/cron.d/teaching-platform-safe-cleanup"
LOG_DIR="/var/log/teaching-platform-maintenance"
ENABLE_EXITED_CONTAINER_PRUNE=0
ENABLE_DANGLING_IMAGE_PRUNE=0

print_help() {
  cat <<'EOF'
Usage:
  bash ./scripts/server/install-project-cleanup-cron.sh [options]

Options:
  --project-root PATH                  Default: /www/wwwroot/teaching-platform
  --install-path PATH                  Default: /usr/local/bin/teaching-platform-safe-cleanup
  --cron-file PATH                     Default: /etc/cron.d/teaching-platform-safe-cleanup
  --enable-exited-container-prune      Add exited container prune to daily job
  --enable-dangling-image-prune        Add dangling image prune to weekly job
  -h, --help                           Show help
EOF
}

info() {
  printf '[install-project-cleanup] %s\n' "$*"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root)
      PROJECT_ROOT="$2"
      shift 2
      ;;
    --install-path)
      INSTALL_PATH="$2"
      shift 2
      ;;
    --cron-file)
      CRON_FILE="$2"
      shift 2
      ;;
    --enable-exited-container-prune)
      ENABLE_EXITED_CONTAINER_PRUNE=1
      shift
      ;;
    --enable-dangling-image-prune)
      ENABLE_DANGLING_IMAGE_PRUNE=1
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n' "$1" >&2
      print_help >&2
      exit 1
      ;;
  esac
done

SOURCE_SCRIPT="${PROJECT_ROOT}/scripts/server/safe-project-cleanup.sh"

if [[ ! -f "$SOURCE_SCRIPT" ]]; then
  printf 'Source script not found: %s\n' "$SOURCE_SCRIPT" >&2
  exit 1
fi

mkdir -p "$(dirname "$INSTALL_PATH")" "$LOG_DIR"
cp -f "$SOURCE_SCRIPT" "$INSTALL_PATH"
chmod +x "$INSTALL_PATH"

DAILY_ARGS="--project-root ${PROJECT_ROOT}"
WEEKLY_ARGS="--project-root ${PROJECT_ROOT} --report-only"

if [[ "$ENABLE_EXITED_CONTAINER_PRUNE" -eq 1 ]]; then
  DAILY_ARGS="${DAILY_ARGS} --prune-exited-containers"
fi

if [[ "$ENABLE_DANGLING_IMAGE_PRUNE" -eq 1 ]]; then
  WEEKLY_ARGS="--project-root ${PROJECT_ROOT} --prune-dangling-images"
fi

{
  echo "SHELL=/bin/bash"
  echo "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
  echo ""
  echo "# Daily project-safe cleanup at 03:25"
  echo "25 3 * * * root ${INSTALL_PATH} ${DAILY_ARGS} >> ${LOG_DIR}/cron.log 2>&1"
  echo ""
  echo "# Weekly project-safe report or optional dangling image cleanup at 03:45 Sunday"
  echo "45 3 * * 0 root ${INSTALL_PATH} ${WEEKLY_ARGS} >> ${LOG_DIR}/cron.log 2>&1"
} > "$CRON_FILE"

chmod 644 "$CRON_FILE"

info "Installed script: $INSTALL_PATH"
info "Installed cron: $CRON_FILE"
info "Log directory: $LOG_DIR"
info "Current cron file contents:"
cat "$CRON_FILE"
