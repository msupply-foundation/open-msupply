#!/usr/bin/env bash
# Samples Postgres for active queries + blocking chains during a load test.
# Run this in its own terminal WHILE the k6 load test runs, then Ctrl-C to stop.
#
#   ./scripts/load-testing/pg-blocking-sampler.sh [interval_seconds] [out_file]
#
# Prints live to the terminal AND appends to a log file. Each recorded sample
# shows: pid, app, state, how long the current query has run (ms), what it's
# waiting on, which pids are blocking it (pg_blocking_pids), and the (truncated)
# query. Rows are ordered longest-running first, so the sync/integrate
# transaction and whatever it is blocking float to the top.
#
# When nothing is active it prints a heartbeat ('.') so you can see it's alive.

set -uo pipefail

INTERVAL="${1:-0.25}"
OUT="${2:-scripts/load-testing/output/pg-blocking-$(date -u +%Y-%m-%dT%H-%M-%SZ).log}"
CONTAINER="${PG_CONTAINER:-pg}"
DB="${PG_DB:-tmp}"

mkdir -p "$(dirname "$OUT")"
echo "Sampling container=$CONTAINER db=$DB every ${INTERVAL}s -> $OUT"
echo "Ctrl-C to stop.  ('.' = sampled, nothing active)"

# NOTE: no backslash meta-commands here -- psql -c does not accept them.
# -A unaligned, -F field sep, -t tuples-only (no header/footer).
SQL="SELECT
  to_char(clock_timestamp(),'HH24:MI:SS.MS'),
  a.pid,
  coalesce(nullif(a.application_name,''),'?'),
  a.state,
  round(extract(epoch FROM (clock_timestamp()-a.query_start))*1000)::int,
  coalesce(a.wait_event_type,'-'),
  coalesce(a.wait_event,'-'),
  coalesce(array_to_string(pg_blocking_pids(a.pid),','),'-'),
  left(regexp_replace(coalesce(a.query,''),'\s+',' ','g'),140)
FROM pg_stat_activity a
WHERE a.datname = current_database()
  AND a.pid <> pg_backend_pid()
  AND a.state IS DISTINCT FROM 'idle'
ORDER BY 5 DESC NULLS LAST;"

HDR="time         | pid | app | state | ms | wait_type | wait_event | blocked_by | query"

trap 'echo; echo "stopped -> $OUT"; exit 0' INT

while true; do
  RES="$(podman exec -i "$CONTAINER" psql -U postgres -d "$DB" -At -F ' | ' -P pager=off -c "$SQL" 2>&1)"
  if [ -n "$RES" ]; then
    STAMP="$(date -u +%H:%M:%S)"
    {
      echo "================ $STAMP ================"
      echo "$HDR"
      echo "$RES"
    } | tee -a "$OUT"
  else
    printf '.'
  fi
  sleep "$INTERVAL"
done
