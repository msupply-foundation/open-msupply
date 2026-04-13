use anyhow::{Context, Result};
use diesel::prelude::*;
use diesel::sql_query;
use std::time::Duration;

use crate::bench;
use crate::config::PgConfig;
use crate::db;
use crate::schema;

/// Template database name for a given N.
pub fn template_name(n: u64) -> String {
    format!("changelog_bench_seed_{}", n)
}

/// Check if a seed template database already exists.
pub fn template_exists(pg: &PgConfig, n: u64) -> Result<bool> {
    let mut conn = db::connect_maintenance(pg)?;

    #[derive(diesel::QueryableByName)]
    struct CountRow {
        #[diesel(sql_type = diesel::sql_types::BigInt)]
        cnt: i64,
    }

    let result: Vec<CountRow> = sql_query(&format!(
        "SELECT count(*)::bigint AS cnt FROM pg_database WHERE datname = '{}'",
        template_name(n)
    ))
    .load(&mut conn)?;

    Ok(result[0].cnt > 0)
}

/// Find the largest existing seed template with fewer than `n` rows.
/// Returns `Some(existing_n)` if found, `None` if no smaller template exists.
fn find_base_template(n: u64, all_n_values: &[u64], pg: &PgConfig) -> Result<Option<u64>> {
    // Check all n_values smaller than n, largest first
    let mut candidates: Vec<u64> = all_n_values.iter().filter(|&&v| v > 0 && v < n).copied().collect();
    candidates.sort_unstable();
    candidates.reverse();

    for candidate in candidates {
        if template_exists(pg, candidate)? {
            return Ok(Some(candidate));
        }
    }
    Ok(None)
}

/// Generate a seed template database for N rows.
///
/// If a smaller seed template exists, creates from that template and inserts
/// only the remaining rows. Otherwise creates from scratch.
pub fn generate_seed(n: u64, all_n_values: &[u64], pg: &PgConfig) -> Result<()> {
    if n == 0 {
        return Ok(());
    }

    let tpl_name = template_name(n);
    let mut maint_conn = db::connect_maintenance(pg)?;

    // Drop if exists (need to unmark as template first)
    let _ = sql_query(&format!(
        "ALTER DATABASE \"{}\" IS_TEMPLATE false",
        tpl_name
    ))
    .execute(&mut maint_conn);
    let _ = sql_query(&format!(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{}'",
        tpl_name
    ))
    .execute(&mut maint_conn);
    let _ = sql_query(&format!("DROP DATABASE IF EXISTS \"{}\"", tpl_name)).execute(&mut maint_conn);

    // Check if we can build on top of a smaller existing template
    let base = find_base_template(n, all_n_values, pg)?;
    let rows_to_insert;

    if let Some(base_n) = base {
        let base_tpl = template_name(base_n);
        eprintln!(
            "  Creating seed '{}' from base template '{}' ({} existing rows)...",
            tpl_name,
            base_tpl,
            crate::plot::format_n(base_n)
        );
        sql_query(&format!(
            "CREATE DATABASE \"{}\" TEMPLATE \"{}\"",
            tpl_name, base_tpl
        ))
        .execute(&mut maint_conn)
        .with_context(|| {
            format!(
                "Failed to create '{}' from template '{}'",
                tpl_name, base_tpl
            )
        })?;
        rows_to_insert = n - base_n;
    } else {
        eprintln!("  Creating seed database '{}' from scratch...", tpl_name);
        sql_query(&format!("CREATE DATABASE \"{}\"", tpl_name))
            .execute(&mut maint_conn)
            .with_context(|| format!("Failed to create seed database '{}'", tpl_name))?;
        rows_to_insert = n;
    }

    // Connect to the seed database
    let seed_pg = PgConfig {
        database: tpl_name.clone(),
        ..pg.clone()
    };
    let mut conn = db::connect(&seed_pg, Duration::from_secs(10))?;

    if base.is_none() {
        // Fresh database — create schema
        eprintln!("  Creating seed schema...");
        for stmt in schema::base_types_sql() {
            sql_query(&stmt).execute(&mut conn)?;
        }
        sql_query(&schema::base_table_sql()).execute(&mut conn)?;
    }

    // Insert remaining rows
    eprintln!(
        "  Inserting {} rows (total target: {})...",
        crate::plot::format_n(rows_to_insert),
        crate::plot::format_n(n)
    );
    bench::prepopulate(&mut conn, rows_to_insert)?;

    // Disconnect before marking as template
    drop(conn);

    // Mark as template
    eprintln!("  Marking as template...");
    sql_query(&format!(
        "ALTER DATABASE \"{}\" IS_TEMPLATE true",
        tpl_name
    ))
    .execute(&mut maint_conn)
    .with_context(|| format!("Failed to mark '{}' as template", tpl_name))?;

    eprintln!("  Seed template '{}' ready.", tpl_name);
    Ok(())
}

