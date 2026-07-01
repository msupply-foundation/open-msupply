//! Direct SQLite -> Postgres data copy for migrating an existing omSupply server between database
//! engines WITHOUT going through sync (which would lose OMS-only, non-synced tables such as assets,
//! vaccine courses, plugin data, temperature_breach_config, printer, etc.).
//!
//! Strategy: the empty Postgres schema is built beforehand with `initialise-database` (so all tables,
//! enum types, foreign keys, triggers and views already exist and are at the SAME migration version
//! as the SQLite file). This command then copies raw row data from the SQLite file into that schema:
//!   - column TYPES are read from Postgres `information_schema` so values are formatted correctly
//!     (booleans, dates/timestamps, bytea, enums-as-text),
//!   - foreign keys and changelog triggers are disabled during the copy (`session_replication_role`),
//!   - target tables are truncated first so the copy is an exact clone (re-runnable),
//!   - auto-increment sequences (e.g. `changelog.cursor`) are advanced to MAX+1 afterwards.
//!
//! The migration-bookkeeping tables are intentionally left untouched so the target keeps its correct
//! migration state.
//!
//! Enums load fine as text labels because diesel-derive-enum uses the same label strings on both
//! engines and Postgres coerces the text literal to the enum type on INSERT.

use anyhow::{anyhow, Context};
use diesel::connection::SimpleConnection;
use diesel::sql_types::{BigInt, Nullable, Text};
use diesel::{sql_query, Connection, QueryableByName, RunQueryDsl};
use log::{info, warn};
use repository::{get_storage_connection_manager, DBConnection};
use rusqlite::types::ValueRef;
use rusqlite::OpenFlags;
use service::settings::Settings;

/// Tables whose contents are owned by the migration framework and are already populated correctly by
/// `initialise-database`. We must not truncate or overwrite them.
const SKIP_TABLES: &[&str] = &["__diesel_schema_migrations", "migration_fragment_log"];

#[derive(QueryableByName)]
struct TableName {
    #[diesel(sql_type = Text)]
    table_name: String,
}

#[derive(QueryableByName)]
struct CountRow {
    #[diesel(sql_type = BigInt)]
    c: i64,
}

#[derive(QueryableByName, Clone)]
struct PgColumn {
    #[diesel(sql_type = Text)]
    column_name: String,
    #[diesel(sql_type = Text)]
    data_type: String,
    #[diesel(sql_type = Text)]
    is_identity: String,
    #[diesel(sql_type = Nullable<Text>)]
    column_default: Option<String>,
}

impl PgColumn {
    fn has_sequence(&self) -> bool {
        self.is_identity == "YES"
            || self
                .column_default
                .as_deref()
                .map(|d| d.trim_start().starts_with("nextval"))
                .unwrap_or(false)
    }
}

