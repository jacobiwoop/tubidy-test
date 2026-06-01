#!/bin/sh
set -eu

if command -v Xvfb >/dev/null 2>&1; then
  Xvfb "${DISPLAY:-:99}" -screen 0 1920x1080x24 -nolisten tcp &
  XVFB_PID=$!
else
  XVFB_PID=""
fi

python /app/cloak-runner/server.py &
RUNNER_PID=$!

cleanup() {
  kill "$RUNNER_PID" 2>/dev/null || true
  if [ -n "${XVFB_PID}" ]; then
    kill "$XVFB_PID" 2>/dev/null || true
  fi
}

trap cleanup INT TERM EXIT

node /app/app.js &
API_PID=$!

wait "$API_PID"
