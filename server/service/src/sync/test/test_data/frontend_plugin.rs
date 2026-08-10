use repository::{
    FrontendPluginFile, FrontendPluginFiles, FrontendPluginRow, FrontendPluginRowDelete,
    FrontendPluginTypes, HostRuntime, LEGACY_HOST_RUNTIME, LEGACY_PLUGIN_API_VERSION,
};
use serde_json::json;

// Data in this file is used in "test_frontend_plugin_translation" and "test_sync_pull_and_push"
use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "frontend_plugin";

// Deliberately WITHOUT `host_runtime` or `plugin_api_version`: this is the
// shape every row installed before the columns existed still has on the wire,
// and it must keep translating — arriving as `react` at API 0, which is a true
// description of it, since no bundle for any other runtime could exist before
// the fields did.
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
        }],
        "version": "1.0.0"
    }"#,
);

// The other direction: a bundle built for a named front end declares both the
// runtime it targets and where it sits on that runtime's API number line.
const FRONTEND_PLUGIN_WITH_HOST_RUNTIME: (&str, &str) = (
    "frontend_plugin_with_host_runtime",
    r#"{
        "id":  "frontend_plugin_with_host_runtime",
        "entry_point": "first_one.js",
        "code": "code",
        "types": ["plugin_type"],
        "files": [ {
            "file_name": "first_one.js",
            "file_content_base64": "base64stuffhere"
        }],
        "version": "3.0.0",
        "host_runtime": "solid",
        "plugin_api_version": 1
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
        version: "1.0.0".to_string(),
        host_runtime: HostRuntime(LEGACY_HOST_RUNTIME.to_string()),
        plugin_api_version: LEGACY_PLUGIN_API_VERSION,
    }
}

fn frontend_plugin_with_host_runtime() -> FrontendPluginRow {
    FrontendPluginRow {
        id: FRONTEND_PLUGIN_WITH_HOST_RUNTIME.0.to_string(),
        version: "3.0.0".to_string(),
        host_runtime: HostRuntime("solid".to_string()),
        plugin_api_version: 1,
        ..frontend_plugin()
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(TABLE_NAME, FRONTEND_PLUGIN, frontend_plugin()),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            FRONTEND_PLUGIN_WITH_HOST_RUNTIME,
            frontend_plugin_with_host_runtime(),
        ),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        FRONTEND_PLUGIN.0,
        FrontendPluginRowDelete(FRONTEND_PLUGIN.0.to_string()),
    )]
}

pub(crate) fn test_v6_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: FRONTEND_PLUGIN.0.to_string(),
        push_data: json!(frontend_plugin()),
    }]
}
