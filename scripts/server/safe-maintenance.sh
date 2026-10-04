#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/www/wwwroot/teaching-platform}"
LOG_DIR="${LOG_DIR:-/var/log/server-maintenance}"
PROJECT_ARCHIVE_DAYS="${PROJECT_ARCHIVE_DAYS:-14}"
PANEL_BACKUP_DAYS="${PANEL_BACKUP_DAYS:-21}"
DB_BACKUP_DAYS="${DB_BACKUP_DAYS:-30}"
TMP_DAYS="${TMP_DAYS:-3}"
VAR_TMP_DAYS="${VAR_TMP_DAYS:-7}"
JOURNAL_RETENTION="${JOURNAL_RETENTION:-7d}"
DISK_WARN_PERCENT="${DISK_WARN_PERCENT:-80}"
DISK_CRIT_PERCENT="${DISK_CRIT_PERCENT:-90}"
RECYCLE_BIN_PATHS=("/.Recycle_bin" "/www/.Recycle_bin")

REPORT_ONLY=0
DRY_RUN=0
RUN_PROJECT_ARCHIVE_CLEAN=1
RUN_PANEL_BACKUP_CLEAN=0
RUN_DROP_CACHE=0
RUN_REFRESH_SWAP=0
RUN_RECYCLE_BIN_CLEAN=0

print_help() {
  cat <<'EOF'
Usage:
  bash ./scripts/server/safe-maintenance.sh [options]

Options:
  --project-root PATH          Default: /www/wwwroot/teaching-platform
  --report-only                Only print diagnostics, do not delete anything
  --dry-run                    Print cleanup targets without deleting them
  --project-archive-days N     Retention for old teaching-platform deploy archives. Default: 14
  --panel-backup-days N        Retention for BaoTa panel/site zip backups. Default: 21
  --db-backup-days N           Retention for BaoTa DB backup files. Default: 30
  --cleanup-panel-backups      Also delete old BaoTa panel/site/db backups
  --cleanup-recycle-bin        Empty known BaoTa recycle bin paths (manual only)
  --skip-project-archives      Skip teaching-platform archive cleanup
  --drop-cache                 Run sync && echo 3 > /proc/sys/vm/drop_caches
  --refresh-swap               Run swapoff -a && swapon -a
  -h, --help                   Show help

Safe defaults:
  - cleans unused Docker artifacts
  - vacuums journal logs
  - cleans package manager cache
  - removes old files from /tmp and /var/tmp
  - removes root user build caches
  - removes old teaching-platform release archives

Not enabled by default:
  - deleting BaoTa panel/site/db backups
  - emptying BaoTa recycle bins
  - dropping Linux page cache
  - refreshing swap
EOF
}

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

info() {
  printf '[maintenance][%s] %s\n' "$(timestamp)" "$*"
}

warn() {
  printf '[maintenance][%s][warn] %s\n' "$(timestamp)" "$*" >&2
}

run_cmd() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[maintenance][dry-run] %s\n' "$*"
    return 0
  fi
  "$@"
}

run_sh() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[maintenance][dry-run] %s\n' "$*"
    return 0
  fi
  bash -lc "$*"
}

ensure_log_dir() {
  mkdir -p "$LOG_DIR"
}

start_logging() {
  ensure_log_dir
  local log_file
  log_file="${LOG_DIR}/maintenance-$(date +%Y%m%d-%H%M%S).log"
  exec > >(tee -a "$log_file") 2>&1
  info "Log file: ${log_file}"
}

show_df() {
  info "Filesystem usage"
  df -h
  echo
  df -ih
  echo
}

show_memory() {
  info "Memory and swap usage"
  free -h || true
  echo
  swapon --show || true
  echo
}

show_key_dirs() {
  info "Top-level usage: /"
  du -xhd1 / 2>/dev/null | sort -h || true
  echo

  info "Top-level usage: /www"
  du -xhd1 /www 2>/dev/null | sort -h || true
  echo

  info "Top-level usage: /var"
  du -xhd1 /var 2>/dev/null | sort -h || true
  echo

  info "Top-level usage: /root"
  du -xhd1 /root 2>/dev/null | sort -h || true
  echo

  if [[ -d /www/wwwroot ]]; then
    info "Top-level usage: /www/wwwroot"
    du -xhd1 /www/wwwroot 2>/dev/null | sort -h || true
    echo
  fi

  if [[ -d /www/backup ]]; then
    info "Top-level usage: /www/backup"
    du -xhd1 /www/backup 2>/dev/null | sort -h || true
    echo
  fi
}

