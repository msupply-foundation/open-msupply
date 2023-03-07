use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::{IntegrationRecords, PullDeleteRecord, PullDeleteRecordTable, PullUpsertRecord},
};
use repository::{ClinicianRow, ClinicianStoreJoinRow, Gender};
use serde_json::json;
use util::{inline_edit, uuid::uuid};

pub struct ClinicianRecordTester;
impl SyncRecordTester for ClinicianRecordTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let store_id = &new_site_properties.store_id;
        let row = ClinicianRow {
            id: uuid(),
            code: "code".to_string(),
            last_name: "last".to_string(),
            initials: "initials".to_string(),
            first_name: None,
            address1: None,
            address2: None,
            phone: None,
            mobile: None,
            email: None,
            gender: Some(Gender::Male),
            is_active: true,
        };

        let clinician_json = json!({
            "id": row.id,
            "code": row.code,
            "last_name": row.last_name,
            "om_gender": "MALE",
            "is_active": true
        });
        let join_row = ClinicianStoreJoinRow {
            id: uuid(),
            store_id: store_id.to_string(),
            clinician_id: row.id.clone(),
        };

        result.push(TestStepData {
            central_upsert: json!({
                "clinician": [clinician_json],
            }),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::Clinician(row.clone()),
                PullUpsertRecord::ClinicianStoreJoin(join_row.clone()),
            ]),
        });
        // STEP 2 - mutate
        let row = inline_edit(&row, |mut d| {
            d.code = "code2".to_string();
            d.last_name = "last2".to_string();
            d.initials = "initials2".to_string();
            d.first_name = Some("first".to_string());
            d.address1 = Some("address1".to_string());
            d.address2 = Some("address2".to_string());
            d.phone = Some("phone".to_string());
            d.mobile = Some("mobile".to_string());
            d.email = Some("email".to_string());
            d.gender = Some(Gender::Female);
            d
        });
        result.push(TestStepData {
            central_upsert: json!({}),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::Clinician(row.clone()),
            ]),
        });
        // STEP 3 - delete
        result.push(TestStepData {
            central_upsert: json!({}),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_deletes(vec![
                PullDeleteRecord {
                    id: join_row.id.clone(),
                    table: PullDeleteRecordTable::ClinicianStoreJoin,
                },
                PullDeleteRecord {
                    id: row.id.clone(),
                    table: PullDeleteRecordTable::Clinician,
                },
            ]),
        });
        result
    }
}
