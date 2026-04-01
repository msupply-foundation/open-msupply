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

    let db_source = current_dir.join("omsupply-database.sqlite");
    let db_dest = temp_db_dir.join("omsupply-database.sqlite");
    if db_source.exists() {
        std::fs::copy(&db_source, &db_dest)?;
        log::info!("Copied seed database to {}", db_dest.display());
    } else {
        anyhow::bail!(
            "Seed database not found at {}. Copy a demo database here.",
            db_source.display()
        );
    }

    // Mount database and standard_reports into the container
    container.add_mount(&temp_db_dir, "/database/");
    container.add_mount(&standard_reports_dir, "/standard_reports/");

    // Start container (entry.sh starts the server automatically)
    container.run_detached(&[], &[]).await?;
    wait_for_server(&base_url, 60).await?;

    // Build reports locally
    if !cli.skip_build {
        build_reports_local(&standard_reports_dir)?;
    }

    // Upsert reports into the container
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

    // Run report tests sequentially
    // show-report internally runs `yarn install` per report — parallel runs corrupt the shared yarn cache
    let mut results = skipped;
    for report in &to_run {
        let result = run_report_test(CONTAINER_NAME, report.as_ref(), &config, &output_dir);
        results.push(result);
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
