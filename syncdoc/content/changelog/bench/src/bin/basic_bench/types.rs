use plotters::prelude::RGBColor;
use serde::{Deserialize, Serialize};

use anyhow::Context;

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
