use anyhow::{Context, Result};
use diesel::prelude::*;
use diesel::sql_query;

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
