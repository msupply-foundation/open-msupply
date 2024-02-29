use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::{IntegrationRecords, PullUpsertRecord},
};
use chrono::NaiveDate;
use repository::{Gender, NameRow, NameStoreJoinRow, NameType, StoreMode, StoreRow};

use serde_json::json;
use util::{
    inline_edit, inline_init,
    uuid::{small_uuid, uuid},
};

pub(crate) struct PatientNameAndStoreAndNameStoreJoinTester;

impl SyncRecordTester for PatientNameAndStoreAndNameStoreJoinTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let facility_name_row = inline_init(|r: &mut NameRow| {
            r.id = uuid();
            r.r#type = NameType::Facility;
            r.name = "facility".to_string();
            r.is_customer = true;
            r.is_supplier = true;
        });
        let facility_name_json = json!({
            "ID": facility_name_row.id,
            "type": "facility",
            "name": "facility",
            "customer": true,
            "supplier": true,
        });

        let store_row = StoreRow {
            id: uuid(),
            name_id: facility_name_row.id.clone(),
            code: small_uuid(),
            site_id: new_site_properties.site_id as i32,
            logo: None,
            store_mode: StoreMode::Dispensary,
        };
        let store_json = json!({
            "ID": store_row.id,
            "code": store_row.code,
            "name_ID": store_row.name_id,
            "sync_id_remote_site": store_row.site_id,
            "store_mode": "dispensary"
        });

        let patient_name_row = inline_init(|r: &mut NameRow| {
            r.id = uuid();
            r.r#type = NameType::Patient;
            r.first_name = Some("Random".to_string());
            r.is_customer = true;
            r.is_supplier = false;
            r.gender = Some(Gender::Male);
            r.supplying_store_id = Some(store_row.id.clone());
        });
        let patient_name_json = json!({
            "ID": patient_name_row.id,
            "type": "patient",
            "customer": true,
            "supplier": false,
            "female": false,
            "om_gender": "MALE",
            "first": "Random",
            "supplying_store_id": patient_name_row.supplying_store_id
        });

        let patient_name_store_join_row = NameStoreJoinRow {
            id: uuid(),
            name_link_id: patient_name_row.id.clone(),
            store_id: store_row.id.clone(),
            name_is_customer: true,
            name_is_supplier: false,
        };
        let patient_name_store_join_json = json!({
            "ID": patient_name_store_join_row.id,
            "name_ID": patient_name_store_join_row.name_link_id,
            "store_ID": patient_name_store_join_row.store_id
        });

        result.push(TestStepData {
            central_upsert: json!({
                "store": [store_json ],
                "name": [patient_name_json, facility_name_json],
                "name_store_join": [patient_name_store_join_json],
            }),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::Name(patient_name_row.clone()),
                PullUpsertRecord::Name(facility_name_row),
                PullUpsertRecord::NameStoreJoin(patient_name_store_join_row),
                PullUpsertRecord::Store(store_row),
            ]),
        });

        // STEP 2 - update patient name
        let patient_row = inline_edit(&patient_name_row, |mut p| {
            p.first_name = Some("Rebeus".to_string());
            p.last_name = Some("Hagrid".to_string());
            p.date_of_death = Some(NaiveDate::from_ymd_opt(2023, 09, 21).unwrap());
            p
        });

        result.push(TestStepData {
            central_upsert: json!({}),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![PullUpsertRecord::Name(
                patient_row,
            )]),
        });

        result
    }
}
