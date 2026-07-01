# Migrating an omSupply server from SQLite to Postgres

This copies **all** data from an existing SQLite omSupply database into a Postgres database using the `migrate-sqlite-to-postgres` CLI command. Your Postgres server can be a local
install, a remote host, or a container — it makes no difference here; the driver only needs a host,
port and credentials.

---

## Concepts to understand first (applies to dev and prod)

1. **It's an offline copy.** Stop the omSupply server so the SQLite file is quiescent (no writes, no
   sync) during the copy.
2. **Migrate from a *copy* of the `.sqlite` file**, never the live file. You never modify the source,
   so rollback = "restart the old server".
3. **You use the *Postgres* CLI**, which can also read a `.sqlite` file (via `--sqlite-path`). The
   database backend is compile-time, so this is a Postgres-featured binary that includes the
   `migrate-sqlite-to-postgres` subcommand.
4. **Build the schema with `migrate`, NOT `initialise-database`.** On Postgres, `migrate` auto-creates
   the database if missing and runs every migration to build the full schema. `initialise-database` is
   a test-only helper that can leave an empty schema. (The copy refuses to run against an empty schema.)
5. **Version parity matters.** The Postgres schema and the SQLite file must be at the same omSupply
   version — build the CLI from the same commit the source data came from.
6. **The copy is atomic and idempotent** — it truncates the target then re-copies in one transaction,
   so it's safe to re-run.

---

## Get the Postgres migration CLI

The **Development** section runs via `cargo run` (build-and-run in one step). The **Production** and
**Verify** sections use the built binary, shown as **`./omSupply-cli-postgres.exe`** (the Windows
build-output name). **Substitute the binary that matches your environment:**

| Environment | Binary to run in place of `omSupply-cli-postgres.exe` |
|---|---|
| Windows, packaged/installed | `omSupply-cli.exe` (the installer renames `omSupply-cli-postgres.exe` to this) |
| Windows, from source | `.\target\release\remote_server_cli.exe` built with `--features "postgres,sqlite-to-postgres"` |
| macOS, packaged build | `./remote_server_cli-postgres` (built via `INCLUDE_MIGRATION_DRIVER=true ./build/mac/build.sh <arch>`) |
| macOS, from source (dev) | `./target/release/remote_server_cli` (built with the same features) — or `cargo run --no-default-features --features "postgres,sqlite-to-postgres" --bin remote_server_cli -- <subcommand>` |

**Building from source needs libpq** (the Postgres client lib):
- macOS: `brew install libpq` then `export PQ_LIB_DIR=/opt/homebrew/opt/libpq/lib`
- Windows: install PostgreSQL, then `set PQ_LIB_DIR=C:\Program Files\PostgreSQL\<ver>\lib` and add
  `...\PostgreSQL\<ver>\bin` to `PATH` (so `libpq.dll` is found at run time).

> **Path style:** examples use forward-slash paths (`/path/to/copy.sqlite`). On Windows use backslash
> paths (`C:\path\to\copy.sqlite`). The subcommands and flags are identical everywhere; only the binary
> name (see table) and path style differ.

---

## Configure the database

The CLI reads `configuration/*.yaml` from the **current directory**, so run commands from the folder
that contains `configuration/`. Point the `database:` block at your Postgres server:

```yaml
database:
  host: "localhost"        # or a remote host / container host
  port: 5432
  username: "postgres"     # must be a SUPERUSER (needs CREATE DATABASE + session_replication_role)
  password: "your-password"
  database_name: "omsupply_pg"   # a real Postgres DB name, NOT a .sqlite filename
```

Keep your existing `sync:` block unchanged — because the copy includes `key_value_store` (site id +
sync cursors) and `changelog`, the migrated server resumes as the **same site** with incremental sync.

---

## A) Development

Goal: validate the migration on a copy of a datafile; iterate freely. In dev you build-and-run in one
step with `cargo run`. Run these from the `server/` directory (config is read from
`server/configuration/*.yaml`); the `--` separates cargo's args from the CLI's args.

1. **Get a copy of the SQLite file** you want to migrate (e.g. `cp source.sqlite copy.sqlite`).
2. **Configure** `server/configuration/*.yaml` `database:` block to your (dev) Postgres (see above).
3. **Build the Postgres schema** (creates the DB if missing, runs all migrations + views):
   ```bash
   cargo run --no-default-features --features "postgres,sqlite-to-postgres" --bin remote_server_cli -- migrate
   ```
