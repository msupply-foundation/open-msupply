use log::{info, warn};
use std::net::TcpListener;
use tokio::process::Command;
use tokio::time::{sleep, Duration};

/// Find a free port by binding to port 0
fn find_free_port() -> Result<u16, String> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Failed to bind to find free port: {e}"))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to get local addr: {e}"))?
        .port();
    Ok(port)
}

/// Shared via app data — just holds the port for proxy routing
pub struct DevServer {
    pub port: u16,
}

/// Owns the child process — when dropped, SIGTERMs the whole process group so yarn,
/// webpack, and any node descendants all die together. The child is started in its own
/// process group via `setpgid` (see `spawn`) so one signal reaps the whole tree.
///
/// We deliberately don't use tokio's `kill_on_drop`: it would SIGKILL only the direct
/// yarn child and orphan webpack/node.
///
/// `std::process::exit` bypasses `Drop`, so callers exiting hard must `drop(...)` this
/// explicitly first.
pub struct DevServerProcess {
    child: tokio::process::Child,
}

impl Drop for DevServerProcess {
    fn drop(&mut self) {
        info!("Shutting down webpack-dev-server");
        if let Some(pid) = self.child.id() {
            unsafe {
                libc::kill(-(pid as i32), libc::SIGTERM);
            }
        }
    }
}

/// Spawn webpack-dev-server, return both the app-data handle and the process handle.
pub async fn spawn(backend_port: u16) -> Result<(DevServer, DevServerProcess), String> {
    let webpack_port = find_free_port()?;
    // Anchor to crate manifest, not CWD, so `cargo run` works from any directory
    let client_host_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../client/packages/host");

    if !client_host_dir.exists() {
        return Err(format!(
            "Client host directory not found at {}",
            client_host_dir.display()
        ));
    }

    let api_host = format!("http://localhost:{backend_port}");

    info!(
        "Starting webpack-dev-server on port {} (API_HOST={})",
        webpack_port, api_host
    );

    let child = unsafe {
        Command::new("yarn")
            .args([
                "webpack-cli",
                "serve",
                "--port",
                &webpack_port.to_string(),
                "--env",
                &format!("API_HOST={api_host}"),
                "--no-open",
            ])
            .current_dir(&client_host_dir)
            .stdout(std::process::Stdio::inherit())
            .stderr(std::process::Stdio::inherit())
            // Start in new process group so we can SIGTERM the whole tree on Drop
            .pre_exec(|| {
                libc::setpgid(0, 0);
                Ok(())
            })
            .spawn()
            .map_err(|e| format!("Failed to spawn webpack-dev-server: {e}"))?
    };

    // Wait for webpack-dev-server to be ready
    let ready = wait_for_server(webpack_port, Duration::from_secs(120)).await;
    if !ready {
        warn!(
            "Webpack-dev-server did not become ready within timeout, proxying may fail initially"
        );
    } else {
        info!("Webpack-dev-server ready on port {webpack_port}");
        // Open browser to backend port (not webpack port)
        let backend_url = format!("http://localhost:{backend_port}");
        if let Err(e) = open::that(&backend_url) {
            warn!("Failed to open browser: {e}");
        }
    }

    Ok((DevServer { port: webpack_port }, DevServerProcess { child }))
}

async fn wait_for_server(port: u16, timeout: Duration) -> bool {
    let start = tokio::time::Instant::now();
    let client = awc::Client::new();
    let url = format!("http://127.0.0.1:{port}/");

    loop {
        if start.elapsed() > timeout {
            return false;
        }

        match client.get(&url).send().await {
            Ok(_) => return true,
            Err(_) => sleep(Duration::from_millis(500)).await,
        }
    }
}
