#!/usr/bin/env bash
# One-command hermetic e2e run against the committed reference datafile.
#
#   cd client
#   yarn e2e:local                          # whole suite
#   yarn e2e:local stocktake-regression     # one suite
#   yarn e2e:local stocktake-regression --headed
#
# What it does: builds the (sqlite) server + CLI, restores a throwaway
# database from server/data/e2e, boots the server and a webpack dev server
# on dedicated ports, waits for both, runs the deterministic regression
# suites, tears everything down. Store-local data (stock) is arranged by
# the suites' data.setup.ts through the API — the datafile deliberately
# contains none (see server/data/e2e/README.md).
#
# The suites themselves are DEFINED IN open-msupply-frontend (e2e/ there —
# the cross-FE test-id contract, e2e/TESTIDS.md, lets one suite definition
# verify both front ends), so this script needs a checkout of that repo
# alongside the server + front end it builds here.
#
# Knobs (all optional):
#   FE_SUITES_DIR     open-msupply-frontend checkout (default:
#                     ../open-msupply-frontend next to this repo)
#   E2E_SERVER_PORT   backend port  (default 9920; discovery uses port+1)
#   E2E_FE_PORT       front-end port (default 3113)
#   KEEP_SERVER=1     leave the server + FE running after the tests
set -euo pipefail

SERVER_PORT=${E2E_SERVER_PORT:-9920}
FE_PORT=${E2E_FE_PORT:-3113}
DB_NAME=e2e_playwright # -> server/e2e_playwright.sqlite (gitignored)

# Neutralise any sync credentials in the developer's local.yaml. Empty core
# fields make the merged sync settings count as "not configured", so the
# server can't try to re-authenticate this throwaway site against a real
# central on startup (which would panic or overwrite the restored settings).
# All four must be set together or settings validation rejects the block.
#
# The server-role override is pinned for the same reason: it must NOT be
# inherited from local.yaml. Left unpinned, the stack's sync topology depends
# on whether the developer happens to set `server.override_is_central_server`
# — and the two settings behave very differently:
#
#   pinned true (here)  the site is its own central, so a sync run is a local
#                       no-op that SUCCEEDS instantly. Status, phase list,
#                       last-successful notice and Sync-now are all exercised.
#   unpinned in CI      settings are "not configured", so the synchroniser
#                       logs "Sync is disabled, skipping" and NO run is ever
#                       recorded — every trigger silently does nothing, and
#                       isCentralServer flips to false (which changes the
#                       phase-visibility row the modal displays).
#
# The sync-modal suite asserts triggering, so it needs runs to happen; every
# other suite is indifferent. Pin it so local and CI agree.
SYNC_OFF=(
  APP__SYNC__URL=
  APP__SYNC__USERNAME=
  APP__SYNC__PASSWORD_SHA256=
  APP__SYNC__INTERVAL_SECONDS=0
  APP__SERVER__OVERRIDE_IS_CENTRAL_SERVER=true
)

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PW_DIR=$(cd "$SCRIPT_DIR/.." && pwd)          # client/playwright
CLIENT_DIR=$(cd "$PW_DIR/.." && pwd)          # client
SERVER_DIR=$(cd "$CLIENT_DIR/../server" && pwd)

FE_SUITES_DIR=${FE_SUITES_DIR:-$CLIENT_DIR/../../open-msupply-frontend}
if [[ ! -d "$FE_SUITES_DIR/e2e/specs" ]]; then
  echo "FE_SUITES_DIR ($FE_SUITES_DIR) is not an open-msupply-frontend checkout" >&2
  echo "  git clone https://github.com/msupply-foundation/open-msupply-frontend" >&2
  echo "  then set FE_SUITES_DIR if it isn't ../open-msupply-frontend" >&2
  exit 1
fi
FE_SUITES_DIR=$(cd "$FE_SUITES_DIR" && pwd)
# Stack logs go in the suites repo (so CI uploads one coherent artifact)
# but in their own dir — Playwright wipes its outputDir (e2e/test-results)
# at run start, which would eat logs written before it.
LOG_DIR="$FE_SUITES_DIR/e2e/stack-logs"
mkdir -p "$LOG_DIR"

SERVER_PID=""
FE_PID=""
cleanup() {
  if [[ "${KEEP_SERVER:-0}" == "1" ]]; then
    echo "KEEP_SERVER=1 — server http://localhost:$SERVER_PORT, FE http://localhost:$FE_PORT left running"
    return
  fi
  [[ -n "$FE_PID" ]] && kill "$FE_PID" 2>/dev/null || true
  # npm/yarn's webpack child survives its parent — free the port explicitly.
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

# Fresh-checkout bootstrap: JS deps for this FE (webpack dev server) and
# for the suites repo, plus the suites' Playwright browser. All are fast
# no-ops when already present. Linux needs the browser's system deps.
[[ -d "$CLIENT_DIR/node_modules" ]] || (cd "$CLIENT_DIR" && yarn install)
[[ -d "$FE_SUITES_DIR/node_modules" ]] || (cd "$FE_SUITES_DIR" && pnpm install --frozen-lockfile)
if [[ "$(uname)" == "Linux" ]]; then
  (cd "$FE_SUITES_DIR" && pnpm exec playwright install --with-deps chromium)
else
  (cd "$FE_SUITES_DIR" && pnpm exec playwright install chromium)
fi

echo "Building server + CLI (sqlite; a no-op when already built)"
(cd "$SERVER_DIR" && cargo build --bin remote_server --bin remote_server_cli)
# Honour CARGO_TARGET_DIR (CI shares a persistent target dir across jobs).
BIN_DIR="${CARGO_TARGET_DIR:-$SERVER_DIR/target}/debug"

echo "Restoring database from server/data/e2e"
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
  APP__SERVER__BASE_DIR=app_data/e2e_local \
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

echo "Starting front end on :$FE_PORT (first compile can take a minute)"
(cd "$CLIENT_DIR/packages/host" && exec yarn start \
  --port "$FE_PORT" --env API_HOST="http://localhost:$SERVER_PORT" \
  > "$LOG_DIR/e2e-devserver.log" 2>&1) &
FE_PID=$!

echo -n "Waiting for front end"
for _ in $(seq 1 90); do
  if curl -s -m 2 -o /dev/null "http://localhost:$FE_PORT"; then echo " — ready"; break; fi
  echo -n "."
  sleep 2
done

# Serial within a run: the suites share one database and use serial
# describes; honour an explicit --workers from the caller.
WORKERS=(--workers 1)
for arg in "$@"; do [[ "$arg" == --workers* ]] && WORKERS=(); done

cd "$FE_SUITES_DIR"
# ${arr[@]+...} keeps empty-array expansion safe under bash 3.2's `set -u`.
# E2E_META_APP_VERSION: the suites config stamps the app-under-test version
# into the report — that's this repo's client, not the suites repo.
BASE_URL="http://localhost:$FE_PORT" \
API_URL="http://localhost:$SERVER_PORT" \
E2E_META_APP_VERSION=$(node -p "require('$CLIENT_DIR/package.json').version") \
  pnpm exec playwright test --config e2e/playwright.config.ts \
  "$@" ${WORKERS[@]+"${WORKERS[@]}"}
