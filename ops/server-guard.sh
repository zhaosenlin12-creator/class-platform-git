#!/usr/bin/env bash
set -euo pipefail

# server-guard.sh
# Lightweight host guard focused on detecting common cryptominer/persistence signals.
# Adds active response options for suspicious processes and persistence.
#
# Safe defaults:
# - MODE=audit (no killing)
# - --daemon runs forever with INTERVAL seconds between checks
#
# Environment variables:
#   MODE=audit|enforce
#   INTERVAL=60
#   CPU_THRESHOLD=<N>            # %CPU across all cores (ps can exceed 100 on multi-core)
#                               # If unset, defaults to 90% * CPU cores (e.g. 2 cores => 180)
#   LOG_FILE=/var/log/server-guard.log
#   DRY_RUN=1                    # when MODE=enforce: set DRY_RUN=0 to actually kill
#   ALLOWLIST_REGEX=...          # regex to ignore specific process commandlines
#   AUTO_KILL_ON_SUSPECT=1       # kill suspicious processes when MODE=enforce
#   AUTO_DISABLE_PERSISTENCE=1   # disable suspicious cron/systemd items when MODE=enforce
#   QUARANTINE_DIR=/var/lib/server-guard/quarantine
#   ALERT_CMD=...                # optional command to run on alert (receives message as $1)

MODE="${MODE:-audit}"
INTERVAL="${INTERVAL:-60}"
LOG_FILE="${LOG_FILE:-/var/log/server-guard.log}"
DRY_RUN="${DRY_RUN:-1}"
ALLOWLIST_REGEX="${ALLOWLIST_REGEX:-}"
QUARANTINE_DIR="${QUARANTINE_DIR:-/var/lib/server-guard/quarantine}"
AUTO_KILL_ON_SUSPECT="${AUTO_KILL_ON_SUSPECT:-1}"
AUTO_DISABLE_PERSISTENCE="${AUTO_DISABLE_PERSISTENCE:-1}"
ALERT_CMD="${ALERT_CMD:-}"

# Default CPU threshold: 90% per core
if [[ -z "${CPU_THRESHOLD:-}" ]]; then
  CORES="$(nproc 2>/dev/null || getconf _NPROCESSORS_ONLN 2>/dev/null || echo 1)"
  CPU_THRESHOLD="$(( CORES * 90 ))"
fi

SUSPECT_REGEX='(xmrig|minerd|cpuminer|kinsing|kdevtmpfsi|stratum\+tcp|monero|\bxmr\b|cryptonight|nanopool|pool\.minexmr|supportxmr|nicehash|coinhive)'
PERSISTENCE_REGEX='(curl|wget).*(http|https)://|bash\s+-c|/dev/tcp|base64\s+-d|\bchmod\b.*\+x'
SYSTEMD_SUSPECT_REGEX='(curl|wget).*(http|https)://|bash\s+-c|/dev/tcp|base64\s+-d|/tmp/|/var/tmp/|/dev/shm/'

usage() {
  cat <<'EOF'
Usage:
  server-guard.sh --once
  server-guard.sh --daemon

Options:
  --once                 Run one scan and exit (default)
  --daemon               Run forever, sleeping INTERVAL seconds between scans
  --mode audit|enforce   Override MODE env var
  --interval SECONDS     Override INTERVAL env var
  --log-file PATH        Override LOG_FILE env var
  --cpu-threshold N      Override CPU_THRESHOLD env var
  --dry-run 0|1          Override DRY_RUN env var

Examples:
  MODE=audit INTERVAL=60 ./server-guard.sh --daemon
  MODE=enforce DRY_RUN=0 CPU_THRESHOLD=200 ./server-guard.sh --daemon
EOF
}

