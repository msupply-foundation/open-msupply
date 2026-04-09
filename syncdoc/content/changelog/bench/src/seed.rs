use anyhow::{bail, Context, Result};
use diesel::prelude::*;
use diesel::sql_query;
use std::fs;
use std::path::Path;
use std::process::Command;
use std::time::Duration;

use crate::bench;
use crate::config::PgConfig;
use crate::db;
use crate::schema;

/// Returns the path where a seed dump for N rows would be stored.
pub fn dump_path(seed_dir: &str, n: u64) -> String {
    format!("{}/n_{}.sql", seed_dir, n)
}

/// Check if a seed dump already exists for a given N.
pub fn dump_exists(seed_dir: &str, n: u64) -> bool {
    Path::new(&dump_path(seed_dir, n)).exists()
}

/// Generate a seed dump for N rows.
///
/// Connects to the configured Postgres, resets the database, populates N rows,
/// dumps data-only via pg_dump, and saves to `{seed_dir}/n_{N}.sql`.
pub fn generate_seed(n: u64, seed_dir: &str, pg: &PgConfig) -> Result<()> {
    if n == 0 {
        return Ok(());
    }

    fs::create_dir_all(seed_dir).context("Failed to create seed directory")?;

    // Reset the database for a clean seed
    eprintln!("  Resetting database for seed generation...");
    db::reset_database(pg)?;

    let mut conn = db::connect(pg, Duration::from_secs(10))
        .context("Failed to connect for seed generation")?;

    // Create a minimal schema: types + table, no indexes
    eprintln!("  Creating seed schema...");
    for stmt in schema::base_types_sql() {
        sql_query(&stmt).execute(&mut conn)?;
    }
    sql_query(&schema::base_table_sql()).execute(&mut conn)?;

    // Populate
    eprintln!("  Populating {} rows...", n);
    bench::prepopulate(&mut conn, n)?;

    // Dump data-only via pg_dump, streaming directly to file
    eprintln!("  Dumping data with pg_dump...");
    let output_path = dump_path(seed_dir, n);
    let output_file = fs::File::create(&output_path)
        .with_context(|| format!("Failed to create dump file {}", output_path))?;

    let mut child = Command::new("pg_dump")
        .args([
            "-h",
            &pg.host,
            "-p",
            &pg.port.to_string(),
            "-U",
            &pg.user,
            "--data-only",
            "--no-owner",
            "--no-privileges",
            &pg.database,
        ])
        .env("PGPASSWORD", &pg.password)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .context("Failed to spawn pg_dump. Is pg_dump installed and in PATH?")?;

    let mut stdout = child
        .stdout
        .take()
        .context("Failed to capture pg_dump stdout")?;
    let mut writer = std::io::BufWriter::new(output_file);
    let bytes_written =
        std::io::copy(&mut stdout, &mut writer).context("Failed to stream pg_dump output")?;
    drop(writer);

    let output = child
        .wait_with_output()
        .context("Failed to wait for pg_dump")?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let _ = fs::remove_file(&output_path);
        bail!("pg_dump failed: {}", stderr);
    }

    let size_mb = bytes_written as f64 / 1_048_576.0;
    eprintln!("  Dump saved to {} ({:.1} MB)", output_path, size_mb);

    Ok(())
}

/// Restore a seed dump into the benchmark database via psql.
///
/// The database must already have the schema (table + partitions) created
/// but with NO data.
pub fn restore_seed(seed_dir: &str, n: u64, pg: &PgConfig) -> Result<()> {
    if n == 0 {
        return Ok(());
    }

    let path = dump_path(seed_dir, n);
    if !Path::new(&path).exists() {
        bail!(
            "Seed dump not found at {}. Run seed generation first.",
            path
        );
    }

    let dump_data =
        fs::read(&path).with_context(|| format!("Failed to read dump file {}", path))?;

    eprintln!("  Restoring seed data from {}...", path);

    let mut child = Command::new("psql")
        .args([
            "-h",
            &pg.host,
            "-p",
            &pg.port.to_string(),
            "-U",
            &pg.user,
            "-d",
            &pg.database,
            "-q",
        ])
        .env("PGPASSWORD", &pg.password)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .context("Failed to spawn psql. Is psql installed and in PATH?")?;

    use std::io::Write;
    if let Some(ref mut stdin) = child.stdin {
        stdin
            .write_all(&dump_data)
            .context("Failed to write dump data to psql stdin")?;
    }
    drop(child.stdin.take());

    let output = child
        .wait_with_output()
        .context("Failed to wait for psql")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("ERROR") {
            bail!("psql restore failed: {}", stderr);
        }
    }

    Ok(())
}