show_recycle_bin_usage() {
  info "Known BaoTa recycle bin usage"
  local found=0
  local path

  for path in "${RECYCLE_BIN_PATHS[@]}"; do
    if [[ -d "$path" ]]; then
      found=1
      du -xhd1 "$path" 2>/dev/null | sort -h || true
    fi
  done

  if [[ "$found" -eq 0 ]]; then
    printf 'No known recycle bin paths found.\n'
  fi
  echo
}

show_large_files() {
  info "Large files over 200M under /www and /var"
  find /www /var -xdev -type f -size +200M 2>/dev/null | xargs -r ls -lhS
  echo
}

show_docker_usage() {
  if ! command -v docker >/dev/null 2>&1; then
    warn "docker not found, skipping docker usage report"
    return
  fi

  info "Docker disk usage"
  docker system df || true
  echo
}

show_journal_usage() {
  if ! command -v journalctl >/dev/null 2>&1; then
    warn "journalctl not found, skipping journal usage report"
    return
  fi

  info "Journal disk usage"
  journalctl --disk-usage || true
  echo
}

show_rootfs_risk() {
  local root_usage
  root_usage="$(df -P / | awk 'NR==2 {gsub("%","",$5); print $5}')"
  info "Root filesystem usage: ${root_usage}%"
  if [[ "$root_usage" -ge "$DISK_CRIT_PERCENT" ]]; then
    warn "Root filesystem is in critical range (>= ${DISK_CRIT_PERCENT}%)."
  elif [[ "$root_usage" -ge "$DISK_WARN_PERCENT" ]]; then
    warn "Root filesystem is in warning range (>= ${DISK_WARN_PERCENT}%)."
  fi
  echo
}

cleanup_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    warn "docker not found, skipping docker cleanup"
    return
  fi

  info "Pruning exited containers"
  run_cmd docker container prune -f
  echo

  info "Pruning unused images"
  run_cmd docker image prune -af
  echo

  info "Pruning builder cache"
  run_cmd docker builder prune -af
  echo

  info "Pruning unused networks"
  run_cmd docker network prune -f
  echo
}

cleanup_journal() {
  if ! command -v journalctl >/dev/null 2>&1; then
    return
  fi

  info "Vacuuming journal logs to ${JOURNAL_RETENTION}"
  run_cmd journalctl --vacuum-time="${JOURNAL_RETENTION}"
  echo
}

cleanup_pkg_cache() {
  info "Cleaning package manager cache"
  run_sh "apt-get clean 2>/dev/null || yum clean all 2>/dev/null || dnf clean all 2>/dev/null || true"
  echo
}

cleanup_tmp_dirs() {
  info "Cleaning old files from /tmp (>${TMP_DAYS} days)"
  run_sh "find /tmp -xdev -type f -mtime +${TMP_DAYS} -print -delete 2>/dev/null || true"
  echo

  info "Cleaning old files from /var/tmp (>${VAR_TMP_DAYS} days)"
  run_sh "find /var/tmp -xdev -type f -mtime +${VAR_TMP_DAYS} -print -delete 2>/dev/null || true"
  echo
}

cleanup_root_caches() {
  info "Cleaning root user build caches"
  run_sh "rm -rf /root/.cache/pip /root/.cache/yarn /root/.npm/_cacache 2>/dev/null || true"
  echo
}

cleanup_project_archives() {
  if [[ "$RUN_PROJECT_ARCHIVE_CLEAN" -ne 1 ]]; then
    info "Skipping teaching-platform archive cleanup"
    echo
    return
  fi

  if [[ ! -d "$PROJECT_ROOT" ]]; then
    warn "Project root not found: ${PROJECT_ROOT}"
    echo
    return
  fi

  info "Cleaning old teaching-platform archives (>${PROJECT_ARCHIVE_DAYS} days)"
  run_sh "find '${PROJECT_ROOT}/backup' -type f \\( -name '*.zip' -o -name '*.tar.gz' -o -name '*.tgz' \\) -mtime +${PROJECT_ARCHIVE_DAYS} -print -delete 2>/dev/null || true"
  run_sh "find '${PROJECT_ROOT}/packages' -type f \\( -name '*.zip' -o -name '*.tar.gz' -o -name '*.tgz' \\) -mtime +${PROJECT_ARCHIVE_DAYS} -print -delete 2>/dev/null || true"
  run_sh "find '${PROJECT_ROOT}' -maxdepth 1 -type f \\( -name '*.zip' -o -name '*.tar.gz' -o -name '*.tgz' \\) -mtime +${PROJECT_ARCHIVE_DAYS} -print -delete 2>/dev/null || true"
  echo
}

