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
# The server + reference datafile come from a checkout that carries
# `server/` (the suites live here). The front end and the server now share
# ONE repository, and that is this one, so nothing needs setting; the
# separate pre-merge `open-msupply` checkout stays accepted as a fallback,
# and OMS_DIR overrides both.
#
# Whichever it resolves to needs three specific capabilities, each
# preflighted below with its own message. A branch name is not the
# requirement — any branch carrying all three works:
#
#   1. The e2e datafile export — server/data/e2e/{export.json,users.txt}.
#   2. `remote_server_cli initialise-from-export --name --refresh`, the
#      restore path used here (Action::InitialiseFromExport in
#      cli/src/cli.rs; --refresh makes the datafile's dates current).
#   3. Cookie-session auth: the `authToken` query must answer with a
#      Set-Cookie session cookie and /graphql must accept it, because this
#      front end sends `credentials: 'same-origin'` and NO Authorization
#      header (src/api/graphql.ts). A server that only returns a bearer
#      token leaves every UI step in the suites unauthenticated.
#
# Knobs (all optional):
#   OMS_DIR           the checkout supplying server/ (default: this repo,
#                     then a pre-merge ../open-msupply — see below)
#   E2E_SERVER_PORT   backend port (discovery uses port+1)
#   E2E_FE_PORT       front-end port
#     When neither port is set, a free pair is picked automatically
#     (server 9930+2n, FE 3115+n), seeded from this checkout's path — so
#     several worktrees can run concurrently against one shared OMS_DIR
#     without coordinating ports by hand.
#   KEEP_SERVER=1     leave the server + FE running after the tests
set -euo pipefail

