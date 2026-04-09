use anyhow::{bail, Context, Result};
use diesel::prelude::*;
use diesel::sql_query;
use std::fs;
use std::path::Path;
use std::process::Command;
use std::time::Duration;

use crate::bench;
use crate::docker;
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
/// Spins up a temporary container, creates a minimal table with ALL columns
/// (including v7), populates with N rows, dumps data-only via pg_dump,
/// and saves to `{seed_dir}/n_{N}.sql`.
pub fn generate_seed(
    n: u64,
    seed_dir: &str,
    port: u16,
    pg_image: &str,
) -> Result<()> {
    if n == 0 {
        return Ok(());
    }

    fs::create_dir_all(seed_dir).context("Failed to create seed directory")?;

    let container_name = format!("changelog-bench-seed-{}", n);

    // Use default PG config for seeding (doesn't need to be tuned)
    eprintln!("  Starting seed container for N={}...", n);
    let container = docker::start_container(
        &container_name,
        port,
        "pg-configs/default.txt",
        pg_image,
    )
    .context("Failed to start seed container")?;

    docker::wait_for_ready(&container_name, Duration::from_secs(60))
        .context("Seed container failed to become ready")?;

    let mut conn = docker::wait_for_connection(&container.connection_string(), Duration::from_secs(30))
        .context("Failed to connect to seed container")?;

    // Create a minimal schema: types + table, no indexes
    eprintln!("  Creating seed schema...");
    for stmt in schema::base_types_sql() {
        sql_query(&stmt).execute(&mut conn)?;
    }
    sql_query(&schema::base_table_sql()).execute(&mut conn)?;

    // Populate
    eprintln!("  Populating {} rows...", n);
    bench::prepopulate(&mut conn, n)?;

    // Dump data-only via pg_dump, streaming directly to file to avoid
    // holding the entire dump in memory (500M rows can be ~50GB).
    eprintln!("  Dumping data with pg_dump...");
    let output_path = dump_path(seed_dir, n);
    let output_file = fs::File::create(&output_path)
        .with_context(|| format!("Failed to create dump file {}", output_path))?;

    let mut child = Command::new("docker")
        .args([
            "exec",
            &container_name,
            "pg_dump",
            "-U",
            "postgres",
            "--data-only",
            "--no-owner",
            "--no-privileges",
            "bench",
        ])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .context("Failed to spawn pg_dump")?;

    let mut stdout = child.stdout.take().context("Failed to capture pg_dump stdout")?;
    let mut writer = std::io::BufWriter::new(output_file);
    let bytes_written = std::io::copy(&mut stdout, &mut writer)
        .context("Failed to stream pg_dump output to file")?;
    drop(writer);

    let output = child.wait_with_output().context("Failed to wait for pg_dump")?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Clean up partial dump file on failure
        let _ = fs::remove_file(&output_path);
        bail!("pg_dump failed: {}", stderr);
    }

    let size_mb = bytes_written as f64 / 1_048_576.0;
    eprintln!("  Dump saved to {} ({:.1} MB)", output_path, size_mb);

    drop(container);
    Ok(())
}

/// Restore a seed dump into an existing container.
///
/// The target container must already have the schema (table + partitions) created
/// but with NO data. This function pipes the dump into psql.
pub fn restore_seed(
    container_name: &str,
    seed_dir: &str,
    n: u64,
) -> Result<()> {
    if n == 0 {
        return Ok(());
    }

    let path = dump_path(seed_dir, n);
    if !Path::new(&path).exists() {
        bail!("Seed dump not found at {}. Run seed generation first.", path);
    }

    let dump_data = fs::read(&path)
        .with_context(|| format!("Failed to read dump file {}", path))?;

    eprintln!("  Restoring seed data from {}...", path);

    let mut child = Command::new("docker")
        .args([
            "exec",
            "-i",
            container_name,
            "psql",
            "-U",
            "postgres",
            "-d",
            "bench",
            "-q", // quiet
        ])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .context("Failed to spawn psql for restore")?;

    // Write dump to psql stdin
    use std::io::Write;
    if let Some(ref mut stdin) = child.stdin {
        stdin
            .write_all(&dump_data)
            .context("Failed to write dump data to psql stdin")?;
    }
    // Drop stdin to signal EOF
    drop(child.stdin.take());

    let output = child.wait_with_output().context("Failed to wait for psql")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // psql may emit warnings about sequences etc, only fail on actual errors
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
pub fn ensure_seeds(
    n_values: &[u64],
    seed_dir: &str,
    port: u16,
    pg_image: &str,
) -> Result<()> {
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
        missing.iter().map(|n| crate::plot::format_n(*n)).collect::<Vec<_>>()
    );

    for n in missing {
        eprintln!("\n--- Seeding N={} ---", crate::plot::format_n(n));
        generate_seed(n, seed_dir, port, pg_image)?;
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
    #[ignore] // Requires Docker
    fn test_generate_and_restore_seed() {
        let tmp_dir = std::env::temp_dir().join("changelog-bench-test-seed-e2e");
        let _ = fs::remove_dir_all(&tmp_dir);

        let n = 1000;
        let port = 15496;
        let seed_dir = tmp_dir.to_str().unwrap();

        // Generate seed
        generate_seed(n, seed_dir, port, "postgres:17").unwrap();
        assert!(dump_exists(seed_dir, n));

        // Verify dump file is non-empty
        let dump = fs::read_to_string(dump_path(seed_dir, n)).unwrap();
        assert!(dump.contains("COPY"), "Dump should contain COPY statements");

        // Now restore into a fresh container with a different schema
        let restore_name = "changelog-bench-test-restore";
        let restore_port = 15495;
        let container = docker::start_container(
            restore_name,
            restore_port,
            "pg-configs/default.txt",
            "postgres:17",
        )
        .unwrap();
        docker::wait_for_ready(restore_name, Duration::from_secs(30)).unwrap();

        let mut conn =
            diesel::PgConnection::establish(&container.connection_string()).unwrap();

        // Create schema (no indexes)
        for stmt in schema::base_types_sql() {
            sql_query(&stmt).execute(&mut conn).unwrap();
        }
        sql_query(&schema::base_table_sql()).execute(&mut conn).unwrap();

        // Restore
        restore_seed(restore_name, seed_dir, n).unwrap();
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
            "INSERT INTO changelog (table_name, record_id, row_action) VALUES ('invoice', 'test-new', 'UPSERT')"
        ).execute(&mut conn).unwrap();

        let result: Vec<CountRow> =
            sql_query("SELECT count(*)::bigint AS cnt FROM changelog")
                .load(&mut conn)
                .unwrap();
        assert_eq!(result[0].cnt, n as i64 + 1);

        drop(container);
        let _ = fs::remove_dir_all(&tmp_dir);
    }
}