/// Create the benchmark database from a seed template.
///
/// Uses `CREATE DATABASE ... TEMPLATE ...` for a fast file-level copy.
/// The resulting database has the base table with N rows (non-partitioned, no indexes).
pub fn create_from_template(n: u64, pg: &PgConfig) -> Result<()> {
    if n == 0 {
        db::reset_database(pg)?;
        return Ok(());
    }

    let tpl_name = template_name(n);
    let mut maint_conn = db::connect_maintenance(pg)?;

    // Terminate connections to the benchmark database
    let _ = sql_query(&format!(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{}' AND pid <> pg_backend_pid()",
        pg.database
    ))
    .execute(&mut maint_conn);

    // Drop and recreate from template
    let _ = sql_query(&format!("DROP DATABASE IF EXISTS \"{}\"", pg.database))
        .execute(&mut maint_conn);

    sql_query(&format!(
        "CREATE DATABASE \"{}\" TEMPLATE \"{}\"",
        pg.database, tpl_name
    ))
    .execute(&mut maint_conn)
    .with_context(|| {
        format!(
            "Failed to create '{}' from template '{}'. Does the template exist?",
            pg.database, tpl_name
        )
    })?;

    Ok(())
}

/// Reset the changelog_cursor_seq sequence to match the restored data.
/// Must be called after creating from template so new inserts get correct cursor values.
pub fn reset_sequence_after_restore(conn: &mut PgConnection, n: u64) -> Result<()> {
    let next_val = n + 1;
    sql_query(&format!(
        "SELECT setval('changelog_cursor_seq', {}, true);",
        next_val
    ))
    .execute(conn)
    .context("Failed to reset sequence after restore")?;
    Ok(())
}

/// Ensure all required seed templates exist, generating any that are missing.
/// Seeds are generated in ascending order so smaller seeds are available as
/// bases for larger ones.
pub fn ensure_seeds(n_values: &[u64], pg: &PgConfig) -> Result<()> {
    let mut missing: Vec<u64> = Vec::new();
    for &n in n_values {
        if n > 0 && !template_exists(pg, n)? {
            missing.push(n);
        }
    }

    if missing.is_empty() {
        eprintln!("All seed templates already exist.");
        return Ok(());
    }

    // Sort ascending so smaller seeds are built first and can be reused
    missing.sort_unstable();

    eprintln!(
        "Generating {} seed template(s): {:?}",
        missing.len(),
        missing
            .iter()
            .map(|n| crate::plot::format_n(*n))
            .collect::<Vec<_>>()
    );

    for n in missing {
        eprintln!("\n--- Seeding N={} ---", crate::plot::format_n(n));
        generate_seed(n, n_values, pg)?;
    }

    Ok(())
}

/// Drop a seed template (for --reseed).
pub fn drop_template(n: u64, pg: &PgConfig) -> Result<()> {
    let tpl_name = template_name(n);
    let mut maint_conn = db::connect_maintenance(pg)?;

    // Unmark as template first
    let _ = sql_query(&format!(
        "ALTER DATABASE \"{}\" IS_TEMPLATE false",
        tpl_name
    ))
    .execute(&mut maint_conn);
    let _ = sql_query(&format!(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{}'",
        tpl_name
    ))
    .execute(&mut maint_conn);
    let _ = sql_query(&format!("DROP DATABASE IF EXISTS \"{}\"", tpl_name))
        .execute(&mut maint_conn);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_template_name() {
        assert_eq!(template_name(1_000_000), "changelog_bench_seed_1000000");
        assert_eq!(template_name(0), "changelog_bench_seed_0");
    }

    #[test]
    #[ignore] // Requires a running Postgres
    fn test_generate_and_create_from_template() {
        let pg = PgConfig::localhost("changelog_bench_test_tpl");

        let n = 1000;

        // Generate seed template
        generate_seed(n, &[n], &pg).unwrap();
        assert!(template_exists(&pg, n).unwrap());

        // Create benchmark DB from template
        create_from_template(n, &pg).unwrap();

        let mut conn = db::connect(&pg, Duration::from_secs(5)).unwrap();
        reset_sequence_after_restore(&mut conn, n).unwrap();

        // Verify row count
        #[derive(diesel::QueryableByName)]
        struct CountRow {
            #[diesel(sql_type = diesel::sql_types::BigInt)]
            cnt: i64,
        }
        let result: Vec<CountRow> =
            sql_query("SELECT count(*)::bigint AS cnt FROM changelog")
                .load(&mut conn)
                .unwrap();
        assert_eq!(result[0].cnt, n as i64);

        // Verify new inserts work
        sql_query(
            "INSERT INTO changelog (record_id, table_name, row_action) VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'invoice', 'UPSERT')",
        )
        .execute(&mut conn)
        .unwrap();

        let result: Vec<CountRow> =
            sql_query("SELECT count(*)::bigint AS cnt FROM changelog")
                .load(&mut conn)
                .unwrap();
        assert_eq!(result[0].cnt, n as i64 + 1);

        // Cleanup
        drop(conn);
        drop_template(n, &pg).unwrap();
        let mut maint = db::connect_maintenance(&pg).unwrap();
        let _ = sql_query(&format!("DROP DATABASE IF EXISTS \"{}\"", pg.database))
            .execute(&mut maint);
    }
}
