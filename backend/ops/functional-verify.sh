#!/usr/bin/env bash
set -euo pipefail

# functional-verify.sh
# Post-deploy functional verification script
#
# Usage:
#   ./functional-verify.sh --base-url https://class.codebn.cn --username admin --password 'xxxx' [--local-url http://127.0.0.1:8081]
#   ./functional-verify.sh --base-url https://class.codebn.cn --username admin --password 'xxxx' --captcha-skip
#
# Notes:
# - If captcha is enforced in production, you can either:
#   (a) run with --captcha-skip AND temporarily set SKIP_CAPTCHA=true
#   (b) let the script fetch captcha SVG and input the code manually

BASE_URL=""
LOCAL_URL="http://127.0.0.1:8081"
USERNAME=""
PASSWORD=""
CAPTCHA_SKIP=0
VERBOSE=0

for arg in "$@"; do
  case "$arg" in
    --base-url) BASE_URL="$2"; shift 2 ;;
    --local-url) LOCAL_URL="$2"; shift 2 ;;
    --username) USERNAME="$2"; shift 2 ;;
    --password) PASSWORD="$2"; shift 2 ;;
    --captcha-skip) CAPTCHA_SKIP=1; shift ;;
    -v|--verbose) VERBOSE=1; shift ;;
    -h|--help)
      cat <<'EOF'
Usage:
  ./functional-verify.sh --base-url https://domain --username admin --password 'xxx' [--local-url http://127.0.0.1:8081]
  ./functional-verify.sh --base-url https://domain --username admin --password 'xxx' --captcha-skip
EOF
      exit 0
      ;;
    *) shift ;;
  esac
done

if [[ -z "$BASE_URL" || -z "$USERNAME" || -z "$PASSWORD" ]]; then
  echo "[ERROR] base-url/username/password required." >&2
  exit 1
fi

log() {
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $*"
}

json_get() {
  local key="$1"
  local input="$2"
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<PY
import json,sys
data=json.loads(sys.argv[1])
print(data.get("$key",""))
PY "$input"
    return
  fi
  if command -v python >/dev/null 2>&1; then
    python - <<PY
import json,sys
data=json.loads(sys.argv[1])
print(data.get("$key",""))
PY "$input"
    return
  fi
  # fallback: naive grep
  echo "$input" | sed -n "s/.*\"$key\":\"\\([^\"]*\\)\".*/\\1/p"
}

log "1) Health check (local)"
curl -fsS "$LOCAL_URL/health" >/dev/null
log "OK"

log "2) Health check (public)"
curl -fsS -I "$BASE_URL/health" | head -n 1

log "3) Uploads should be 404 (OSS-only)"
curl -fsS -I "$BASE_URL/uploads/test.txt" | head -n 1

log "4) Login flow"
captcha=""
checkKey=""
if [[ "$CAPTCHA_SKIP" -eq 1 ]]; then
  captcha="skip"
  checkKey="$(date +%s)"
else
  ts="$(date +%s)"
  resp="$(curl -fsS "$BASE_URL/sys/randomImage/$ts")"
  checkKey="$(echo "$resp" | sed -n 's/.*"code":"\([^"]*\)".*/\1/p')"
  [[ -z "$checkKey" ]] && checkKey="$(echo "$resp" | sed -n 's/.*"checkKey":"\([^"]*\)".*/\1/p')"

  if command -v python3 >/dev/null 2>&1; then
    python3 - <<PY
import json,sys
data=json.loads(sys.argv[1])
svg=data.get("result") or data.get("img") or ""
open("/tmp/captcha.svg","w",encoding="utf-8").write(svg)
PY "$resp"
    log "Captcha saved to /tmp/captcha.svg (open it and input code)"
  else
    log "Python not found; enable --captcha-skip or install python3."
  fi
  read -r -p "Enter captcha: " captcha
fi

login_payload=$(printf '{"username":"%s","password":"%s","captcha":"%s","checkKey":"%s"}' "$USERNAME" "$PASSWORD" "$captcha" "$checkKey")
login_resp="$(curl -fsS -H "Content-Type: application/json" -d "$login_payload" "$BASE_URL/sys/login")"
token="$(echo "$login_resp" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"

if [[ -z "$token" ]]; then
  echo "[ERROR] Login failed. Response: $login_resp" >&2
  exit 2
fi
log "Login OK"

log "5) Upload test (OSS)"
tmpfile="/tmp/verify-upload.txt"
echo "verify-$(date -u +'%Y%m%dT%H%M%SZ')" > "$tmpfile"
upload_resp="$(curl -fsS -H "X-Access-Token: $token" -F "file=@$tmpfile;type=text/plain" -F "bizPath=verify" "$BASE_URL/sys/common/upload")"

if [[ "$VERBOSE" -eq 1 ]]; then
  echo "$upload_resp"
fi

file_url="$(echo "$upload_resp" | sed -n 's/.*"fullUrl":"\([^"]*\)".*/\1/p')"
if [[ -z "$file_url" ]]; then
  file_url="$(echo "$upload_resp" | sed -n 's/.*"message":"\([^"]*\)".*/\1/p')"
fi

if [[ -z "$file_url" ]]; then
  echo "[ERROR] Upload failed. Response: $upload_resp" >&2
  exit 3
fi

log "Upload OK: $file_url"

log "6) Check OSS URL access"
curl -fsS -I "$file_url" | head -n 1

log "All checks passed."
