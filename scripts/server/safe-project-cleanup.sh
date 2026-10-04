#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/www/wwwroot/teaching-platform}"
LOG_DIR="${LOG_DIR:-/var/log/teaching-platform-maintenance}"
DEPLOY_RETENTION_DAYS="${DEPLOY_RETENTION_DAYS:-3}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
RELEASE_BACKUP_RETENTION_DAYS="${RELEASE_BACKUP_RETENTION_DAYS:-7}"
PROJECT_LOG_RETENTION_DAYS="${PROJECT_LOG_RETENTION_DAYS:-7}"
DOCKER_BUILDER_UNTIL="${DOCKER_BUILDER_UNTIL:-240h}"

REPORT_ONLY=0
DRY_RUN=0
RUN_DOCKER_BUILDER_CLEAN=1
RUN_EXITED_CONTAINER_PRUNE=0
RUN_DANGLING_IMAGE_PRUNE=0

print_help() {
  cat <<'EOF'
Usage:
  bash ./scripts/server/safe-project-cleanup.sh [options]

Options:
  --project-root PATH              Default: /www/wwwroot/teaching-platform
  --report-only                    Only print diagnostics, do not delete anything
  --dry-run                        Print cleanup targets without deleting them
  --deploy-retention-days N        Retain deploy archives for N days. Default: 3
  --backup-retention-days N        Retain project backup files/dirs for N days. Default: 7
  --release-backup-days N          Retain release-backup files/dirs for N days. Default: 7
  --project-log-retention-days N   Retain project log files for N days. Default: 7
  --skip-docker-builder-clean      Do not prune Docker builder cache
  --prune-exited-containers        Also prune exited Docker containers
  --prune-dangling-images          Also prune dangling Docker images
  -h, --help                       Show help
EOF
}

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

info() {
  printf '[project-cleanup][%s] %s\n' "$(timestamp)" "$*"
}

warn() {
  printf '[project-cleanup][%s][warn] %s\n' "$(timestamp)" "$*" >&2
}

run_sh() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[project-cleanup][dry-run] %s\n' "$*"
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
  log_file="${LOG_DIR}/project-cleanup-$(date +%Y%m%d-%H%M%S).log"
  exec > >(tee -a "$log_file") 2>&1
  info "Log file: ${log_file}"
}

