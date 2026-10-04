#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="/www/wwwroot/teaching-platform"
INSTALL_PATH="/usr/local/bin/server-safe-maintenance"
CRON_FILE="/etc/cron.d/server-safe-maintenance"
LOG_DIR="/var/log/server-maintenance"
ENABLE_PANEL_BACKUP_CLEANUP=0

print_help() {
  cat <<'EOF'
Usage:
  bash ./scripts/server/install-maintenance-cron.sh [options]

Options:
  --project-root PATH             Default: /www/wwwroot/teaching-platform
  --install-path PATH             Default: /usr/local/bin/server-safe-maintenance
  --cron-file PATH                Default: /etc/cron.d/server-safe-maintenance
  --enable-panel-backup-cleanup   Add a weekly cleanup job for old BaoTa backups
  -h, --help                      Show help
EOF
}

info() {
  printf '[install-maintenance] %s\n' "$*"
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
    --enable-panel-backup-cleanup)
      ENABLE_PANEL_BACKUP_CLEANUP=1
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

SOURCE_SCRIPT="${PROJECT_ROOT}/scripts/server/safe-maintenance.sh"

if [[ ! -f "$SOURCE_SCRIPT" ]]; then
  printf 'Source script not found: %s\n' "$SOURCE_SCRIPT" >&2
  exit 1
fi

mkdir -p "$(dirname "$INSTALL_PATH")" "$LOG_DIR"
cp -f "$SOURCE_SCRIPT" "$INSTALL_PATH"
chmod +x "$INSTALL_PATH"

{
  echo "SHELL=/bin/bash"
  echo "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
  echo ""
  echo "# Daily safe maintenance at 03:17"
  echo "17 3 * * * root ${INSTALL_PATH} --project-root ${PROJECT_ROOT} >> ${LOG_DIR}/cron.log 2>&1"
  echo ""
  echo "# Weekly report-only snapshot at 03:35 Sunday"
  echo "35 3 * * 0 root ${INSTALL_PATH} --project-root ${PROJECT_ROOT} --report-only >> ${LOG_DIR}/cron.log 2>&1"

  if [[ "$ENABLE_PANEL_BACKUP_CLEANUP" -eq 1 ]]; then
    echo ""
    echo "# Weekly BaoTa backup cleanup at 04:05 Sunday"
    echo "5 4 * * 0 root ${INSTALL_PATH} --project-root ${PROJECT_ROOT} --cleanup-panel-backups >> ${LOG_DIR}/cron.log 2>&1"
  fi
} > "$CRON_FILE"

chmod 644 "$CRON_FILE"

info "Installed script: $INSTALL_PATH"
info "Installed cron: $CRON_FILE"
info "Log directory: $LOG_DIR"
info "Current cron file contents:"
cat "$CRON_FILE"
