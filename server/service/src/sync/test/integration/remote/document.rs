use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::{IntegrationRecords, PullUpsertRecord},
};
use chrono::Utc;
use repository::{Document, DocumentStatus};
use serde_json::json;
use util::uuid::uuid;

pub struct DocumentRecordTester;
impl SyncRecordTester for DocumentRecordTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();

        // STEP 1: document sync
        let patient_name_id = uuid();
        let patient_name_json = json!({
            "ID": patient_name_id,
            "type": "patient",
            "customer": true,
            "supplier": false,
            "female": false,
        });
        let patient_name_store_join_json = json!({
            "ID": uuid(),
            "name_ID": patient_name_id,
            "store_ID": new_site_properties.store_id
        });
        let schema_id = uuid();
        let schema_json = json!({
            "ID": schema_id,
            "type": "JSONForms",
            "json_schema": "{}",
            "ui_schema": "{\"test\":1}",
        });

        let row = Document {
            id: uuid(),
            name: "document/name".to_string(),
            parent_ids: vec![],
            user_id: "some_user".to_string(),
            datetime: Utc::now(),
            r#type: "MyDocument".to_string(),
            data: json!({"some": "data"}),
            form_schema_id: Some(schema_id),
            status: DocumentStatus::Active,
            comment: Some("comment".to_string()),
            owner_name_id: Some(patient_name_id),
            context: Some("program".to_string()),
        };

        result.push(TestStepData {
            central_upsert: json!({
                "name": [patient_name_json],
                "name_store_join": [patient_name_store_join_json],
                "form_schema": [schema_json],
            }),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::Document(row.clone()),
            ]),
        });

        result
    }
}
