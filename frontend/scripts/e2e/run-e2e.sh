#!/usr/bin/env bash
# One-command hermetic e2e run: the deterministic regression suites
# (e2e/ — test-id contract, see e2e/TESTIDS.md) driven against THIS
# front end.
#
#   scripts/e2e/run-e2e.sh                          # whole suite
#   scripts/e2e/run-e2e.sh stocktake-regression     # one suite
#   scripts/e2e/run-e2e.sh stocktake-regression --headed
#
# What it does: builds the (sqlite) mSupply server + CLI from an
# open-msupply checkout, restores a throwaway database from its committed
# reference datafile (server/data/e2e), boots the server and this repo's
# vite dev server (GraphQL proxied to the throwaway backend), waits for
# both, runs the e2e/ Playwright suites with BASE_URL pointing at this
# front end, tears everything down. Store-local data (stock) is arranged
# by e2e/specs/data.setup.ts through the API.
#
# The open-msupply checkout (server + reference datafile only — the
# suites live here) must be on `develop` — the same branch this front end
# needs generally: the cookie-session auth contract plus the e2e datafile
# + CLI support.
#
# Knobs (all optional):
#   OMS_DIR           open-msupply checkout (default: ../open-msupply)
#   E2E_SERVER_PORT   backend port  (default 9930; discovery uses port+1)
#   E2E_FE_PORT       front-end port (default 3115)
#   KEEP_SERVER=1     leave the server + FE running after the tests
set -euo pipefail

SERVER_PORT=${E2E_SERVER_PORT:-9930}
FE_PORT=${E2E_FE_PORT:-3115}
DB_NAME=e2e_newfe # -> $OMS_DIR/server/e2e_newfe.sqlite (gitignored there)

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
FE_DIR=$(cd "$SCRIPT_DIR/../.." && pwd)
OMS_DIR=${OMS_DIR:-$FE_DIR/../open-msupply}
if [[ ! -d "$OMS_DIR/server/data/e2e" ]]; then
  echo "OMS_DIR ($OMS_DIR) is not an open-msupply checkout on the develop branch" >&2
  echo "  git clone https://github.com/msupply-foundation/open-msupply --branch develop" >&2
  echo "  (or: git -C <checkout> switch develop) — then set OMS_DIR if it isn't ../open-msupply" >&2
  exit 1
fi
OMS_DIR=$(cd "$OMS_DIR" && pwd)
SERVER_DIR="$OMS_DIR/server"
# Stack logs get their own dir — Playwright wipes its outputDir
# (e2e/test-results) at run start, which would eat logs written before it.
LOG_DIR="$FE_DIR/e2e/stack-logs"
mkdir -p "$LOG_DIR"

# Neutralise any sync credentials in the developer's local.yaml. Empty core
# fields make the merged sync settings count as "not configured", so the
# server can't try to re-authenticate this throwaway site against a real
# central on startup (which would panic or overwrite the restored settings).
# All four must be set together or settings validation rejects the block.
SYNC_OFF=(
  APP__SYNC__URL=
  APP__SYNC__USERNAME=
  APP__SYNC__PASSWORD_SHA256=
  APP__SYNC__INTERVAL_SECONDS=0
)

SERVER_PID=""
FE_PID=""
cleanup() {
  if [[ "${KEEP_SERVER:-0}" == "1" ]]; then
    echo "KEEP_SERVER=1 — server http://localhost:$SERVER_PORT, FE http://localhost:$FE_PORT left running"
    return
  fi
  [[ -n "$FE_PID" ]] && kill "$FE_PID" 2>/dev/null || true
  lsof -ti tcp:"$FE_PORT" 2>/dev/null | xargs kill 2>/dev/null || true
  # The server sometimes ignores a plain TERM — escalate to KILL.
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    sleep 1
    kill -9 "$SERVER_PID" 2>/dev/null || true
  fi
  lsof -ti tcp:"$SERVER_PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true
}
trap cleanup EXIT

for port in "$SERVER_PORT" $((SERVER_PORT + 1)) "$FE_PORT"; do
  if lsof -ti tcp:"$port" >/dev/null 2>&1; then
    echo "Port $port is in use — set E2E_SERVER_PORT / E2E_FE_PORT" >&2
    exit 1
  fi
