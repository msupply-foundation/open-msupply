use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::{IntegrationRecords, PullUpsertRecord},
};
use repository::{DocumentContext, DocumentRegistryRow, FormSchemaJson};
use serde_json::json;
use util::uuid::uuid;

pub(crate) struct DocumentRegistryTester;

impl SyncRecordTester for DocumentRegistryTester {
    fn test_step_data(&self, _: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let form_row1 = FormSchemaJson {
            id: uuid(),
            r#type: "JSONForms".to_string(),
            json_schema: serde_json::from_str("{}").unwrap(),
            ui_schema: serde_json::from_str("{\"test\":1}").unwrap(),
        };
        let form_json1 = json!({
            "ID": form_row1.id,
            "type":  "JSONForms",
            "json_schema": "{}",
            "ui_schema": "{\"test\":1}",
        });

        let doc_registry1 = DocumentRegistryRow {
            id: uuid(),
            document_type: "TestProgram".to_string(),
            context: DocumentContext::Program,
            name: Some("Some name".to_string()),
            parent_id: None,
            form_schema_id: Some(form_row1.id.clone()),
            config: Some("{}".to_string()),
        };
        let doc_registry_json1 = json!({
            "ID": doc_registry1.id,
            "document_type": "TestProgram",
            "context": "PROGRAM",
            "name": "Some name",
            "form_schema_ID": form_row1.id,
            "config": "{}",
        });

        result.push(TestStepData {
            central_upsert: json!({
                "form_schema": [form_json1],
                "om_document_registry": [doc_registry_json1],
            }),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::FormSchema(form_row1),
                PullUpsertRecord::DocumentRegistry(doc_registry1),
            ]),
        });

        result
    }
}
