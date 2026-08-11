#!/bin/bash
set -e

PG_DATA="/database/postgres/data"
PG_USER="postgres"
PG_DB="${APP_DATABASE__DATABASE_NAME:-omsupply-database}"
IMPORT_DUMP="/import.dump"
# A dump mounted here instead of at IMPORT_DUMP is a common mistake; it is
# detected and rejected below.
MISPLACED_IMPORT_DUMP="/database/import.dump"

# Fail fast on dump-mount mistakes. A mis-mounted dump is otherwise silent:
# Postgres starts with an empty database and the server lands on the
# initialisation screen, which is indistinguishable from a genuine sync/init
# failure. Aborting here makes the mistake obvious in `docker logs` instead of
# surfacing much later.

# A dump mounted at the wrong path.
if [ -e "$MISPLACED_IMPORT_DUMP" ]; then
    echo "ERROR: a dump is mounted at '$MISPLACED_IMPORT_DUMP', but this image reads it from '$IMPORT_DUMP'." >&2
    echo "       Update the mount target: -v /host/path/to.dump:$IMPORT_DUMP" >&2
    exit 1
fi

# The bind-mount source does not exist on the host, so Docker created an empty
# directory at the target instead of exposing a file.
if [ -e "$IMPORT_DUMP" ] && [ ! -f "$IMPORT_DUMP" ]; then
    echo "ERROR: '$IMPORT_DUMP' is not a regular file (Docker created an empty directory)." >&2
    echo "       The host path in '-v <host>:$IMPORT_DUMP' does not exist — check it." >&2
    exit 1
fi

# Ensure PG_DATA exists and is owned by the postgres user before initdb.
# /database is root-owned (created in the Dockerfile / mounted as a volume),
# so we create the postgres subdirectory and hand it to the postgres user.
install -d -m 700 "$PG_DATA"
chmod 700 "$PG_DATA"
if [ "$(stat -c '%U:%G' "$PG_DATA")" != "$PG_USER:$PG_USER" ]; then
    chown "$PG_USER:$PG_USER" "$PG_DATA"
fi

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
    gosu $PG_USER pg_restore --no-owner --exit-on-error --dbname "$PG_DB" "$IMPORT_DUMP"
    echo "Database import complete."
else
    echo "No dump mounted at $IMPORT_DUMP — starting with the current database contents (empty on a fresh container)."
fi

# Hand off to the shared entry script for CLI commands, reference data loading,
# etc.
exec /usr/src/omsupply/server/entry.sh "$@"
