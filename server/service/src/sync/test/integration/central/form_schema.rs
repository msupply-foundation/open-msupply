use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::IntegrationOperation,
};
use repository::FormSchemaJson;
use serde_json::json;
use util::uuid::uuid;

pub(crate) struct FormSchemaTester;

impl SyncRecordTester for FormSchemaTester {
    fn test_step_data(&self, _: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let row1 = FormSchemaJson {
            id: uuid(),
            r#type: "JSONForms".to_string(),
            json_schema: serde_json::from_str("{}").unwrap(),
            ui_schema: serde_json::from_str("{\"test\":1}").unwrap(),
        };
        let json1 = json!({
            "ID": row1.id,
            "type":  "JSONForms",
            "json_schema": "{}",
            "ui_schema": "{\"test\":1}",
        });

        result.push(TestStepData {
            central_upsert: json!({
                "form_schema": [json1],
            }),
            integration_records: vec![IntegrationOperation::upsert(row1)],
            ..Default::default()
        });

        result
    }
}
