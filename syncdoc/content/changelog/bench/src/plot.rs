use anyhow::{Context, Result};
use plotters::prelude::*;
use std::collections::HashMap;
use std::fs;

use crate::bench::BenchResult;

const CHART_WIDTH: u32 = 1200;
const CHART_HEIGHT: u32 = 800;

const COLORS: &[RGBColor] = &[
    RGBColor(31, 119, 180),   // blue
    RGBColor(255, 127, 14),   // orange
    RGBColor(44, 160, 44),    // green
    RGBColor(214, 39, 40),    // red
    RGBColor(148, 103, 189),  // purple
    RGBColor(140, 86, 75),    // brown
    RGBColor(227, 119, 194),  // pink
    RGBColor(127, 127, 127),  // gray
    RGBColor(188, 189, 34),   // olive
    RGBColor(23, 190, 207),   // cyan
];

fn phase_label(phase: u8) -> &'static str {
    match phase {
        1 => "Phase 1: PG Config Comparison",
        2 => "Phase 2: Index Strategy Comparison",
        3 => "Phase 3: Partition Strategy Comparison",
        _ => "Unknown Phase",
    }
}

fn phase_dir(phase: u8) -> &'static str {
    match phase {
        1 => "phase1_pg_config",
        2 => "phase2_indexes",
        3 => "phase3_partitioning",
        _ => "unknown",
    }
}

/// Generate charts for a given phase.
/// Phase 2 gets clustered bar charts (one per N, scenarios on x-axis, p50/p95/p99 bars).
/// Other phases get one line chart per scenario (p50/p95/p99 lines vs N).
pub fn generate_phase_charts(
    results: &[BenchResult],
    phase: u8,
    output_dir: &str,
    timestamp: &str,
    skip_graphs: bool,
) -> Result<()> {
    let dir = format!("{}/{}_{}", output_dir, phase_dir(phase), timestamp);
    fs::create_dir_all(&dir).context("Failed to create output directory")?;

    // Save phase-specific results.json alongside the charts
    let phase_results: Vec<_> = results.iter().filter(|r| r.phase == phase).cloned().collect();
    save_results_json(&phase_results, &dir)?;

    if !skip_graphs {
        if phase == 2 {
            // Phase 2: one clustered bar chart per N value
            let mut n_values: Vec<u64> = results
                .iter()
                .filter(|r| r.phase == phase)
                .map(|r| r.n)
                .collect();
            n_values.sort();
            n_values.dedup();

            for n in &n_values {
                generate_index_bar_chart(results, phase, *n, &dir)?;
            }
        } else {
            // Other phases: one line chart per scenario
            let mut scenario_names: Vec<String> = results
                .iter()
                .filter(|r| r.phase == phase)
                .map(|r| r.scenario_name.clone())
                .collect();
            scenario_names.sort();
            scenario_names.dedup();

            for name in &scenario_names {
                generate_scenario_chart(results, phase, name, &dir)?;
            }
        }
    }

    Ok(())
}

