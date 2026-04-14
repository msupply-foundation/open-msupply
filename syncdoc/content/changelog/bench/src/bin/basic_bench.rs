//! Basic changelog insert-rate benchmark.
//!
//! A simpler companion to `main.rs`. For each scenario it:
//!   1. recreates the changelog table,
//!   2. creates the scenario's indexes,
//!   3. bulk-fills `bench_interval` rows via generate_series,
//!   4. measures `bench_batch_repeat` inserts of `bench_batch_size` rows each,
//! and repeats 3–4 until the table reaches `bench_max_size` rows.
//!
//! Results are flushed to `results.json` after every measurement, and a single
//! chart comparing scenarios is rendered at the end.

use anyhow::{bail, Context, Result};
use clap::Parser;
use diesel::prelude::*;
use diesel::sql_query;
use plotters::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::time::Instant;

// ── Inline constants ─────────────────────────────────────────────────────────

const TABLE_NAME_VALUES: &[&str] = &[
    "number", "location", "stock_line", "name", "name_store_join", "invoice",
    "invoice_line", "stocktake", "stocktake_line", "requisition",
    "requisition_line", "activity_log", "clinician", "clinician_store_join",
    "document", "barcode", "location_movement", "sensor", "temperature_breach",
    "temperature_log", "temperature_breach_config", "currency", "asset",
    "asset_log", "vaccination", "encounter", "item", "report", "preference",
];

const COLORS: &[RGBColor] = &[
    RGBColor(31, 119, 180),
    RGBColor(255, 127, 14),
    RGBColor(44, 160, 44),
    RGBColor(214, 39, 40),
    RGBColor(148, 103, 189),
    RGBColor(140, 86, 75),
    RGBColor(227, 119, 194),
    RGBColor(127, 127, 127),
];

const BASE_TYPE_SQL: &str = "CREATE TYPE row_action_type AS ENUM ('UPSERT', 'DELETE');";
const BASE_SEQ_SQL: &str = "CREATE SEQUENCE changelog_cursor_seq START WITH 1 INCREMENT BY 1;";
const BASE_TABLE_SQL: &str = "CREATE TABLE changelog (
    cursor BIGINT NOT NULL DEFAULT nextval('changelog_cursor_seq') PRIMARY KEY,
    record_id UUID NOT NULL,
    table_name TEXT NOT NULL,
    row_action row_action_type NOT NULL,
    source_site_id INTEGER,
    store_id UUID,
    transfer_store_id UUID,
    patient_id UUID
);";

// ── CLI ──────────────────────────────────────────────────────────────────────

#[derive(Parser)]
#[command(name = "basic-bench")]
#[command(about = "Basic changelog insert-rate benchmark")]
struct Cli {
    /// Path to the basic-config.toml file.
    #[arg(short, long, default_value = "basic-config.toml")]
    config: String,

    /// Generate charts from an existing results.json (skip benchmarks).
    #[arg(long)]
    generate_charts: Option<String>,

    /// Use the fastest N% of batch rates for each measurement point (default 50).
    /// E.g. --top-pct 50 averages the top half; --top-pct 100 averages all batches.
    #[arg(long, default_value = "50")]
    top_pct: f64,
}

// ── Config ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
struct Config {
    bench_interval: u64,
    bench_batch_size: u64,
    bench_batch_repeat: u32,
    bench_max_size: u64,
    output_dir: String,
    #[serde(default)]
    pg: PgConfig,
    #[serde(default)]
    null_profiles: HashMap<String, NullProfile>,
    scenarios: Vec<Scenario>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
struct PgConfig {
    host: String,
    port: u16,
    user: String,
    password: String,
    database: String,
}

impl Default for PgConfig {
    fn default() -> Self {
        Self {
            host: "localhost".to_string(),
            port: 5432,
            user: "postgres".to_string(),
            password: "postgres".to_string(),
            database: "changelog_bench_basic".to_string(),
        }
    }
}

impl PgConfig {
    fn connection_string(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}/{}",
            self.user,
            urlencoding::encode(&self.password),
            self.host,
            self.port,
            self.database
        )
    }

    fn maintenance_connection_string(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}/postgres",
            self.user,
            urlencoding::encode(&self.password),
            self.host,
            self.port,
        )
    }
}

