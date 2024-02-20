use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::IntegrationOperation,
};
use repository::{ContextRow, DocumentRegistryCategory, DocumentRegistryRow, FormSchemaJson};
use serde_json::json;
use util::uuid::uuid;

pub(crate) struct DocumentRegistryTester;

impl SyncRecordTester for DocumentRegistryTester {
    fn test_step_data(&self, _: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let context = ContextRow {
            id: "some context".to_string(),
            name: "".to_string(),
        };
        let master_list_json = json!({
            "ID": context.id.clone(),
            "description": context.name.clone(),
            "isProgram": true,
            "code": "",
            "note": "",
            "programSettings": { "storeTags": {} },
        });
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
            category: DocumentRegistryCategory::ProgramEnrolment,
            document_type: "TestProgram".to_string(),
            context_id: context.id.clone(),
            name: Some("Some name".to_string()),
            form_schema_id: Some(form_row1.id.clone()),
            config: Some("{}".to_string()),
        };
        let doc_registry_json1 = json!({
            "ID": doc_registry1.id,
            "category": "PROGRAM_ENROLMENT",
            "document_type": "TestProgram",
            "context_ID": context.id.clone(),
            "name": "Some name",
            "form_schema_ID": form_row1.id,
            "config": "{}",
        });

        result.push(TestStepData {
            central_upsert: json!({
                "list_master": [master_list_json],
                "form_schema": [form_json1],
                "om_document_registry": [doc_registry_json1],
            }),
            integration_records: vec![
                IntegrationOperation::upsert(form_row1),
                IntegrationOperation::upsert(doc_registry1),
            ],
            ..Default::default()
        });

        result
    }
}