/// Generate a single chart for one scenario showing p50, p95, p99 lines vs N.
fn generate_scenario_chart(
    results: &[BenchResult],
    phase: u8,
    scenario_name: &str,
    output_dir: &str,
) -> Result<()> {
    let output_path = format!("{}/{}.png", output_dir, scenario_name);

    let scenario_results: Vec<&BenchResult> = results
        .iter()
        .filter(|r| r.phase == phase && r.scenario_name == scenario_name)
        .collect();

    if scenario_results.is_empty() {
        return Ok(());
    }

    // Build data series for each percentile
    let percentiles: &[(&str, fn(&BenchResult) -> u64, RGBColor)] = &[
        ("p50", |r: &BenchResult| r.stats.p50_us, COLORS[0]),
        ("p95", |r: &BenchResult| r.stats.p95_us, COLORS[1]),
        ("p99", |r: &BenchResult| r.stats.p99_us, COLORS[3]),
    ];

    let mut all_n: Vec<u64> = scenario_results.iter().map(|r| r.n).collect();
    all_n.sort();
    all_n.dedup();

    let max_val = scenario_results
        .iter()
        .map(|r| r.stats.p99_us)
        .max()
        .unwrap_or(1);
    let min_n = *all_n.first().unwrap_or(&1);
    let max_n = *all_n.last().unwrap_or(&1);

    let root = BitMapBackend::new(&output_path, (CHART_WIDTH, CHART_HEIGHT)).into_drawing_area();
    root.fill(&WHITE)?;

    let title = format!(
        "{} - {} - Insert Latency vs Table Size",
        phase_label(phase),
        scenario_name
    );

    let min_n_f64 = (min_n as f64).max(1.0);
    let max_n_f64 = max_n as f64;
    let max_val_f64 = (max_val as f64) * 1.1;

    let mut chart = ChartBuilder::on(&root)
        .caption(&title, ("sans-serif", 28))
        .margin(15)
        .x_label_area_size(50)
        .y_label_area_size(80)
        .build_cartesian_2d((min_n_f64..max_n_f64).log_scale(), 0.0..max_val_f64)?;

    chart
        .configure_mesh()
        .x_desc("Pre-populated rows (N)")
        .y_desc("Latency (us)")
        .x_label_formatter(&|v| format_n(*v as u64))
        .y_label_formatter(&|v| format!("{:.0}", v))
        .draw()?;

    for (label, get_value, color) in percentiles {
        let mut points: Vec<(f64, f64)> = scenario_results
            .iter()
            .map(|r| (r.n as f64, get_value(r) as f64))
            .collect();
        points.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());

        let color = *color;
        chart
            .draw_series(LineSeries::new(points.clone(), color.stroke_width(2)))?
            .label(*label)
            .legend(move |(x, y)| {
                PathElement::new(vec![(x, y), (x + 20, y)], color.stroke_width(2))
            });

        chart.draw_series(
            points
                .iter()
                .map(|(x, y)| Circle::new((*x, *y), 4, color.filled())),
        )?;
    }

    chart
        .configure_series_labels()
        .position(SeriesLabelPosition::UpperLeft)
        .border_style(BLACK)
        .background_style(WHITE.mix(0.8))
        .draw()?;

    root.present()?;
    eprintln!("  Generated: {}", output_path);
    Ok(())
}

