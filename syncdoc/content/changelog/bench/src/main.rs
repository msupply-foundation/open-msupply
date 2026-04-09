mod bench;
mod config;
mod docker;
mod plot;
mod schema;
mod seed;

use anyhow::{Context, Result};
use clap::Parser;
use diesel::prelude::*;
use diesel::sql_query;
use std::time::Duration;

use bench::BenchResult;
use config::Config;

#[derive(Parser)]
#[command(name = "changelog-bench")]
#[command(about = "Benchmark changelog insert performance under different indexing/partitioning strategies")]
struct Cli {
    /// Path to config.toml
    #[arg(short, long, default_value = "config.toml")]
    config: String,

    /// Run only this phase (1, 2, or 3)
    #[arg(short, long)]
    phase: Option<u8>,

    /// Override: only run these scenarios (comma-separated names)
    #[arg(short, long)]
    scenarios: Option<String>,

    /// Override: only test these N values (comma-separated)
    #[arg(short, long)]
    n_values: Option<String>,

    /// Skip graph generation
    #[arg(long)]
    no_graphs: bool,

    /// Only generate seeds, don't run benchmarks
    #[arg(long)]
    seed_only: bool,

    /// Force regeneration of seed dumps even if they exist
    #[arg(long)]
    reseed: bool,
}

fn main() -> Result<()> {
    docker::install_signal_handler();

    let cli = Cli::parse();

    let mut config = Config::load(&cli.config)?;

    // Apply CLI overrides
    if let Some(phase) = cli.phase {
        config.filter_phase(phase);
    }
    if let Some(ref scenarios) = cli.scenarios {
        let names: Vec<String> = scenarios.split(',').map(|s| s.trim().to_string()).collect();
        config.filter_scenarios(&names);
    }
    if let Some(ref n_values) = cli.n_values {
        let values: Vec<u64> = n_values
            .split(',')
            .map(|s| s.trim().parse::<u64>())
            .collect::<std::result::Result<Vec<_>, _>>()
            .context("Failed to parse n_values")?;
        config.filter_n_values(&values);
    }

    if config.scenarios.is_empty() && !cli.seed_only {
        eprintln!("No scenarios to run after applying filters.");
        return Ok(());
    }

    // ── Step 1: Ensure seed dumps exist for all required N values ──
    if cli.reseed {
        eprintln!("\n{}", "=".repeat(60));
        eprintln!("=== Reseed: removing existing dumps ===");
        eprintln!("{}", "=".repeat(60));
        for n in &config.n_values {
            let path = seed::dump_path(&config.seed_dir, *n);
            if std::path::Path::new(&path).exists() {
                eprintln!("  Removing existing dump: {}", path);
                std::fs::remove_file(&path)?;
            }
        }
    }

    seed::ensure_seeds(
        &config.n_values,
        &config.seed_dir,
        config.port,
        &config.pg_image,
    )?;

    if cli.seed_only {
        eprintln!("\nSeed generation complete. Exiting (--seed-only).");
        return Ok(());
    }

    // ── Step 2: Run benchmarks using seed dumps ──
    // Timestamp for this run, appended to phase directory names
    let timestamp = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
    eprintln!("Results will be saved to: {}/", config.output_dir);

    eprintln!(
        "\nRunning {} scenarios across {} N values",
        config.scenarios.len(),
        config.n_values.len()
    );

    let mut all_results: Vec<BenchResult> = Vec::new();

    for phase in config.phases() {
        let phase_scenarios = config.scenarios_for_phase(phase);
        if phase_scenarios.is_empty() {
            continue;
        }

        eprintln!("\n{}", "=".repeat(60));
        eprintln!(
            "=== Phase {} ({} scenarios) ===",
            phase,
            phase_scenarios.len()
        );
        eprintln!("{}", "=".repeat(60));

        for scenario in &phase_scenarios {
            for n in &config.n_values {
                let container_name = format!("changelog-bench-{}-{}", scenario.name, n);
                eprintln!(
                    "\n--- Scenario: {} | N: {} ---",
                    scenario.name,
                    plot::format_n(*n)
                );

                // Start container with scenario-specific PG config
                eprintln!("  Starting Postgres container...");
                let container = docker::start_container(
                    &container_name,
                    config.port,
                    &scenario.pg_config_file,
                    &config.pg_image,
                )
                .with_context(|| {
                    format!("Failed to start container for {}", scenario.name)
                })?;

                docker::wait_for_ready(&container_name, Duration::from_secs(60))
                    .context("Postgres failed to become ready")?;

                // Connect (retry until host port mapping is ready)
                let mut conn =
                    docker::wait_for_connection(&container.connection_string(), Duration::from_secs(30))
                        .context("Failed to connect to Postgres")?;

                // Create table structure (types, table, partitions, v7 columns — NO indexes)
                eprintln!("  Setting up schema structure...");
                let stmts = schema::structure_sql(scenario, *n, config.batch_size as u64);
                for stmt in &stmts {
                    sql_query(stmt)
                        .execute(&mut conn)
                        .with_context(|| {
                            format!("Failed SQL: {}", &stmt[..stmt.len().min(100)])
                        })?;
                }

                // Restore seed data
                if *n > 0 {
                    eprintln!("  Restoring seed data for N={}...", plot::format_n(*n));
                    seed::restore_seed(&container_name, &config.seed_dir, *n)?;
                    seed::reset_sequence_after_restore(&mut conn, *n)?;
                }

                // Now create indexes (after data is loaded — faster than indexing during inserts)
                eprintln!("  Creating indexes...");
                let index_stmts = schema::index_sql(scenario.indexes);
                for stmt in &index_stmts {
                    sql_query(stmt)
                        .execute(&mut conn)
                        .with_context(|| {
                            format!("Failed index SQL: {}", &stmt[..stmt.len().min(100)])
                        })?;
                }

                // Ensure extra partitions exist for measurement batch (range partitions)
                if let Some(config::PartitionConfig::Range { key: _, size }) =
                    &scenario.partition
                {
                    let extra_partitions = schema::partition_ddl(
                        scenario.partition.as_ref().unwrap(),
                        *n,
                        config.batch_size as u64 + *size,
                    );
                    for stmt in &extra_partitions {
                        let _ = sql_query(stmt).execute(&mut conn);
                    }
                }

                // ANALYZE after data load + index creation
                eprintln!("  Running ANALYZE...");
                sql_query("ANALYZE changelog;").execute(&mut conn)?;

                // Measure
                eprintln!("  Measuring {} inserts...", config.batch_size);
                let mut latencies =
                    bench::measure_inserts(&mut conn, config.batch_size, scenario)?;

                let stats = bench::compute_stats(&mut latencies);
                eprintln!(
                    "  Results: p50={}us p95={}us p99={}us max={}us",
                    stats.p50_us, stats.p95_us, stats.p99_us, stats.max_us
                );

                all_results.push(BenchResult {
                    scenario_name: scenario.name.clone(),
                    phase: scenario.phase,
                    n: *n,
                    batch_size: config.batch_size,
                    stats,
                });

                // Container dropped here via Drop impl
                drop(container);
                eprintln!("  Container cleaned up.");
            }
        }

        // Print phase summary
        plot::print_phase_table(&all_results, phase);

        // Save results and generate phase graphs
        eprintln!("\nSaving Phase {} results and generating graphs...", phase);
        plot::generate_phase_charts(&all_results, phase, &config.output_dir, &timestamp, cli.no_graphs)?;
    }

    eprintln!("\nDone!");
    Ok(())
}
