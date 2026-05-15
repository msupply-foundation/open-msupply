use plotters::prelude::RGBColor;
use serde::{Deserialize, Serialize};

use anyhow::Context;

use crate::config::Config;

pub const TABLE_NAME_VALUES: &[&str] = &[
    "number", "location", "stock_line", "name", "name_store_join", "invoice",
    "invoice_line", "stocktake", "stocktake_line", "requisition",
    "requisition_line", "activity_log", "clinician", "clinician_store_join",
    "document", "barcode", "location_movement", "sensor", "temperature_breach",
    "temperature_log", "temperature_breach_config", "currency", "asset",
    "asset_log", "vaccination", "encounter", "item", "report", "preference",
];

pub const COLORS: &[RGBColor] = &[
    RGBColor(31, 119, 180),
    RGBColor(255, 127, 14),
    RGBColor(44, 160, 44),
    RGBColor(214, 39, 40),
    RGBColor(148, 103, 189),
    RGBColor(140, 86, 75),
    RGBColor(227, 119, 194),
    RGBColor(127, 127, 127),
];

pub const BASE_TYPE_SQL: &str = "CREATE TYPE row_action_type AS ENUM ('UPSERT', 'DELETE');";
pub const BASE_SEQ_SQL: &str =
    "CREATE SEQUENCE changelog_cursor_seq START WITH 1 INCREMENT BY 1;";

pub const BASE_TABLE_SQL: &str = "CREATE TABLE changelog (
    cursor BIGINT NOT NULL DEFAULT nextval('changelog_cursor_seq') PRIMARY KEY,
    record_id UUID NOT NULL,
    table_name TEXT NOT NULL,
    row_action row_action_type NOT NULL,
    source_site_id INTEGER,
    store_id UUID,
    transfer_store_id UUID,
    patient_id UUID
);";

pub const PARTITIONED_TABLE_SQL: &str = "CREATE TABLE changelog (
    cursor BIGINT NOT NULL DEFAULT nextval('changelog_cursor_seq'),
    record_id UUID NOT NULL,
    table_name TEXT NOT NULL,
    row_action row_action_type NOT NULL,
    source_site_id INTEGER,
    store_id UUID,
    transfer_store_id UUID,
    patient_id UUID
) PARTITION BY RANGE (cursor);";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeasurementPoint {
    pub scenario: String,
    /// Row count at the end of the bench_interval fill — used as the X-axis value.
    pub records_in_db: u64,
    pub batch_durations_us: Vec<u64>,
    pub batch_rows_per_sec: Vec<f64>,
    /// Total size of indexes on the changelog table in MB (if capture_index_size is enabled).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub index_size_mb: Option<f64>,
}

pub fn save_results(dir: &str, results: &[MeasurementPoint], suffix: Option<&str>) -> anyhow::Result<()> {
    let filename = match suffix {
        Some(s) => format!("results_{}.json", s),
        None => "results.json".to_string(),
    };
    let path = std::path::PathBuf::from(dir).join(filename);
    let json = serde_json::to_string_pretty(results)?;
    std::fs::write(&path, json)
        .with_context(|| format!("failed to write {:?}", path))?;
    Ok(())
}

pub fn save_server_specs(dir: &str) -> anyhow::Result<()> {
    let mem = sys_info::mem_info().ok();
    let disk = sys_info::disk_info().ok();

    let kb_to_gb = |kb: u64| (kb as f64 / 1_048_576.0 * 100.0).round() / 100.0;

    let ram_total = mem.as_ref().map(|m| kb_to_gb(m.total)).unwrap_or(0.0);
    let ram_available = mem.as_ref().map(|m| kb_to_gb(m.avail)).unwrap_or(0.0);
    let swap_total = mem.as_ref().map(|m| kb_to_gb(m.swap_total)).unwrap_or(0.0);

    let specs = serde_json::json!({
        "hostname": sys_info::hostname().unwrap_or_else(|_| "unknown".into()),
        "os": format!("{} {}",
            sys_info::os_type().unwrap_or_else(|_| "unknown".into()),
            sys_info::os_release().unwrap_or_else(|_| "unknown".into()),
        ),
        "processor": format!("{} Core(s), {} MHz",
            sys_info::cpu_num().unwrap_or(0),
            sys_info::cpu_speed().unwrap_or(0),
        ),
        "ram_total_gb": ram_total,
        "ram_available_gb": ram_available,
        "virtual_memory_gb": (ram_total * 100.0 + swap_total * 100.0).round() / 100.0,
        "virtual_memory_available_gb": (ram_available * 100.0 + mem.as_ref().map(|m| kb_to_gb(m.swap_free)).unwrap_or(0.0) * 100.0).round() / 100.0,
        "page_file_space_gb": swap_total,
        "storage_total_gb": disk.as_ref().map(|d| (d.total as f64 / 1_048_576.0 * 100.0).round() / 100.0).unwrap_or(0.0),
        "storage_free_gb": disk.as_ref().map(|d| (d.free as f64 / 1_048_576.0 * 100.0).round() / 100.0).unwrap_or(0.0),
    });

    let path = std::path::PathBuf::from(dir).join("server_specs.json");
    let json = serde_json::to_string_pretty(&specs)?;
    std::fs::write(&path, json)
        .with_context(|| format!("failed to write {:?}", path))?;
    Ok(())
}

pub fn save_run_config(
    dir: &str,
    config: &Config,
    cli_flags: &serde_json::Value,
) -> anyhow::Result<()> {
    let run_config = serde_json::json!({
        "cli": cli_flags,
        "config": config,
    });

    let path = std::path::PathBuf::from(dir).join("config.json");
    let json = serde_json::to_string_pretty(&run_config)?;
    std::fs::write(&path, json)
        .with_context(|| format!("failed to write {:?}", path))?;
    Ok(())
}