/// Generate a clustered bar chart for Phase 2: one chart per N value.
/// X-axis: index strategies, Y-axis: latency (us).
/// Each cluster has 3 bars: p50, p95, p99.
fn generate_index_bar_chart(
    results: &[BenchResult],
    phase: u8,
    n: u64,
    output_dir: &str,
) -> Result<()> {
    let output_path = format!("{}/n_{}.png", output_dir, format_n(n));

    let phase_results: Vec<&BenchResult> = results
        .iter()
        .filter(|r| r.phase == phase && r.n == n)
        .collect();

    if phase_results.is_empty() {
        return Ok(());
    }

    let mut scenario_names: Vec<String> = phase_results
        .iter()
        .map(|r| r.scenario_name.clone())
        .collect();
    scenario_names.sort();
    scenario_names.dedup();

    let num_scenarios = scenario_names.len();
    let max_val = phase_results
        .iter()
        .map(|r| r.stats.p99_us)
        .max()
        .unwrap_or(1);
    let max_val_f64 = (max_val as f64) * 1.2; // 20% headroom

    let root = BitMapBackend::new(&output_path, (CHART_WIDTH, CHART_HEIGHT)).into_drawing_area();
    root.fill(&WHITE)?;

    let title = format!(
        "{} - N={} - Insert Latency by Index Strategy",
        phase_label(phase),
        format_n(n)
    );

    // Each scenario gets a cluster of 3 bars (p50, p95, p99)
    // X range: 0..num_scenarios, with bars positioned within each unit
    let mut chart = ChartBuilder::on(&root)
        .caption(&title, ("sans-serif", 28))
        .margin(15)
        .x_label_area_size(80)
        .y_label_area_size(80)
        .build_cartesian_2d(
            0.0..(num_scenarios as f64),
            0.0..max_val_f64,
        )?;

    chart
        .configure_mesh()
        .disable_x_mesh()
        .y_desc("Latency (us)")
        .x_desc("Index Strategy")
        .x_label_formatter(&|v| {
            let idx = *v as usize;
            if idx < scenario_names.len() && (*v - idx as f64).abs() < 0.01 {
                scenario_names[idx].clone()
            } else {
                String::new()
            }
        })
        .y_label_formatter(&|v| format!("{:.0}", v))
        .draw()?;

    let bar_width = 0.25;
    let percentile_colors: &[(&str, RGBColor)] = &[
        ("p50", COLORS[0]),   // blue
        ("p95", COLORS[1]),   // orange
        ("p99", COLORS[3]),   // red
    ];

    for (p_idx, (label, color)) in percentile_colors.iter().enumerate() {
        let get_value: fn(&BenchResult) -> u64 = match *label {
            "p50" => |r: &BenchResult| r.stats.p50_us,
            "p95" => |r: &BenchResult| r.stats.p95_us,
            "p99" => |r: &BenchResult| r.stats.p99_us,
            _ => unreachable!(),
        };

        let bars: Vec<_> = scenario_names
            .iter()
            .enumerate()
            .filter_map(|(s_idx, name)| {
                phase_results
                    .iter()
                    .find(|r| r.scenario_name == *name)
                    .map(|r| {
                        let x_center = s_idx as f64 + 0.15 + (p_idx as f64 * bar_width);
                        let x0 = x_center - bar_width * 0.4;
                        let x1 = x_center + bar_width * 0.4;
                        let val = get_value(r) as f64;
                        Rectangle::new([(x0, 0.0), (x1, val)], color.filled())
                    })
            })
            .collect();

        let color = *color;
        chart
            .draw_series(bars)?
            .label(*label)
            .legend(move |(x, y)| Rectangle::new([(x, y - 5), (x + 15, y + 5)], color.filled()));
    }

    // Draw value labels on top of each bar
    for (s_idx, name) in scenario_names.iter().enumerate() {
        if let Some(r) = phase_results.iter().find(|r| r.scenario_name == *name) {
            let values = [r.stats.p50_us, r.stats.p95_us, r.stats.p99_us];
            for (p_idx, val) in values.iter().enumerate() {
                let x_center = s_idx as f64 + 0.15 + (p_idx as f64 * bar_width);
                chart.draw_series(std::iter::once(Text::new(
                    format!("{}", val),
                    (x_center, *val as f64 + max_val_f64 * 0.02),
                    ("sans-serif", 12).into_font().color(&BLACK),
                )))?;
            }
        }
    }

    chart
        .configure_series_labels()
        .position(SeriesLabelPosition::UpperLeft)
        .border_style(BLACK)
        .background_style(WHITE.mix(0.8))
        .draw()?;

    root.present()?;
    eprintln!("  Generated: {}", output_path);
    Ok(())
}

pub fn format_n(n: u64) -> String {
    if n >= 1_000_000_000 {
        format!("{}B", n / 1_000_000_000)
    } else if n >= 1_000_000 {
        format!("{}M", n / 1_000_000)
    } else if n >= 1_000 {
        format!("{}K", n / 1_000)
    } else {
        format!("{}", n)
    }
}

