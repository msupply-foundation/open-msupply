use repository::{DocumentRegistryCategory, DocumentRegistryRow};
use serde_json::json;

// Data in this file is used in "test_om_document_registry_translation" and "test_sync_pull_and_push"
use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "document_registry";

// The context and schema are mock rows (`context_program_a`, `mock_form_schema_simple`).
const DOCUMENT_REGISTRY: (&str, &str) = (
    "demo_program_DemoEncounter",
    r#"{
        "id": "demo_program_DemoEncounter",
        "category": "Encounter",
        "document_type": "DemoEncounter",
        "context_id": "program_a",
        "name": "Demo encounter",
        "form_schema_id": "simple_form_schema",
        "config": "{\"events\":[]}",
        "plugin_code": "demo_program",
        "program_key": "demo"
    }"#,
);

fn document_registry() -> DocumentRegistryRow {
    DocumentRegistryRow {
        id: DOCUMENT_REGISTRY.0.to_string(),
        category: DocumentRegistryCategory::Encounter,
        document_type: "DemoEncounter".to_string(),
        context_id: "program_a".to_string(),
        name: Some("Demo encounter".to_string()),
        form_schema_id: Some("simple_form_schema".to_string()),
        config: Some(r#"{"events":[]}"#.to_string()),
        plugin_code: Some("demo_program".to_string()),
        program_key: Some("demo".to_string()),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        DOCUMENT_REGISTRY,
        document_registry(),
    )]
}

pub(crate) fn test_v6_central_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        // Sent under a record id of its own, not the entry's id
        // (`document_registry_om::sync_record_id`).
        record_id: format!("{}_oms_central", DOCUMENT_REGISTRY.0),
        push_data: json!(document_registry()),
    }]
}
