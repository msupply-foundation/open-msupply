use super::config::{build_show_report_config, ResolvedReportConfig};
use super::docker::{wait_for_server, Container};
use super::report::ReportTest;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;

const IMAGE_NAME: &str = "msupplyfoundation/omsupply";

#[derive(Debug)]
pub enum TestStatus {
    Pass,
    Fail,
    Skipped,
}

#[derive(Debug)]
pub struct ReportTestResult {
    pub code: String,
    pub status: TestStatus,
    pub message: String,
}

/// Everything needed to run a single report test in its own container.
pub struct ReportTestInput {
    pub report: Box<dyn ReportTest>,
    pub config: ResolvedReportConfig,
    pub image_tag: String,
    pub port: i32,
    pub standard_reports_dir: PathBuf,
    pub temp_dir: PathBuf,
    pub output_dir: PathBuf,
    pub skip_build: bool,
}

/// Run a full isolated test for a single report:
/// start container → build → upsert → show-report → validate → stop.
pub async fn run_isolated_report_test(input: ReportTestInput) -> ReportTestResult {
    let code = input.report.code().to_string();
    let container_name = format!("srt-{}", code);

    // Check skip from config
    if let Some(reason) = &input.config.skip {
        return ReportTestResult {
            code,
            status: TestStatus::Skipped,
            message: reason.clone(),
        };
    }

    log::info!("[{}] Starting container on port {}", code, input.port);

    // Prepare per-report database copy
    let db_dir = input.temp_dir.join(format!("db-{}", code));
    let _ = std::fs::create_dir_all(&db_dir);

    let db_source = if Path::new(&input.config.database).is_absolute() {
        PathBuf::from(&input.config.database)
    } else {
        input.temp_dir.join("..").join(&input.config.database)
    };

    let db_dest = db_dir.join("omsupply-database.sqlite");
    if let Err(e) = std::fs::copy(&db_source, &db_dest) {
        return ReportTestResult {
            code,
            status: TestStatus::Fail,
            message: format!("Failed to copy database {}: {}", db_source.display(), e),
        };
    }

    // Create and start container
    let mut container = Container::new(IMAGE_NAME, &input.image_tag);
    container
        .name(&container_name)
        .platform("linux/amd64")
        .add_port(input.port, 8000)
        .add_mount(&db_dir, "/database/")
        .add_mount(&input.standard_reports_dir, "/standard_reports/");

    container.stop(); // kill any leftover

    if let Err(e) = container.run_detached(&[], &[]).await {
        return ReportTestResult {
            code,
            status: TestStatus::Fail,
            message: format!("Failed to start container: {}", e),
        };
    }

    let base_url = format!("http://localhost:{}", input.port);
    if let Err(e) = wait_for_server(&base_url, 90).await {
        container.stop();
        return ReportTestResult {
            code,
            status: TestStatus::Fail,
            message: format!("Server not ready: {}", e),
        };
    }

    // Build just this one report inside the container
    let report_dir = format!("/standard_reports/{}", code);
    let generated_json = format!("/standard_reports/{}/generated/reports.json", code);

    if !input.skip_build {
        log::info!("[{}] Building report...", code);
        let status = Command::new("docker")
            .args([
                "exec",
                "-w",
                "/usr/src/omsupply/server",
                &container_name,
                "./remote_server_cli",
                "build-reports",
                "--path",
                &report_dir,
            ])
            .status();

        match status {
            Ok(s) if s.success() => {}
            Ok(s) => {
                container.stop();
                return ReportTestResult {
                    code,
                    status: TestStatus::Fail,
                    message: format!("build-reports failed: {}", s),
                };
            }
            Err(e) => {
                container.stop();
                return ReportTestResult {
                    code,
                    status: TestStatus::Fail,
                    message: format!("build-reports exec error: {}", e),
                };
            }
        }
    }

    // Upsert just this one report
    log::info!("[{}] Upserting report...", code);
    let upsert_status = Command::new("docker")
        .args([
            "exec",
            &container_name,
            "./remote_server_cli",
            "upsert-reports",
            "--path",
            &generated_json,
            "--overwrite",
        ])
        .status();

    match upsert_status {
        Ok(s) if s.success() => {}
        Ok(s) => {
            container.stop();
            return ReportTestResult {
                code,
                status: TestStatus::Fail,
                message: format!("upsert-reports failed: {}", s),
            };
        }
        Err(e) => {
            container.stop();
            return ReportTestResult {
                code,
                status: TestStatus::Fail,
                message: format!("upsert-reports exec error: {}", e),
            };
        }
    }

    // Build merged test-config.json from the report's own config + environment overrides
    let show_report_config = match build_show_report_config(
        &input.standard_reports_dir,
        &code,
        &input.config,
    ) {
        Ok(c) => c,
        Err(e) => {
            container.stop();
            return ReportTestResult {
                code,
                status: TestStatus::Fail,
                message: format!("Failed to build test config: {}", e),
            };
        }
    };

    // Write it into the container
    let config_dir = format!("/tmp/report-config-{}", code);
    let script = format!(
        "mkdir -p {} && echo '{}' > {}/test-config.json",
        config_dir, show_report_config, config_dir
    );

    let _ = Command::new("docker")
        .args(["exec", &container_name, "bash", "-c", &script])
        .status();

    // Run show-report
    log::info!("[{}] Running show-report...", code);
    let container_report_path = format!("/standard_reports/{}", input.report.path());
    let output = Command::new("docker")
        .args([
            "exec",
            &container_name,
            "./remote_server_cli",
            "show-report",
            "--path",
            &container_report_path,
            "--config",
            &config_dir,
        ])
        .output();

    let output = match output {
        Ok(o) => o,
        Err(e) => {
            container.stop();
            return ReportTestResult {
                code,
                status: TestStatus::Fail,
                message: format!("docker exec error: {}", e),
            };
        }
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        container.stop();
        return ReportTestResult {
            code,
            status: TestStatus::Fail,
            message: format!(
                "show-report failed: {}\nstdout: {}\nstderr: {}",
                output.status,
                stdout.chars().take(500).collect::<String>(),
                stderr.chars().take(500).collect::<String>(),
            ),
        };
    }

    // Copy HTML out
    let output_filename = format!("{}.html", code);
    let container_file = format!(
        "{}:/usr/src/omsupply/server/{}",
        container_name, output_filename
    );
    let local_file = input.output_dir.join(&output_filename);

    let cp_result = Command::new("docker")
        .args(["cp", &container_file, &local_file.to_string_lossy()])
        .status();

    // Stop container now — we have the file
    container.stop();

    match cp_result {
        Ok(s) if s.success() => {}
        Ok(s) => {
            return ReportTestResult {
                code,
                status: TestStatus::Fail,
                message: format!("docker cp failed: {}", s),
            };
        }
        Err(e) => {
            return ReportTestResult {
                code,
                status: TestStatus::Fail,
                message: format!("docker cp error: {}", e),
            };
        }
    }

    // Validate
    let html = match std::fs::read_to_string(&local_file) {
        Ok(c) => c,
        Err(e) => {
            return ReportTestResult {
                code,
                status: TestStatus::Fail,
                message: format!("Failed to read output: {}", e),
            };
        }
    };

    match input.report.validate(&html) {
        Ok(()) => {
            log::info!("[{}] PASS ({} bytes)", code, html.len());
            ReportTestResult {
                code,
                status: TestStatus::Pass,
                message: format!("{} bytes", html.len()),
            }
        }
        Err(msg) => {
            log::error!("[{}] FAIL: {}", code, msg);
            ReportTestResult {
                code,
                status: TestStatus::Fail,
                message: msg,
            }
        }
    }
}