/// Print a summary table to stdout for a given phase.
pub fn print_phase_table(results: &[BenchResult], phase: u8) {
    let phase_results: Vec<_> = results.iter().filter(|r| r.phase == phase).collect();
    if phase_results.is_empty() {
        return;
    }

    println!("\n{}", phase_label(phase));
    println!(
        "{:<30} | {:>12} | {:>10} | {:>10} | {:>10} | {:>10} | {:>10}",
        "Scenario", "N", "p50 (us)", "p95 (us)", "p99 (us)", "mean (us)", "max (us)"
    );
    println!("{}", "-".repeat(110));

    for r in &phase_results {
        println!(
            "{:<30} | {:>12} | {:>10} | {:>10} | {:>10} | {:>10} | {:>10}",
            r.scenario_name,
            format_n(r.n),
            r.stats.p50_us,
            r.stats.p95_us,
            r.stats.p99_us,
            r.stats.mean_us,
            r.stats.max_us,
        );
    }
}

/// Save results to a JSON file.
pub fn save_results_json(results: &[BenchResult], output_dir: &str) -> Result<()> {
    fs::create_dir_all(output_dir).context("Failed to create output directory")?;
    let path = format!("{}/results.json", output_dir);
    let json = serde_json::to_string_pretty(results)?;
    fs::write(&path, json)?;
    eprintln!("  Saved results to: {}", path);
    Ok(())
}

