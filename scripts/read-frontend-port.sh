#!/usr/bin/env bash
# Print the frontend dev server port, sourced from `server.port` in
# server/configuration/<env>.yaml (falling back to base.yaml, then 3003).
# `<env>` defaults to `local`; pass another name as the first arg to read e.g.
# `staging.yaml`. Used by the `dev: all` VSCode tasks so worktrees that pin a
# port via yaml also pin the webpack listen port.
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV="${1:-local}"
for f in "$ROOT/server/configuration/$ENV.yaml" "$ROOT/server/configuration/base.yaml"; do
  [ -f "$f" ] || continue
  port=$(awk '
    /^server:/ { in_block=1; next }
    /^[^[:space:]#]/ { in_block=0 }
    in_block && /^[[:space:]]+port:[[:space:]]*[0-9]+/ {
      match($0, /[0-9]+/)
      print substr($0, RSTART, RLENGTH)
      exit
    }
  ' "$f") || true
  if [ -n "$port" ]; then
    echo "$port"
    exit 0
  fi
done
echo 3003
