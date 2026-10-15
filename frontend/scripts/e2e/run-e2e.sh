#!/usr/bin/env bash
# One-command hermetic e2e run: the deterministic regression suites
# (e2e/ — test-id contract, see e2e/TESTIDS.md) driven against THIS
# front end.
#
#   scripts/e2e/run-e2e.sh                          # whole suite
#   scripts/e2e/run-e2e.sh stocktake-regression     # one suite
#   scripts/e2e/run-e2e.sh stocktake-regression --headed
#
# What it does: builds the (sqlite) mSupply server + CLI from this repo's
# server/, restores a throwaway database from its committed reference
# datafile (server/data/e2e), boots the server and this front end's vite dev
# server (GraphQL proxied to the throwaway backend), waits for both, runs the
# e2e/ Playwright suites with BASE_URL pointing at this front end, tears
# everything down. Store-local data (stock) is arranged by
# e2e/specs/data.setup.ts through the API.
#
# The server is always THIS checkout's server/ — the one guaranteed to match
# the branch under test — unless OMS_DIR says otherwise. It needs three
# specific capabilities, each preflighted below with its own message:
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
#   OMS_DIR           a checkout whose server/ to build instead of this one's
#                     (e.g. to try these suites against another branch's
#                     server)
#   E2E_SERVER_PORT   backend port (discovery uses port+1)
#   E2E_FE_PORT       front-end port
#     When neither port is set, a free pair is picked automatically
#     (server 9930+2n, FE 3115+n), seeded from this checkout's path — so
#     several worktrees can run concurrently against one shared OMS_DIR
#     without coordinating ports by hand.
#   E2E_SERVERS=N     run the suites across N servers side by side, each with
#                     its own throwaway database and front end, the spec files
#                     split by last-run duration (scripts/e2e/split-specs.mjs,
#                     timings in e2e/.spec-timings.json). Unset: automatic — up
#                     to 3, fewer when other e2e runs on this machine already
#                     hold servers (see E2E_SERVER_BUDGET). Always capped at
#                     the number of selected spec files, so a one-suite run
#                     boots one server; 1 with E2E_SERVER_PORT / E2E_FE_PORT
#                     or E2E_PLUGIN_PROFILE.
#   E2E_SERVER_BUDGET=N  how many e2e servers the automatic choice lets this
#                     machine run at once, across every concurrent run
#                     (default 6). Ignored when E2E_SERVERS is set.
#   KEEP_SERVER=1     leave the server + FE running after the tests
#   E2E_SERVER_CACHE=0      always run cargo build (default: reuse a cached
#                           server binary when server/ is unchanged — see
#                           "Server binaries are cached" below)
#   E2E_SERVER_CACHE_DIR    where the cached binaries live
#                           (default ~/.cache/open-msupply/e2e-server)
#   E2E_PLUGIN_PROFILE  run a plugin profile instead of the default suites:
#                     builds that profile's plugin bundle (pnpm build:plugins),
#                     installs it into THIS run's throwaway database through
#                     the real install path, waits for discovery to offer
#                     it (no restart — the same path as the nightly), and
#                     runs only
#                     e2e/specs/plugins/<profile>/ (playwright.config.ts picks
#                     the project from the same variable). A profile is a
#                     plugin directory name: plugins/<profile>/, whose
#                     package.json `name` is the plugin code. Profiles are
#                     listed in e2e/README.md, not here — this script names
#                     no deployment.
#                     Its own run, never mixed with the default suites: a
#                     plugin can change the host app for every store on the
#                     site (a dashboard replaced, a column added), so the
#                     default suites must never see one installed.
set -euo pipefail

PLUGIN_PROFILE=${E2E_PLUGIN_PROFILE:-}
PLUGIN_CODE=""

SERVER_PORT=${E2E_SERVER_PORT:-}
FE_PORT=${E2E_FE_PORT:-}
DATAFILE_NAME="" # set before the restore; e2e unless a profile overlays it
SERVERS=${E2E_SERVERS:-auto}
if [[ -n "$SERVER_PORT" || -n "$FE_PORT" || -n "$PLUGIN_PROFILE" ]]; then
  SERVERS=1
