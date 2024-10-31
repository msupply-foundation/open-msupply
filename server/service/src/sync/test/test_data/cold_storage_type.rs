use repository::ColdStorageTypeRow;

use super::TestSyncIncomingRecord;

const TABLE_NAME: &str = "Location_type";

const LOCATION_TYPE_1: (&str, &str) = (
    "84AA2B7A18694A2AB1E84DCABAD19617",
    r#"{
    "Description": "Cool Room",
    "ID": "84AA2B7A18694A2AB1E84DCABAD19617",
    "Temperature_max": 4,
    "Temperature_min": 1,
    "customData": null
  }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        LOCATION_TYPE_1,
        ColdStorageTypeRow {
            id: LOCATION_TYPE_1.0.to_string(),
            name: "Cool Room".to_string(),
            min_temperature: 1.0,
            max_temperature: 4.0,
        },
    )]
}
