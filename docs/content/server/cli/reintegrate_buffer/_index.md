+++
title = "Replay Sync Buffer"
weight = 20
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "code"
+++

# Replay Sync Buffer

The `reintegrate-buffer` cli command re-runs sync buffer translation + integration against the
`sync_buffer` already present in a database. It is useful for:

- re-processing already-pulled records after fixing a translator, and
- replaying a `sync_buffer` dump (e.g. captured from a production site) into a local database to
  reproduce or profile integration.

`NOTE` This is a Postgres-only, V5/V6 sync flow and is intended for development / diagnostics, not
production sites.

For the full cli argument list and up to date description please run the command with just `--help`.

### Replay a dump

Restoring a `sync_buffer` dump and replaying it is three steps: create a database with the schema,
load the dump's data into it, then reintegrate.

**1. Create and migrate the database**

`initialise-database` drops any existing database, creates a fresh one, and applies all migrations
— giving an empty, fully-migrated schema (the `sync_buffer` table is empty at this point):

The database is selected from the configuration `.yaml` files (the `database.database_name` value),
or overridden with the `APP__DATABASE__DATABASE_NAME` environment variable, e.g.
`APP__DATABASE__DATABASE_NAME=my_replay`.

`NOTE` `initialise-database` **drops** the target database if it already exists — point it at a
throwaway replay database, not one you want to keep.

```
# In development
cargo run --bin remote_server_cli --features postgres -- \
  initialise-database

# In production
omSupply-cli initialise-database

# Override just the database name for a throwaway replay db
APP__DATABASE__DATABASE_NAME=my_replay cargo run --bin remote_server_cli --features postgres -- initialise-database

# Or point at a specific config file with --config-path (a global flag, so it goes
# *before* the subcommand). The file is the override layer; a base.yaml must sit in
# the same directory.
cargo run --bin remote_server_cli --features postgres -- --config-path configuration/my_replay.yaml initialise-database
```

`NOTE` `--config-path` drops the database named in that config — don't point it at a config for a
database you want to keep (e.g. a central server's).

**2. Load the dump's data**

The dump contains only `sync_buffer`, so load it data-only with `pg_restore`:

```
pg_restore --dbname=my_replay --data-only --no-owner sync_buffer_dump.dump
```

`NOTE` Do **not** pass `--table=sync_buffer*`. `sync_buffer` is partitioned, and the table glob
matches no data on a `--data-only` restore — omitting it loads the whole (sync_buffer-only) dump
correctly.

**3. Reintegrate**

Reset the buffer's integration state and re-run integration:

`NOTE` need to pass `APP__DATABASE__DATABASE_NAME=my_replay` before the command if you don't want it to pickup db name from yaml
```
# In development
cargo run --bin remote_server_cli --features postgres -- reintegrate-buffer

# In production
omSupply-cli reintegrate-buffer
```

### Re-run after fixing a translator

If the buffer is already in the database (e.g. on a site whose records failed to integrate), just
reintegrate — no restore needed:

```
cargo run --bin remote_server_cli --features postgres -- reintegrate-buffer
```

If the fix shipped a database migration, add `--migrate` to apply pending migrations to the
existing database first. Unlike `initialise-database`, this migrates **in place** without dropping
the database, so the buffer and any integrated data are preserved:

```
cargo run --bin remote_server_cli --features postgres -- reintegrate-buffer --migrate
```

### Scope to specific tables

To re-process only certain tables (e.g. after fixing a single translator), pass `--tables` with a
comma-separated list of `sync_buffer.table_name` values:

```
cargo run --bin remote_server_cli --features postgres -- reintegrate-buffer --tables item,name
```

`NOTE` This is a diagnostic shortcut — integration still runs the listed tables in dependency
order, but it does **not** pull in records those tables depend on, so a scoped run can fail or
produce incomplete data if a dependency wasn't already integrated.

### Options

| Flag | Description |
| --- | --- |
| `--source-site-id` | Integrate the V5/V6 buffer rows for this source site (default `1`). |
| `--use-transaction` | Wrap integration in a transaction (outer batch + per-record sub-transactions) so the whole batch is atomic. Off by default for speed. |
| `--migrate` | Run pending database migrations before reintegrating. |
| `--skip-buffer-reset` | Skip resetting the buffer's integration state — only retry rows that are still pending. |
| `-e`, `--errors-only` | Only reintegrate records that previously errored — the reset clears integration state for rows with an `integration_error` (excluding deliberately-ignored rows, which also carry an error message) and leaves successful rows untouched. Errored rows are already integrated (not pending), so this needs a reset and therefore **conflicts with `--skip-buffer-reset`**. |
| `--tables` | Restrict integration to these comma-separated `sync_buffer.table_name` values (e.g. `item,name`). Defaults to all tables. |

### Extra

- The reset (when not `--skip-buffer-reset`) drops null-data upsert rows and marks every
  `sync_buffer` row pending again, so integration reprocesses the whole buffer.
- The integrator logs per-batch progress at `info` level as it works through the buffer.
- With `--tables`, requested names that aren't part of the integration order are ignored (logged
  as a warning), so a typo'd table name simply integrates nothing rather than erroring.
