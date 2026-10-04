#!/usr/bin/env bash
set -euo pipefail

# one-click-hardening.sh
# Enterprise-grade hardening bootstrap (free stack)
# - server-guard runtime monitor + alerts
# - fail2ban auto-ban
# - auditd rules
# - AIDE integrity (optional init)
# - sysctl kernel hardening (optional)
# - SSH hardening (optional)
# - logrotate for guard/incident logs
#
# Usage:
#   sudo ./one-click-hardening.sh [--apply-sysctl] [--apply-ssh] [--init-aide]
#
# Defaults:
#   apply sysctl = yes
#   apply ssh hardening = no
#   init AIDE = no
#

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"

APPLY_SYSCTL=1
APPLY_SSH=0
INIT_AIDE=0

for arg in "$@"; do
  case "$arg" in
    --apply-sysctl) APPLY_SYSCTL=1 ;;
    --skip-sysctl) APPLY_SYSCTL=0 ;;
    --apply-ssh) APPLY_SSH=1 ;;
    --init-aide) INIT_AIDE=1 ;;
    -h|--help)
      cat <<'EOF'
Usage:
  sudo ./one-click-hardening.sh [--apply-sysctl] [--apply-ssh] [--init-aide]

Options:
  --apply-sysctl   Apply kernel hardening (default: on)
  --skip-sysctl    Skip kernel hardening
  --apply-ssh      Apply SSH hardening config (recommended only if you have console access)
  --init-aide      Initialize AIDE database (first run can be slow)
EOF
      exit 0
      ;;
    *) ;;
  esac
done

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "[ERROR] Please run as root (sudo)." >&2
  exit 1
fi

log() {
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $*"
}

install_pkgs() {
  if command -v yum >/dev/null 2>&1; then
    yum install -y fail2ban audit aide curl >/dev/null
  elif command -v apt-get >/dev/null 2>&1; then
    apt-get update -y >/dev/null
    apt-get install -y fail2ban auditd aide curl >/dev/null
  else
    log "[WARN] Package manager not found. Install fail2ban/auditd/aide manually."
  fi
}

backup_if_exists() {
  local f="$1"
  if [[ -f "$f" ]]; then
    cp -f "$f" "$f.bak.$(date -u +'%Y%m%dT%H%M%SZ')" || true
  fi
}

log "Installing required packages..."
install_pkgs

log "Installing server-guard and alert scripts..."
install -m 0755 "$APP_DIR/ops/server-guard.sh" /usr/local/sbin/server-guard.sh
install -m 0755 "$APP_DIR/ops/server-guard-alert.sh" /usr/local/sbin/server-guard-alert.sh
install -m 0755 "$APP_DIR/ops/incident-isolate.sh" /usr/local/sbin/incident-isolate.sh
install -m 0644 "$APP_DIR/ops/server-guard.service" /etc/systemd/system/server-guard.service

log "Configuring server-guard env..."
if [[ ! -f /etc/sysconfig/server-guard ]]; then
  install -m 0644 "$APP_DIR/ops/server-guard.env.example" /etc/sysconfig/server-guard
else
  log "server-guard env already exists, skipping overwrite."
fi

log "Enabling server-guard..."
systemctl daemon-reload
systemctl enable --now server-guard

log "Configuring fail2ban..."
mkdir -p /etc/fail2ban/filter.d /etc/fail2ban/action.d
backup_if_exists /etc/fail2ban/jail.local
cp -f "$APP_DIR/ops/fail2ban/filter.d/teaching-login.conf" /etc/fail2ban/filter.d/teaching-login.conf
cp -f "$APP_DIR/ops/fail2ban/action.d/alert-webhook.conf" /etc/fail2ban/action.d/alert-webhook.conf
cp -f "$APP_DIR/ops/fail2ban/jail.local" /etc/fail2ban/jail.local
systemctl enable fail2ban || true
systemctl restart fail2ban || true

log "Configuring auditd..."
mkdir -p /etc/audit/rules.d
backup_if_exists /etc/audit/rules.d/teaching.rules
cp -f "$APP_DIR/ops/audit/audit.rules" /etc/audit/rules.d/teaching.rules
systemctl enable auditd || true
systemctl restart auditd || true
if command -v augenrules >/dev/null 2>&1; then
  augenrules --load || true
fi

log "Configuring AIDE..."
backup_if_exists /etc/aide.conf
cp -f "$APP_DIR/ops/aide/aide.conf" /etc/aide.conf
mkdir -p /var/log/aide
if [[ "$INIT_AIDE" == "1" ]]; then
  log "Initializing AIDE database (may take a while)..."
  aide --init || true
  if [[ -f /var/lib/aide/aide.db.new.gz ]]; then
    mv -f /var/lib/aide/aide.db.new.gz /var/lib/aide/aide.db.gz
  fi
fi

log "Installing logrotate config..."
cp -f "$APP_DIR/ops/logrotate/server-guard" /etc/logrotate.d/server-guard

if [[ "$APPLY_SYSCTL" == "1" ]]; then
  log "Applying sysctl hardening..."
  cp -f "$APP_DIR/ops/sysctl/99-teaching-hardening.conf" /etc/sysctl.d/99-teaching-hardening.conf
  sysctl --system || true
else
  log "Skipped sysctl hardening."
fi

if [[ "$APPLY_SSH" == "1" ]]; then
  log "Applying SSH hardening..."
  mkdir -p /etc/ssh/sshd_config.d
  cp -f "$APP_DIR/ops/ssh/sshd_config.hardening" /etc/ssh/sshd_config.d/99-hardening.conf
  systemctl restart sshd || true
else
  log "Skipped SSH hardening."
fi

log "Done. Review /etc/sysconfig/server-guard for webhook + allowlist."