fi
# One entry per server, filled once ports are known. A single-server run has
# one entry; SERVER_PORT / FE_PORT / DB_NAME / LOG_DIR name the first.
SERVER_PORTS=()
FE_PORTS=()
DB_NAMES=() # -> $OMS_DIR/server/<name>.sqlite (gitignored there)
LOG_DIRS=()
SERVER_PIDS=()
FE_PIDS=()

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
FE_DIR=$(cd "$SCRIPT_DIR/../.." && pwd)
# Resolve a plugin profile up front, before any build: an unknown one is a
# typo, and should cost nothing.
if [[ -n "$PLUGIN_PROFILE" ]]; then
  PLUGIN_MANIFEST="$FE_DIR/plugins/$PLUGIN_PROFILE/package.json"
  if [[ "$PLUGIN_PROFILE" == */* || ! -f "$PLUGIN_MANIFEST" ]]; then
    echo "Unknown E2E_PLUGIN_PROFILE '$PLUGIN_PROFILE': no plugins/$PLUGIN_PROFILE/package.json" >&2
    exit 1
  fi
  if [[ ! -d "$FE_DIR/e2e/specs/plugins/$PLUGIN_PROFILE" ]]; then
    echo "E2E_PLUGIN_PROFILE '$PLUGIN_PROFILE' has no suites (e2e/specs/plugins/$PLUGIN_PROFILE/)" >&2
    exit 1
  fi
  PLUGIN_CODE=$(node -p "require(process.argv[1]).name" "$PLUGIN_MANIFEST")
fi
OMS_DIR=${OMS_DIR:-$FE_DIR/..}
if [[ ! -d "$OMS_DIR/server/data/e2e" ]]; then
  echo "MISSING DEPENDENCY: the e2e datafile export." >&2
  echo "  Expected: $OMS_DIR/server/data/e2e/ (export.json + users.txt)" >&2
  echo "  This checkout may predate the e2e datafile; if OMS_DIR is set, point" >&2
  echo "  it at a checkout that has server/data/e2e/." >&2
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
# The per-port subdir is appended once ports are known: the React front
# end's harness (client/playwright) writes flat files with these same names
# into e2e/stack-logs, and a concurrent run must not interleave.
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

# Access control is pinned ON for the same reason: a local.yaml with
# `debug_no_access_control: true` makes every unauthenticated request run as
# a "dummy_user" that has no account, so the app's startup `me` query fails
# with an internal error and the login screen never renders.
SERVER_ROLE_PIN+=(APP__SERVER__DEBUG_NO_ACCESS_CONTROL=false)

cleanup() {
  local i
  if [[ "${KEEP_SERVER:-0}" == "1" ]]; then
    for i in ${SERVER_PORTS[@]+"${!SERVER_PORTS[@]}"}; do
      echo "KEEP_SERVER=1 — server http://localhost:${SERVER_PORTS[$i]}, FE http://localhost:${FE_PORTS[$i]} left running"
    done
    return
  fi
  for i in ${FE_PIDS[@]+"${!FE_PIDS[@]}"}; do
    kill "${FE_PIDS[$i]}" 2>/dev/null || true
  done
  for i in ${FE_PORTS[@]+"${!FE_PORTS[@]}"}; do
    lsof -ti tcp:"${FE_PORTS[$i]}" 2>/dev/null | xargs kill 2>/dev/null || true
  done
  # The server sometimes ignores a plain TERM — escalate to KILL.
  for i in ${SERVER_PIDS[@]+"${!SERVER_PIDS[@]}"}; do
    kill "${SERVER_PIDS[$i]}" 2>/dev/null || true
  done
  if [[ ${#SERVER_PIDS[@]} -gt 0 ]]; then
    sleep 1
    for i in "${!SERVER_PIDS[@]}"; do
      kill -9 "${SERVER_PIDS[$i]}" 2>/dev/null || true
    done
  fi
  for i in ${SERVER_PORTS[@]+"${!SERVER_PORTS[@]}"}; do
    lsof -ti tcp:"${SERVER_PORTS[$i]}" 2>/dev/null | xargs kill -9 2>/dev/null || true
  done
  # The database and app-data dir are per-run (named by port) — remove them
  # so concurrent-run slots don't accumulate throwaway files in OMS_DIR.
  for i in ${DB_NAMES[@]+"${!DB_NAMES[@]}"}; do
    rm -f "$SERVER_DIR/${DB_NAMES[$i]}".sqlite*
    rm -rf "$SERVER_DIR/app_data/${DB_NAMES[$i]}"
  done
  if [[ -n "$DATAFILE_NAME" && "$DATAFILE_NAME" != e2e ]]; then
    rm -rf "$SERVER_DIR/data/$DATAFILE_NAME"
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

# Server binaries are cached by source hash. A front-end-only change leaves
# server/ identical to one already built, and even a "no-op" cargo build of
# it costs minutes on a fresh worktree (one that shares CARGO_TARGET_DIR
# included), so when the cache holds binaries for this exact source, cargo
# is skipped and they are used instead. The key is a sha256 over every
# non-ignored file under server/ as it is on disk — tracked or not, so
# uncommitted edits count, and Cargo.lock, rust-toolchain.toml and
# .cargo/config.toml are all in there — plus the host and the cargo
# profile. ~0.3s for the whole tree.
CACHE_ROOT=${E2E_SERVER_CACHE_DIR:-$HOME/.cache/open-msupply/e2e-server}
server_source_key() {
  local f files=()
  # The index can still list a file deleted from the worktree; hash what is
  # actually there.
  while IFS= read -r -d '' f; do
    [[ -f "$OMS_DIR/$f" ]] && files+=("$f")
  done < <(git -C "$OMS_DIR" ls-files -z --cached --others --exclude-standard server)
  {
    # rustc -V: an unpinned toolchain updated by rustup changes no file here.
    echo "host=$(uname -sm) profile=debug rustc=$(cd "$SERVER_DIR" && rustc -V 2>/dev/null)"
    (cd "$OMS_DIR" && printf '%s\0' ${files[@]+"${files[@]}"} | xargs -0 shasum -a 256)
  } | shasum -a 256 | cut -c1-16
}
# Honour CARGO_TARGET_DIR (CI shares a persistent target dir across jobs).
BIN_DIR="${CARGO_TARGET_DIR:-$SERVER_DIR/target}/debug"
SERVER_CACHE_DIR="" # this source's slot in the cache; empty when the cache is off
if [[ "${E2E_SERVER_CACHE:-1}" != "0" ]]; then
  if git -C "$OMS_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    SERVER_CACHE_DIR="$CACHE_ROOT/$(server_source_key)"
  else
    echo "Server build cache off: $OMS_DIR is not a git checkout"
  fi
fi
if [[ -n "$SERVER_CACHE_DIR" && -x "$SERVER_CACHE_DIR/remote_server" && -x "$SERVER_CACHE_DIR/remote_server_cli" ]]; then
  touch "$SERVER_CACHE_DIR" # most-recently-used, for the prune below
  BIN_DIR="$SERVER_CACHE_DIR"
  echo "Server build skipped: server/ is unchanged since a cached build ($SERVER_CACHE_DIR)"
else
  echo "Building server + CLI (sqlite; a no-op when already built)"
  (cd "$SERVER_DIR" && cargo build --bin remote_server --bin remote_server_cli)
  if [[ -n "$SERVER_CACHE_DIR" ]]; then
    # Copy into a temp dir and rename, so a half-copied entry is never a hit.
    mkdir -p "$CACHE_ROOT"
    CACHE_TMP=$(mktemp -d "$CACHE_ROOT/.tmp.XXXXXX")
    cp "$BIN_DIR/remote_server" "$BIN_DIR/remote_server_cli" "$CACHE_TMP/"
    [[ -d "$SERVER_CACHE_DIR" ]] || mv "$CACHE_TMP" "$SERVER_CACHE_DIR"
    rm -rf "$CACHE_TMP"
    echo "Server build cached for next time ($SERVER_CACHE_DIR)"
    # Each entry is ~0.8GB of debug binaries: keep the 5 most recently used,
    # and sweep temp dirs an interrupted copy left behind.
    (cd "$CACHE_ROOT" && ls -1t | tail -n +6 | while IFS= read -r old; do rm -rf -- "./$old"; done)
    find "$CACHE_ROOT" -mindepth 1 -maxdepth 1 -name '.tmp.*' -mtime +1 -exec rm -rf {} +
  fi
fi

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

# Several servers: work out which spec files each one runs before booting
# anything, from Playwright's own listing — so CLI filters select files exactly
# as they do for the run — split by last-run duration. Fewer selected files
# than servers boots fewer servers.
#
# Automatic count: up to AUTO_MAX_SERVERS, within a machine-wide budget so
# several agents' runs back off instead of piling up. Other runs' servers are
# the listeners on this script's server-port slots (9930-10129, even ports).
AUTO_MAX_SERVERS=3
if [[ "$SERVERS" == "auto" ]]; then
  BUDGET=${E2E_SERVER_BUDGET:-6}
  RUNNING=$(lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null |
    awk '{ n = split($9, a, ":"); p = a[n] + 0
           if (p >= 9930 && p <= 10128 && p % 2 == 0) print p }' |
    sort -u | wc -l | tr -d ' ')
  SERVERS=$(( BUDGET - RUNNING ))
  (( SERVERS > AUTO_MAX_SERVERS )) && SERVERS=$AUTO_MAX_SERVERS
  (( SERVERS < 1 )) && SERVERS=1
  echo "Servers: up to $SERVERS ($RUNNING other e2e server(s) running, budget $BUDGET; set E2E_SERVERS to choose)"
fi
SPEC_GROUPS=""
if [[ "$SERVERS" -gt 1 ]]; then
  LIST_FILE=$(mktemp -t e2e-list.XXXXXX)
  (cd "$FE_DIR" && pnpm exec playwright test --config e2e/playwright.config.ts \
    --list --reporter=json "$@" > "$LIST_FILE" 2> "$LIST_FILE.err") || {
    echo "Listing the selected suites failed:" >&2
    tail -20 "$LIST_FILE.err" >&2
    exit 1
  }
  echo "Splitting the suites across $SERVERS servers"
  SPEC_GROUPS=$(node "$SCRIPT_DIR/split-specs.mjs" assign "$LIST_FILE" "$SERVERS")
  rm -f "$LIST_FILE" "$LIST_FILE.err"
  # String(): `node -p` colours a printed number when FORCE_COLOR is set
  # (Claude Code sets it), and a coloured count never satisfies the slot
  # loop's -ge test below, so it would claim every free slot.
  SERVERS=$(node -p "String(JSON.parse(process.argv[1]).length)" "$SPEC_GROUPS")
fi
# Every server boots its own database and dev server — anything but a small
# positive integer here must stop the run, not size it.
if ! [[ "$SERVERS" =~ ^[1-9][0-9]?$ ]]; then
  echo "Bad server count '$SERVERS' — expected a positive integer (E2E_SERVERS)" >&2
  exit 1
fi

# Pick a free port slot per server when none was requested: slot n -> server
# 9930+2n (+1 of it for discovery), FE 3115+n. Seeding the probe order from
# the checkout path means concurrent worktrees start at different slots even
# when launched at the same instant; doing it here — after the possibly
# minutes-long cargo build — keeps the pick-to-bind window small.
slot_taken() {
  local port
  for port in ${SERVER_PORTS[@]+"${SERVER_PORTS[@]}"}; do
    [[ "$port" == "$1" ]] && return 0
  done
  return 1
}
if [[ -n "$SERVER_PORT" ]]; then
  SERVER_PORTS=("$SERVER_PORT")
  FE_PORTS=("$FE_PORT")
else
  SEED=$(( $(cksum <<<"$FE_DIR" | cut -d' ' -f1) % 100 ))
  for i in $(seq 0 99); do
    [[ ${#SERVER_PORTS[@]} -ge "$SERVERS" ]] && break
    slot=$(( (SEED + i) % 100 ))
    candidate=$((9930 + slot * 2))
    if ! slot_taken "$candidate" && port_free "$candidate" &&
      port_free $((candidate + 1)) && port_free $((3115 + slot)); then
      SERVER_PORTS+=("$candidate")
      FE_PORTS+=($((3115 + slot)))
    fi
  done
  if [[ ${#SERVER_PORTS[@]} -lt "$SERVERS" ]]; then
    echo "Not enough free port slots for $SERVERS server(s) (server 9930-10129, FE 3115-3214) — set E2E_SERVER_PORT / E2E_FE_PORT" >&2
    exit 1
  fi
fi
SERVER_PORT=${SERVER_PORTS[0]}
FE_PORT=${FE_PORTS[0]}
for i in "${!SERVER_PORTS[@]}"; do
  echo "Ports: server :${SERVER_PORTS[$i]} (discovery :$((SERVER_PORTS[$i] + 1))), front end :${FE_PORTS[$i]}"
done

# Per-run database + app-data dir, named by port, so concurrent runs
# sharing one OMS_DIR checkout never touch each other's files.
for i in "${!SERVER_PORTS[@]}"; do
  DB_NAMES+=("e2e_newfe_${SERVER_PORTS[$i]}")
  LOG_DIRS+=("$LOG_ROOT/${SERVER_PORTS[$i]}")
  mkdir -p "${LOG_DIRS[$i]}"
done
DB_NAME=${DB_NAMES[0]}
LOG_DIR=${LOG_DIRS[0]}

# A plugin profile may carry a datafile OVERLAY — the deployment's central
# configuration on top of the shared datafile (scripts/e2e/apply-overlay.mjs;
# e2e/README.md § Plugin profiles). The merged copy is written beside the
# shared one, named by port like the database (server/data is gitignored
# apart from e2e/), and removed with it. A profile always runs one server
# (see SERVERS above), so there is one copy.
DATAFILE_NAME=e2e
OVERLAY="$FE_DIR/e2e/fixtures/plugins/$PLUGIN_PROFILE/overlay.json"
if [[ -n "$PLUGIN_PROFILE" && -f "$OVERLAY" ]]; then
  DATAFILE_NAME=e2e_${PLUGIN_PROFILE}_$SERVER_PORT
  node "$FE_DIR/scripts/e2e/apply-overlay.mjs" "$SERVER_DIR/data/e2e" \
    "$OVERLAY" "$SERVER_DIR/data/$DATAFILE_NAME" || {
    echo "Could not apply $OVERLAY to the shared datafile" >&2
    exit 1
  }
fi

echo "Restoring ${#DB_NAMES[@]} database(s) from $SERVER_DIR/data/$DATAFILE_NAME"
RESTORE_PIDS=()
for i in "${!DB_NAMES[@]}"; do
  rm -f "$SERVER_DIR/${DB_NAMES[$i]}".sqlite*
  (cd "$SERVER_DIR" && env MSUPPLY_NO_TEST_DB_TEMPLATE=1 \
    APP__DATABASE__DATABASE_NAME="${DB_NAMES[$i]}" \
    "${SYNC_OFF[@]}" "${SERVER_ROLE_PIN[@]}" \
    "$BIN_DIR/remote_server_cli" initialise-from-export -n "$DATAFILE_NAME" -r \
    > "${LOG_DIRS[$i]}/e2e-init.log" 2>&1) &
  RESTORE_PIDS+=($!)
done
for i in "${!RESTORE_PIDS[@]}"; do
  wait "${RESTORE_PIDS[$i]}" || {
    echo "initialise-from-export failed:" >&2
    tail -20 "${LOG_DIRS[$i]}/e2e-init.log" >&2
    exit 1
  }
done

for i in "${!SERVER_PORTS[@]}"; do
  echo "Starting server on :${SERVER_PORTS[$i]}"
  (cd "$SERVER_DIR" && exec env \
    APP__DATABASE__DATABASE_NAME="${DB_NAMES[$i]}" \
    APP__SERVER__PORT="${SERVER_PORTS[$i]}" \
    APP__SERVER__BASE_DIR=app_data/"${DB_NAMES[$i]}" \
    APP__LOGGING__MODE=Console \
    "${SYNC_OFF[@]}" "${SERVER_ROLE_PIN[@]}" \
    "$BIN_DIR/remote_server" > "${LOG_DIRS[$i]}/e2e-server.log" 2>&1) &
  SERVER_PIDS+=($!)
done

for i in "${!SERVER_PORTS[@]}"; do
  echo -n "Waiting for server :${SERVER_PORTS[$i]}"
  STATUS=""
  for _ in $(seq 1 30); do
    STATUS=$(curl -s -m 2 "http://localhost:${SERVER_PORTS[$i]}/graphql" \
      -H 'Content-Type: application/json' \
      -d '{"query":"query { initialisationStatus { status } }"}' \
      | grep -o INITIALISED || true)
    [[ "$STATUS" == "INITIALISED" ]] && echo " — ready" && break
    echo -n "."
    sleep 2
  done
  if [[ "${STATUS:-}" != "INITIALISED" ]]; then
    echo; echo "Server failed to start:" >&2
    tail -20 "${LOG_DIRS[$i]}/e2e-server.log" >&2
    exit 1
  fi
done

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

# Plugin profile: install the profile's bundle the way a deployment does —
# the built bundle through the CLI's install command, against this run's own
# server (pinned central above, which is what exposes the install mutation) —
# never the dev loop's OMS_PLUGIN_DIRS, which skips discovery, the content
# hash and the cache, the very path a deployment takes.
#
# No restart, the same as the nightly (which cannot restart: the image
# reloads the datafile on every boot). The install mutation runs the
# server's LoadPlugin processor, which binds the backend half and rebuilds
# the frontend serving cache, so the plugin goes live in place; this waits
# for discovery to offer it. Kept identical to the workflow's "Install the
# plugin profile" step, so a local run tests the path CI depends on. A
# bundle that installed but cannot be offered to this front end (wrong host
# runtime, a version this server gates out) fails here, by name, rather than
# as a navigator that never appears.
if [[ -n "$PLUGIN_PROFILE" ]]; then
  BUNDLE="$FE_DIR/dist/bundles/$PLUGIN_CODE.json"
  echo "Building plugin bundles (profile: $PLUGIN_PROFILE)"
  (cd "$FE_DIR" && pnpm build:plugins > "$LOG_DIR/e2e-plugin-build.log" 2>&1) || {
    echo "pnpm build:plugins failed:" >&2
    tail -20 "$LOG_DIR/e2e-plugin-build.log" >&2
    exit 1
  }
  if [[ ! -f "$BUNDLE" ]]; then
    echo "Plugin build produced no $BUNDLE" >&2
    exit 1
  fi

  echo "Installing $PLUGIN_CODE"
  # From SERVER_DIR, like the restore: the CLI loads the server's
  # configuration/ relative to its working directory before it does anything.
  (cd "$SERVER_DIR" && env "${SYNC_OFF[@]}" "${SERVER_ROLE_PIN[@]}" \
    "$BIN_DIR/remote_server_cli" install-plugin-bundle -p "$BUNDLE" \
    --url "http://localhost:$SERVER_PORT" \
    --username "$PROBE_USER" --password "$PROBE_PASS" \
    > "$LOG_DIR/e2e-plugin-install.log" 2>&1) || {
    echo "install-plugin-bundle failed:" >&2
    tail -20 "$LOG_DIR/e2e-plugin-install.log" >&2
    exit 1
  }

  echo -n "Waiting for discovery to offer $PLUGIN_CODE"
  DISCOVERED=""
  for _ in $(seq 1 30); do
    DISCOVERED=$(curl -s -m 2 "http://localhost:$SERVER_PORT/graphql" \
      -H 'Content-Type: application/json' \
      -d '{"query":"query { frontendPluginMetadata(hostRuntime: \"solid\") { code } }"}' \
      || true)
    grep -q "\"code\":\"$PLUGIN_CODE\"" <<<"$DISCOVERED" && break
    echo -n "."
    sleep 2
  done
  if ! grep -q "\"code\":\"$PLUGIN_CODE\"" <<<"$DISCOVERED"; then
    echo
    echo "INSTALLED BUT NOT DISCOVERED: $PLUGIN_CODE" >&2
    echo "  The server never offered it to this front end (hostRuntime solid)." >&2
    echo "  Discovery said: ${DISCOVERED:-(no response)}" >&2
    tail -20 "$LOG_DIR/e2e-server.log" >&2
    exit 1
  fi
  echo " — ready"
fi

for i in "${!FE_PORTS[@]}"; do
  echo "Starting front end on :${FE_PORTS[$i]}"
  # The first front end keeps Vite's default dependency cache; each extra one
  # gets its own, so their optimiser runs can't race (vite.config.ts).
  CACHE_DIR=""
  [[ "$i" -gt 0 ]] && CACHE_DIR="$FE_DIR/node_modules/.vite-e2e-$((i + 1))"
  (cd "$FE_DIR" && exec env \
    DEV_SERVER_PORT="${FE_PORTS[$i]}" \
    GRAPHQL_PROXY_TARGET="http://localhost:${SERVER_PORTS[$i]}" \
    VITE_CACHE_DIR="$CACHE_DIR" \
    pnpm exec vite --strictPort > "${LOG_DIRS[$i]}/e2e-devserver.log" 2>&1) &
  FE_PIDS+=($!)
done

for i in "${!FE_PORTS[@]}"; do
  echo -n "Waiting for front end :${FE_PORTS[$i]}"
  for _ in $(seq 1 45); do
    if curl -s -m 2 -o /dev/null "http://localhost:${FE_PORTS[$i]}"; then echo " — ready"; break; fi
    echo -n "."
    sleep 2
  done
done

# Single worker per server: everything on one server shares its database,
# and the stock-mutating stocktake group must not overlap other stock users.
# With one server, honour an explicit --workers from the caller; with
# several, each server's suite project is capped at one worker in
# playwright.config.ts and the run gets one worker per server.
WORKERS=(--workers "${#SERVER_PORTS[@]}")
for arg in "$@"; do [[ "$arg" == --workers* ]] && WORKERS=(); done

SERVERS_JSON=""
if [[ ${#SERVER_PORTS[@]} -gt 1 ]]; then
  SERVERS_JSON=$(node -e '
    const [groups, servers, fes] = process.argv.slice(1);
    const s = servers.split(" "), f = fes.split(" ");
    process.stdout.write(JSON.stringify(JSON.parse(groups).map((specs, i) => ({
      baseURL: `http://localhost:${f[i]}`,
      apiURL: `http://localhost:${s[i]}`,
      specs,
    }))));
  ' "$SPEC_GROUPS" "${SERVER_PORTS[*]}" "${FE_PORTS[*]}")
fi

cd "$FE_DIR"
# ${arr[@]+...} keeps empty-array expansion safe under bash 3.2's `set -u`.
set +e
BASE_URL="http://localhost:$FE_PORT" \
API_URL="http://localhost:$SERVER_PORT" \
E2E_PLUGIN_PROFILE="$PLUGIN_PROFILE" \
E2E_SERVERS_JSON="$SERVERS_JSON" \
  pnpm exec playwright test --config e2e/playwright.config.ts \
  "$@" ${WORKERS[@]+"${WORKERS[@]}"}
STATUS=$?
set -e

# Fold this run's per-file durations into the timings the next split uses.
node "$SCRIPT_DIR/split-specs.mjs" record \
  "$FE_DIR/e2e/playwright-report${E2E_RUN_TAG:+-$E2E_RUN_TAG}/results.json" || true
exit "$STATUS"
