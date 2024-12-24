use repository::BackendPluginRow;
use serde_json::json;

// Data in this file is used in "test_backend_plugin_translation" and "test_sync_pull_and_push"
use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "backend_plugin";

const BACKEND_PLUGIN: (&str, &str) = (
    "backend_plugin",
    r#"{
        "id":  "backend_plugin",
        "bundle_base64": "bundle_base64",
        "code": "code",
        "type": "AMC",
        "variant_type": "BOA_JS"
    }"#,
);

fn backend_plugin() -> BackendPluginRow {
    BackendPluginRow {
        id: BACKEND_PLUGIN.0.to_string(),
        code: "code".to_string(),
        bundle_base64: "bundle_base64".to_string(),
        r#type: repository::PluginType::Amc,
        variant_type: repository::PluginVariantType::BoaJs,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        BACKEND_PLUGIN,
        backend_plugin(),
    )]
}

pub(crate) fn test_v6_central_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: BACKEND_PLUGIN.0.to_string(),
        push_data: json!(backend_plugin()),
    }]
}
