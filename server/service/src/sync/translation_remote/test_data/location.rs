use repository::{ChangelogAction, ChangelogRow, ChangelogTableName, LocationRow, SyncBufferRow};
use serde_json::json;
use util::inline_init;

use crate::sync::translation_remote::{
    location::LegacyLocationRow,
    pull::{IntegrationRecord, IntegrationUpsertRecord},
    TRANSLATION_RECORD_LOCATION,
};

use super::{TestSyncPushRecord, TestSyncRecord};

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

fn location_pull_record() -> TestSyncRecord {
    TestSyncRecord {
        translated_record: Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Location(LocationRow {
                id: LOCATION_1.0.to_string(),
                name: "NameRed.02".to_string(),
                code: "Red.02".to_string(),
                on_hold: false,
                store_id: "store_a".to_string(),
            }),
        )),
        identifier: "Location 1",
        remote_sync_buffer_row: inline_init(|r: &mut SyncBufferRow| {
            r.table_name = TRANSLATION_RECORD_LOCATION.to_string();
            r.record_id = LOCATION_1.0.to_string();
            r.data = LOCATION_1.1.to_string();
        }),
    }
}
fn location_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: ChangelogRow {
            id: 2,
            table_name: ChangelogTableName::Location,
            row_id: LOCATION_1.0.to_string(),
            row_action: ChangelogAction::Upsert,
        },
        push_data: json!(LegacyLocationRow {
            id: LOCATION_1.0.to_string(),
            name: "NameRed.02".to_string(),
            code: "Red.02".to_string(),
            on_hold: false,
            store_id: "store_a".to_string(),
        }),
    }
}

#[allow(dead_code)]
pub fn get_test_location_records() -> Vec<TestSyncRecord> {
    vec![location_pull_record()]
}

#[allow(dead_code)]
pub fn get_test_push_location_records() -> Vec<TestSyncPushRecord> {
    vec![location_push_record()]
}
