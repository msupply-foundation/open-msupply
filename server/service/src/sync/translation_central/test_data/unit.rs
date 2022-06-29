use crate::sync::translation_central::test_data::{TestSyncDataRecord, TestSyncRecord};
use repository::{SyncBufferRow, UnitRow};
use util::inline_init;

const UNIT_1: (&'static str, &'static str) = (
    "A02C91EB6C77400BA783C4CD7C565F29",
    r#"{
        "ID": "A02C91EB6C77400BA783C4CD7C565F29",
        "units": "Units",
        "comment": "",
        "order_number": 0
    }"#,
);

const UNIT_2: (&'static str, &'static str) = (
    "EC87200254974C609293D88E470598C4",
    r#"{
        "ID": "EC87200254974C609293D88E470598C4",
        "units": "Tab",
        "comment": "",
        "order_number": 1
    }"#,
);

const UNIT_1_UPSERT: (&'static str, &'static str) = (
    "A02C91EB6C77400BA783C4CD7C565F29",
    r#"{
        "ID": "A02C91EB6C77400BA783C4CD7C565F29",
        "units": "Bottle",
        "comment": "This is a bottle unit type",
        "order_number": 2
    }"#,
);

#[allow(dead_code)]
const RECORD_TYPE: &'static str = "unit";
#[allow(dead_code)]
pub fn get_test_unit_records() -> Vec<TestSyncRecord> {
    vec![
        TestSyncRecord {
            translated_record: TestSyncDataRecord::Unit(Some(UnitRow {
                id: UNIT_1.0.to_owned(),
                name: "Units".to_owned(),
                description: None,
                index: 0,
            })),
            identifier: "Unit - units",
            central_sync_buffer_row: inline_init(|r: &mut SyncBufferRow| {
                r.table_name = RECORD_TYPE.to_owned();
                r.record_id = UNIT_1.0.to_owned();
                r.data = UNIT_1.1.to_owned();
            }),
        },
        TestSyncRecord {
            translated_record: TestSyncDataRecord::Unit(Some(UnitRow {
                id: UNIT_2.0.to_owned(),
                name: "Tab".to_owned(),
                description: None,
                index: 1,
            })),
            identifier: "Unit - tab",
            central_sync_buffer_row: inline_init(|r: &mut SyncBufferRow| {
                r.table_name = RECORD_TYPE.to_owned();
                r.record_id = UNIT_2.0.to_owned();
                r.data = UNIT_2.1.to_owned();
            }),
        },
    ]
}
#[allow(dead_code)]
pub fn get_test_unit_upsert_records() -> Vec<TestSyncRecord> {
    vec![TestSyncRecord {
        translated_record: TestSyncDataRecord::Unit(Some(UnitRow {
            id: UNIT_1_UPSERT.0.to_owned(),
            name: "Bottle".to_owned(),
            description: Some("This is a bottle unit type".to_owned()),
            index: 2,
        })),
        identifier: "Unit upsert 1",
        central_sync_buffer_row: inline_init(|r: &mut SyncBufferRow| {
            r.table_name = RECORD_TYPE.to_owned();
            r.record_id = UNIT_1_UPSERT.0.to_owned();
            r.data = UNIT_1_UPSERT.1.to_owned();
        }),
    }]
}
