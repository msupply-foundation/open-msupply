use anyhow::{bail, Context, Result};
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

const POSTGRES_PASSWORD: &str = "bench";
const POSTGRES_DB: &str = "bench";
const POSTGRES_USER: &str = "postgres";

/// Global tracker for the currently active container name.
/// The signal handler uses this to clean up on SIGTERM/SIGINT.
static ACTIVE_CONTAINER: std::sync::OnceLock<Arc<Mutex<Option<String>>>> = std::sync::OnceLock::new();

fn active_container() -> &'static Arc<Mutex<Option<String>>> {
    ACTIVE_CONTAINER.get_or_init(|| Arc::new(Mutex::new(None)))
}

/// Install a signal handler that cleans up the active container on Ctrl+C / SIGTERM.
/// Call once at startup.
pub fn install_signal_handler() {
    let container_ref = active_container().clone();
    ctrlc::set_handler(move || {
        let name = container_ref.lock().unwrap().take();
        if let Some(name) = name {
            eprintln!("\nSignal received, cleaning up container '{}'...", name);
            let _ = stop_and_remove(&name);
        }
        std::process::exit(1);
    })
    .expect("Failed to install signal handler");
}

pub struct Container {
    pub name: String,
    pub port: u16,
}

impl Container {
    pub fn connection_string(&self) -> String {
        format!(
            "postgres://{}:{}@localhost:{}/{}",
            POSTGRES_USER, POSTGRES_PASSWORD, self.port, POSTGRES_DB
        )
    }
}

impl Drop for Container {
    fn drop(&mut self) {
        // Clear from the global tracker
        if let Ok(mut guard) = active_container().lock() {
            *guard = None;
        }
        let _ = stop_and_remove(&self.name);
    }
}

/// Parse a pg config .txt file into key=value pairs.
/// Lines starting with # are comments, blank lines are ignored.
pub fn parse_pg_config(path: &str) -> Result<Vec<(String, String)>> {
    let content =
        std::fs::read_to_string(path).with_context(|| format!("Failed to read {}", path))?;

    let mut params = Vec::new();
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some((key, value)) = line.split_once('=') {
            params.push((key.trim().to_string(), value.trim().to_string()));
        }
    }
    Ok(params)
}

pub fn build_docker_run_args(
    name: &str,
    port: u16,
    pg_config_file: &str,
    pg_image: &str,
) -> Result<Vec<String>> {
    let pg_params = parse_pg_config(pg_config_file)?;

    let mut args = vec![
        "run".to_string(),
        "-d".to_string(),
        "--name".to_string(),
        name.to_string(),
        "-e".to_string(),
        format!("POSTGRES_PASSWORD={}", POSTGRES_PASSWORD),
        "-e".to_string(),
        format!("POSTGRES_DB={}", POSTGRES_DB),
        "-p".to_string(),
        format!("{}:5432", port),
        pg_image.to_string(),
    ];

    // Each setting becomes an individual -c key=value flag,
    // which overrides only that setting while keeping all Postgres defaults.
    for (key, value) in &pg_params {
        args.push("-c".to_string());
        args.push(format!("{}={}", key, value));
    }

    Ok(args)
}

pub fn start_container(
    name: &str,
    port: u16,
    pg_config_file: &str,
    pg_image: &str,
) -> Result<Container> {
    // Remove any stale container with the same name (e.g. from a previous crash)
    let _ = stop_and_remove(name);

    let args = build_docker_run_args(name, port, pg_config_file, pg_image)?;

    let output = Command::new("docker")
        .args(&args)
        .output()
        .context("Failed to execute docker run")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        bail!("docker run failed: {}", stderr);
    }

    // Register with the global tracker so signal handler can clean up
    if let Ok(mut guard) = active_container().lock() {
        *guard = Some(name.to_string());
    }

    Ok(Container {
        name: name.to_string(),
        port,
    })
}

pub fn wait_for_ready(name: &str, timeout: Duration) -> Result<()> {
    let start = Instant::now();
    loop {
        let output = Command::new("docker")
            .args(["exec", name, "pg_isready", "-U", POSTGRES_USER])
            .output()
            .context("Failed to execute pg_isready")?;

        if output.status.success() {
            return Ok(());
        }

        if start.elapsed() > timeout {
            bail!(
                "Postgres container '{}' did not become ready within {:?}",
                name,
                timeout
            );
        }

        thread::sleep(Duration::from_millis(500));
    }
}

/// Wait until we can actually establish a diesel PgConnection through the host port.
/// `pg_isready` via `docker exec` checks the container-internal socket, which can
/// succeed before the host port mapping is ready.
pub fn wait_for_connection(connection_string: &str, timeout: Duration) -> Result<PgConnection> {
    use diesel::Connection;

    let start = Instant::now();
    loop {
        match PgConnection::establish(connection_string) {
            Ok(conn) => return Ok(conn),
            Err(e) => {
                if start.elapsed() > timeout {
                    bail!(
                        "Could not connect to Postgres at '{}' within {:?}: {}",
                        connection_string,
                        timeout,
                        e
                    );
                }
                thread::sleep(Duration::from_millis(500));
            }
        }
    }
}

