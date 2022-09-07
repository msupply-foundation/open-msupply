use crate::sync::translations::{location::LegacyLocationRow, LegacyTableName, PullUpsertRecord};
use repository::{ChangelogAction, ChangelogRow, ChangelogTableName, LocationRow};
use serde_json::json;
use util::inline_init;

use super::{TestSyncPullRecord, TestSyncPushRecord};

const LOCATION_1: (&'static str, &'static str) = (
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

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![TestSyncPullRecord::new_pull_upsert(
        LegacyTableName::LOCATION,
        LOCATION_1,
        PullUpsertRecord::Location(LocationRow {
            id: LOCATION_1.0.to_string(),
            name: "NameRed.02".to_string(),
            code: "Red.02".to_string(),
            on_hold: false,
            store_id: "store_a".to_string(),
        }),
    )]
}

pub(crate) fn test_push_records() -> Vec<TestSyncPushRecord> {
    vec![TestSyncPushRecord {
        change_log: inline_init(|r: &mut ChangelogRow| {
            r.cursor = 2;
            r.table_name = ChangelogTableName::Location;
            r.record_id = LOCATION_1.0.to_string();
            r.row_action = ChangelogAction::Upsert;
        }),
        push_data: json!(LegacyLocationRow {
            id: LOCATION_1.0.to_string(),
            name: "NameRed.02".to_string(),
            code: "Red.02".to_string(),
            on_hold: false,
            store_id: "store_a".to_string(),
        }),
    }]
}
