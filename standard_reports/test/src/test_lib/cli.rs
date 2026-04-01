use anyhow::Result;
use std::process::{Command, Stdio};

/// Build standard reports inside the Docker container.
/// The container has Node.js + yarn (dev image) and standard_reports/ is mounted.
pub fn build_reports_in_container(container_name: &str) -> Result<()> {
    log::info!("Building standard reports in container...");

    let status = Command::new("docker")
        .args([
            "exec",
            "-w",
            "/usr/src/omsupply/server",
            container_name,
            "./remote_server_cli",
            "build-reports",
            "--path",
            "/standard_reports",
        ])
        .status()?;

    if !status.success() {
        anyhow::bail!("build-reports failed inside container");
    }

    log::info!("Standard reports built successfully");
    Ok(())
}

/// Upsert reports into the running Docker container.
pub fn upsert_reports_in_container(container_name: &str) -> Result<()> {
    log::info!("Upserting reports into container...");

    let status = Command::new("docker")
        .args([
            "exec",
            container_name,
            "./remote_server_cli",
            "upsert-reports",
            "--path",
            "/standard_reports/generated/standard_reports.json",
            "--overwrite",
        ])
        .status()?;

    if !status.success() {
        anyhow::bail!("upsert-reports failed inside container");
    }

    log::info!("Reports upserted successfully");
    Ok(())
}

/// Check if the container's CLI supports the `test-report` command.
pub fn has_test_report_command(container_name: &str) -> bool {
    let output = Command::new("docker")
        .args([
            "exec",
            container_name,
            "./remote_server_cli",
            "test-report",
            "--help",
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();

    matches!(output, Ok(s) if s.success())
}
