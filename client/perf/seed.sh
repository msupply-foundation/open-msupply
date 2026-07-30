#!/usr/bin/env bash
#
# Seed (or remove) the perf harness fixture.
#
#   ./seed.sh                      # seed with defaults
#   ./seed.sh --clean              # remove everything the seeder created
#   ./seed.sh -v fat_lines=400     # override a fixture size
#   ./seed.sh -v store_code=HUF    # seed into a different store
#
# Connection details are resolved the same way the server resolves them:
# server/configuration/base.yaml, overridden by local.yaml when it exists. Any
# PG* variable already set in the environment wins over both, so CI or a
# non-standard setup needs no config file at all.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
conf_dir="$here/../../server/configuration"

# Read one key from the `database:` block. base.yaml first, then local.yaml, so
# the later file wins — mirroring how the server layers its own config.
yaml_db_value() {
  local key="$1" found="" file value
  for file in "$conf_dir/base.yaml" "$conf_dir/local.yaml"; do
    [ -f "$file" ] || continue
    value="$(
      awk -v k="$key" '
        /^database:/ { inblock = 1; next }
        /^[^[:space:]#]/ { inblock = 0 }
        inblock && $1 == k ":" {
          $1 = ""
          sub(/^[[:space:]]+/, "")
          gsub(/"/, "")
          sub(/[[:space:]]*#.*$/, "")
          print
        }
      ' "$file" | tail -n 1
    )"
    [ -n "$value" ] && found="$value"
  done
  printf '%s' "$found"
}

# Env wins, then config, then the base.yaml defaults as a last resort.
export PGHOST="${PGHOST:-$(yaml_db_value host)}"
export PGPORT="${PGPORT:-$(yaml_db_value port)}"
export PGUSER="${PGUSER:-$(yaml_db_value username)}"
export PGPASSWORD="${PGPASSWORD:-$(yaml_db_value password)}"
export PGDATABASE="${PGDATABASE:-$(yaml_db_value database_name)}"

: "${PGHOST:=localhost}"
: "${PGPORT:=5432}"
: "${PGUSER:=postgres}"
: "${PGDATABASE:=omsupply-database}"

script="seed.sql"
if [ "${1:-}" = "--clean" ]; then
  script="unseed.sql"
  shift
fi

echo "perf fixture: ${script} -> ${PGUSER}@${PGHOST}:${PGPORT}/${PGDATABASE}"

exec psql -v ON_ERROR_STOP=1 "$@" -f "$here/$script"
