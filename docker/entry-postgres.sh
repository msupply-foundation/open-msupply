#!/bin/bash
set -e

PG_DATA="/var/lib/postgresql/data"
PG_USER="postgres"
PG_DB="${APP_DATABASE__DATABASE_NAME:-omsupply-database}"
IMPORT_DUMP="/database/import.dump"

# Initialise the PostgreSQL data directory if it doesn't exist
if [ ! -s "$PG_DATA/PG_VERSION" ]; then
    echo "Initialising PostgreSQL data directory..."
    gosu $PG_USER initdb -D "$PG_DATA" --encoding=UTF8 --locale=C.UTF-8

    # Configure to listen on localhost only
    echo "host all all 127.0.0.1/32 trust" >> "$PG_DATA/pg_hba.conf"
    echo "local all all trust" >> "$PG_DATA/pg_hba.conf"
fi

# Start PostgreSQL
echo "Starting PostgreSQL..."
gosu $PG_USER pg_ctl -D "$PG_DATA" -l /var/lib/postgresql/pg.log -w start

# Create the database if it doesn't exist
if ! gosu $PG_USER psql -lqt | cut -d \| -f 1 | grep -qw "$PG_DB"; then
    echo "Creating database '$PG_DB'..."
    gosu $PG_USER createdb "$PG_DB"
fi

# Import dump file if it exists
if [ -f "$IMPORT_DUMP" ]; then
    echo "Importing database dump from $IMPORT_DUMP..."
    gosu $PG_USER pg_restore --clean --if-exists --no-owner --dbname "$PG_DB" "$IMPORT_DUMP" || true
    echo "Database import complete."
fi

# Hand off to the shared entry script for CLI commands, reference data loading, etc.
exec /usr/src/omsupply/server/entry.sh "$@"
