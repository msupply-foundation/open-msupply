use repository::{FrontendPluginFile, FrontendPluginFiles, FrontendPluginRow, FrontendPluginTypes};
use serde_json::json;

// Data in this file is used in "test_frontend_plugin_translation" and "test_sync_pull_and_push"
use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "frontend_plugin";

const FRONTEND_PLUGIN: (&str, &str) = (
    "frontend_plugin",
    r#"{
        "id":  "frontend_plugin",
        "entry_point": "first_one.js",
        "code": "code",
        "types": ["plugin_type"],
        "files": [ {
            "file_name": "first_one.js",
            "file_content_base64": "base64stuffhere"
        }]
    }"#,
);

fn frontend_plugin() -> FrontendPluginRow {
    FrontendPluginRow {
        id: FRONTEND_PLUGIN.0.to_string(),
        code: "code".to_string(),
        types: FrontendPluginTypes(vec!["plugin_type".to_string()]),
        entry_point: "first_one.js".to_string(),
        files: FrontendPluginFiles(vec![FrontendPluginFile {
            file_name: "first_one.js".to_string(),
            file_content_base64: "base64stuffhere".to_string(),
        }]),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        FRONTEND_PLUGIN,
        frontend_plugin(),
    )]
}

pub(crate) fn test_v6_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: FRONTEND_PLUGIN.0.to_string(),
        push_data: json!(frontend_plugin()),
    }]
}
