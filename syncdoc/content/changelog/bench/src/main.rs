mod bench;
mod config;
mod db;
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
        eprintln!("=== Reseed: dropping existing templates ===");
        eprintln!("{}", "=".repeat(60));
        for n in &config.n_values {
            eprintln!("  Dropping template for N={}...", plot::format_n(*n));
            seed::drop_template(*n, &config.pg)?;
        }
    }

    seed::ensure_seeds(&config.n_values, &config.pg)?;

    if cli.seed_only {
        eprintln!("\nSeed generation complete. Exiting (--seed-only).");
        return Ok(());
    }

    // ── Step 2: Run benchmarks using seed dumps ──
    let timestamp = chrono::Local::now()
        .format("%Y-%m-%d_%H-%M-%S")
        .to_string();
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

        if phase == 4 {
            // Phase 4: grouped loop — for each (N, null_profile), UPDATE once, then cycle index types
            // Group scenarios by null_profile
            let mut profile_names: Vec<String> = phase_scenarios
                .iter()
                .filter_map(|s| s.null_profile.clone())
                .collect();
            profile_names.sort();
            profile_names.dedup();

            for n in &config.n_values {
                for profile_name in &profile_names {
                    let profile = config
                        .null_profiles
                        .get(profile_name)
                        .expect("validated in config");

                    let profile_scenarios: Vec<_> = phase_scenarios
                        .iter()
                        .filter(|s| s.null_profile.as_deref() == Some(profile_name))
                        .collect();

                    eprintln!(
                        "\n--- Phase 4 | N: {} | Profile: {} ---",
                        plot::format_n(*n),
                        profile_name,
                    );

                    // Fresh DB from template
                    eprintln!("  Creating database from seed template...");
                    seed::create_from_template(*n, &config.pg)?;

                    let mut conn = db::connect(&config.pg, Duration::from_secs(10))
                        .context("Failed to connect to Postgres")?;

                    if *n > 0 {
                        seed::reset_sequence_after_restore(&mut conn, *n)?;
                    }

                    // Redistribute nulls (skip if balanced = 50% which matches seed default)
                    let is_balanced = profile.store_id == 0.5
                        && profile.transfer_store_id == 0.5
                        && profile.patient_id == 0.5;
                    if !is_balanced {
                        eprintln!("  Redistributing NULL percentages...");
                        bench::redistribute_nulls(&mut conn, profile)?;
                    } else {
                        eprintln!("  Skipping redistribution (balanced matches seed default)");
                    }

                    let base_cursor = *n;

                    // Cycle index types within the same DB
                    for scenario in &profile_scenarios {
                        eprintln!("  --- Index: {} ---", scenario.name);

                        // Create indexes
                        eprintln!("    Creating indexes...");
                        let index_stmts = schema::index_sql(&scenario.indexes);
                        for stmt in &index_stmts {
                            sql_query(stmt).execute(&mut conn).with_context(|| {
                                format!("Failed index SQL: {}", &stmt[..stmt.len().min(100)])
                            })?;
                        }

                        // ANALYZE
                        eprintln!("    Running ANALYZE...");
                        sql_query("ANALYZE changelog;").execute(&mut conn)?;

                        // Measure
                        eprintln!("    Measuring {} inserts...", config.batch_size);
                        let mut latencies = bench::measure_inserts(
                            &mut conn,
                            config.batch_size,
                            scenario,
                            Some(profile),
                        )?;

                        let stats = bench::compute_stats(&mut latencies);
                        eprintln!(
                            "    Results: p50={}us p95={}us p99={}us max={}us",
                            stats.p50_us, stats.p95_us, stats.p99_us, stats.max_us
                        );

                        all_results.push(BenchResult {
                            scenario_name: scenario.name.clone(),
                            phase: scenario.phase,
                            n: *n,
                            batch_size: config.batch_size,
                            stats,
                            null_profile: Some(profile_name.clone()),
                        });

                        // Drop indexes and delete measurement rows for next index type
                        eprintln!("    Dropping indexes...");
                        for stmt in &index_stmts {
                            let idx_name = stmt
                                .split_whitespace()
                                .nth(2)
                                .unwrap_or("unknown");
                            let drop_sql = format!("DROP INDEX IF EXISTS {}", idx_name);
                            let _ = sql_query(&drop_sql).execute(&mut conn);
                        }

                        // Delete measurement rows and reset sequence
                        sql_query(&format!(
                            "DELETE FROM changelog WHERE cursor > {}",
                            base_cursor
                        ))
                        .execute(&mut conn)?;
                        sql_query(&format!(
                            "SELECT setval('changelog_cursor_seq', {}, true)",
                            base_cursor + 1
                        ))
                        .execute(&mut conn)?;
                    }
                }
            }
        } else {
            // Phases 1-3: one fresh DB per (scenario, N) pair
            for scenario in &phase_scenarios {
                for n in &config.n_values {
                    eprintln!(
                        "\n--- Scenario: {} | N: {} ---",
                        scenario.name,
                        plot::format_n(*n)
                    );

                    // Apply PG config overrides if specified
                    if let Some(ref pg_config_file) = scenario.pg_config_file {
                        eprintln!("  Applying PG config from {}...", pg_config_file);
                        let mut maint_conn = db::connect_maintenance(&config.pg)?;
                        db::apply_pg_config(&mut maint_conn, pg_config_file)?;
                    }

                    // Create benchmark DB from seed template (fast file-level copy)
                    eprintln!("  Creating database from seed template...");
                    seed::create_from_template(*n, &config.pg)?;

                    let mut conn = db::connect(&config.pg, Duration::from_secs(10))
                        .context("Failed to connect to Postgres")?;

                    if *n > 0 {
                        seed::reset_sequence_after_restore(&mut conn, *n)?;
                    }

                    // For partitioned scenarios: migrate data from base table into partitioned structure
                    if scenario.partition.is_some() {
                        eprintln!("  Migrating to partitioned table...");
                        schema::migrate_to_partitioned(
                            &mut conn,
                            scenario,
                            *n,
                            config.batch_size as u64,
                        )?;
                    }

                    // Create indexes after data load
                    eprintln!("  Creating indexes...");
                    let index_stmts = schema::index_sql(&scenario.indexes);
                    for stmt in &index_stmts {
                        sql_query(stmt).execute(&mut conn).with_context(|| {
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
                        bench::measure_inserts(&mut conn, config.batch_size, scenario, None)?;

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
                        null_profile: None,
                    });

                    // Reset PG config overrides if we applied any
                    if scenario.pg_config_file.is_some() {
                        eprintln!("  Resetting PG config...");
                        drop(conn);
                        let mut maint_conn = db::connect_maintenance(&config.pg)?;
                        db::reset_pg_config(&mut maint_conn)?;
                    }
                }
            }
        }

        // Print phase summary
        plot::print_phase_table(&all_results, phase);

        // Save results and generate phase graphs
        eprintln!("\nSaving Phase {} results and generating graphs...", phase);
        plot::generate_phase_charts(
            &all_results,
            phase,
            &config.output_dir,
            &timestamp,
            cli.no_graphs,
            &config.null_profiles,
        )?;
    }

    eprintln!("\nDone!");
    Ok(())
}
