use crate::sync::test::TestSyncOutgoingRecord;

use super::TestSyncIncomingRecord;
use repository::PluginDataRow;
use serde_json::json;

const TABLE_NAME: &str = "plugin_data";

const PLUGIN_DATA: (&str, &str) = (
    "plugin_data",
    r#"{
        "id":  "plugin_data",
        "plugin_code": "plugin_code",
        "related_record_id": "Some related record",
        "data_identifier": "Some data identifier",
        "data": "can be json"
    }"#,
);

pub(crate) fn plugin_data() -> PluginDataRow {
    PluginDataRow {
        id: PLUGIN_DATA.0.to_string(),
        store_id: None,
        plugin_code: "plugin_code".to_string(),
        related_record_id: Some("Some related record".to_string()),
        data_identifier: "Some data identifier".to_string(),
        data: "can be json".to_string(),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PLUGIN_DATA,
        plugin_data(),
    )]
}

pub(crate) fn test_v6_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PLUGIN_DATA.0.to_string(),
        push_data: json!(plugin_data()),
    }]
}
