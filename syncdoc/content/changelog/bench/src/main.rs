mod chart;
mod config;
mod db;
mod types;

use anyhow::{Context, Result};
use clap::Parser;
use diesel::prelude::*;
use std::fs;
use std::time::Instant;

use config::Config;
use types::{MeasurementPoint, save_results, save_run_config, save_server_specs};

#[derive(Parser)]
#[command(name = "basic-bench")]
#[command(about = "Basic changelog insert-rate benchmark")]
struct Cli {
    /// Path to the basic-config.toml file.
    #[arg(short, long, default_value = "basic-config.toml")]
    config: String,

    /// Generate charts from existing results.json file(s). Multiple files are merged.
    #[arg(long, num_args = 1..)]
    generate_charts: Vec<String>,

    /// Output directory for generated charts. Defaults to the directory of the
    /// first --generate-charts file, or the config's output_dir during a bench run.
    #[arg(short, long)]
    output_dir: Option<String>,

    /// Use the fastest N% of batch rates for each measurement point (default 50).
    #[arg(long, default_value = "50")]
    top_pct: f64,

    /// Run single-insert mode: inserts rows one at a time instead of in batches.
    /// Same config, same scenarios, same results format — only the insert method differs.
    #[arg(long)]
    single_insert: bool,
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    // --generate-charts: merge file(s) and render charts, then exit.
    if !cli.generate_charts.is_empty() {
        let default_dir = std::path::Path::new(&cli.generate_charts[0])
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| ".".to_string());
        let output_dir = cli.output_dir.as_deref().unwrap_or(&default_dir);
        fs::create_dir_all(output_dir)
            .with_context(|| format!("failed to create {}", output_dir))?;
        eprintln!("Generating charts into: {}", output_dir);
        chart::generate_charts_from_files(&cli.generate_charts, output_dir, cli.top_pct)?;
        eprintln!("Done!");
        return Ok(());
    }

    let config = Config::load(&cli.config)?;
    let output_dir = cli.output_dir.as_deref().unwrap_or(&config.output_dir);
    fs::create_dir_all(output_dir)
        .with_context(|| format!("failed to create {}", output_dir))?;

    let mode_label = if cli.single_insert { "single-insert" } else { "batch" };
    let results_suffix = if cli.single_insert { Some("single") } else { None };
    let mut results: Vec<MeasurementPoint> = Vec::new();

    save_run_config(
        output_dir,
        &config,
        &serde_json::json!({
            "config_file": cli.config,
            "single_insert": cli.single_insert,
            "top_pct": cli.top_pct,
            "output_dir": output_dir,
        }),
    )?;

    for scenario in &config.scenarios {
        eprintln!("\n=== Scenario ({}): {} ===", mode_label, scenario.name);
        let profile = config.resolved_profile(scenario);
        eprintln!(
            "  null profile: store={:.2} transfer={:.2} patient={:.2}",
            profile.store_id, profile.transfer_store_id, profile.patient_id
        );
        if let Some(ps) = scenario.partition_size {
            eprintln!("  partition_size: {}", ps);
        }

        let scenario_start = Instant::now();

        eprintln!("  resetting database...");
        db::reset_database(&config.pg)?;
        let mut conn = db::connect(&config.pg)?;
        db::recreate_changelog(&mut conn, scenario.partition_size)?;

        for idx_sql in &scenario.indexes {
            eprintln!("  creating index: {}", idx_sql);
            diesel::sql_query(idx_sql)
                .execute(&mut conn)
                .with_context(|| format!("failed to create index: {}", idx_sql))?;
        }

        let mut rows_in_db: u64 = 0;
        while rows_in_db < config.bench_max_size {
            // Check max scenario time.
            if let Some(max_mins) = config.max_scenario_minutes {
                if scenario_start.elapsed().as_secs() >= max_mins * 60 {
                    eprintln!(
                        "  max scenario time ({}m) reached, stopping",
                        max_mins
                    );
                    break;
                }
            }

            // ── fill ─────────────────────────────────────────────────────────
            let fill_to = (rows_in_db + config.bench_interval).min(config.bench_max_size);
            if fill_to > rows_in_db {
                eprintln!(
                    "  fill: generate_series {}..{} ({} rows)",
                    rows_in_db + 1,
                    fill_to,
                    fill_to - rows_in_db
                );
                if let Some(ps) = scenario.partition_size {
                    db::ensure_partitions(&mut conn, fill_to, ps)?;
                }
                db::insert_series(&mut conn, rows_in_db + 1, fill_to, &profile)?;
                rows_in_db = fill_to;
            }

            if rows_in_db >= config.bench_max_size {
                break;
            }

            // X-axis value: rows in the DB at the end of the bench_interval fill.
            let x_value = rows_in_db;

            eprintln!(
                "  measure ({}): {} batches of {} rows at {} rows in DB",
                mode_label, config.bench_batch_repeat, config.bench_batch_size, x_value
            );

            // Ensure partitions cover the upcoming measurement inserts.
            if let Some(ps) = scenario.partition_size {
                let max_cursor =
                    rows_in_db + config.bench_batch_size * config.bench_batch_repeat as u64;
                db::ensure_partitions(&mut conn, max_cursor, ps)?;
            }

            let mut durations = Vec::with_capacity(config.bench_batch_repeat as usize);
            let mut rates = Vec::with_capacity(config.bench_batch_repeat as usize);

            for _ in 0..config.bench_batch_repeat {
                let from = rows_in_db + 1;
                let to = rows_in_db + config.bench_batch_size;

                if cli.single_insert {
                    // Single-insert: pre-generate SQL, then execute one at a time,
                    // timing the entire batch of sequential inserts.
                    let sqls = db::prepare_single_row_sqls(from, config.bench_batch_size, &profile);

                    let start = Instant::now();
                    for sql in &sqls {
                        db::execute_single_insert(&mut conn, sql)?;
                    }
                    let elapsed = start.elapsed();

                    durations.push(elapsed.as_micros() as u64);
                    rates.push(config.bench_batch_size as f64 / elapsed.as_secs_f64());
                } else {
                    // Batch: one generate_series statement for all rows.
                    let start = Instant::now();
                    db::insert_series(&mut conn, from, to, &profile)?;
                    let elapsed = start.elapsed();

                    durations.push(elapsed.as_micros() as u64);
                    rates.push(config.bench_batch_size as f64 / elapsed.as_secs_f64());
                }

                rows_in_db = to;
            }

            let avg = rates.iter().sum::<f64>() / rates.len() as f64;
            let min = rates.iter().cloned().fold(f64::INFINITY, f64::min);
            let max = rates.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
            eprintln!(
                "    rate (rows/sec): avg={:.0} min={:.0} max={:.0}",
                avg, min, max
            );

            let scenario_label = if cli.single_insert {
                format!("{}_single", scenario.name)
            } else {
                scenario.name.clone()
            };

            results.push(MeasurementPoint {
                scenario: scenario_label,
                records_in_db: x_value,
                batch_durations_us: durations,
                batch_rows_per_sec: rates,
            });

            // Flush after every measurement so partial runs are not lost.
            save_results(output_dir, &results, results_suffix)?;
        }
    }

    eprintln!("\nGenerating charts...");
    chart::generate_charts(output_dir, &results, cli.top_pct, results_suffix)?;

    save_server_specs(output_dir)?;
    eprintln!("\nDone. Results in {}/", output_dir);
    Ok(())
}
