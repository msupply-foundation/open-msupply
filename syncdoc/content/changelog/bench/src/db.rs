use anyhow::{bail, Context, Result};
use diesel::prelude::*;
use diesel::sql_query;
use std::thread;
use std::time::{Duration, Instant};

use crate::config::PgConfig;

/// Connect to the benchmark database, retrying until it's available.
pub fn connect(pg: &PgConfig, timeout: Duration) -> Result<PgConnection> {
    let conn_str = pg.connection_string();
    let start = Instant::now();
    loop {
        match PgConnection::establish(&conn_str) {
            Ok(conn) => return Ok(conn),
            Err(e) => {
                if start.elapsed() > timeout {
                    bail!(
                        "Could not connect to Postgres at '{}' within {:?}: {}",
                        conn_str,
                        timeout,
                        e
                    );
                }
                thread::sleep(Duration::from_millis(500));
            }
        }
    }
}

/// Connect to the `postgres` maintenance database.
pub fn connect_maintenance(pg: &PgConfig) -> Result<PgConnection> {
    let maint_str = pg.maintenance_connection_string();
    PgConnection::establish(&maint_str)
        .with_context(|| format!("Failed to connect to maintenance database at {}", maint_str))
}

/// Drop and recreate the benchmark database to get a clean slate.
/// Connects to the `postgres` maintenance database to do this.
pub fn reset_database(pg: &PgConfig) -> Result<()> {
    let maint_str = pg.maintenance_connection_string();
    let mut conn = PgConnection::establish(&maint_str)
        .with_context(|| format!("Failed to connect to maintenance database at {}", maint_str))?;

    // Terminate any existing connections to the benchmark database
    let _ = sql_query(&format!(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{}' AND pid <> pg_backend_pid()",
        pg.database
    ))
    .execute(&mut conn);

    // Drop and recreate
    let _ = sql_query(&format!("DROP DATABASE IF EXISTS \"{}\"", pg.database)).execute(&mut conn);
    sql_query(&format!("CREATE DATABASE \"{}\"", pg.database))
        .execute(&mut conn)
        .with_context(|| format!("Failed to create database '{}'", pg.database))?;

    Ok(())
}

/// Parse a PG config .txt file (key = value per line, # comments) and apply
/// each setting via ALTER SYSTEM, then reload with pg_reload_conf().
pub fn apply_pg_config(conn: &mut PgConnection, pg_config_file: &str) -> Result<()> {
    let content = std::fs::read_to_string(pg_config_file)
        .with_context(|| format!("Failed to read pg_config_file '{}'", pg_config_file))?;

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some((key, value)) = line.split_once('=') {
            let key = key.trim();
            let value = value.trim();
            let stmt = format!("ALTER SYSTEM SET {} = '{}';", key, value);
            sql_query(&stmt)
                .execute(conn)
                .with_context(|| format!("Failed to apply PG config: {}", stmt))?;
        }
    }

    sql_query("SELECT pg_reload_conf();")
        .execute(conn)
        .context("Failed to reload PG config")?;

    // Brief pause for settings to take effect
    std::thread::sleep(std::time::Duration::from_millis(200));

    Ok(())
}

/// Reset all ALTER SYSTEM overrides and reload config.
pub fn reset_pg_config(conn: &mut PgConnection) -> Result<()> {
    sql_query("ALTER SYSTEM RESET ALL;")
        .execute(conn)
        .context("Failed to reset PG config")?;
    sql_query("SELECT pg_reload_conf();")
        .execute(conn)
        .context("Failed to reload PG config after reset")?;
    std::thread::sleep(std::time::Duration::from_millis(200));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_connect_invalid_host() {
        let pg = PgConfig {
            host: "nonexistent-host-12345".to_string(),
            port: 5432,
            user: "postgres".to_string(),
            password: "pass".to_string(),
            database: "bench".to_string(),
        };
        let result = connect(&pg, Duration::from_secs(1));
        assert!(result.is_err());
    }

    #[test]
    #[ignore] // Requires a running Postgres
    fn test_reset_database() {
        let pg = PgConfig {
            host: "localhost".to_string(),
            port: 5432,
            user: "postgres".to_string(),
            password: "bench".to_string(),
            database: "changelog_bench_test_reset".to_string(),
        };

        // Reset should create the database
        reset_database(&pg).unwrap();

        // Should be able to connect
        let mut conn = connect(&pg, Duration::from_secs(5)).unwrap();

        // Verify it's empty
        #[derive(diesel::QueryableByName)]
        struct CountRow {
            #[diesel(sql_type = diesel::sql_types::BigInt)]
            cnt: i64,
        }

        let result: Vec<CountRow> = sql_query(
            "SELECT count(*)::bigint AS cnt FROM information_schema.tables WHERE table_schema = 'public'"
        )
        .load(&mut conn)
        .unwrap();
        assert_eq!(result[0].cnt, 0);

        // Reset again — should work even with an existing database
        reset_database(&pg).unwrap();

        // Cleanup
        let maint_str = pg.maintenance_connection_string();
        let mut maint = PgConnection::establish(&maint_str).unwrap();
        let _ = sql_query(&format!("DROP DATABASE IF EXISTS \"{}\"", pg.database))
            .execute(&mut maint);
    }
}
