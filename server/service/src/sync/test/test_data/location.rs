use crate::sync::translations::location::LegacyLocationRow;

use repository::LocationRow;
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "Location";

const LOCATION_1: (&str, &str) = (
    "cf5812e0c33911eb9757779d39ae2bdb",
    r#"{
        "ID": "cf5812e0c33911eb9757779d39ae2bdb",
        "code": "Red.02",
        "Description": "NameRed.02",
        "Comment": "",
        "Volume": 0,
        "type_ID": "",
        "object_type": "",
        "parent_id": "",
        "Colour": "",
        "bottom_y_coordinate": 0,
        "summary_only": false,
        "store_ID": "store_a",
        "priority": 0,
        "hold": false,
        "replenishment_type": "",
        "asset_ID": ""
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        LOCATION_1,
        LocationRow {
            id: LOCATION_1.0.to_string(),
            name: "NameRed.02".to_string(),
            code: "Red.02".to_string(),
            on_hold: false,
            store_id: "store_a".to_string(),
        },
    )]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: LOCATION_1.0.to_string(),
        push_data: json!(LegacyLocationRow {
            id: LOCATION_1.0.to_string(),
            name: "NameRed.02".to_string(),
            code: "Red.02".to_string(),
            on_hold: false,
            store_id: "store_a".to_string(),
        }),
    }]
}
