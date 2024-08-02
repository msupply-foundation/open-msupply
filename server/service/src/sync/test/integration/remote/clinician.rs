use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::IntegrationOperation,
};
use chrono::NaiveDate;
use repository::{ClinicianRow, ClinicianStoreJoinRow, GenderType, StoreMode, StoreRow};
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
        let store_row = StoreRow {
            id: uuid(),
            name_link_id: new_site_properties.name_id.to_owned(),
            code: small_uuid(),
            site_id: new_site_properties.site_id as i32,
            logo: None,
            store_mode: StoreMode::Dispensary,
            created_date: NaiveDate::from_ymd_opt(2021, 1, 1),
            is_disabled: false,
        };
        let store_json = json!({
            "ID": store_row.id,
            "code": store_row.code,
            "name_ID": store_row.name_link_id,
            "sync_id_remote_site": store_row.site_id,
            "store_mode": "dispensary",
            "created_date": "2021-01-01"
        });

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
            gender: Some(GenderType::Male),
            is_active: true,
        };

        let clinician_json = json!({
            "ID": clinician_row.id,
            "code": clinician_row.code,
            "initials": clinician_row.initials,
            "last_name": clinician_row.last_name,
            "active": true,
            "female": false,
            "store_ID": store_row.id.clone()
        });

        let join_row = ClinicianStoreJoinRow {
            id: uuid(),
            store_id: store_row.id.clone(),
            clinician_link_id: clinician_row.id.clone(),
        };
        let join_json = json!({
            "ID": join_row.id,
            "store_ID": join_row.store_id,
            "prescriber_ID": join_row.clinician_link_id,
        });

        result.push(TestStepData {
            central_upsert: json!({
                "store": [store_json],
                "clinician": [clinician_json],
                "clinician_store_join": [join_json],
            }),
            integration_records: vec![
                IntegrationOperation::upsert(store_row),
                IntegrationOperation::upsert(clinician_row.clone()),
                IntegrationOperation::upsert(join_row),
            ],
            ..Default::default()
        });

        // STEP 2 - mutate
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
            d.gender = Some(GenderType::Female);
            d
        });

        result.push(TestStepData {
            integration_records: vec![IntegrationOperation::upsert(row)],
            ..Default::default()
        });
        result
    }
}
