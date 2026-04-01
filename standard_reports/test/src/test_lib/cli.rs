use anyhow::Result;
use std::path::Path;
use std::process::{Command, Stdio};

/// Build standard reports locally using the CLI.
pub fn build_reports_local(standard_reports_dir: &Path) -> Result<()> {
    log::info!("Building standard reports...");

    let server_dir = standard_reports_dir.join("../server");
    let cli_path = server_dir.join("target/debug/remote_server_cli");

    if cli_path.exists() {
        let status = Command::new(&cli_path)
            .arg("build-reports")
            .current_dir(&server_dir)
            .status()?;

        if !status.success() {
            anyhow::bail!("build-reports failed");
        }
    } else {
        log::info!("CLI binary not found at {}, building via cargo run...", cli_path.display());
        let status = Command::new("cargo")
            .args(["run", "--bin", "remote_server_cli", "--", "build-reports"])
            .current_dir(&server_dir)
            .status()?;

        if !status.success() {
            anyhow::bail!("cargo run build-reports failed");
        }
    }

    log::info!("Standard reports built successfully");
    Ok(())
}

/// Upsert reports into the running Docker container.
/// Since standard_reports/ is mounted at /standard_reports/ in the container,
/// the generated JSON is already accessible. We pass the path explicitly.
pub fn upsert_reports_in_container(container_name: &str) -> Result<()> {
    log::info!("Upserting reports into container...");

    // Upsert standard reports
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
        anyhow::bail!("upsert-reports (reports) failed inside container");
    }

    // Also upsert standard forms if generated file exists
    let forms_status = Command::new("docker")
        .args([
            "exec",
            container_name,
            "test",
            "-f",
            "/standard_reports/../standard_forms/generated/standard_forms.json",
        ])
        .status();

    if let Ok(s) = forms_status {
        if s.success() {
            let _ = Command::new("docker")
                .args([
                    "exec",
                    container_name,
                    "./remote_server_cli",
                    "upsert-reports",
                    "--path",
                    "/standard_reports/../standard_forms/generated/standard_forms.json",
                    "--overwrite",
                ])
                .status();
        }
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
