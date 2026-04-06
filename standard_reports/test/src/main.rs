mod test_lib;

use clap::Parser;
use test_lib::*;

#[derive(Parser)]
#[command(name = "standard-reports-test")]
#[command(about = "Integration tests for standard reports")]
struct Cli {
    /// Docker image tag — overrides config.toml
    #[arg(long, env = "IMAGE_TAG")]
    image_tag: Option<String>,

    /// Starting host port — each report gets port_start + N
    #[arg(long)]
    port_start: Option<i32>,

    /// Path to seed database — overrides config.toml
    #[arg(long)]
    database: Option<String>,

    /// Skip the build-reports step
    #[arg(long)]
    skip_build: Option<bool>,

    /// Only run these reports (comma-separated codes)
    #[arg(long, value_delimiter = ',')]
    only: Option<Vec<String>>,

    /// Skip these reports (comma-separated codes)
    #[arg(long, value_delimiter = ',')]
    skip: Option<Vec<String>>,

    /// Path to config file
    #[arg(long, default_value = "config.toml")]
    config: String,

    /// Write a markdown test report to this file — overrides config.toml
    #[arg(long)]
    output: Option<String>,

    /// Max parallel containers [default: 8, use 1 for CI]
    #[arg(long, env = "WORKERS")]
    workers: Option<usize>,
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

    // Load config, with CLI flags taking precedence
    let mut config = load_config(std::path::Path::new(&cli.config))?;

    if let Some(tag) = &cli.image_tag {
        config.defaults.image_tag = Some(tag.clone());
    }
    if let Some(port) = cli.port_start {
        config.defaults.port_start = port;
    }
    if let Some(db) = &cli.database {
        config.defaults.database = Some(db.clone());
    }
    if let Some(skip) = cli.skip_build {
        config.defaults.skip_build = skip;
    }
    if let Some(workers) = cli.workers {
        config.defaults.workers = workers;
    }

    let image_tag = config
        .defaults
        .image_tag
        .clone()
        .expect("image_tag must be set via --image-tag, IMAGE_TAG env, or config.toml");
    let output_path = cli
        .output
        .unwrap_or_else(|| config.defaults.output.clone());
    let workers = config.defaults.workers;

    // Temp dirs
    let temp_dir = current_dir.join("temp");
    let output_dir = temp_dir.join("output");
    std::fs::create_dir_all(&temp_dir)?;
    std::fs::create_dir_all(&output_dir)?;

    // Get all registered reports and apply CLI filters
    let reports = all_reports();
    log::info!("Registered {} reports", reports.len());

    // Semaphore to limit number of parallel tasks (containers)
    let semaphore = std::sync::Arc::new(tokio::sync::Semaphore::new(workers));
    let mut tasks = Vec::new();
    let mut skipped: Vec<ReportTestResult> = Vec::new();
    let mut port = config.defaults.port_start;

    for report in reports {
        let code = report.code().to_string();

        // --only filter
        if let Some(ref only) = cli.only {
            if !only.contains(&code) {
                continue;
            }
        }

        // --skip filter
        if let Some(ref skip_list) = cli.skip {
            if skip_list.contains(&code) {
                skipped.push(ReportTestResult {
                    code,
                    status: TestStatus::Skipped,
                    message: "skipped via --skip".to_string(),
                });
                continue;
            }
        }

        let resolved = config.resolve_for_report(&code);

        // Resolve database path
        let db_path = if std::path::Path::new(&resolved.database).is_absolute() {
            std::path::PathBuf::from(&resolved.database)
        } else {
            current_dir.join(&resolved.database)
        };

        if !db_path.exists() {
            skipped.push(ReportTestResult {
                code,
                status: TestStatus::Fail,
                message: format!("Database not found: {}", db_path.display()),
            });
            continue;
        }

        let input = ReportTestInput {
            report,
            config: resolved,
            image_tag: image_tag.clone(),
            port,
            standard_reports_dir: standard_reports_dir.clone(),
            temp_dir: temp_dir.clone(),
            output_dir: output_dir.clone(),
            skip_build: config.defaults.skip_build,
        };

        let permit = semaphore.clone();
        tasks.push(tokio::spawn(async move {
            let _permit = permit.acquire().await.unwrap();
            run_isolated_report_test(input).await
        }));
        port += 1;
    }

    // Wait for all parallel tasks
    let mut results = skipped;
    for handle in tasks {
        results.push(handle.await?);
    }

    // Sort results by code for consistent output
    results.sort_by(|a, b| a.code.cmp(&b.code));

    // Summary
    print_summary(&results);
    write_report_markdown(&output_path, &image_tag, &results);

    let failures = results
        .iter()
        .filter(|r| matches!(r.status, TestStatus::Fail))
        .count();
    if failures > 0 {
        anyhow::bail!("{} report(s) failed", failures);
    }

    Ok(())
}
