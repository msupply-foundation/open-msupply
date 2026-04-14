use anyhow::{Context, Result};
use diesel::prelude::*;
use diesel::sql_query;
use md5::{Md5, Digest};
use rand::RngExt;

use crate::config::{NullProfile, PgConfig};
use crate::types::*;

pub fn connect(pg: &PgConfig) -> Result<PgConnection> {
    let conn_str = pg.connection_string();
    PgConnection::establish(&conn_str)
        .with_context(|| format!("Failed to connect to {}", conn_str))
}

/// Drop and recreate the benchmark database via the `postgres` maintenance DB.
pub fn reset_database(pg: &PgConfig) -> Result<()> {
    let maint = pg.maintenance_connection_string();
    let mut conn = PgConnection::establish(&maint)
        .with_context(|| format!("Failed to connect to maintenance DB at {}", maint))?;

    let _ = sql_query(&format!(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity \
         WHERE datname = '{}' AND pid <> pg_backend_pid()",
        pg.database
    ))
    .execute(&mut conn);

    let _ = sql_query(&format!("DROP DATABASE IF EXISTS \"{}\"", pg.database))
        .execute(&mut conn);
    sql_query(&format!("CREATE DATABASE \"{}\"", pg.database))
        .execute(&mut conn)
        .with_context(|| format!("Failed to create database '{}'", pg.database))?;
    Ok(())
}

/// Create the changelog table. If `partition_size` is Some, creates a partitioned table.
pub fn recreate_changelog(
    conn: &mut PgConnection,
    partition_size: Option<u64>,
) -> Result<()> {
    let _ = sql_query("DROP TABLE IF EXISTS changelog CASCADE").execute(conn);
    let _ = sql_query("DROP SEQUENCE IF EXISTS changelog_cursor_seq").execute(conn);
    let _ = sql_query("DROP TYPE IF EXISTS row_action_type").execute(conn);

    sql_query(BASE_TYPE_SQL)
        .execute(conn)
        .context("failed to create row_action_type")?;
    sql_query(BASE_SEQ_SQL)
        .execute(conn)
        .context("failed to create changelog_cursor_seq")?;

    if partition_size.is_some() {
        sql_query(PARTITIONED_TABLE_SQL)
            .execute(conn)
            .context("failed to create partitioned changelog table")?;
    } else {
        sql_query(BASE_TABLE_SQL)
            .execute(conn)
            .context("failed to create changelog table")?;
    }
    Ok(())
}

/// Ensure range partitions exist to cover cursors up to `up_to` (inclusive).
/// Each partition covers `partition_size` rows. Idempotent.
pub fn ensure_partitions(
    conn: &mut PgConnection,
    up_to: u64,
    partition_size: u64,
) -> Result<()> {
    let max_partition = up_to.saturating_sub(1) / partition_size;
    for i in 0..=max_partition {
        let from = i * partition_size + 1;
        let to = (i + 1) * partition_size + 1;
        let sql = format!(
            "CREATE TABLE IF NOT EXISTS changelog_p{i} \
             PARTITION OF changelog FOR VALUES FROM ({from}) TO ({to})"
        );
        let _ = sql_query(&sql).execute(conn);
    }
    Ok(())
}