pub fn run(
    settings: &Settings,
    sqlite_path: &str,
    dry_run: bool,
    verify: bool,
    batch_size: usize,
) -> anyhow::Result<()> {
    let batch_size = batch_size.max(1);

    // --- Source (SQLite, read-only) ---
    let sqlite = rusqlite::Connection::open_with_flags(
        sqlite_path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_URI,
    )
    .with_context(|| format!("Cannot open source SQLite database at '{}'", sqlite_path))?;

    // --- Target (Postgres) ---
    let manager = get_storage_connection_manager(&settings.database);
    let storage = manager.connection()?;
    let mut locked = storage.lock();
    let conn = locked.connection();

    let tables = pg_base_tables(conn)?;
    let copy_tables: Vec<String> = tables
        .into_iter()
        .filter(|t| !SKIP_TABLES.contains(&t.as_str()))
        .collect();

    info!(
        "Found {} Postgres base tables to copy (skipping {:?})",
        copy_tables.len(),
        SKIP_TABLES
    );

    // Guard: an empty public schema almost always means the Postgres database was auto-created but
    // never migrated. Copying/verifying against it would silently do nothing.
    if copy_tables.is_empty() {
        return Err(anyhow!(
            "Target Postgres database '{}' has no tables - its schema has not been built. \
             Run `remote_server_cli migrate` against this database first (it creates the DB if \
             missing and runs all migrations), then re-run this command.",
            settings.database.database_name
        ));
    }

    // Introspect columns + source row counts up front (also validates connectivity/schema parity).
    let mut plan: Vec<(String, Vec<PgColumn>, i64)> = Vec::new();
    for table in &copy_tables {
        let pg_cols = pg_columns(conn, table)?;
        let sqlite_cols = sqlite_columns(&sqlite, table)?;
        if sqlite_cols.is_empty() {
            warn!("Table '{}' does not exist in the SQLite source, skipping", table);
            continue;
        }
        // Only copy columns present in BOTH schemas (guards against version drift).
        let shared: Vec<PgColumn> = pg_cols
            .into_iter()
            .filter(|c| sqlite_cols.iter().any(|s| s == &c.column_name))
            .collect();
        if shared.is_empty() {
            warn!("No shared columns for '{}', skipping", table);
            continue;
        }
        let count = sqlite_count(&sqlite, table)?;
        plan.push((table.clone(), shared, count));
    }

    let total_rows: i64 = plan.iter().map(|(_, _, c)| *c).sum();
    info!("Planned copy: {} tables, {} source rows total", plan.len(), total_rows);
    for (table, cols, count) in &plan {
        info!("  {:<40} {:>10} rows, {} columns", table, count, cols.len());
    }

    if dry_run {
        info!("Dry run - no data written. Re-run without --dry-run to perform the copy.");
        return Ok(());
    }

    if verify {
        // Verify-only mode: don't copy, just compare row counts of an earlier copy.
        info!("Verify-only mode: comparing SQLite vs Postgres row counts (no data written)");
        let all_match = verify_and_report(&sqlite, conn, &plan)?;
        return if all_match {
            Ok(())
        } else {
            Err(anyhow!("Verification failed: row counts differ (see table above)"))
        };
    }

    // Everything runs on a single pooled connection inside one transaction: atomic + the
    // `session_replication_role` session setting stays in effect for the whole copy.
    conn.transaction::<_, anyhow::Error, _>(|conn| {
        info!("Disabling triggers and foreign key checks for this session");
        conn.batch_execute("SET session_replication_role = 'replica';")?;

        // Truncate every target table (except skip list) in one statement so FK order is irrelevant.
        let truncate_list = plan
            .iter()
            .map(|(t, _, _)| format!("\"{}\"", t))
            .collect::<Vec<_>>()
            .join(", ");
        if !truncate_list.is_empty() {
            info!("Truncating target tables");
            conn.batch_execute(&format!(
                "TRUNCATE {} RESTART IDENTITY CASCADE;",
                truncate_list
            ))?;
        }

        for (table, cols, count) in &plan {
            copy_table(&sqlite, conn, table, cols, *count, batch_size)?;
        }

        info!("Resetting auto-increment sequences");
        for (table, cols, _) in &plan {
            for col in cols.iter().filter(|c| c.has_sequence()) {
                reset_sequence(conn, table, &col.column_name);
            }
        }

        conn.batch_execute("SET session_replication_role = 'origin';")?;
        Ok(())
    })?;

    info!("Copy complete. Verifying row counts...");
    let all_match = verify_and_report(&sqlite, conn, &plan)?;

    info!("Next step: run `remote_server_cli migrate` to drop & rebuild derived views.");
    if all_match {
        Ok(())
    } else {
        Err(anyhow!(
            "Copy committed, but verification found row-count mismatches (see table above) - \
             investigate before cutover"
        ))
    }
}

/// Compare SQLite vs Postgres row counts for every planned table. Returns true if all match.
fn verify_and_report(
    sqlite: &rusqlite::Connection,
    conn: &mut DBConnection,
    plan: &[(String, Vec<PgColumn>, i64)],
) -> anyhow::Result<bool> {
    let mut mismatches = 0;
    info!("{:<42} {:>12} {:>12}   {}", "table", "sqlite", "postgres", "status");
    info!("{}", "-".repeat(84));
    for (table, _, sqlite_count) in plan {
        let pg = pg_count(conn, table)?;
        let ok = pg == *sqlite_count;
        if !ok {
            mismatches += 1;
        }
        info!(
            "{:<42} {:>12} {:>12}   {}",
            table,
            sqlite_count,
            pg,
            if ok { "ok" } else { "MISMATCH" }
        );
    }
    if mismatches == 0 {
        info!("Verification passed: all {} tables match", plan.len());
    } else {
        warn!("Verification: {} table(s) differ", mismatches);
    }
    Ok(mismatches == 0)
}