SERVER_PORT=${E2E_SERVER_PORT:-}
FE_PORT=${E2E_FE_PORT:-}
DB_NAME="" # set once ports are known -> $OMS_DIR/server/<name>.sqlite (gitignored there)

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
FE_DIR=$(cd "$SCRIPT_DIR/../.." && pwd)
OMS_DIR=${OMS_DIR:-}
if [[ -z "$OMS_DIR" ]]; then
  # Candidates in order; the first one carrying server/data/e2e wins.
  #
  # THIS REPO FIRST. The front end and the server share one repository now,
  # so its own server/ is both the nearest and the only one guaranteed to
  # match the branch under test. A separate pre-merge `open-msupply`
  # checkout still works and is still tried — but it is no longer the
  # default, because those have drifted: an out-of-date datafile shows up
  # as the app redirecting away from a gated screen, which reads as a
  # SUITE failure rather than the setup problem it is.
  #
  # The main-working-tree entries are for a git worktree that is sparse or
  # nested (.worktrees/<name>) and so has no server/ or no sibling of its
  # own — worktree runs need no OMS_DIR either way.
  COMMON_DIR=$(git -C "$FE_DIR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
  MAIN_TREE=${COMMON_DIR:+$(dirname "$COMMON_DIR")}
  for candidate in \
    "$FE_DIR/.." \
    ${MAIN_TREE:+"$MAIN_TREE"} \
    "$FE_DIR/../../open-msupply" \
    ${MAIN_TREE:+"$MAIN_TREE/../open-msupply"}; do
    [[ -d "$candidate/server/data/e2e" ]] && OMS_DIR=$candidate && break
  done
  # Nothing matched: name the nearest candidate, so the error below points
  # somewhere useful rather than at an empty string.
  OMS_DIR=${OMS_DIR:-$FE_DIR/..}
fi
if [[ ! -d "$OMS_DIR/server/data/e2e" ]]; then
  echo "MISSING DEPENDENCY: the e2e datafile export." >&2
  echo "  Expected: $OMS_DIR/server/data/e2e/ (export.json + users.txt)" >&2
  echo "  Neither this repo's own server/ nor a pre-merge ../open-msupply" >&2
  echo "  checkout carries it — this working tree may be sparse, or on a" >&2
  echo "  revision predating the e2e datafile. Set OMS_DIR to a checkout" >&2
  echo "  that has server/data/e2e/." >&2
  exit 1
fi
# Named separately from the directory: a checkout that HAS data/e2e but is
# missing a file inside it otherwise fails later, inside the CLI, as an
# opaque serde error.
for datafile in export.json users.txt; do
  if [[ ! -f "$OMS_DIR/server/data/e2e/$datafile" ]]; then
    echo "MISSING DEPENDENCY: $OMS_DIR/server/data/e2e/$datafile" >&2
    echo "  The e2e datafile export is incomplete — restore it in OMS_DIR." >&2
    exit 1
  fi
done
OMS_DIR=$(cd "$OMS_DIR" && pwd)
SERVER_DIR="$OMS_DIR/server"
# Stack logs get their own dir — Playwright wipes its outputDir
# (e2e/test-results) at run start, which would eat logs written before it.
# The per-port subdir is appended once ports are known: open-msupply's
# harness writes flat files with these same names into e2e/stack-logs when
# its FE_SUITES_DIR points here, and a concurrent run must not interleave.
LOG_ROOT="$FE_DIR/e2e/stack-logs"

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

# The server ROLE is pinned for a related but distinct reason: it must not be
# inherited from local.yaml either, and unlike the block above it changes what
# the app renders. The two modes behave very differently:
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
# The sync-modal suite asserts triggering, so it needs runs to happen. Pin it
# so local and CI agree. NB the pin is stack-wide, so it reaches every suite:
# a central server additively exposes its central-only affordances (this FE:
# Manage › Help documents in the nav, the save-as-global-default action in the
# table-settings popover — both SERVER_ADMIN-gated; the current app gates the
# same way). No suite asserts an exhaustive nav or popover, which is why this
# is safe today — a suite that starts to should scope its assertion rather
# than assume a remote-site stack.
SERVER_ROLE_PIN=(APP__SERVER__OVERRIDE_IS_CENTRAL_SERVER=true)

SERVER_PID=""
FE_PID=""
cleanup() {
  if [[ "${KEEP_SERVER:-0}" == "1" ]]; then
    echo "KEEP_SERVER=1 — server http://localhost:$SERVER_PORT, FE http://localhost:$FE_PORT left running"
    return
  fi
  [[ -n "$FE_PID" ]] && kill "$FE_PID" 2>/dev/null || true
  [[ -n "$FE_PORT" ]] && lsof -ti tcp:"$FE_PORT" 2>/dev/null | xargs kill 2>/dev/null || true
  # The server sometimes ignores a plain TERM — escalate to KILL.
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    sleep 1
    kill -9 "$SERVER_PID" 2>/dev/null || true
  fi
  [[ -n "$SERVER_PORT" ]] && lsof -ti tcp:"$SERVER_PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true
  # The database and app-data dir are per-run (named by port) — remove them
  # so concurrent-run slots don't accumulate throwaway files in OMS_DIR.
  if [[ -n "$DB_NAME" ]]; then
    rm -f "$SERVER_DIR/$DB_NAME".sqlite*
    rm -rf "$SERVER_DIR/app_data/$DB_NAME"
  fi
}
trap cleanup EXIT

port_free() { ! lsof -ti tcp:"$1" >/dev/null 2>&1; }

# Explicitly-requested ports (CI derives a unique pair per run) fail fast
# while it's still cheap; automatic selection instead happens after the
# cargo build, as close as possible to the moment the ports are bound.
if [[ -n "$SERVER_PORT" || -n "$FE_PORT" ]]; then
  SERVER_PORT=${SERVER_PORT:-9930}
  FE_PORT=${FE_PORT:-3115}
  for port in "$SERVER_PORT" $((SERVER_PORT + 1)) "$FE_PORT"; do
    if ! port_free "$port"; then
      echo "Port $port is in use — set E2E_SERVER_PORT / E2E_FE_PORT" >&2
      exit 1
    fi
  done
fi

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

# Dependency 2: the restore path this script drives. Probed rather than
# assumed, because without --refresh the datafile restores with stale dates
# and the failure surfaces much later as puzzling assertion failures (dates
# out of range) rather than as a missing subcommand.
CLI_HELP=$("$BIN_DIR/remote_server_cli" initialise-from-export --help 2>&1 || true)
if ! grep -q -- "--refresh" <<<"$CLI_HELP"; then
  echo "MISSING DEPENDENCY: remote_server_cli initialise-from-export --refresh" >&2
  echo "  OMS_DIR ($OMS_DIR) builds a CLI without the date-refreshing restore" >&2
  echo "  path this script uses (Action::InitialiseFromExport in cli/src/cli.rs)." >&2
  echo "  Its 'initialise-from-export --help' reported:" >&2
  echo "${CLI_HELP:-  (the subcommand does not exist)}" | sed 's/^/    /' >&2
  exit 1
fi

# Pick a free port slot when none was requested: slot n -> server 9930+2n
# (+1 of it for discovery), FE 3115+n. Seeding the probe order from the
# checkout path means concurrent worktrees start at different slots even
# when launched at the same instant; doing it here — after the possibly
# minutes-long cargo build — keeps the pick-to-bind window small.
if [[ -z "$SERVER_PORT" ]]; then
  SEED=$(( $(cksum <<<"$FE_DIR" | cut -d' ' -f1) % 100 ))
  for i in $(seq 0 99); do
    slot=$(( (SEED + i) % 100 ))
    if port_free $((9930 + slot * 2)) && port_free $((9931 + slot * 2)) &&
      port_free $((3115 + slot)); then
      SERVER_PORT=$((9930 + slot * 2))
      FE_PORT=$((3115 + slot))
      break
    fi
  done
  if [[ -z "$SERVER_PORT" ]]; then
    echo "No free port slot (server 9930-10129, FE 3115-3214) — set E2E_SERVER_PORT / E2E_FE_PORT" >&2
    exit 1
  fi
  echo "Ports: server :$SERVER_PORT (discovery :$((SERVER_PORT + 1))), front end :$FE_PORT"
fi

# Per-run database + app-data dir, named by port, so concurrent runs
# sharing one open-msupply checkout never touch each other's files.
DB_NAME=e2e_newfe_$SERVER_PORT
LOG_DIR="$LOG_ROOT/$SERVER_PORT"
mkdir -p "$LOG_DIR"

echo "Restoring database from $SERVER_DIR/data/e2e"
rm -f "$SERVER_DIR/$DB_NAME".sqlite*
(cd "$SERVER_DIR" && env MSUPPLY_NO_TEST_DB_TEMPLATE=1 \
  APP__DATABASE__DATABASE_NAME="$DB_NAME" \
  "${SYNC_OFF[@]}" "${SERVER_ROLE_PIN[@]}" \
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
  APP__SERVER__BASE_DIR=app_data/"$DB_NAME" \
  APP__LOGGING__MODE=Console \
  "${SYNC_OFF[@]}" "${SERVER_ROLE_PIN[@]}" \
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

# Dependency 3: cookie-session auth. This front end authenticates every
# request with the session cookie alone (credentials: 'same-origin', no
# Authorization header — src/api/graphql.ts), so a server that answers
# authToken WITHOUT a Set-Cookie leaves every UI step logged out. Checked
# here because the symptom otherwise lands as auth.setup timing out on the
# app chrome, which reads like a front-end bug.
# The same credentials the suites use, so this probe can't disagree with them.
PROBE_USER=${PW_USERNAME:-admin}
PROBE_PASS=${PW_PASSWORD:-pass}
AUTH_RESPONSE=$(curl -s -i -m 5 "http://localhost:$SERVER_PORT/graphql" \
  -H 'Content-Type: application/json' \
  -d "{\"query\":\"query { authToken(username:\\\"$PROBE_USER\\\",password:\\\"$PROBE_PASS\\\") { __typename } }\"}" \
  || true)
# Refused credentials produce no cookie either, so separate the two: only a
# server that ACCEPTED the login and still sent no cookie lacks the capability.
if ! grep -q '"__typename":"AuthToken"' <<<"$AUTH_RESPONSE"; then
  echo "CANNOT AUTHENTICATE: the server refused the e2e credentials." >&2
  echo "  User '$PROBE_USER' (PW_USERNAME/PW_PASSWORD override the default" >&2
  echo "  admin/pass) was not accepted, so this is a datafile/credential" >&2
  echo "  mismatch rather than a missing capability. Server said:" >&2
  sed -n '/^{/,$p' <<<"$AUTH_RESPONSE" | head -3 | sed 's/^/    /' >&2
  exit 1
fi
if ! grep -qi '^set-cookie:' <<<"$AUTH_RESPONSE"; then
  echo "MISSING DEPENDENCY: cookie-session auth on the authToken query." >&2
  echo "  OMS_DIR ($OMS_DIR) accepted the login but sent no Set-Cookie." >&2
  echo "  This front end sends no Authorization header, so every UI step" >&2
  echo "  would run unauthenticated (see set_session_cookie in" >&2
  echo "  graphql/general/src/queries/login.rs)." >&2
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
