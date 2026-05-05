#!/bin/bash
set -e

# Hardware id setup.
# If /etc/machine-id is already non-empty, the operator has bind-mounted it
# from the host (or otherwise pre-populated it) and we leave it alone.
# Otherwise we keep a per-deployment UUID in /database/machine-id — alongside
# the database, but NOT inside it — and copy it into /etc/machine-id for the
# server's machine_uid lookup. Logical dumps (sqlite .dump, pg_dump) don't
# carry the file, so a restored dump on a new deployment generates a fresh
# id and the central API can detect the mismatch.
if [ ! -s /etc/machine-id ]; then
    ID_FILE=/database/machine-id
    if [ ! -s "$ID_FILE" ]; then
        cat /proc/sys/kernel/random/uuid > "$ID_FILE"
    fi
    cat "$ID_FILE" > /etc/machine-id
fi

# Whey MSUPPLY_NO_TEST_DB_TEMPLATE ?
# Initialise uses testdb to setup database and migrated it, by default we create templates
# which allows for faster testing, but requires finding workspace

# If command line argument exists then just run cli
if [ $# -gt 0 ]; then
    MSUPPLY_NO_TEST_DB_TEMPLATE=1 ./remote_server_cli "$@"
    exit $?
fi

# Load reference file
if [ ! -z "$LOAD_REFERENCE_FILE" ]; then
  echo "Loading reference file "
  MSUPPLY_NO_TEST_DB_TEMPLATE=1 ./remote_server_cli initialise-from-export -n "$LOAD_REFERENCE_FILE"
fi

# Refresh dates
if [ "$SHOULD_REFRESH_DATES" = true ]; then
    echo "Refreshing dates"
    ./remote_server_cli refresh-dates
fi

exec ./remote_server