fn pg_count(conn: &mut DBConnection, table: &str) -> anyhow::Result<i64> {
    let row: CountRow = sql_query(format!("SELECT count(*) AS c FROM \"{}\"", table)).get_result(conn)?;
    Ok(row.c)
}

fn copy_table(
    sqlite: &rusqlite::Connection,
    conn: &mut DBConnection,
    table: &str,
    cols: &[PgColumn],
    expected: i64,
    batch_size: usize,
) -> anyhow::Result<()> {
    let col_list = cols
        .iter()
        .map(|c| format!("\"{}\"", c.column_name))
        .collect::<Vec<_>>()
        .join(", ");

    let select_sql = format!("SELECT {} FROM \"{}\"", col_list, table);
    let mut stmt = sqlite
        .prepare(&select_sql)
        .with_context(|| format!("Failed to prepare read for '{}'", table))?;

    let mut rows = stmt.query([])?;
    let mut value_tuples: Vec<String> = Vec::with_capacity(batch_size);
    let mut written: i64 = 0;

    while let Some(row) = rows.next()? {
        let mut values: Vec<String> = Vec::with_capacity(cols.len());
        for (i, col) in cols.iter().enumerate() {
            let value_ref = row.get_ref(i)?;
            values.push(to_pg_literal(value_ref, &col.data_type));
        }
        value_tuples.push(format!("({})", values.join(", ")));

        if value_tuples.len() >= batch_size {
            written += flush_batch(conn, table, &col_list, &mut value_tuples)? as i64;
        }
    }
    written += flush_batch(conn, table, &col_list, &mut value_tuples)? as i64;

    if written != expected {
        warn!(
            "Table '{}': wrote {} rows but source reported {} (may differ if rows changed mid-copy)",
            table, written, expected
        );
    } else {
        info!("Table '{}': copied {} rows", table, written);
    }
    Ok(())
}

fn flush_batch(
    conn: &mut DBConnection,
    table: &str,
    col_list: &str,
    value_tuples: &mut Vec<String>,
) -> anyhow::Result<usize> {
    if value_tuples.is_empty() {
        return Ok(0);
    }
    let n = value_tuples.len();
    let sql = format!(
        "INSERT INTO \"{}\" ({}) VALUES {};",
        table,
        col_list,
        value_tuples.join(", ")
    );
    sql_query(sql)
        .execute(conn)
        .with_context(|| format!("Insert into '{}' failed", table))?;
    value_tuples.clear();
    Ok(n)
}

fn reset_sequence(conn: &mut DBConnection, table: &str, column: &str) {
    // false as the third arg to setval => nextval() returns exactly the given value.
    let sql = format!(
        "SELECT setval(pg_get_serial_sequence('\"{table}\"', '{column}'), \
         GREATEST(COALESCE((SELECT MAX(\"{column}\") FROM \"{table}\"), 0) + 1, 1), false);",
        table = table,
        column = column
    );
    if let Err(e) = conn.batch_execute(&sql) {
        // Not fatal: some identity columns have no serial sequence.
        warn!("Could not reset sequence for {}.{}: {}", table, column, e);
    }
}

// --- Introspection -------------------------------------------------------------------------------

fn pg_base_tables(conn: &mut DBConnection) -> anyhow::Result<Vec<String>> {
    let rows: Vec<TableName> = sql_query(
        "SELECT table_name FROM information_schema.tables \
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE' \
         ORDER BY table_name",
    )
    .get_results(conn)?;
    Ok(rows.into_iter().map(|r| r.table_name).collect())
}

fn pg_columns(conn: &mut DBConnection, table: &str) -> anyhow::Result<Vec<PgColumn>> {
    // Table name comes from Postgres itself, so inlining is safe here.
    let rows: Vec<PgColumn> = sql_query(format!(
        "SELECT column_name, data_type, is_identity, column_default \
         FROM information_schema.columns \
         WHERE table_schema = 'public' AND table_name = '{}' \
         ORDER BY ordinal_position",
        table
    ))
    .get_results(conn)?;
    Ok(rows)
}

fn sqlite_columns(sqlite: &rusqlite::Connection, table: &str) -> anyhow::Result<Vec<String>> {
    let mut stmt = sqlite.prepare(&format!("PRAGMA table_info(\"{}\")", table))?;
    let names = stmt
        .query_map([], |row| row.get::<_, String>(1))? // column 1 = name
        .collect::<Result<Vec<String>, _>>()?;
    Ok(names)
}

