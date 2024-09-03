use repository::demographic_indicator_row::DemographicIndicatorRow;
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "demographic_indicator";

const DEMOGRAPHIC_INDICATOR1: (&str, &str) = (
    "test_demographic_indicator",
    r#"{
        "id":  "test_demographic_indicator",
        "name": "test demographic",
        "base_year": 0,
        "base_population": 0,
        "population_percentage": 0.0,
        "year_1_projection": 0,
        "year_2_projection": 0,
        "year_3_projection": 0,
        "year_4_projection": 0,
        "year_5_projection": 0
    }"#,
);

fn demographic_indicator1() -> DemographicIndicatorRow {
    DemographicIndicatorRow {
        id: DEMOGRAPHIC_INDICATOR1.0.to_string(),
        name: "test demographic".to_string(),
        base_year: 0,
        base_population: 0,
        population_percentage: 0.0,
        year_1_projection: 0,
        year_2_projection: 0,
        year_3_projection: 0,
        year_4_projection: 0,
        year_5_projection: 0,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        DEMOGRAPHIC_INDICATOR1,
        demographic_indicator1(),
    )]
}

pub(crate) fn test_v6_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: DEMOGRAPHIC_INDICATOR1.0.to_string(),
        push_data: json!(demographic_indicator1()),
    }]
}