/// Load results from a JSON file.
#[allow(dead_code)]
pub fn load_results_json(output_dir: &str) -> Result<Vec<BenchResult>> {
    let path = format!("{}/results.json", output_dir);
    let json = fs::read_to_string(&path)?;
    let results: Vec<BenchResult> = serde_json::from_str(&json)?;
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::bench::Stats;

    fn mock_results() -> Vec<BenchResult> {
        vec![
            BenchResult {
                scenario_name: "scenario_a".to_string(),
                phase: 1,
                n: 1_000_000,
                batch_size: 10_000,
                stats: Stats {
                    p50_us: 50,
                    p95_us: 120,
                    p99_us: 200,
                    mean_us: 65,
                    min_us: 20,
                    max_us: 500,
                },
            },
            BenchResult {
                scenario_name: "scenario_a".to_string(),
                phase: 1,
                n: 10_000_000,
                batch_size: 10_000,
                stats: Stats {
                    p50_us: 80,
                    p95_us: 200,
                    p99_us: 350,
                    mean_us: 95,
                    min_us: 30,
                    max_us: 800,
                },
            },
            BenchResult {
                scenario_name: "scenario_b".to_string(),
                phase: 1,
                n: 1_000_000,
                batch_size: 10_000,
                stats: Stats {
                    p50_us: 40,
                    p95_us: 100,
                    p99_us: 170,
                    mean_us: 55,
                    min_us: 15,
                    max_us: 400,
                },
            },
            BenchResult {
                scenario_name: "scenario_b".to_string(),
                phase: 1,
                n: 10_000_000,
                batch_size: 10_000,
                stats: Stats {
                    p50_us: 60,
                    p95_us: 150,
                    p99_us: 280,
                    mean_us: 75,
                    min_us: 25,
                    max_us: 600,
                },
            },
        ]
    }

    #[test]
    fn test_generate_charts_creates_files() {
        let tmp_dir = std::env::temp_dir().join("changelog-bench-test-plots");
        let _ = fs::remove_dir_all(&tmp_dir);
        fs::create_dir_all(&tmp_dir).unwrap();

        let results = mock_results();
        let timestamp = "2026-01-01_00-00-00";
        generate_phase_charts(&results, 1, tmp_dir.to_str().unwrap(), timestamp, false).unwrap();

        // Mock results have two scenarios: scenario_a and scenario_b
        let phase_dir = format!("phase1_pg_config_{}", timestamp);
        let scenario_a_path = tmp_dir.join(format!("{}/scenario_a.png", phase_dir));
        let scenario_b_path = tmp_dir.join(format!("{}/scenario_b.png", phase_dir));

        assert!(scenario_a_path.exists(), "scenario_a chart should exist");
        assert!(scenario_b_path.exists(), "scenario_b chart should exist");

        // Verify files are non-empty
        assert!(fs::metadata(&scenario_a_path).unwrap().len() > 0, "scenario_a chart should be non-empty");
        assert!(fs::metadata(&scenario_b_path).unwrap().len() > 0, "scenario_b chart should be non-empty");

        let _ = fs::remove_dir_all(&tmp_dir);
    }

    #[test]
    fn test_generate_phase2_bar_charts() {
        let tmp_dir = std::env::temp_dir().join("changelog-bench-test-phase2");
        let _ = fs::remove_dir_all(&tmp_dir);
        fs::create_dir_all(&tmp_dir).unwrap();

        let results = vec![
            BenchResult {
                scenario_name: "idx_pk_only".to_string(),
                phase: 2,
                n: 1_000_000,
                batch_size: 10_000,
                stats: Stats { p50_us: 30, p95_us: 80, p99_us: 150, mean_us: 40, min_us: 10, max_us: 300 },
            },
            BenchResult {
                scenario_name: "idx_v7".to_string(),
                phase: 2,
                n: 1_000_000,
                batch_size: 10_000,
                stats: Stats { p50_us: 50, p95_us: 120, p99_us: 200, mean_us: 65, min_us: 20, max_us: 500 },
            },
            BenchResult {
                scenario_name: "idx_pk_only".to_string(),
                phase: 2,
                n: 10_000_000,
                batch_size: 10_000,
                stats: Stats { p50_us: 40, p95_us: 100, p99_us: 180, mean_us: 50, min_us: 15, max_us: 400 },
            },
            BenchResult {
                scenario_name: "idx_v7".to_string(),
                phase: 2,
                n: 10_000_000,
                batch_size: 10_000,
                stats: Stats { p50_us: 70, p95_us: 180, p99_us: 300, mean_us: 85, min_us: 25, max_us: 700 },
            },
        ];

        let timestamp = "2026-01-01_00-00-00";
        generate_phase_charts(&results, 2, tmp_dir.to_str().unwrap(), timestamp, false).unwrap();

        let phase_dir = format!("phase2_indexes_{}", timestamp);
        let n1m_path = tmp_dir.join(format!("{}/n_1M.png", phase_dir));
        let n10m_path = tmp_dir.join(format!("{}/n_10M.png", phase_dir));

        assert!(n1m_path.exists(), "N=1M bar chart should exist");
        assert!(n10m_path.exists(), "N=10M bar chart should exist");
        assert!(fs::metadata(&n1m_path).unwrap().len() > 0);
        assert!(fs::metadata(&n10m_path).unwrap().len() > 0);

        let _ = fs::remove_dir_all(&tmp_dir);
    }

    #[test]
    fn test_results_json_roundtrip() {
        let tmp_dir = std::env::temp_dir().join("changelog-bench-test-json");
        let _ = fs::remove_dir_all(&tmp_dir);
        fs::create_dir_all(&tmp_dir).unwrap();

        let results = mock_results();
        save_results_json(&results, tmp_dir.to_str().unwrap()).unwrap();

        let loaded = load_results_json(tmp_dir.to_str().unwrap()).unwrap();

        assert_eq!(results.len(), loaded.len());
        for (orig, loaded) in results.iter().zip(loaded.iter()) {
            assert_eq!(orig.scenario_name, loaded.scenario_name);
            assert_eq!(orig.n, loaded.n);
            assert_eq!(orig.stats.p95_us, loaded.stats.p95_us);
            assert_eq!(orig.stats.p99_us, loaded.stats.p99_us);
        }

        let _ = fs::remove_dir_all(&tmp_dir);
    }

    #[test]
    fn test_format_n() {
        assert_eq!(format_n(500), "500");
        assert_eq!(format_n(1_000), "1K");
        assert_eq!(format_n(1_000_000), "1M");
        assert_eq!(format_n(10_000_000), "10M");
        assert_eq!(format_n(1_000_000_000), "1B");
    }
}