done

# Fresh-checkout bootstrap: JS deps and the Playwright browser. Both are
# fast no-ops when already present. Linux needs the browser's system deps.
[[ -d "$FE_DIR/node_modules" ]] || (cd "$FE_DIR" && pnpm install --frozen-lockfile)
if [[ "$(uname)" == "Linux" ]]; then
  (cd "$FE_DIR" && pnpm exec playwright install --with-deps chromium)
else
  (cd "$FE_DIR" && pnpm exec playwright install chromium)
fi

echo "Building server + CLI (sqlite; a no-op when already built)"
(cd "$SERVER_DIR" && cargo build --bin remote_server --bin remote_server_cli)
# Honour CARGO_TARGET_DIR (CI shares a persistent target dir across jobs).
BIN_DIR="${CARGO_TARGET_DIR:-$SERVER_DIR/target}/debug"

echo "Restoring database from $SERVER_DIR/data/e2e"
rm -f "$SERVER_DIR/$DB_NAME".sqlite*
(cd "$SERVER_DIR" && env MSUPPLY_NO_TEST_DB_TEMPLATE=1 \
  APP__DATABASE__DATABASE_NAME="$DB_NAME" "${SYNC_OFF[@]}" \
  "$BIN_DIR/remote_server_cli" initialise-from-export -n e2e -r \
  > "$LOG_DIR/e2e-init.log" 2>&1) || {
  echo "initialise-from-export failed:" >&2
  tail -20 "$LOG_DIR/e2e-init.log" >&2
  exit 1
}

echo "Starting server on :$SERVER_PORT"
(cd "$SERVER_DIR" && exec env \
  APP__DATABASE__DATABASE_NAME="$DB_NAME" \
  APP__SERVER__PORT="$SERVER_PORT" \
  APP__SERVER__BASE_DIR=app_data/e2e_newfe \
  APP__LOGGING__MODE=Console \
  "${SYNC_OFF[@]}" \
  "$BIN_DIR/remote_server" > "$LOG_DIR/e2e-server.log" 2>&1) &
SERVER_PID=$!

echo -n "Waiting for server"
for _ in $(seq 1 30); do
  STATUS=$(curl -s -m 2 "http://localhost:$SERVER_PORT/graphql" \
    -H 'Content-Type: application/json' \
    -d '{"query":"query { initialisationStatus { status } }"}' \
    | grep -o INITIALISED || true)
  [[ "$STATUS" == "INITIALISED" ]] && echo " — ready" && break
  echo -n "."
  sleep 2
done
if [[ "${STATUS:-}" != "INITIALISED" ]]; then
  echo; echo "Server failed to start:" >&2
  tail -20 "$LOG_DIR/e2e-server.log" >&2
  exit 1
fi

echo "Starting front end on :$FE_PORT"
(cd "$FE_DIR" && exec env \
  DEV_SERVER_PORT="$FE_PORT" \
  GRAPHQL_PROXY_TARGET="http://localhost:$SERVER_PORT" \
  pnpm exec vite --strictPort > "$LOG_DIR/e2e-devserver.log" 2>&1) &
FE_PID=$!

echo -n "Waiting for front end"
for _ in $(seq 1 45); do
  if curl -s -m 2 -o /dev/null "http://localhost:$FE_PORT"; then echo " — ready"; break; fi
  echo -n "."
  sleep 2
done

# Single worker by default: the suites share one database, and the
# stock-mutating stocktake group must not overlap other stock users; honour
# an explicit --workers from the caller.
WORKERS=(--workers 1)
for arg in "$@"; do [[ "$arg" == --workers* ]] && WORKERS=(); done

cd "$FE_DIR"
# ${arr[@]+...} keeps empty-array expansion safe under bash 3.2's `set -u`.
BASE_URL="http://localhost:$FE_PORT" \
API_URL="http://localhost:$SERVER_PORT" \
  pnpm exec playwright test --config e2e/playwright.config.ts \
  "$@" ${WORKERS[@]+"${WORKERS[@]}"}
