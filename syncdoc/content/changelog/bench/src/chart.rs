use anyhow::{Context, Result};
use plotters::prelude::*;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use crate::types::{MeasurementPoint, COLORS};

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
        .margin_top(60)
        .margin_bottom(60)
        .margin_left(60)
        .margin_right(300)
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
pub fn generate_charts(dir: &str, results: &[MeasurementPoint], top_pct: f64, suffix: Option<&str>) -> Result<()> {
    if results.is_empty() {
        return Ok(());
    }
    let dir = PathBuf::from(dir);
    let by_scenario = aggregate(results, top_pct);

    let tag = suffix.map(|s| format!("_{}", s)).unwrap_or_default();

    // Combined chart
    render_chart(
        &dir.join(format!("insert_rate{}.png", tag)),
        &format!("Insert rate vs records in DB (top {}% avg)", top_pct),
        &by_scenario,
    )?;

    // Per-scenario charts
    for (name, data) in &by_scenario {
        let mut single = HashMap::new();
        single.insert(name.clone(), data.clone());
        render_chart(
            &dir.join(format!("insert_rate_{}{}.png", name, tag)),
            &format!("{} — insert rate (top {}% avg)", name, top_pct),
            &single,
        )?;
    }

    Ok(())
}

/// Read one or more results.json files, merge them, and generate all charts.
pub fn generate_charts_from_files(
    paths: &[String],
    output_dir: &str,
    top_pct: f64,
) -> Result<()> {
    let mut all_results: Vec<MeasurementPoint> = Vec::new();
    for path in paths {
        eprintln!("  loading {}", path);
        let json = fs::read_to_string(path)
            .with_context(|| format!("Failed to read {}", path))?;
        let results: Vec<MeasurementPoint> = serde_json::from_str(&json)
            .with_context(|| format!("Failed to parse {}", path))?;
        all_results.extend(results);
    }
    generate_charts(output_dir, &all_results, top_pct, None)
}

