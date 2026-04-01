mod test_lib;

use clap::Parser;
use test_lib::*;

const IMAGE_NAME: &str = "msupplyfoundation/omsupply";
const CONTAINER_NAME: &str = "standard-reports-test";

#[derive(Parser)]
#[command(name = "standard-reports-test")]
#[command(about = "Integration tests for standard reports")]
struct Cli {
    /// Docker image tag (e.g. v2.17.0)
    #[arg(long, env = "IMAGE_TAG")]
    image_tag: String,

    /// Host port to map to container port 8000
    #[arg(long, env = "HOST_PORT", default_value = "9000")]
    port: i32,

    /// Skip the build-reports step
    #[arg(long)]
    skip_build: bool,

    /// Only run these reports (comma-separated codes)
    #[arg(long, value_delimiter = ',')]
    only: Option<Vec<String>>,

    /// Skip these reports (comma-separated codes)
    #[arg(long, value_delimiter = ',')]
    skip: Option<Vec<String>>,

    /// Path to seed SQLite database file
    #[arg(long, default_value = "omsupply-database.sqlite")]
    database: String,

    /// Write a markdown test report to this file
    #[arg(long, default_value = "temp/test-report.md")]
    output: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    simple_logger::init_with_level(log::Level::Info).unwrap();
    log_panics::init();

    let cli = Cli::parse();

    let timeout = tokio::time::sleep(std::time::Duration::from_secs(600));

    tokio::select! {
        result = run_tests(cli) => {
            if let Err(e) = &result {
                log::error!("Test failed: {:#}", e);
            }
            result
        }
        _ = timeout => {
            panic!("Test timed out after 10 minutes");
        }
    }
}

async fn run_tests(cli: Cli) -> anyhow::Result<()> {
    let current_dir = std::env::current_dir()?;
    let standard_reports_dir = std::fs::canonicalize(current_dir.join("../"))?;
    let base_url = format!("http://localhost:{}", cli.port);

    // Set up container
    let mut container = Container::new(IMAGE_NAME, &cli.image_tag);
    container
        .name(CONTAINER_NAME)
        .platform("linux/amd64")
        .add_port(cli.port, 8000);

    // Stop any existing container with the same name
    container.stop();

    // Copy seed database to temp directory
    let temp_dir = current_dir.join("temp");
    let temp_db_dir = temp_dir.join("database");
    let output_dir = temp_dir.join("output");
    std::fs::create_dir_all(&temp_db_dir)?;
    std::fs::create_dir_all(&output_dir)?;

    let db_source = std::path::Path::new(&cli.database);
    let db_source = if db_source.is_absolute() {
        db_source.to_path_buf()
    } else {
        current_dir.join(db_source)
    };
    let db_dest = temp_db_dir.join("omsupply-database.sqlite");
    if db_source.exists() {
        std::fs::copy(&db_source, &db_dest)?;
        log::info!("Copied seed database from {}", db_source.display());
    } else {
        anyhow::bail!(
            "Seed database not found at {}",
            db_source.display()
        );
    }

    // Mount database and standard_reports into the container
    container.add_mount(&temp_db_dir, "/database/");
    container.add_mount(&standard_reports_dir, "/standard_reports/");

    // Start container (entry.sh starts the server automatically)
    container.run_detached(&[], &[]).await?;
    wait_for_server(&base_url, 60).await?;

    // Build and upsert reports inside the container
    if !cli.skip_build {
        build_reports_in_container(CONTAINER_NAME)?;
    }
    upsert_reports_in_container(CONTAINER_NAME)?;

    // Load config
    let config = load_test_config(&standard_reports_dir)?;
    log::info!("Loaded test-config.json (store_id: {})", config.store_id);

    // Get all registered reports and apply filters
    let reports = all_reports();
    log::info!("Registered {} reports", reports.len());

    // Partition into skipped and runnable
    let mut skipped: Vec<ReportTestResult> = Vec::new();
    let mut to_run: Vec<std::sync::Arc<dyn test_lib::report::ReportTest>> = Vec::new();

    for report in reports {
        let code = report.code().to_string();

        if let Some(ref only) = cli.only {
            if !only.contains(&code) {
                continue;
            }
        }

        if let Some(ref skip) = cli.skip {
            if skip.contains(&code) {
                skipped.push(ReportTestResult {
                    code,
                    status: TestStatus::Skipped,
                    message: "skipped via --skip".to_string(),
                });
                continue;
            }
        }

        if let Some(reason) = report.skip() {
            skipped.push(ReportTestResult {
                code,
                status: TestStatus::Skipped,
                message: reason.to_string(),
            });
            continue;
        }

        to_run.push(std::sync::Arc::from(report));
    }

    // Check if the container supports test-report (parallel-safe, no yarn)
    let use_test_report = has_test_report_command(CONTAINER_NAME);
    if use_test_report {
        log::info!("Container supports test-report — running in parallel");
    } else {
        log::info!("Container does not support test-report — falling back to show-report (sequential)");
    }

    let cli_command = if use_test_report {
        "test-report"
    } else {
        "show-report"
    };

    let mut results = skipped;

    if use_test_report {
        // Parallel execution — safe because test-report skips yarn
        let container_name = CONTAINER_NAME.to_string();
        let config = std::sync::Arc::new(config);
        let output_dir = std::sync::Arc::new(output_dir);
        let cli_command = cli_command.to_string();

        let handles: Vec<_> = to_run
            .into_iter()
            .map(|report| {
                let container_name = container_name.clone();
                let config = config.clone();
                let output_dir = output_dir.clone();
                let cli_command = cli_command.clone();
                tokio::task::spawn_blocking(move || {
                    run_report_test(
                        &container_name,
                        report.as_ref(),
                        &config,
                        &output_dir,
                        &cli_command,
                    )
                })
            })
            .collect();

        for handle in handles {
            results.push(handle.await?);
        }
    } else {
        // Sequential execution — show-report runs yarn install which corrupts under parallelism
        for report in &to_run {
            let result =
                run_report_test(CONTAINER_NAME, report.as_ref(), &config, &output_dir, cli_command);
            results.push(result);
        }
    }

    // Summary
    print_summary(&results);
    write_report_markdown(&cli.output, &cli.image_tag, &results);

    // Cleanup
    container.stop();

    let failures = results
        .iter()
        .filter(|r| matches!(r.status, TestStatus::Fail))
        .count();
    if failures > 0 {
        anyhow::bail!("{} report(s) failed", failures);
    }

    Ok(())
}
