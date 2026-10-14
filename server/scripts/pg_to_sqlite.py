#!/usr/bin/env python3
"""Copy an open-mSupply Postgres database into an open-mSupply SQLite database.

Useful for testing SQLite against data that only exists as a Postgres dump (e.g. the
reference system dump from https://reference.msupply.foundation/).

The SQLite database must already exist with the same schema version, so create it with
the SQLite build of the CLI first, from the same branch the Postgres database was
migrated with:

    cd server
    cargo build --bin remote_server_cli
    APP__DATABASE__DATABASE_NAME=/path/to/copy ./target/debug/remote_server_cli initialise-database
    python3 scripts/pg_to_sqlite.py --pg-db reference-system --sqlite /path/to/copy.sqlite

Every SQLite table is emptied and refilled from the Postgres table of the same name.
Migration bookkeeping stays as created by the CLI. Values are converted to the
formats diesel writes for SQLite (diesel 2.x, chrono):
  - booleans as 0/1
  - timestamps as text "%F %T%.f" (no fraction when zero, else 3 or 6 digits); this
    matters because SQLite compares timestamps as text
  - dates as text "%F"; enums and JSON as text; bytea as a blob
Requires `psql` on PATH; uses only the Python standard library.
"""

import argparse
import csv
import io
import sqlite3
import subprocess
import sys

# Left as the CLI created them, so the copy keeps a consistent migration history
SKIP_TABLES = {"__diesel_schema_migrations", "migration_fragment_log"}
NULL_MARKER = "\\N"
# Postgres truncates identifiers to 63 bytes (NAMEDATALEN - 1), in table definitions and in
# queries alike, so a longer column name diesel uses is stored shortened in Postgres
PG_MAX_IDENTIFIER = 63
BATCH_SIZE = 5000


def psql(args, sql):
    """Run a query and return its rows as lists of strings (None for NULL)."""
    command = [
        "psql", "-h", args.pg_host, "-p", str(args.pg_port), "-U", args.pg_user,
        "-d", args.pg_db, "-v", "ON_ERROR_STOP=1", "-q",
        "-c", "SET TIME ZONE 'UTC'; SET DATESTYLE TO ISO;",
        "-c", f"COPY ({sql}) TO STDOUT WITH (FORMAT csv, NULL '{NULL_MARKER}')",
    ]
    output = subprocess.run(command, check=True, capture_output=True, text=True).stdout
    # csv drops the quotes that tell a NULL from the literal text "\N"; the latter
    # doesn't occur in open-mSupply data
    return [
        [None if value == NULL_MARKER else value for value in row]
        for row in csv.reader(io.StringIO(output))
    ]


def to_timestamp(value):
    """Postgres ISO text ("2026-07-05 11:59:59.9") to diesel's SQLite text format."""
    if value is None:
        return None
    value = value.split("+")[0]  # timestamptz in UTC: drop the offset
    if "." not in value:
        return value
    seconds, fraction = value.split(".")
    micros = int(fraction.ljust(6, "0")[:6])
    if micros == 0:
        return seconds
    if micros % 1000 == 0:
        return f"{seconds}.{micros // 1000:03d}"
    return f"{seconds}.{micros:06d}"


def converter(udt_name):
    if udt_name == "bool":
        return lambda v: None if v is None else (1 if v == "t" else 0)
    if udt_name in ("timestamp", "timestamptz"):
        return to_timestamp
    if udt_name in ("int2", "int4", "int8"):
        return lambda v: None if v is None else int(v)
    if udt_name in ("float4", "float8", "numeric"):
        return lambda v: None if v is None else float(v)
    if udt_name == "bytea":
        return lambda v: None if v is None else bytes.fromhex(v[2:])
    return lambda v: v  # text, varchar, date, json(b), enums


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--pg-db", required=True)
    parser.add_argument("--pg-host", default="localhost")
    parser.add_argument("--pg-port", default=5432, type=int)
    parser.add_argument("--pg-user", default="postgres")
    parser.add_argument("--sqlite", required=True, help="path to the initialised .sqlite file")
    parser.add_argument("--tables", nargs="*", help="only copy these tables")
    args = parser.parse_args()

    connection = sqlite3.connect(args.sqlite)
    connection.execute("PRAGMA foreign_keys = OFF")

    sqlite_tables = [
        name for (name,) in connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
        if name not in SKIP_TABLES and (not args.tables or name in args.tables)
    ]
    pg_columns = {}
    for table, column, udt_name in psql(args, """
        SELECT c.table_name, c.column_name, c.udt_name
        FROM information_schema.columns c
        JOIN information_schema.tables t USING (table_schema, table_name)
        WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    """):
        pg_columns.setdefault(table, {})[column] = udt_name

    problems = []
    for table in sqlite_tables:
        columns = [row[1] for row in connection.execute(f'PRAGMA table_info("{table}")')]
        if table not in pg_columns:
            problems.append(f"{table}: not in Postgres, left empty")
            continue
        pg_names = [c[:PG_MAX_IDENTIFIER] for c in columns]
        missing = [c for c, pg in zip(columns, pg_names) if pg not in pg_columns[table]]
        if missing:
            problems.append(f"{table}: Postgres lacks {missing}, left empty")
            continue

        select = ", ".join(f'"{c}"' for c in pg_names)
        rows = psql(args, f'SELECT {select} FROM "{table}"')
        converters = [converter(pg_columns[table][c]) for c in pg_names]
        placeholders = ", ".join("?" for _ in columns)
        insert_columns = ", ".join(f'"{c}"' for c in columns)
        insert = f'INSERT INTO "{table}" ({insert_columns}) VALUES ({placeholders})'

        with connection:
            connection.execute(f'DELETE FROM "{table}"')
            for start in range(0, len(rows), BATCH_SIZE):
                connection.executemany(insert, (
                    [convert(value) for convert, value in zip(converters, row)]
                    for row in rows[start:start + BATCH_SIZE]
                ))

        copied = connection.execute(f'SELECT count(*) FROM "{table}"').fetchone()[0]
        status = "ok" if copied == len(rows) else f"MISMATCH (Postgres {len(rows)})"
        print(f"{table:45} {copied:>9} {status}")
        if copied != len(rows):
            problems.append(f"{table}: copied {copied} of {len(rows)} rows")

    extra = sorted(set(pg_columns) - set(sqlite_tables) - SKIP_TABLES)
    if extra and not args.tables:
        problems.append(f"Postgres-only tables not copied: {extra}")
    for problem in problems:
        print(f"WARNING: {problem}", file=sys.stderr)
    connection.execute("VACUUM")
    connection.execute("ANALYZE")
    connection.close()


if __name__ == "__main__":
    main()
