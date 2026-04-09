use anyhow::{Context, Result};
use plotters::prelude::*;
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
    let phase_results: Vec<_> = results.iter().filter(|r| r.phase == phase).cloned().collect();
    if phase_results.is_empty() {
        eprintln!("  No results for phase {}, skipping.", phase);
        return Ok(());
    }

    let dir = format!("{}/{}_{}", output_dir, phase_dir(phase), timestamp);
    fs::create_dir_all(&dir).context("Failed to create output directory")?;

    // Save phase-specific results.json alongside the charts
    save_results_json(&phase_results, &dir)?;

    if !skip_graphs {
        if phase == 2 {
            // Phase 2: one bar chart per percentile metric
            // Each cluster = N value, each bar = index strategy
            let percentiles: &[(&str, fn(&BenchResult) -> u64)] = &[
                ("p50", |r: &BenchResult| r.stats.p50_us),
                ("p95", |r: &BenchResult| r.stats.p95_us),
                ("p99", |r: &BenchResult| r.stats.p99_us),
            ];
            for (name, get_value) in percentiles {
                generate_index_bar_chart(&phase_results, phase, name, *get_value, &dir)?;
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
/// X axis uses evenly-spaced points (not log scale) so all N values are equally visible.
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
    let max_val_f64 = (max_val as f64) * 1.1;
    let num_points = all_n.len();

    // Map N values to evenly-spaced indices
    let n_to_idx = |n: u64| -> f64 {
        all_n.iter().position(|&v| v == n).unwrap_or(0) as f64
    };

    let root = BitMapBackend::new(&output_path, (CHART_WIDTH, CHART_HEIGHT)).into_drawing_area();
    root.fill(&WHITE)?;

    let title = format!(
        "{} - {} - Insert Latency vs Table Size",
        phase_label(phase),
        scenario_name
    );

    let all_n_clone = all_n.clone();
    let mut chart = ChartBuilder::on(&root)
        .caption(&title, ("sans-serif", 28))
        .margin(15)
        .x_label_area_size(50)
        .y_label_area_size(80)
        .build_cartesian_2d(0.0..((num_points - 1) as f64), 0.0..max_val_f64)?;

    chart
        .configure_mesh()
        .x_desc("Pre-populated rows (N)")
        .y_desc("Latency (us)")
        .x_labels(num_points)
        .x_label_formatter(&|v| {
            let idx = v.round() as usize;
            if idx < all_n_clone.len() {
                format_n(all_n_clone[idx])
            } else {
                String::new()
            }
        })
        .y_label_formatter(&|v| format!("{:.0}", v))
        .draw()?;

    for (label, get_value, color) in percentiles {
        let mut points: Vec<(f64, f64)> = scenario_results
            .iter()
            .map(|r| (n_to_idx(r.n), get_value(r) as f64))
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

/// Generate a clustered bar chart for Phase 2: one chart per percentile metric.
/// X-axis clusters: N values. Bars within each cluster: index strategies.
fn generate_index_bar_chart(
    phase_results: &[BenchResult],
    phase: u8,
    percentile_name: &str,
    get_value: fn(&BenchResult) -> u64,
    output_dir: &str,
) -> Result<()> {
    let output_path = format!("{}/{}.png", output_dir, percentile_name);

    if phase_results.is_empty() {
        return Ok(());
    }

    // Unique N values (clusters) and scenario names (bars)
    let mut n_values: Vec<u64> = phase_results.iter().map(|r| r.n).collect();
    n_values.sort();
    n_values.dedup();

    let mut scenario_names: Vec<String> = phase_results
        .iter()
        .map(|r| r.scenario_name.clone())
        .collect();
    scenario_names.sort();
    scenario_names.dedup();

    let num_clusters = n_values.len();
    let num_bars = scenario_names.len();

    let max_val = phase_results
        .iter()
        .map(|r| get_value(r))
        .max()
        .unwrap_or(1);
    let max_val_f64 = (max_val as f64) * 1.2;

    let root = BitMapBackend::new(&output_path, (CHART_WIDTH, CHART_HEIGHT)).into_drawing_area();
    root.fill(&WHITE)?;

    let title = format!(
        "{} - {} Insert Latency by N and Index Strategy",
        phase_label(phase),
        percentile_name.to_uppercase(),
    );

    let n_values_clone = n_values.clone();
    let mut chart = ChartBuilder::on(&root)
        .caption(&title, ("sans-serif", 28))
        .margin(15)
        .x_label_area_size(60)
        .y_label_area_size(80)
        .build_cartesian_2d(0.0..(num_clusters as f64), 0.0..max_val_f64)?;

    chart
        .configure_mesh()
        .disable_x_mesh()
        .x_desc("Pre-populated rows (N)")
        .y_desc(format!("{} Latency (us)", percentile_name.to_uppercase()))
        .x_labels(num_clusters)
        .x_label_formatter(&|v| {
            let idx = v.round() as usize;
            if idx < n_values_clone.len() && (*v - idx as f64).abs() < 0.3 {
                format_n(n_values_clone[idx])
            } else {
                String::new()
            }
        })
        .y_label_formatter(&|v| format!("{:.0}", v))
        .draw()?;

    // Bar layout: each cluster spans 1.0 on X axis, bars evenly distributed within
    let cluster_padding = 0.1;
    let usable_width = 1.0 - 2.0 * cluster_padding;
    let bar_width = usable_width / num_bars as f64;

    for (s_idx, scenario_name) in scenario_names.iter().enumerate() {
        let color = COLORS[s_idx % COLORS.len()];

        let bars: Vec<_> = n_values
            .iter()
            .enumerate()
            .filter_map(|(n_idx, n)| {
                phase_results
                    .iter()
                    .find(|r| r.n == *n && r.scenario_name == *scenario_name)
                    .map(|r| {
                        let x_center =
                            n_idx as f64 + cluster_padding + (s_idx as f64 + 0.5) * bar_width;
                        let x0 = x_center - bar_width * 0.4;
                        let x1 = x_center + bar_width * 0.4;
                        let val = get_value(r) as f64;
                        Rectangle::new([(x0, 0.0), (x1, val)], color.filled())
                    })
            })
            .collect();

        chart
            .draw_series(bars)?
            .label(scenario_name.as_str())
            .legend(move |(x, y)| {
                Rectangle::new([(x, y - 5), (x + 15, y + 5)], color.filled())
            });
    }

    // Value labels on top of each bar
    for (s_idx, scenario_name) in scenario_names.iter().enumerate() {
        for (n_idx, n) in n_values.iter().enumerate() {
            if let Some(r) = phase_results
                .iter()
                .find(|r| r.n == *n && r.scenario_name == *scenario_name)
            {
                let val = get_value(r);
                let x_center =
                    n_idx as f64 + cluster_padding + (s_idx as f64 + 0.5) * bar_width;
                chart.draw_series(std::iter::once(Text::new(
                    format!("{}", val),
                    (x_center, val as f64 + max_val_f64 * 0.02),
                    ("sans-serif", 10).into_font().color(&BLACK),
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
        let val = n as f64 / 1_000_000_000.0;
        if val.fract() == 0.0 { format!("{}B", val as u64) } else { format!("{:.1}B", val) }
    } else if n >= 1_000_000 {
        let val = n as f64 / 1_000_000.0;
        if val.fract() == 0.0 { format!("{}M", val as u64) } else { format!("{:.1}M", val) }
    } else if n >= 1_000 {
        let val = n as f64 / 1_000.0;
        if val.fract() == 0.0 { format!("{}K", val as u64) } else { format!("{:.1}K", val) }
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
        let p50_path = tmp_dir.join(format!("{}/p50.png", phase_dir));
        let p95_path = tmp_dir.join(format!("{}/p95.png", phase_dir));
        let p99_path = tmp_dir.join(format!("{}/p99.png", phase_dir));

        assert!(p50_path.exists(), "p50 bar chart should exist");
        assert!(p95_path.exists(), "p95 bar chart should exist");
        assert!(p99_path.exists(), "p99 bar chart should exist");
        assert!(fs::metadata(&p50_path).unwrap().len() > 0);
        assert!(fs::metadata(&p95_path).unwrap().len() > 0);
        assert!(fs::metadata(&p99_path).unwrap().len() > 0);

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
        assert_eq!(format_n(1_200_000), "1.2M");
        assert_eq!(format_n(2_300_000), "2.3M");
        assert_eq!(format_n(1_000_000), "1M");
        assert_eq!(format_n(10_000_000), "10M");
        assert_eq!(format_n(100_000), "100K");
        assert_eq!(format_n(1_000_000_000), "1B");
        assert_eq!(format_n(1_500_000_000), "1.5B");
    }
}