log() {
  local msg="$1"
  local ts
  ts="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

  # stdout
  printf '%s %s\n' "$ts" "$msg"

  # file
  if [[ -n "$LOG_FILE" ]]; then
    local dir
    dir="$(dirname "$LOG_FILE")"
    mkdir -p "$dir" 2>/dev/null || true
    printf '%s %s\n' "$ts" "$msg" >>"$LOG_FILE" 2>/dev/null || true
  fi

  if [[ -n "$ALERT_CMD" ]]; then
    if [[ "$msg" =~ \[SUSPECT\]|\[WARN\]|\[ENFORCE\] ]]; then
      ( "$ALERT_CMD" "$msg" ) >/dev/null 2>&1 || true
    fi
  fi
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

kill_suspect() {
  local pid="$1"
  local reason="$2"

  if [[ "$MODE" != "enforce" ]]; then
    return 0
  fi
  if [[ "$AUTO_KILL_ON_SUSPECT" != "1" ]]; then
    return 0
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    log "[ENFORCE:DRY_RUN] Would kill PID=$pid ($reason)"
    return 0
  fi

  log "[ENFORCE] Killing PID=$pid ($reason)"
  kill -TERM "$pid" 2>/dev/null || true
  sleep 2
  kill -KILL "$pid" 2>/dev/null || true
}

scan_processes() {
  if ! has_cmd ps; then
    log "[WARN] ps not found; skipping process scan"
    return 0
  fi

  # Read top CPU consumers; parse pid, pcpu, user, args (args contains spaces)
  ps -eo pid=,pcpu=,user=,args= --sort=-pcpu | head -n 60 | while read -r pid pcpu user args; do
    [[ -z "${pid:-}" ]] && continue

    # Allowlist
    if [[ -n "$ALLOWLIST_REGEX" ]] && [[ "$args" =~ $ALLOWLIST_REGEX ]]; then
      continue
    fi

    local is_high_cpu=0
    # Compare float pcpu against threshold using awk
    if awk -v v="$pcpu" -v t="$CPU_THRESHOLD" 'BEGIN{exit !(v+0 >= t+0)}'; then
      is_high_cpu=1
    fi

    local exe_path=""
    if [[ -r "/proc/$pid/exe" ]]; then
      exe_path="$(readlink "/proc/$pid/exe" 2>/dev/null || true)"
    fi
    local exe_clean="${exe_path% (deleted)}"

    local tmp_exec=0
    if [[ -n "$exe_clean" ]] && [[ "$exe_clean" =~ ^/(tmp|var/tmp|dev/shm)/ ]]; then
      tmp_exec=1
    fi
    local deleted_exec=0
    if [[ -n "$exe_path" ]] && [[ "$exe_path" == *"(deleted)"* ]]; then
      deleted_exec=1
    fi

    local env_suspect=0
    if [[ -r "/proc/$pid/environ" ]]; then
      if tr '\0' '\n' <"/proc/$pid/environ" 2>/dev/null | grep -Eqi 'LD_PRELOAD=|LD_LIBRARY_PATH=.*(/tmp|/var/tmp|/dev/shm)'; then
        env_suspect=1
      fi
    fi

    local suspect=0
    if [[ "$args" =~ $SUSPECT_REGEX ]]; then
      suspect=1
    fi
    if [[ $is_high_cpu -eq 1 && ( $suspect -eq 1 || $tmp_exec -eq 1 || $deleted_exec -eq 1 || $env_suspect -eq 1 ) ]]; then
      log "[SUSPECT] high_cpu=${pcpu}% pid=$pid user=$user exe=${exe_path:-?} cmd=${args:0:200}"
      kill_suspect "$pid" "high cpu + suspect pattern"
    elif [[ $suspect -eq 1 || $tmp_exec -eq 1 || $deleted_exec -eq 1 || $env_suspect -eq 1 ]]; then
      log "[SUSPECT] pid=$pid user=$user exe=${exe_path:-?} cmd=${args:0:200}"
    fi
  done
}

scan_cron() {
  # Common persistence: cron dropping curl|wget|bash
  local patterns="$PERSISTENCE_REGEX"

  if has_cmd grep; then
    for p in /etc/cron.d /etc/cron.daily /etc/cron.hourly /etc/cron.weekly /etc/cron.monthly /var/spool/cron; do
      if [[ -e "$p" ]]; then
        if grep -R -n -E "$patterns" "$p" 2>/dev/null | head -n 20 | read -r _; then
          log "[WARN] Potential cron persistence found under $p (inspect manually)"
          # Print a small excerpt for quick triage
          grep -R -n -E "$patterns" "$p" 2>/dev/null | head -n 20 | while read -r line; do
            log "[CRON] $line"
          done
          if [[ "$MODE" == "enforce" && "$AUTO_DISABLE_PERSISTENCE" == "1" ]]; then
            mkdir -p "$QUARANTINE_DIR/cron" 2>/dev/null || true
            # Try to disable suspicious lines (best-effort)
            local sed_pattern
            sed_pattern="$(printf '%s' "$patterns" | sed 's/[\\/&]/\\&/g')"
            while IFS= read -r file; do
              [[ -z "$file" ]] && continue
              if [[ -f "$file" ]]; then
                local ts
                ts="$(date -u +'%Y%m%dT%H%M%SZ')"
                cp -f "$file" "$QUARANTINE_DIR/cron/$(basename "$file").$ts.bak" 2>/dev/null || true
                # comment suspicious lines
                sed -i -E "/$sed_pattern/ s/^/# disabled by server-guard /" "$file" 2>/dev/null || true
                log "[ENFORCE] Disabled suspicious cron lines in $file"
              fi
            done < <(grep -R -l -E "$patterns" "$p" 2>/dev/null || true)
          fi
        fi
      fi
    done
  fi
}

scan_network() {
  if ! has_cmd ss; then
    return 0
  fi

  # Mining pools often use these ports; this is heuristic.
  local port_regex=':(3333|4444|5555|6666|7777|14444)\b'
  if ss -Htpn 2>/dev/null | grep -E "$port_regex" >/dev/null 2>&1; then
    log "[WARN] Suspicious outbound connections detected on common mining ports (inspect ss -tpn)"
    ss -Htpn 2>/dev/null | grep -E "$port_regex" | head -n 20 | while read -r line; do
      log "[NET] $line"
    done
  fi
}
scan_systemd() {
  if ! has_cmd systemctl; then
    return 0
  fi

  local unit
  for unit in /etc/systemd/system/*.service; do
    [[ -f "$unit" ]] || continue
    if grep -E '^ExecStart|^ExecStartPre|^ExecStartPost' "$unit" 2>/dev/null | grep -E "$SYSTEMD_SUSPECT_REGEX" >/dev/null 2>&1; then
      log "[WARN] Suspicious systemd unit: $unit"
      grep -E '^ExecStart|^ExecStartPre|^ExecStartPost' "$unit" 2>/dev/null | head -n 5 | while read -r line; do
        log "[SYSTEMD] $line"
      done
      if [[ "$MODE" == "enforce" && "$AUTO_DISABLE_PERSISTENCE" == "1" ]]; then
        local name
        name="$(basename "$unit")"
        log "[ENFORCE] Disabling systemd unit $name"
        systemctl stop "$name" 2>/dev/null || true
        systemctl disable "$name" 2>/dev/null || true
        mkdir -p "$QUARANTINE_DIR/systemd" 2>/dev/null || true
        local ts
        ts="$(date -u +'%Y%m%dT%H%M%SZ')"
        mv -f "$unit" "$QUARANTINE_DIR/systemd/${name}.${ts}.disabled" 2>/dev/null || true
        systemctl daemon-reload 2>/dev/null || true
      fi
    fi
  done
}

run_once() {
  log "[RUN] mode=$MODE interval=${INTERVAL}s cpu_threshold=${CPU_THRESHOLD}% dry_run=$DRY_RUN"
  scan_processes
  scan_cron
  scan_network
  scan_systemd
}

main() {
  local daemon=0

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --once)
        daemon=0
        shift
        ;;
      --daemon)
        daemon=1
        shift
        ;;
      --mode)
        MODE="$2"
        shift 2
        ;;
      --interval)
        INTERVAL="$2"
        shift 2
        ;;
      --log-file)
        LOG_FILE="$2"
        shift 2
        ;;
      --cpu-threshold)
        CPU_THRESHOLD="$2"
        shift 2
        ;;
      --dry-run)
        DRY_RUN="$2"
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        log "[ERROR] Unknown arg: $1"
        usage
        exit 2
        ;;
    esac
  done

  if [[ "$MODE" != "audit" && "$MODE" != "enforce" ]]; then
    log "[ERROR] MODE must be audit|enforce"
    exit 2
  fi

  if [[ $daemon -eq 1 ]]; then
    while true; do
      run_once || true
      sleep "$INTERVAL"
    done
  else
    run_once
  fi
}

main "$@"
