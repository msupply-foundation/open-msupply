use crate::sync::test::{TestSyncIncomingRecord, TestSyncOutgoingRecord};
use repository::NameOmsFieldsRow;
use serde_json::json;

const TABLE_NAME: &str = "name_oms_fields";

const NAME_OMS_FIELDS_1: (&str, &str) = (
    "1FB32324AF8049248D929CFB35F25NOF",
    r#"{
        "id": "1FB32324AF8049248D929CFB35F25NOF",
        "properties": "{\"key\":\"test\"}"
}"#,
);

fn name_oms_fields_1() -> NameOmsFieldsRow {
    NameOmsFieldsRow {
        id: NAME_OMS_FIELDS_1.0.to_owned(),
        properties: Some("{\"key\":\"test\"}".to_string()),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        NAME_OMS_FIELDS_1,
        name_oms_fields_1(),
    )]
}

pub(crate) fn test_v6_central_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: NAME_OMS_FIELDS_1.0.to_string(),
        push_data: json!(name_oms_fields_1()),
    }]
}
