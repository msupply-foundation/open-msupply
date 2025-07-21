#!/bin/bash
set -e

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
