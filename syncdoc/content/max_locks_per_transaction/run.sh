#!/usr/bin/env bash
# Start two throwaway Postgres containers (differing only in
# max_locks_per_transaction), run the demo against them, then discard them.
set -euo pipefail
cd "$(dirname "$0")"

cleanup() { docker compose down -v >/dev/null 2>&1 || true; }
trap cleanup EXIT          # always tear the containers down when we exit

docker compose down -v >/dev/null 2>&1 || true   # start from a clean slate
echo "Starting throwaway Postgres containers..."
docker compose up -d --wait                      # wait for both healthchecks

cargo run --quiet
