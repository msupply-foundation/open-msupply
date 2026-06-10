#!/usr/bin/env bash
# Spins up a throwaway PostgreSQL 16 cluster (socket-only, trust auth), runs the Postgres
# parity suite against it, and tears everything down. Nothing persistent is modified.
#
# Usage: ./scripts/run-postgres-tests.sh
set -euo pipefail

PGBIN="${PGBIN:-/opt/homebrew/opt/postgresql@16/bin}"
PORT="${PG_TEST_PORT:-54329}"
PGDIR="$(mktemp -d "${TMPDIR:-/tmp}/oms-pg.XXXXXX")"

cleanup() { "$PGBIN/pg_ctl" -D "$PGDIR/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$PGDIR"; }
trap cleanup EXIT

"$PGBIN/initdb" -D "$PGDIR/data" -U postgres --auth=trust >/dev/null
"$PGBIN/pg_ctl" -D "$PGDIR/data" \
  -o "-p $PORT -k $PGDIR -c listen_addresses=''" -l "$PGDIR/log" -w start >/dev/null
"$PGBIN/createdb" -h "$PGDIR" -p "$PORT" -U postgres oms_spike

cd "$(dirname "$0")/.."
PG_DSN="host=$PGDIR port=$PORT user=postgres dbname=oms_spike sslmode=disable" \
  go test ./internal/repository/ -run InvoiceSuite -v