#[derive(Debug, Clone, Deserialize)]
struct NullProfile {
    store_id: f64,
    transfer_store_id: f64,
    patient_id: f64,
}

impl Default for NullProfile {
    fn default() -> Self {
        Self {
            store_id: 0.5,
            transfer_store_id: 0.5,
            patient_id: 0.5,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
struct Scenario {
    name: String,
    #[serde(default)]
    indexes: Vec<String>,
    null_profile: Option<String>,
}

impl Config {
    fn load(path: &str) -> Result<Self> {
        let content = fs::read_to_string(path)
            .with_context(|| format!("Failed to read {}", path))?;
        let config: Config = toml::from_str(&content)
            .with_context(|| format!("Failed to parse {}", path))?;
        config.validate()?;
        Ok(config)
    }

    fn validate(&self) -> Result<()> {
        if self.scenarios.is_empty() {
            bail!("no scenarios defined");
        }
        if self.bench_interval == 0 {
            bail!("bench_interval must be > 0");
        }
        if self.bench_batch_size == 0 {
            bail!("bench_batch_size must be > 0");
        }
        if self.bench_batch_repeat == 0 {
            bail!("bench_batch_repeat must be > 0");
        }
        if self.bench_max_size == 0 {
            bail!("bench_max_size must be > 0");
        }
        for s in &self.scenarios {
            if let Some(name) = &s.null_profile {
                if !self.null_profiles.contains_key(name) {
                    bail!(
                        "scenario '{}' references unknown null_profile '{}'",
                        s.name,
                        name
                    );
                }
            }
        }
        Ok(())
    }

    fn resolved_profile(&self, scenario: &Scenario) -> NullProfile {
        scenario
            .null_profile
            .as_ref()
            .and_then(|n| self.null_profiles.get(n))
            .cloned()
            .unwrap_or_default()
    }
}

// ── DB helpers ───────────────────────────────────────────────────────────────

fn connect(pg: &PgConfig) -> Result<PgConnection> {
    let conn_str = pg.connection_string();
    PgConnection::establish(&conn_str)
        .with_context(|| format!("Failed to connect to {}", conn_str))
}

/// Drop and recreate the benchmark database via the `postgres` maintenance DB.
fn reset_database(pg: &PgConfig) -> Result<()> {
    let maint = pg.maintenance_connection_string();
    let mut conn = PgConnection::establish(&maint)
        .with_context(|| format!("Failed to connect to maintenance DB at {}", maint))?;

    let _ = sql_query(&format!(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity \
         WHERE datname = '{}' AND pid <> pg_backend_pid()",
        pg.database
    ))
    .execute(&mut conn);

    let _ = sql_query(&format!("DROP DATABASE IF EXISTS \"{}\"", pg.database))
        .execute(&mut conn);
    sql_query(&format!("CREATE DATABASE \"{}\"", pg.database))
        .execute(&mut conn)
        .with_context(|| format!("Failed to create database '{}'", pg.database))?;
    Ok(())
}

fn recreate_changelog(conn: &mut PgConnection) -> Result<()> {
    // The database is fresh, but we don't want to assume it — tolerate pre-existing types/tables.
    let _ = sql_query("DROP TABLE IF EXISTS changelog").execute(conn);
    let _ = sql_query("DROP SEQUENCE IF EXISTS changelog_cursor_seq").execute(conn);
    let _ = sql_query("DROP TYPE IF EXISTS row_action_type").execute(conn);

    sql_query(BASE_TYPE_SQL)
        .execute(conn)
        .context("failed to create row_action_type")?;
    sql_query(BASE_SEQ_SQL)
        .execute(conn)
        .context("failed to create changelog_cursor_seq")?;
    sql_query(BASE_TABLE_SQL)
        .execute(conn)
        .context("failed to create changelog table")?;
    Ok(())
}

/// Insert rows [from..=to] into changelog using `generate_series`.
/// Nulls are applied probabilistically via `random()` to match the profile.
fn insert_series(
    conn: &mut PgConnection,
    from: u64,
    to: u64,
    profile: &NullProfile,
) -> Result<()> {
    let enum_array = TABLE_NAME_VALUES
        .iter()
        .map(|v| format!("'{}'", v))
        .collect::<Vec<_>>()
        .join(", ");
    let enum_count = TABLE_NAME_VALUES.len();

    // random() < p_populated → the column gets a value; otherwise NULL.
    let store_populated = 1.0 - profile.store_id;
    let transfer_populated = 1.0 - profile.transfer_store_id;
    let patient_populated = 1.0 - profile.patient_id;

    let sql = format!(
"INSERT INTO changelog (record_id, table_name, row_action, source_site_id, store_id, transfer_store_id, patient_id)
SELECT
    md5(g::text)::uuid,
    (ARRAY[{enum_array}])[1 + (g % {enum_count})::int],
    CASE WHEN random() < 0.05 THEN 'DELETE'::row_action_type ELSE 'UPSERT'::row_action_type END,
    CASE WHEN random() < 0.25 THEN (1 + (g % 99)::int) ELSE NULL END,
    CASE WHEN random() < {store_populated} THEN md5((g+1)::text)::uuid ELSE NULL END,
    CASE WHEN random() < {transfer_populated} THEN md5((g+2)::text)::uuid ELSE NULL END,
    CASE WHEN random() < {patient_populated} THEN md5((g+3)::text)::uuid ELSE NULL END
FROM generate_series({from}, {to}) AS g;"
    );

    sql_query(&sql)
        .execute(conn)
        .with_context(|| format!("generate_series insert {}..{} failed", from, to))?;
    Ok(())
}

// ── Result type ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MeasurementPoint {
    scenario: String,
    /// Row count at the end of the bench_interval fill — used as the X-axis value.
    records_in_db: u64,
    batch_durations_us: Vec<u64>,
    batch_rows_per_sec: Vec<f64>,
}

fn save_results(dir: &str, results: &[MeasurementPoint]) -> Result<()> {
    let path = PathBuf::from(dir).join("results.json");
    let json = serde_json::to_string_pretty(results)?;
    fs::write(&path, json).with_context(|| format!("failed to write {:?}", path))?;
    Ok(())
}

// ── Charts ───────────────────────────────────────────────────────────────────

/// For each measurement point, sort batch rates descending and return the top-pct
/// average and the single fastest rate. Returns (records_in_db, avg, max) per scenario.
fn aggregate(
    results: &[MeasurementPoint],
    top_pct: f64,
) -> HashMap<String, Vec<(u64, f64, f64)>> {
    let frac = (top_pct / 100.0).clamp(0.01, 1.0);
    let mut by_scenario: HashMap<String, Vec<(u64, f64, f64)>> = HashMap::new();
    for r in results {
        let mut sorted: Vec<f64> = r.batch_rows_per_sec.clone();
        sorted.sort_by(|a, b| b.partial_cmp(a).unwrap()); // descending
        let take = (sorted.len() as f64 * frac).ceil() as usize;
        let take = take.max(1).min(sorted.len());
        let avg = sorted[..take].iter().sum::<f64>() / take as f64;
        let max = sorted[0];
        by_scenario
            .entry(r.scenario.clone())
            .or_default()
            .push((r.records_in_db, avg, max));
    }
    for v in by_scenario.values_mut() {
        v.sort_by_key(|t| t.0);
    }
    by_scenario
}

fn format_x(v: &u64) -> String {
    if *v >= 1_000_000 {
        format!("{}M", v / 1_000_000)
    } else if *v >= 1_000 {
        format!("{}K", v / 1_000)
    } else {
        v.to_string()
    }
}

fn render_chart(
    path: &PathBuf,
    title: &str,
    by_scenario: &HashMap<String, Vec<(u64, f64, f64)>>,
) -> Result<()> {
    let (max_x, min_y, max_y) = by_scenario.values().flatten().fold(
        (0u64, f64::INFINITY, f64::NEG_INFINITY),
        |(mx, miny, maxy), (x, avg, fastest)| {
            (mx.max(*x), miny.min(*avg), maxy.max(*fastest))
        },
    );

    let y_range = max_y - min_y;
    let y_lo = (min_y - y_range * 0.05).max(0.0);
    let y_hi = max_y + y_range * 0.05;

    let root = BitMapBackend::new(path, (2400, 1600)).into_drawing_area();
    root.fill(&WHITE)?;

    let mut chart = ChartBuilder::on(&root)
        .caption(title, ("sans-serif", 48).into_font())
        .margin(60)
        .x_label_area_size(120)
        .y_label_area_size(180)
        .build_cartesian_2d(0u64..max_x.max(1), y_lo..y_hi.max(1.0))?;

    chart
        .configure_mesh()
        .x_desc("Records in database")
        .y_desc("Rows inserted per second")
        .x_label_formatter(&format_x)
        .axis_desc_style(("sans-serif", 32).into_font())
        .label_style(("sans-serif", 24).into_font())
        .draw()?;

    let mut names: Vec<_> = by_scenario.keys().cloned().collect();
    names.sort();

    for (i, name) in names.iter().enumerate() {
        let color = COLORS[i % COLORS.len()];
        let data = &by_scenario[name];

        // Top-pct average (solid, labelled for legend) — drawn first so fastest overlays it.
        chart
            .draw_series(LineSeries::new(
                data.iter().map(|(x, avg, _)| (*x, *avg)),
                color.stroke_width(3),
            ))?
            .label(name.clone())
            .legend(move |(x, y)| {
                PathElement::new(vec![(x, y), (x + 40, y)], color.stroke_width(3))
            });

        // Fastest (thin, drawn on top)
        chart.draw_series(LineSeries::new(
            data.iter().map(|(x, _, fastest)| (*x, *fastest)),
            color.mix(0.5).stroke_width(2),
        ))?;
    }

    // Annotate the lowest "fastest batch" value per scenario.
    for (name, pts) in by_scenario {
        if let Some((sx, sy)) = pts
            .iter()
            .map(|(x, _avg, fastest)| (*x, *fastest))
            .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap())
        {
            chart.draw_series(std::iter::once(Circle::new(
                (sx, sy),
                8,
                RED.filled(),
            )))?;
            chart.draw_series(std::iter::once(Text::new(
                format!("{} — {:.0} r/s", name, sy),
                (sx, sy),
                ("sans-serif", 28).into_font().color(&RED),
            )))?;
        }
    }

    chart
        .configure_series_labels()
        .border_style(BLACK)
        .background_style(WHITE.mix(0.8))
        .label_font(("sans-serif", 28).into_font())
        .draw()?;

    root.present()?;
    eprintln!("Wrote chart: {}", path.display());
    Ok(())
}

/// Generate all charts: one combined + one per scenario.
fn generate_charts(dir: &str, results: &[MeasurementPoint], top_pct: f64) -> Result<()> {
    if results.is_empty() {
        return Ok(());
    }
    let dir = PathBuf::from(dir);
    let by_scenario = aggregate(results, top_pct);

    // Combined chart
    render_chart(
        &dir.join("insert_rate.png"),
        &format!(
            "Insert rate vs records in DB (top {}% avg)",
            top_pct
        ),
        &by_scenario,
    )?;

    // Per-scenario charts
    for (name, data) in &by_scenario {
        let mut single = HashMap::new();
        single.insert(name.clone(), data.clone());
        render_chart(
            &dir.join(format!("insert_rate_{}.png", name)),
            &format!("{} — insert rate (top {}% avg)", name, top_pct),
            &single,
        )?;
    }

    Ok(())
}

/// Read results.json and regenerate all charts.
fn generate_charts_from_file(results_path: &str, top_pct: f64) -> Result<()> {
    let json = fs::read_to_string(results_path)
        .with_context(|| format!("Failed to read {}", results_path))?;
    let results: Vec<MeasurementPoint> = serde_json::from_str(&json)
        .with_context(|| format!("Failed to parse {}", results_path))?;

    let dir = std::path::Path::new(results_path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| ".".to_string());

    generate_charts(&dir, &results, top_pct)
}

// ── Main ─────────────────────────────────────────────────────────────────────

fn main() -> Result<()> {
    let cli = Cli::parse();

    // --generate-charts: render from existing results.json and exit.
    if let Some(ref path) = cli.generate_charts {
        eprintln!("Generating charts from: {}", path);
        generate_charts_from_file(path, cli.top_pct)?;
        eprintln!("Done!");
        return Ok(());
    }

    let config = Config::load(&cli.config)?;
    fs::create_dir_all(&config.output_dir)
        .with_context(|| format!("failed to create {}", config.output_dir))?;

    let mut results: Vec<MeasurementPoint> = Vec::new();

    for scenario in &config.scenarios {
        eprintln!("\n=== Scenario: {} ===", scenario.name);
        let profile = config.resolved_profile(scenario);
        eprintln!(
            "  null profile: store={:.2} transfer={:.2} patient={:.2}",
            profile.store_id, profile.transfer_store_id, profile.patient_id
        );

        eprintln!("  resetting database...");
        reset_database(&config.pg)?;
        let mut conn = connect(&config.pg)?;
        recreate_changelog(&mut conn)?;

        for idx_sql in &scenario.indexes {
            eprintln!("  creating index: {}", idx_sql);
            sql_query(idx_sql)
                .execute(&mut conn)
                .with_context(|| format!("failed to create index: {}", idx_sql))?;
        }

        let mut rows_in_db: u64 = 0;
        while rows_in_db < config.bench_max_size {
            // ── fill ─────────────────────────────────────────────────────────
            let fill_to = (rows_in_db + config.bench_interval).min(config.bench_max_size);
            if fill_to > rows_in_db {
                eprintln!(
                    "  fill: generate_series {}..{} ({} rows)",
                    rows_in_db + 1,
                    fill_to,
                    fill_to - rows_in_db
                );
                insert_series(&mut conn, rows_in_db + 1, fill_to, &profile)?;
                rows_in_db = fill_to;
            }

            if rows_in_db >= config.bench_max_size {
                break;
            }

            // X-axis value: rows in the DB at the end of the bench_interval fill.
            let x_value = rows_in_db;

            eprintln!(
                "  measure: {} batches of {} rows at {} rows in DB",
                config.bench_batch_repeat, config.bench_batch_size, x_value
            );

            let mut durations = Vec::with_capacity(config.bench_batch_repeat as usize);
            let mut rates = Vec::with_capacity(config.bench_batch_repeat as usize);

            for _ in 0..config.bench_batch_repeat {
                let from = rows_in_db + 1;
                let to = rows_in_db + config.bench_batch_size;

                let start = Instant::now();
                insert_series(&mut conn, from, to, &profile)?;
                let elapsed = start.elapsed();

                durations.push(elapsed.as_micros() as u64);
                rates.push(config.bench_batch_size as f64 / elapsed.as_secs_f64());
                rows_in_db = to;
            }

            let avg = rates.iter().sum::<f64>() / rates.len() as f64;
            let min = rates.iter().cloned().fold(f64::INFINITY, f64::min);
            let max = rates.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
            eprintln!(
                "    rate (rows/sec): avg={:.0} min={:.0} max={:.0}",
                avg, min, max
            );

            results.push(MeasurementPoint {
                scenario: scenario.name.clone(),
                records_in_db: x_value,
                batch_durations_us: durations,
                batch_rows_per_sec: rates,
            });

            // Flush after every measurement so partial runs are not lost.
            save_results(&config.output_dir, &results)?;
        }
    }

    eprintln!("\nGenerating charts...");
    generate_charts(&config.output_dir, &results, cli.top_pct)?;

    eprintln!("\nDone. Results in {}/", config.output_dir);
    Ok(())
}