/// Reset the changelog_cursor_seq sequence to match the restored data.
/// Must be called after restore so new inserts get correct cursor values.
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

/// Ensure all required seed dumps exist, generating any that are missing.
pub fn ensure_seeds(n_values: &[u64], seed_dir: &str, pg: &PgConfig) -> Result<()> {
    let missing: Vec<u64> = n_values
        .iter()
        .filter(|&&n| n > 0 && !dump_exists(seed_dir, n))
        .copied()
        .collect();

    if missing.is_empty() {
        eprintln!("All seed dumps already exist in {}/", seed_dir);
        return Ok(());
    }

    eprintln!(
        "Generating {} seed dump(s): {:?}",
        missing.len(),
        missing
            .iter()
            .map(|n| crate::plot::format_n(*n))
            .collect::<Vec<_>>()
    );

    for n in missing {
        eprintln!("\n--- Seeding N={} ---", crate::plot::format_n(n));
        generate_seed(n, seed_dir, pg)?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dump_path() {
        assert_eq!(dump_path("seeds", 1_000_000), "seeds/n_1000000.sql");
        assert_eq!(dump_path("my/dir", 0), "my/dir/n_0.sql");
    }

    #[test]
    fn test_dump_exists_false() {
        assert!(!dump_exists("/nonexistent/path", 999));
    }

    #[test]
    fn test_dump_exists_true() {
        let tmp_dir = std::env::temp_dir().join("changelog-bench-test-seed");
        let _ = fs::remove_dir_all(&tmp_dir);
        fs::create_dir_all(&tmp_dir).unwrap();

        let path = format!("{}/n_1000.sql", tmp_dir.display());
        fs::write(&path, "-- test dump").unwrap();

        assert!(dump_exists(tmp_dir.to_str().unwrap(), 1000));
        assert!(!dump_exists(tmp_dir.to_str().unwrap(), 2000));

        let _ = fs::remove_dir_all(&tmp_dir);
    }

    #[test]
    #[ignore] // Requires a running Postgres and pg_dump/psql in PATH
    fn test_generate_and_restore_seed() {
        let tmp_dir = std::env::temp_dir().join("changelog-bench-test-seed-e2e");
        let _ = fs::remove_dir_all(&tmp_dir);

        let pg = PgConfig {
            host: "localhost".to_string(),
            port: 5432,
            user: "postgres".to_string(),
            password: "bench".to_string(),
            database: "changelog_bench_test_seed".to_string(),
        };

        let n = 1000;
        let seed_dir = tmp_dir.to_str().unwrap();

        // Generate seed
        generate_seed(n, seed_dir, &pg).unwrap();
        assert!(dump_exists(seed_dir, n));

        // Verify dump file is non-empty
        let dump = fs::read_to_string(dump_path(seed_dir, n)).unwrap();
        assert!(dump.contains("COPY"), "Dump should contain COPY statements");

        // Reset and restore into a fresh database
        db::reset_database(&pg).unwrap();
        let mut conn = db::connect(&pg, Duration::from_secs(5)).unwrap();

        // Create schema (no indexes)
        for stmt in schema::base_types_sql() {
            sql_query(&stmt).execute(&mut conn).unwrap();
        }
        sql_query(&schema::base_table_sql())
            .execute(&mut conn)
            .unwrap();

        // Restore
        restore_seed(seed_dir, n, &pg).unwrap();
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

        // Verify new inserts work (sequence is correct)
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
        let maint_str = pg.maintenance_connection_string();
        let mut maint = PgConnection::establish(&maint_str).unwrap();
        let _ = sql_query(&format!(
            "DROP DATABASE IF EXISTS \"{}\"",
            pg.database
        ))
        .execute(&mut maint);
        let _ = fs::remove_dir_all(&tmp_dir);
    }
}