/// Insert rows [from..=to] into changelog using `generate_series`.
/// Nulls are applied probabilistically via `random()` to match the profile.
pub fn insert_series(
    conn: &mut PgConnection,
    from: u64,
    to: u64,
    profile: &NullProfile,
) -> Result<()> {
    let enum_array = TABLE_NAME_VALUES
        .iter()
        .map(|v| format!("'{}'", v))
        .collect::<Vec<_>>()
        .join(", ");
    let enum_count = TABLE_NAME_VALUES.len();

    let store_populated = 1.0 - profile.store_id;
    let transfer_populated = 1.0 - profile.transfer_store_id;
    let patient_populated = 1.0 - profile.patient_id;

    let sql = format!(
"INSERT INTO changelog (record_id, table_name, row_action, source_site_id, store_id, transfer_store_id, patient_id)
SELECT
    md5(g::text)::uuid,
    (ARRAY[{enum_array}])[1 + (g % {enum_count})::int],
    CASE WHEN random() < 0.05 THEN 'DELETE'::row_action_type ELSE 'UPSERT'::row_action_type END,
    CASE WHEN random() < 0.25 THEN (1 + (g % 99)::int) ELSE NULL END,
    CASE WHEN random() < {store_populated} THEN md5((g+1)::text)::uuid ELSE NULL END,
    CASE WHEN random() < {transfer_populated} THEN md5((g+2)::text)::uuid ELSE NULL END,
    CASE WHEN random() < {patient_populated} THEN md5((g+3)::text)::uuid ELSE NULL END
FROM generate_series({from}, {to}) AS g;"
    );

    sql_query(&sql)
        .execute(conn)
        .with_context(|| format!("generate_series insert {}..{} failed", from, to))?;
    Ok(())
}

/// Compute md5(value)::uuid the same way Postgres does: md5 hash → hex string → UUID.
fn md5_uuid(value: &str) -> String {
    let hash = Md5::digest(value.as_bytes());
    let hex = format!("{:x}", hash);
    // Format as UUID: 8-4-4-4-12
    format!(
        "{}-{}-{}-{}-{}",
        &hex[0..8],
        &hex[8..12],
        &hex[12..16],
        &hex[16..20],
        &hex[20..32]
    )
}

/// Pre-generate all single-row INSERT SQL strings with all values computed in Rust.
/// Uses the same data generation logic as `insert_series`:
/// - record_id: md5(g::text)::uuid
/// - table_name: TABLE_NAME_VALUES[g % count]
/// - row_action: 5% DELETE, 95% UPSERT
/// - source_site_id: 25% chance of (1 + g % 99), else NULL
/// - store_id/transfer_store_id/patient_id: md5-based UUID with null probability from profile
///
/// All randomness uses Rust's `rand` instead of Postgres `random()`.
/// Call BEFORE the timing loop so generation doesn't affect latency.
pub fn prepare_single_row_sqls(
    g_from: u64,
    count: u64,
    profile: &NullProfile,
) -> Vec<String> {
    let enum_count = TABLE_NAME_VALUES.len();
    let store_populated = 1.0 - profile.store_id;
    let transfer_populated = 1.0 - profile.transfer_store_id;
    let patient_populated = 1.0 - profile.patient_id;

    let mut rng = rand::rng();

    (0..count)
        .map(|i| {
            let g = g_from + i;

            let record_id = md5_uuid(&g.to_string());
            let table_name = TABLE_NAME_VALUES[(g as usize) % enum_count];
            let row_action = if rng.random_bool(0.05) { "DELETE" } else { "UPSERT" };

            let source_site_id = if rng.random_bool(0.25) {
                format!("{}", 1 + (g % 99))
            } else {
                "NULL".to_string()
            };

            let store_id = if rng.random_bool(store_populated) {
                format!("'{}'", md5_uuid(&(g + 1).to_string()))
            } else {
                "NULL".to_string()
            };

            let transfer_store_id = if rng.random_bool(transfer_populated) {
                format!("'{}'", md5_uuid(&(g + 2).to_string()))
            } else {
                "NULL".to_string()
            };

            let patient_id = if rng.random_bool(patient_populated) {
                format!("'{}'", md5_uuid(&(g + 3).to_string()))
            } else {
                "NULL".to_string()
            };

            format!(
                "INSERT INTO changelog (record_id, table_name, row_action, source_site_id, store_id, transfer_store_id, patient_id) \
                 VALUES ('{record_id}', '{table_name}', '{row_action}'::row_action_type, {source_site_id}, {store_id}, {transfer_store_id}, {patient_id})"
            )
        })
        .collect()
}

/// Execute a pre-generated single-row INSERT SQL string.
pub fn execute_single_insert(conn: &mut PgConnection, sql: &str) -> Result<()> {
    sql_query(sql)
        .execute(conn)
        .context("single-row INSERT failed")?;
    Ok(())
}