fn sqlite_count(sqlite: &rusqlite::Connection, table: &str) -> anyhow::Result<i64> {
    let count: i64 =
        sqlite.query_row(&format!("SELECT COUNT(*) FROM \"{}\"", table), [], |r| r.get(0))?;
    Ok(count)
}

// --- Value formatting ----------------------------------------------------------------------------

/// Produce a Postgres SQL literal for a SQLite value, guided by the *Postgres* column type.
fn to_pg_literal(value: ValueRef, data_type: &str) -> String {
    if matches!(value, ValueRef::Null) {
        return "NULL".to_string();
    }
    match data_type {
        "boolean" => bool_literal(value),
        "bytea" => bytea_literal(value),
        "timestamp without time zone"
        | "timestamp with time zone"
        | "date"
        | "time without time zone"
        | "time with time zone" => datetime_literal(value),
        "smallint" | "integer" | "bigint" | "double precision" | "real" | "numeric" => {
            number_literal(value, data_type)
        }
        // text, character varying, character, uuid, json, jsonb, USER-DEFINED (enums), ...
        _ => text_literal(value),
    }
}

fn bool_literal(value: ValueRef) -> String {
    let truthy = match value {
        ValueRef::Integer(i) => i != 0,
        ValueRef::Real(f) => f != 0.0,
        ValueRef::Text(_) => {
            let s = value_text(value).to_lowercase();
            !matches!(s.as_str(), "0" | "f" | "false" | "n" | "no" | "")
        }
        _ => return "NULL".to_string(),
    };
    if truthy { "TRUE".to_string() } else { "FALSE".to_string() }
}

fn bytea_literal(value: ValueRef) -> String {
    match value {
        ValueRef::Blob(b) => format!("decode('{}', 'hex')", to_hex(b)),
        ValueRef::Text(t) => format!("decode('{}', 'hex')", to_hex(t)),
        _ => "NULL".to_string(),
    }
}

fn datetime_literal(value: ValueRef) -> String {
    match value {
        ValueRef::Text(_) => {
            let s = value_text(value);
            if s.trim().is_empty() {
                "NULL".to_string()
            } else {
                quote(&s)
            }
        }
        // omSupply stores dates/datetimes as ISO text in SQLite; other representations are unexpected.
        _ => "NULL".to_string(),
    }
}

fn number_literal(value: ValueRef, data_type: &str) -> String {
    match value {
        ValueRef::Integer(i) => i.to_string(),
        ValueRef::Real(f) => {
            if f.is_finite() {
                // Rust's default f64 formatting is the shortest round-trippable representation.
                format!("{}", f)
            } else if data_type == "double precision" || data_type == "real" {
                let label = if f.is_nan() {
                    "NaN"
                } else if f > 0.0 {
                    "Infinity"
                } else {
                    "-Infinity"
                };
                format!("'{}'::float8", label)
            } else {
                "NULL".to_string()
            }
        }
        ValueRef::Text(_) => {
            let s = value_text(value);
            let trimmed = s.trim();
            if trimmed.is_empty() {
                "NULL".to_string()
            } else {
                // Assume it is a valid numeric string (schema parity guarantees the column type).
                trimmed.to_string()
            }
        }
        _ => "NULL".to_string(),
    }
}

fn text_literal(value: ValueRef) -> String {
    match value {
        ValueRef::Text(_) => quote(&value_text(value)),
        ValueRef::Integer(i) => quote(&i.to_string()),
        ValueRef::Real(f) => quote(&format!("{}", f)),
        ValueRef::Blob(b) => quote(&String::from_utf8_lossy(b)),
        ValueRef::Null => "NULL".to_string(),
    }
}

/// Lossily decode a text ValueRef to a String.
fn value_text(value: ValueRef) -> String {
    match value {
        ValueRef::Text(bytes) => String::from_utf8_lossy(bytes).into_owned(),
        _ => String::new(),
    }
}

/// Single-quote a string for Postgres. Assumes standard_conforming_strings = on (the default), so
/// only the single quote needs escaping (by doubling).
fn quote(s: &str) -> String {
    format!("'{}'", s.replace('\'', "''"))
}

fn to_hex(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        out.push_str(&format!("{:02x}", b));
    }
    out
}