show_summary() {
  info "Filesystem usage"
  df -h
  echo

  if [[ -d "$PROJECT_ROOT" ]]; then
    info "Project top-level usage"
    du -sh "$PROJECT_ROOT"/* 2>/dev/null | sort -h | tail -n 20 || true
    echo
  fi

  if command -v docker >/dev/null 2>&1; then
    info "Docker disk usage"
    docker system df || true
    echo
  fi
}

cleanup_deploy_archives() {
  if [[ ! -d "$PROJECT_ROOT" ]]; then
    warn "Project root not found: $PROJECT_ROOT"
    return
  fi

  info "Cleaning old deploy archives older than ${DEPLOY_RETENTION_DAYS} days"
  run_sh "find '$PROJECT_ROOT' -maxdepth 2 -type f \\( -name 'class-platform-*.zip' -o -name 'web-dist-before-*.tar.gz' -o -name 'backend-before-*.tar.gz' -o -name '*.tgz' \\) -mtime +${DEPLOY_RETENTION_DAYS} -print -delete 2>/dev/null || true"
  echo
}

cleanup_backup_dir() {
  local backup_dir="$PROJECT_ROOT/backup"
  if [[ ! -d "$backup_dir" ]]; then
    return
  fi

  info "Cleaning old project backup files older than ${BACKUP_RETENTION_DAYS} days"
  run_sh "find '$backup_dir' -maxdepth 1 -type f \\( -name '*.zip' -o -name '*.tar.gz' -o -name '*.tgz' -o -name '*.sql' -o -name '*.sql.gz' \\) -mtime +${BACKUP_RETENTION_DAYS} -print -delete 2>/dev/null || true"
  echo

  info "Cleaning old project backup directories older than ${BACKUP_RETENTION_DAYS} days"
  run_sh "find '$backup_dir' -maxdepth 1 -mindepth 1 -type d \\( -name 'dist.*' -o -name 'web-dist-before-*' -o -name 'backend-before-*' -o -name 'release-*' \\) -mtime +${BACKUP_RETENTION_DAYS} -print -exec rm -rf {} + 2>/dev/null || true"
  echo
}

cleanup_release_backup_dir() {
  local release_backup_dir="$PROJECT_ROOT/release-backup"
  if [[ ! -d "$release_backup_dir" ]]; then
    return
  fi

  info "Cleaning old release-backup entries older than ${RELEASE_BACKUP_RETENTION_DAYS} days"
  run_sh "find '$release_backup_dir' -maxdepth 1 -mindepth 1 -mtime +${RELEASE_BACKUP_RETENTION_DAYS} -print -exec rm -rf {} + 2>/dev/null || true"
  echo
}

cleanup_project_logs() {
  local project_logs_dir="$PROJECT_ROOT/logs"
  if [[ ! -d "$project_logs_dir" ]]; then
    return
  fi

  info "Cleaning old project logs older than ${PROJECT_LOG_RETENTION_DAYS} days"
  run_sh "find '$project_logs_dir' -type f -name '*.log' -mtime +${PROJECT_LOG_RETENTION_DAYS} -print -delete 2>/dev/null || true"
  echo
}

cleanup_docker_builder_cache() {
  if [[ "$RUN_DOCKER_BUILDER_CLEAN" -ne 1 ]]; then
    info "Skipping Docker builder cache cleanup"
    echo
    return
  fi

  if ! command -v docker >/dev/null 2>&1; then
    warn "docker not found, skipping Docker builder cache cleanup"
    echo
    return
  fi

  info "Pruning Docker builder cache older than ${DOCKER_BUILDER_UNTIL}"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[project-cleanup][dry-run] docker builder prune -af --filter until=%s\n' "$DOCKER_BUILDER_UNTIL"
  else
    docker builder prune -af --filter "until=${DOCKER_BUILDER_UNTIL}" || true
  fi
  echo
}

cleanup_exited_containers() {
  if [[ "$RUN_EXITED_CONTAINER_PRUNE" -ne 1 ]]; then
    return
  fi

  if ! command -v docker >/dev/null 2>&1; then
    warn "docker not found, skipping exited container prune"
    return
  fi

  info "Pruning exited Docker containers"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[project-cleanup][dry-run] docker container prune -f\n'
  else
    docker container prune -f || true
  fi
  echo
}

cleanup_dangling_images() {
  if [[ "$RUN_DANGLING_IMAGE_PRUNE" -ne 1 ]]; then
    return
  fi

  if ! command -v docker >/dev/null 2>&1; then
    warn "docker not found, skipping dangling image prune"
    return
  fi

  info "Pruning dangling Docker images"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[project-cleanup][dry-run] docker image prune -f\n'
  else
    docker image prune -f || true
  fi
  echo
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
    --deploy-retention-days)
      DEPLOY_RETENTION_DAYS="$2"
      shift 2
      ;;
    --backup-retention-days)
      BACKUP_RETENTION_DAYS="$2"
      shift 2
      ;;
    --release-backup-days)
      RELEASE_BACKUP_RETENTION_DAYS="$2"
      shift 2
      ;;
    --project-log-retention-days)
      PROJECT_LOG_RETENTION_DAYS="$2"
      shift 2
      ;;
    --skip-docker-builder-clean)
      RUN_DOCKER_BUILDER_CLEAN=0
      shift
      ;;
    --prune-exited-containers)
      RUN_EXITED_CONTAINER_PRUNE=1
      shift
      ;;
    --prune-dangling-images)
      RUN_DANGLING_IMAGE_PRUNE=1
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
show_summary

if [[ "$REPORT_ONLY" -eq 1 ]]; then
  info "Report-only mode complete."
  exit 0
fi

cleanup_deploy_archives
cleanup_backup_dir
cleanup_release_backup_dir
cleanup_project_logs
cleanup_docker_builder_cache
cleanup_exited_containers
cleanup_dangling_images
show_summary

info "Project cleanup complete."
