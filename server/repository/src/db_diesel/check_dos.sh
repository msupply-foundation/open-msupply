#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

# Test cases: item_id:test_name:expected_dos ("none" = no rows expected)
TESTS=(
    "item_a:multiple_periods:4"
    "item_b:out_of_stock_at_start:none"
    "item_c:out_of_stock_at_end:4"
    "item_d:out_of_stock_start_and_end:5"
    "item_e:fully_out_of_stock:11"
    "item_f:in_stock_whole_time:none"
    "item_g:out_of_stock_first_day:10"
)

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

pass=0
fail=0

check_result() {
    local test_name=$1
    local expected=$2
    local result=$3

    # Trim whitespace
    result=$(echo "$result" | tr -d '[:space:]')
    # Normalize: strip trailing .0 for comparison (sqlite returns 4.0, pg returns 4)
    result=$(echo "$result" | sed 's/\.0$//')

    if [ "$expected" = "none" ]; then
        if [ -z "$result" ]; then
            echo -e "  ${GREEN}PASS${NC} $test_name: no rows (expected none)"
            pass=$((pass + 1))
        else
            echo -e "  ${RED}FAIL${NC} $test_name: got '$result', expected no rows"
            fail=$((fail + 1))
        fi
    else
        if [ "$result" = "$expected" ]; then
            echo -e "  ${GREEN}PASS${NC} $test_name: dos=$result"
            pass=$((pass + 1))
        else
            echo -e "  ${RED}FAIL${NC} $test_name: got '$result', expected $expected"
            fail=$((fail + 1))
        fi
    fi
}

# ──────────────────────────────────────────────
# SQLite (in-memory)
# ──────────────────────────────────────────────
echo "=== SQLite Tests ==="

SETUP_SQLITE=$(cat "$DIR/check setup sqlite.sql")
# Extract CTE query (skip orphan SELECT on lines 1-4)
QUERY_SQLITE_TEMPLATE=$(sed -n '5,$p' "$DIR/check sqlite.sql")

for entry in "${TESTS[@]}"; do
    IFS=: read -r item_id test_name expected <<< "$entry"

    QUERY=$(echo "$QUERY_SQLITE_TEMPLATE" | sed "s/'item_a'/'$item_id'/g")

    result=$(sqlite3 :memory: <<EOSQL
$SETUP_SQLITE
.headers off
.mode list
$QUERY;
EOSQL
)

    # Extract just the dos value (last field)
    dos_value=$(echo "$result" | awk -F'|' '{print $NF}' | tr -d '[:space:]')

    check_result "$test_name" "$expected" "$dos_value"
done

# ──────────────────────────────────────────────
# PostgreSQL (via psql)
# ──────────────────────────────────────────────
echo ""
echo "=== PostgreSQL Tests ==="

PGDATABASE="${PGDATABASE:-postgres}"

if ! command -v psql &> /dev/null; then
    echo "  psql not found, skipping PostgreSQL tests"
else
    SETUP_PG=$(cat "$DIR/check setup postgres.sql")
    # Extract CTE query (skip orphan SELECT on lines 1-4), remove bind comments
    QUERY_PG_TEMPLATE=$(sed -n '5,$p' "$DIR/check postgres.sql" | sed 's/ -- binds:.*$//')

    # Run setup once (suppress output)
    psql -q <<EOSQL 2>/dev/null
$SETUP_PG
EOSQL

    for entry in "${TESTS[@]}"; do
        IFS=: read -r item_id test_name expected <<< "$entry"

        QUERY=$(echo "$QUERY_PG_TEMPLATE" | sed "s/'item_a'/'$item_id'/g")

        result=$(psql -t -A -F'|' <<EOSQL 2>/dev/null
$QUERY;
EOSQL
)

        # Extract just the dos value (last field of last non-empty line)
        dos_value=$(echo "$result" | grep -v '^$' | tail -1 | awk -F'|' '{print $NF}' | tr -d '[:space:]')

        check_result "$test_name" "$expected" "$dos_value"
    done
fi

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
echo ""
echo "=== Summary: $pass passed, $fail failed ==="
[ "$fail" -eq 0 ] && exit 0 || exit 1
