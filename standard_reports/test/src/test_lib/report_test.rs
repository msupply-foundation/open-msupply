use super::config::TestConfig;
use super::report::ReportTest;
use std::io::Write;
use std::path::Path;
use std::process::Command;

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

/// Write a per-report test-config.json into a temp dir inside the container.
/// This sets output_filename to the report code so each report gets a unique file.
fn write_report_config(
    container_name: &str,
    report: &dyn ReportTest,
    base_config: &TestConfig,
) -> Result<String, String> {
    let config_dir = format!("/tmp/report-config-{}", report.code());
    let config = serde_json::json!({
        "data_id": "",
        "store_id": base_config.store_id,
        "url": "http://localhost:8000",
        "username": "admin",
        "password": "pass",
        "arguments": report.arguments().unwrap_or(base_config.arguments.clone()),
        "output_filename": report.code(),
    });

    // Create dir and write config inside the container
    let script = format!(
        "mkdir -p {} && echo '{}' > {}/test-config.json",
        config_dir,
        config,
        config_dir
    );

    let status = Command::new("docker")
        .args(["exec", container_name, "bash", "-c", &script])
        .status()
        .map_err(|e| format!("Failed to write config: {}", e))?;

    if !status.success() {
        return Err("Failed to write per-report test-config.json in container".into());
    }

    Ok(config_dir)
}

/// Run show-report inside the container for a single report,
/// copy the output file back, and validate it using the report's trait methods.
pub fn run_report_test(
    container_name: &str,
    report: &dyn ReportTest,
    base_config: &TestConfig,
    output_dir: &Path,
) -> ReportTestResult {
    let code = report.code().to_string();
    log::info!("Testing report: {}", code);

    // Write a per-report test-config.json into the container
    let config_dir = match write_report_config(container_name, report, base_config) {
        Ok(dir) => dir,
        Err(e) => {
            return ReportTestResult {
                code,
                status: TestStatus::Fail,
                message: e,
            };
        }
    };

    // Run show-report
    let container_report_path = format!("/standard_reports/{}", report.path());
    let output = Command::new("docker")
        .args([
            "exec",
            container_name,
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
            return ReportTestResult {
                code,
                status: TestStatus::Fail,
                message: format!("Failed to exec docker: {}", e),
            };
        }
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return ReportTestResult {
            code,
            status: TestStatus::Fail,
            message: format!(
                "show-report exited with {}\nstdout: {}\nstderr: {}",
                output.status,
                stdout.chars().take(500).collect::<String>(),
                stderr.chars().take(500).collect::<String>(),
            ),
        };
    }

    // show-report writes {output_filename}.html to its cwd (/usr/src/omsupply/server/)
    let output_filename = format!("{}.html", code);
    let container_file = format!(
        "{}:/usr/src/omsupply/server/{}",
        container_name, output_filename
    );
    let local_file = output_dir.join(&output_filename);

    let cp_result = Command::new("docker")
        .args(["cp", &container_file, &local_file.to_string_lossy()])
        .status();

    match cp_result {
        Ok(s) if s.success() => {}
        Ok(s) => {
            return ReportTestResult {
                code,
                status: TestStatus::Fail,
                message: format!("docker cp failed with {}", s),
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

    // Read the HTML and validate using the report's trait method
    let html = match std::fs::read_to_string(&local_file) {
        Ok(content) => content,
        Err(e) => {
            return ReportTestResult {
                code,
                status: TestStatus::Fail,
                message: format!("Failed to read output file: {}", e),
            };
        }
    };

    match report.validate(&html) {
        Ok(()) => {
            log::info!("  PASS {} ({} bytes)", code, html.len());
            ReportTestResult {
                code,
                status: TestStatus::Pass,
                message: format!("{} bytes", html.len()),
            }
        }
        Err(msg) => {
            log::error!("  FAIL {}: {}", code, msg);
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

    let pass = results.iter().filter(|r| matches!(r.status, TestStatus::Pass)).count();
    let fail = results.iter().filter(|r| matches!(r.status, TestStatus::Fail)).count();
    let skip = results.iter().filter(|r| matches!(r.status, TestStatus::Skipped)).count();

    let _ = writeln!(f, "# Standard Reports Integration Test Report");
    let _ = writeln!(f);
    let _ = writeln!(f, "- **Image**: `msupplyfoundation/omsupply:{}`", image_tag);
    let _ = writeln!(f, "- **Result**: {} passed, {} failed, {} skipped", pass, fail, skip);
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

    // Failures with full error output
    let failures: Vec<_> = results.iter().filter(|r| matches!(r.status, TestStatus::Fail)).collect();
    if !failures.is_empty() {
        let _ = writeln!(f);
        let _ = writeln!(f, "## Failures");

        for result in &failures {
            let _ = writeln!(f);
            let _ = writeln!(f, "### `{}`", result.code);
            let _ = writeln!(f);
            let _ = writeln!(f, "- **Source**: `standard_reports/{}/latest/`", result.code);
            let _ = writeln!(f, "- **Manifest**: `standard_reports/{}/latest/report-manifest.json`", result.code);
            let _ = writeln!(f, "- **Template**: `standard_reports/{}/latest/src/template.html`", result.code);
            let _ = writeln!(f);
            let _ = writeln!(f, "```");
            let _ = writeln!(f, "{}", result.message);
            let _ = writeln!(f, "```");
        }
    }

    log::info!("Test report written to {}", path);
}