/// Print a summary table of all test results.
pub fn print_summary(results: &[ReportTestResult]) {
    println!();
    println!("========================================================");
    println!("  Standard Reports Integration Test Summary");
    println!("========================================================");
    println!("  {:<25} {:<10} {}", "Report", "Status", "Details");
    println!("--------------------------------------------------------");

    let mut pass = 0;
    let mut fail = 0;
    let mut skip = 0;

    for result in results {
        let status_str = match result.status {
            TestStatus::Pass => {
                pass += 1;
                "PASS"
            }
            TestStatus::Fail => {
                fail += 1;
                "FAIL"
            }
            TestStatus::Skipped => {
                skip += 1;
                "SKIP"
            }
        };
        println!("  {:<25} {:<10} {}", result.code, status_str, result.message);
    }

    println!("--------------------------------------------------------");
    println!(
        "  Total: {} passed, {} failed, {} skipped",
        pass, fail, skip
    );
    println!("========================================================");
}

/// Write a structured markdown report for LLM consumption.
pub fn write_report_markdown(path: &str, image_tag: &str, results: &[ReportTestResult]) {
    let output_path = Path::new(path);
    if let Some(parent) = output_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let mut f = match std::fs::File::create(output_path) {
        Ok(f) => f,
        Err(e) => {
            log::error!("Failed to write report to {}: {}", path, e);
            return;
        }
    };

    let pass = results
        .iter()
        .filter(|r| matches!(r.status, TestStatus::Pass))
        .count();
    let fail = results
        .iter()
        .filter(|r| matches!(r.status, TestStatus::Fail))
        .count();
    let skip = results
        .iter()
        .filter(|r| matches!(r.status, TestStatus::Skipped))
        .count();

    let _ = writeln!(f, "# Standard Reports Integration Test Report");
    let _ = writeln!(f);
    let _ = writeln!(
        f,
        "- **Image**: `msupplyfoundation/omsupply:{}`",
        image_tag
    );
    let _ = writeln!(
        f,
        "- **Result**: {} passed, {} failed, {} skipped",
        pass, fail, skip
    );
    let _ = writeln!(f);

    let _ = writeln!(f, "## Results");
    let _ = writeln!(f);
    let _ = writeln!(f, "| Report | Status | Details |");
    let _ = writeln!(f, "|--------|--------|---------|");
    for result in results {
        let status = match result.status {
            TestStatus::Pass => "PASS",
            TestStatus::Fail => "FAIL",
            TestStatus::Skipped => "SKIP",
        };
        let message = result.message.replace('|', "\\|").replace('\n', " ");
        let _ = writeln!(f, "| `{}` | {} | {} |", result.code, status, message);
    }

    let failures: Vec<_> = results
        .iter()
        .filter(|r| matches!(r.status, TestStatus::Fail))
        .collect();
    if !failures.is_empty() {
        let _ = writeln!(f);
        let _ = writeln!(f, "## Failures");

        for result in &failures {
            let _ = writeln!(f);
            let _ = writeln!(f, "### `{}`", result.code);
            let _ = writeln!(f);
            let _ = writeln!(
                f,
                "- **Source**: `standard_reports/{}/latest/`",
                result.code
            );
            let _ = writeln!(
                f,
                "- **Manifest**: `standard_reports/{}/latest/report-manifest.json`",
                result.code
            );
            let _ = writeln!(
                f,
                "- **Template**: `standard_reports/{}/latest/src/template.html`",
                result.code
            );
            let _ = writeln!(f);
            let _ = writeln!(f, "```");
            let _ = writeln!(f, "{}", result.message);
            let _ = writeln!(f, "```");
        }
    }

    log::info!("Test report written to {}", path);
}