use diesel::PgConnection;

pub fn stop_and_remove(name: &str) -> Result<()> {
    let output = Command::new("docker")
        .args(["rm", "-f", name])
        .output()
        .context("Failed to execute docker rm")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Don't error if container doesn't exist
        if !stderr.contains("No such container") {
            bail!("docker rm failed: {}", stderr);
        }
    }

    Ok(())
}

#[allow(dead_code)]
pub fn is_container_running(name: &str) -> bool {
    Command::new("docker")
        .args(["inspect", "--format", "{{.State.Running}}", name])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "true")
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_pg_config() {
        let tmp_dir = std::env::temp_dir();
        let tmp_file = tmp_dir.join("test_pg_config.txt");
        std::fs::write(
            &tmp_file,
            "# Comment\nshared_buffers = 1GB\nwal_buffers = 64MB\n\n# Another comment\nsynchronous_commit = off\n",
        )
        .unwrap();

        let params = parse_pg_config(tmp_file.to_str().unwrap()).unwrap();
        assert_eq!(params.len(), 3);
        assert_eq!(params[0], ("shared_buffers".to_string(), "1GB".to_string()));
        assert_eq!(params[1], ("wal_buffers".to_string(), "64MB".to_string()));
        assert_eq!(
            params[2],
            ("synchronous_commit".to_string(), "off".to_string())
        );

        std::fs::remove_file(&tmp_file).unwrap();
    }

    #[test]
    fn test_docker_command_construction() {
        let tmp_dir = std::env::temp_dir();
        let tmp_file = tmp_dir.join("test_pg_config_docker_cmd.txt");
        std::fs::write(&tmp_file, "shared_buffers = 128MB\nwal_buffers = -1\n").unwrap();

        let args = build_docker_run_args(
            "test-container",
            15432,
            tmp_file.to_str().unwrap(),
            "postgres:17",
        )
        .unwrap();

        // Verify key arguments are present
        assert!(args.contains(&"run".to_string()));
        assert!(args.contains(&"-d".to_string()));
        assert!(args.contains(&"--name".to_string()));
        assert!(args.contains(&"test-container".to_string()));
        assert!(args.contains(&"15432:5432".to_string()));
        assert!(args.contains(&"postgres:17".to_string()));

        // Verify individual -c flags for each PG param (key=value, no spaces)
        let c_values: Vec<_> = args
            .windows(2)
            .filter(|w| w[0] == "-c")
            .map(|w| w[1].clone())
            .collect();
        assert!(c_values.iter().any(|v| v == "shared_buffers=128MB"), "args: {:?}", c_values);
        assert!(c_values.iter().any(|v| v == "wal_buffers=-1"), "args: {:?}", c_values);

        // Each param should be preceded by -c
        let c_count = args.iter().filter(|a| *a == "-c").count();
        assert_eq!(c_count, 2, "Should have 2 -c flags");

        // No volume mount or config_file override
        assert!(!args.iter().any(|a| a.contains("config_file")));
        assert!(!args.iter().any(|a| a == "-v"));

        // Verify env vars
        assert!(args.contains(&format!("POSTGRES_PASSWORD={}", POSTGRES_PASSWORD)));
        assert!(args.contains(&format!("POSTGRES_DB={}", POSTGRES_DB)));

        std::fs::remove_file(&tmp_file).unwrap();
    }

    #[test]
    fn test_connection_string() {
        let container = Container {
            name: "test".to_string(),
            port: 15432,
        };
        assert_eq!(
            container.connection_string(),
            "postgres://postgres:bench@localhost:15432/bench"
        );
    }

    #[test]
    #[ignore] // Requires Docker
    fn test_container_lifecycle() {
        use diesel::prelude::*;
        use diesel::sql_query;

        let name = "changelog-bench-test-lifecycle";
        let port = 15499;

        let container =
            start_container(name, port, "pg-configs/default.txt", "postgres:17").unwrap();
        wait_for_ready(name, Duration::from_secs(30)).unwrap();

        // Verify we can connect
        let mut conn =
            diesel::PgConnection::establish(&container.connection_string()).unwrap();

        // Verify database is empty (no user tables)
        let result: Vec<CountRow> = sql_query(
            "SELECT count(*)::bigint AS cnt FROM information_schema.tables WHERE table_schema = 'public'"
        )
        .load(&mut conn)
        .unwrap();
        assert_eq!(result[0].cnt, 0, "Fresh database should have no user tables");

        // Container drops here via Drop impl
        drop(container);

        // Verify container is gone
        assert!(!is_container_running(name));
    }
}

#[cfg(test)]
use diesel::sql_types::BigInt;

#[cfg(test)]
#[derive(diesel::QueryableByName)]
struct CountRow {
    #[diesel(sql_type = BigInt)]
    cnt: i64,
}