cleanup_panel_backups() {
  if [[ "$RUN_PANEL_BACKUP_CLEAN" -ne 1 ]]; then
    info "Skipping BaoTa backup cleanup"
    echo
    return
  fi

  info "Cleaning BaoTa panel/site backups (>${PANEL_BACKUP_DAYS} days)"
  run_sh "find /www/backup/panel -type f \\( -name '*.zip' -o -name '*.tar.gz' -o -name '*.tgz' \\) -mtime +${PANEL_BACKUP_DAYS} -print -delete 2>/dev/null || true"
  run_sh "find /www/backup/site -type f \\( -name '*.zip' -o -name '*.tar.gz' -o -name '*.tgz' \\) -mtime +${PANEL_BACKUP_DAYS} -print -delete 2>/dev/null || true"
  echo

  info "Cleaning BaoTa DB backups (>${DB_BACKUP_DAYS} days)"
  run_sh "find /www/backup/database -type f \\( -name '*.sql' -o -name '*.sql.gz' -o -name '*.gz' -o -name '*.zip' \\) -mtime +${DB_BACKUP_DAYS} -print -delete 2>/dev/null || true"
  echo
}

cleanup_recycle_bins() {
  if [[ "$RUN_RECYCLE_BIN_CLEAN" -ne 1 ]]; then
    info "Skipping recycle bin cleanup"
    echo
    return
  fi

  info "Cleaning known BaoTa recycle bin paths"
  local path

  for path in "${RECYCLE_BIN_PATHS[@]}"; do
    if [[ ! -d "$path" ]]; then
      continue
    fi

    run_sh "find '$path' -mindepth 1 -maxdepth 1 -exec rm -rf -- {} + 2>/dev/null || true"
  done
  echo
}

refresh_swap() {
  if [[ "$RUN_REFRESH_SWAP" -ne 1 ]]; then
    return
  fi

  if [[ "$(id -u)" -ne 0 ]]; then
    warn "--refresh-swap requires root"
    return
  fi

  if ! command -v swapon >/dev/null 2>&1 || ! command -v swapoff >/dev/null 2>&1; then
    warn "swap tools are not available"
    return
  fi

  if ! swapon --noheadings --show=NAME 2>/dev/null | grep -q .; then
    info "No active swap detected"
    echo
    return
  fi

  info "Refreshing swap"
  run_cmd swapoff -a
  run_cmd swapon -a
  echo
}

drop_cache() {
  if [[ "$RUN_DROP_CACHE" -ne 1 ]]; then
    return
  fi

  if [[ "$(id -u)" -ne 0 ]]; then
    warn "--drop-cache requires root"
    return
  fi

  if [[ ! -w /proc/sys/vm/drop_caches ]]; then
    warn "/proc/sys/vm/drop_caches is not writable"
    return
  fi

  info "Dropping filesystem cache"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[maintenance][dry-run] sync && echo 3 > /proc/sys/vm/drop_caches\n'
  else
    sync
    echo 3 > /proc/sys/vm/drop_caches
  fi
  echo
}

post_summary() {
  info "Post-maintenance filesystem usage"
  df -h
  echo

  if command -v docker >/dev/null 2>&1; then
    info "Post-maintenance Docker disk usage"
    docker system df || true
    echo
  fi

  info "Completed"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root)
      PROJECT_ROOT="$2"
      shift 2
      ;;
    --report-only)
      REPORT_ONLY=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --project-archive-days)
      PROJECT_ARCHIVE_DAYS="$2"
      shift 2
      ;;
    --panel-backup-days)
      PANEL_BACKUP_DAYS="$2"
      shift 2
      ;;
    --db-backup-days)
      DB_BACKUP_DAYS="$2"
      shift 2
      ;;
    --cleanup-panel-backups)
      RUN_PANEL_BACKUP_CLEAN=1
      shift
      ;;
    --cleanup-recycle-bin)
      RUN_RECYCLE_BIN_CLEAN=1
      shift
      ;;
    --skip-project-archives)
      RUN_PROJECT_ARCHIVE_CLEAN=0
      shift
      ;;
    --drop-cache)
      RUN_DROP_CACHE=1
      shift
      ;;
    --refresh-swap)
      RUN_REFRESH_SWAP=1
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

start_logging
info "Project root: ${PROJECT_ROOT}"
info "Report only: ${REPORT_ONLY}"
info "Dry run: ${DRY_RUN}"
echo

show_df
show_memory
show_rootfs_risk
show_key_dirs
show_recycle_bin_usage
show_large_files
show_docker_usage
show_journal_usage

if [[ "$REPORT_ONLY" -eq 1 ]]; then
  info "Report-only mode finished"
  exit 0
fi

cleanup_docker
cleanup_journal
cleanup_pkg_cache
cleanup_tmp_dirs
cleanup_root_caches
cleanup_project_archives
cleanup_panel_backups
cleanup_recycle_bins
refresh_swap
drop_cache
post_summary
