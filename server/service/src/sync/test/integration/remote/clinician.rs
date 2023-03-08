use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::{IntegrationRecords, PullDeleteRecord, PullDeleteRecordTable, PullUpsertRecord},
};
use repository::{ClinicianRow, ClinicianStoreJoinRow, Gender, StoreRow};
use serde_json::json;
use util::{
    inline_edit,
    uuid::{small_uuid, uuid},
};

pub struct ClinicianRecordTester;
impl SyncRecordTester for ClinicianRecordTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let clinician_row = ClinicianRow {
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
            "ID": clinician_row.id,
            "code": clinician_row.code,
            "initials": clinician_row.initials,
            "last_name": clinician_row.last_name,
            "active": true,
            "female": false
        });

        let store_row = StoreRow {
            id: uuid(),
            name_id: new_site_properties.name_id.to_owned(),
            code: small_uuid(),
            site_id: new_site_properties.site_id as i32,
            logo: None,
        };
        let store_json = json!({
            "ID": store_row.id,
            "code": store_row.code,
            "name_ID": store_row.name_id,
            "sync_id_remote_site": store_row.site_id,
            "store_mode": "dispensary"
        });

        result.push(TestStepData {
            central_upsert: json!({
                "clinician": [clinician_json],
                "store": [store_json],
            }),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::Clinician(clinician_row.clone()),
                PullUpsertRecord::Store(store_row.clone()),
            ]),
        });

        // STEP 2 - store join for clinician
        let join_row = ClinicianStoreJoinRow {
            id: uuid(),
            store_id: store_row.id,
            clinician_id: clinician_row.id.clone(),
        };
        let join_json = json!({
            "ID": join_row.id,
            "store_ID": join_row.store_id,
            "clinician_ID": join_row.clinician_id,
        });

        result.push(TestStepData {
            central_upsert: json!({
                "clinician_store_join": [join_json],
            }),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::ClinicianStoreJoin(join_row.clone()),
            ]),
        });

        // STEP 3 - mutate
        let row = inline_edit(&clinician_row, |mut d| {
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
