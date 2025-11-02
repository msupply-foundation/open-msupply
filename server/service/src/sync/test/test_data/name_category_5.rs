use crate::sync::{
    test::{TestSyncIncomingRecord, TestSyncOutgoingRecord},
    translations::name_category_5::LegacyNameCategory5Row,
};
use repository::{types::PropertyValueType, PropertyRow};
use serde_json::json;

const TABLE_NAME: &str = "name_category5";

const NAME_CATEGORY_5_1: (&str, &str) = (
    "supply_level:Primary",
    r#"{
        "ID": "supply_level:Primary",
        "description": "Primary",
        "type": "c"
    }"#,
);

fn name_category_5_1() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        NAME_CATEGORY_5_1,
        PropertyRow {
            id: "supply_level".to_string(),
            key: "supply_level".to_string(),
            name: "Supply Level".to_string(),
            value_type: PropertyValueType::String,
            allowed_values: Some("Primary".to_string()),
        },
    )
}

const NAME_CATEGORY_5_2: (&str, &str) = (
    "supply_level:Secondary",
    r#"{
    "ID": "supply_level:Secondary",
    "description": "Secondary",
    "type": "c"
}"#,
);

fn name_category_5_2() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        NAME_CATEGORY_5_2,
        PropertyRow {
            id: "supply_level".to_string(),
            key: "supply_level".to_string(),
            name: "Supply Level".to_string(),
            value_type: PropertyValueType::String,
            allowed_values: Some("Secondary".to_string()),
        },
    )
}
fn name_category_5_push_record_1() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: "supply_level:Primary".to_string(),
        push_data: json!(LegacyNameCategory5Row {
            ID: "supply_level:Primary".to_string(),
            description: "Primary".to_string(),
            r#type: "c".to_string(),
        }),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![name_category_5_1(), name_category_5_2()]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![name_category_5_push_record_1()]
}
