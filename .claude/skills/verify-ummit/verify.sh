#!/usr/bin/env bash
# Verification harness for ummit.dev: build, serve dist/ on a private port, fetch pages, capture evidence.
# Usage: verify.sh launch | doctor | get <path> | dom <path> | shot <path> | stop
set -euo pipefail

ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
PORT=${VERIFY_PORT:-4399}
BASE=http://127.0.0.1:$PORT
OUT=${VERIFY_OUT:-$HOME/.cache/verify-ummit}
PIDFILE=$OUT/preview-$PORT.pid
CHROME=${CHROME:-google-chrome-stable}
mkdir -p "$OUT"

# /posts/Linux/foo/ -> posts_Linux_foo
name() {
  local s=${1#/}
  s=${s%/}
  s=${s//\//_}
  echo "${s:-index}"
}

up() { curl -s -o /dev/null "$BASE/"; }

# Headless Chrome with every host but localhost unresolvable, so a page load
# cannot write to the production Firestore counters or Umami analytics.
chrome() {
  local profile
  profile=$(mktemp -d)
  "$CHROME" --headless=new --disable-gpu --user-data-dir="$profile" \
    --host-resolver-rules='MAP * ~NOTFOUND, EXCLUDE 127.0.0.1' "$@" 2>/dev/null
  rm -rf "$profile"
}

case ${1:-} in
  launch)
    if up; then
      echo "port $PORT already answers; not ours. Run '$0 stop' or set VERIFY_PORT." >&2
      exit 1
    fi
    cd "$ROOT"
    bun run build >"$OUT/build.log" 2>&1 || { tail -20 "$OUT/build.log" >&2; exit 1; }
    setsid bunx astro preview --port "$PORT" --host 127.0.0.1 >"$OUT/preview.log" 2>&1 &
    for _ in $(seq 60); do
      if up; then
        # bunx hands off to a node child, so record whoever owns the port, not $!.
        ss -ltnp "sport = :$PORT" | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2 >"$PIDFILE"
        echo "ready $BASE (pid $(cat "$PIDFILE"), evidence in $OUT)"
        exit 0
      fi
      sleep 0.5
    done
    echo "preview did not come up, see $OUT/preview.log" >&2
    exit 1
    ;;
  doctor)
    fail=0
    if [[ -f $PIDFILE ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
      echo "ok   preview process $(cat "$PIDFILE") is ours"
    else
      echo "FAIL no preview started by this harness on port $PORT"
      fail=1
    fi
    if up; then echo "ok   $BASE answers"; else echo "FAIL $BASE does not answer"; fail=1; fi
    head=$(git -C "$ROOT" rev-parse HEAD)
    built=$(curl -s "$BASE/" | grep -o 'data-build="[^"]*"' | head -1 | cut -d'"' -f2 || true)
    if [[ -n $built && $head == "$built"* ]]; then
      echo "ok   served build is HEAD ($built)"
    else
      echo "FAIL served build '$built' is not HEAD $head"
      fail=1
    fi
    [[ -z $(git -C "$ROOT" status --porcelain -- src public astro.config.ts uno.config.ts config.yaml) ]] ||
      echo "note uncommitted source changes: the stamp cannot tell if dist/ includes them, relaunch to be sure"
    exit $fail
    ;;
  get)
    n=$(name "$2")
    code=$(curl -sS -D "$OUT/$n.headers" -o "$OUT/$n.body" -w '%{http_code}' "$BASE$2")
    echo "$code $2 -> $OUT/$n.body"
    [[ $code == 200 ]]
    ;;
  dom)
    n=$(name "$2")
    chrome --virtual-time-budget=5000 --dump-dom "$BASE$2" >"$OUT/$n.dom.html"
    echo "$OUT/$n.dom.html"
    ;;
  shot)
    n=$(name "$2")
    chrome --virtual-time-budget=5000 --window-size="${VERIFY_SIZE:-1280,2400}" \
      --screenshot="$OUT/$n.png" "$BASE$2" >/dev/null
    echo "$OUT/$n.png"
    ;;
  stop)
    if [[ -f $PIDFILE ]]; then
      kill "$(cat "$PIDFILE")" 2>/dev/null || true
      rm -f "$PIDFILE"
      echo "stopped; evidence kept in $OUT"
    else
      echo "nothing to stop on port $PORT"
    fi
    ;;
  *)
    sed -n 2,3p "$0" >&2
    exit 2
    ;;
esac
