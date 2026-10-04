#!/usr/bin/env bash
set -euo pipefail

# incident-isolate.sh
# Emergency isolation & recovery helper
# - blocks outbound traffic (optional)
# - stops application containers/services
# - disables suspicious systemd units/cron entries
# - collects basic forensics
#
# Usage:
#   incident-isolate.sh --lockdown
#   incident-isolate.sh --recover
#
# Env:
#   APP_DIR=/srv/teaching-platform
#   LOG_DIR=/var/log/incident-response
#   BLOCK_OUTBOUND=1
#   STOP_DOCKER=1
#   STOP_NGINX=0

APP_DIR="${APP_DIR:-/srv/teaching-platform}"
LOG_DIR="${LOG_DIR:-/var/log/incident-response}"
BLOCK_OUTBOUND="${BLOCK_OUTBOUND:-1}"
STOP_DOCKER="${STOP_DOCKER:-1}"
STOP_NGINX="${STOP_NGINX:-0}"

mkdir -p "$LOG_DIR"
TS="$(date -u +'%Y%m%dT%H%M%SZ')"

log() {
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$LOG_DIR/incident-$TS.log" >/dev/null
}

snapshot() {
  log "Collecting basic system snapshot..."
  (ps auxfww || true) > "$LOG_DIR/ps-$TS.txt"
  (ss -tpn || true) > "$LOG_DIR/ss-$TS.txt"
  (lsof -nP || true) > "$LOG_DIR/lsof-$TS.txt"
  (crontab -l || true) > "$LOG_DIR/crontab-$TS.txt"
  (systemctl list-units --type=service --all || true) > "$LOG_DIR/systemd-$TS.txt"
  (journalctl -u server-guard --no-pager -n 200 || true) > "$LOG_DIR/guard-$TS.txt"
}

lockdown_network() {
  if [[ "$BLOCK_OUTBOUND" != "1" ]]; then
    return 0
  fi
  if ! command -v iptables >/dev/null 2>&1; then
    log "iptables not found; outbound lockdown skipped."
    return 0
  fi
  log "Blocking outbound traffic (iptables)."
  iptables -P OUTPUT DROP || true
  iptables -A OUTPUT -d 127.0.0.1 -j ACCEPT || true
  iptables -A OUTPUT -d 10.0.0.0/8 -j ACCEPT || true
  iptables -A OUTPUT -d 172.16.0.0/12 -j ACCEPT || true
  iptables -A OUTPUT -d 192.168.0.0/16 -j ACCEPT || true
  iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT || true
  iptables -A OUTPUT -p udp --dport 53 -j ACCEPT || true
  iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT || true
  iptables -A OUTPUT -p tcp --dport 80 -j ACCEPT || true
}

stop_services() {
  if [[ "$STOP_DOCKER" == "1" ]]; then
    log "Stopping application containers (docker compose)."
    if [[ -f "$APP_DIR/docker-compose.prod.yml" ]]; then
      docker compose -f "$APP_DIR/docker-compose.prod.yml" down || true
    fi
  fi
  if [[ "$STOP_NGINX" == "1" ]]; then
    log "Stopping nginx."
    systemctl stop nginx || true
  fi
}

disable_suspicious_units() {
  log "Disabling suspicious systemd units (best-effort)."
  for unit in /etc/systemd/system/*.service; do
    [[ -f "$unit" ]] || continue
    if grep -E '^ExecStart|^ExecStartPre|^ExecStartPost' "$unit" 2>/dev/null | grep -E '(curl|wget).*(http|https)://|bash\s+-c|/dev/tcp|base64\s+-d|/tmp/|/var/tmp/|/dev/shm/' >/dev/null 2>&1; then
      name="$(basename "$unit")"
      systemctl stop "$name" 2>/dev/null || true
      systemctl disable "$name" 2>/dev/null || true
      mv -f "$unit" "$LOG_DIR/${name}.disabled.$TS" 2>/dev/null || true
      log "Disabled suspicious unit: $name"
    fi
  done
  systemctl daemon-reload || true
}

disable_suspicious_cron() {
  log "Disabling suspicious cron entries (best-effort)."
  for p in /etc/cron.d /etc/cron.daily /etc/cron.hourly /etc/cron.weekly /etc/cron.monthly /var/spool/cron; do
    [[ -e "$p" ]] || continue
    grep -R -l -E '(curl|wget).*(http|https)://|bash\s+-c|/dev/tcp|base64\s+-d|\bchmod\b.*\+x' "$p" 2>/dev/null | while read -r f; do
      cp -f "$f" "$LOG_DIR/$(basename "$f").bak.$TS" 2>/dev/null || true
      sed -i -E '/(curl|wget).*(http|https):\/\// s/^/# disabled by incident-isolate /' "$f" 2>/dev/null || true
      log "Suspicious cron disabled in $f"
    done
  done
}

recover_network() {
  log "Restoring outbound policy to ACCEPT."
  if ! command -v iptables >/dev/null 2>&1; then
    return 0
  fi
  iptables -P OUTPUT ACCEPT || true
  iptables -F OUTPUT || true
}

case "${1:-}" in
  --lockdown)
    snapshot
    stop_services
    disable_suspicious_units
    disable_suspicious_cron
    lockdown_network
    log "Isolation complete."
    ;;
  --recover)
    recover_network
    log "Network restored. Manually review and re-enable services after cleanup."
    ;;
  *)
    echo "Usage: $0 --lockdown | --recover"
    exit 2
    ;;
esac