4. **Preview** the copy plan (row counts per table; writes nothing):
   ```bash
   cargo run --no-default-features --features "postgres,sqlite-to-postgres" --bin remote_server_cli -- migrate-sqlite-to-postgres --sqlite-path /path/to/copy.sqlite --dry-run
   ```
5. **Run the copy** (auto-verifies row counts at the end):
   ```bash
   cargo run --no-default-features --features "postgres,sqlite-to-postgres" --bin remote_server_cli -- migrate-sqlite-to-postgres --sqlite-path /path/to/copy.sqlite
   ```
6. **Re-verify any time** (compares SQLite vs Postgres counts; exits non-zero on mismatch):
   ```bash
   cargo run --no-default-features --features "postgres,sqlite-to-postgres" --bin remote_server_cli -- migrate-sqlite-to-postgres --sqlite-path /path/to/copy.sqlite --verify
   ```
7. **Start the Postgres server** and confirm the data and login work:
   ```bash
   cargo run --no-default-features --features postgres --bin remote_server
   ```

Iterate by re-running step 5 (it truncates and re-copies).

---

## B) Production

Goal: real cutover with safety and verification. Same commands, more discipline.

1. **Stop** the running omSupply (SQLite) server/service.
2. **Back up**, then **copy** the `.sqlite` file to a working location for the migration
   (`prod-copy.sqlite`). Keep the original untouched — it's your rollback.
3. **Provision Postgres** and a superuser role. (Local, remote, or container — your choice.)
4. **Obtain the CLI at the correct version:**
   - Packaged: use the installed binary (`omSupply-cli.exe` on Windows), built from the release you deploy.
   - From source: `git checkout` the commit/tag matching the running SQLite server, then build with
     `--features "postgres,sqlite-to-postgres"` (and build the Postgres `remote_server` too).
5. **Configure** the production `database:` block to Postgres (see above).
6. **Build the schema:**
   ```bash
   ./omSupply-cli-postgres.exe migrate
   ```
7. **Dry-run**, then the **real copy**:
   ```bash
   ./omSupply-cli-postgres.exe migrate-sqlite-to-postgres --sqlite-path /path/to/prod-copy.sqlite --dry-run
   ./omSupply-cli-postgres.exe migrate-sqlite-to-postgres --sqlite-path /path/to/prod-copy.sqlite
   ```
8. **Verify** (see below). Do not proceed on mismatches.
9. **Start** the Postgres `remote_server` and confirm login/data, and that the **next sync is
   incremental** (not a fresh initialisation) — this proves the site id + sync cursors migrated.
10. **Decommission the SQLite server.** Never run both against the same site simultaneously (duplicate
    sync pushes).

---

## Verify & rollback

- The copy **auto-verifies** and prints a per-table `sqlite | postgres | status` table, failing on any
  mismatch. Re-check standalone with `--verify`:
  ```bash
  ./omSupply-cli-postgres.exe migrate-sqlite-to-postgres --sqlite-path /path/to/copy.sqlite --verify
  ```
  (The two migration-bookkeeping tables are intentionally excluded — they legitimately differ.)
- Also sanity-check `key_value_store` `DATABASE_VERSION` matches, and spot-check OMS-only tables
  (`asset`, `vaccine_course`, `rnr_form`, `temperature_breach_config`, `plugin_data`).
- **Rollback:** restart the original SQLite server (never modified). Fix and re-run the copy — it is
  idempotent (truncates + re-copies).

---

## Common pitfalls

- **"Found 0 Postgres base tables" / everything shows 0 in Postgres** → the schema wasn't built. Run
  `./omSupply-cli-postgres.exe migrate` first (not `initialise-database`).
- **`password authentication failed`** → wrong credentials in the `database:` block, or you're hitting
  a different Postgres than intended (e.g. a local install vs a remote/container on the same port).
- **Copying the wrong source** → make sure `--sqlite-path` points at your real datafile, not an empty
  `.sqlite` accidentally created by pointing the SQLite build's config at a non-existent filename.
- **Build fails to link** → libpq not found (`PQ_LIB_DIR`), or on Windows `libpq.dll` not on `PATH` at
  run time.
