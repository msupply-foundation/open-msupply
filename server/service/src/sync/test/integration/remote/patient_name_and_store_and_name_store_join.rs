use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::{IntegrationRecords, PullUpsertRecord},
};
use repository::{NameRow, NameStoreJoinRow, NameType, StoreRow};

use serde_json::json;
use util::{
    inline_init,
    uuid::{small_uuid, uuid},
};

pub(crate) struct NameAndStoreAndNameStoreJoinTester;

impl SyncRecordTester for NameAndStoreAndNameStoreJoinTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let facility_name_row = inline_init(|r: &mut NameRow| {
            r.id = uuid();
            r.r#type = NameType::Facility;
            r.is_customer = true;
            r.is_supplier = true;
        });

        let mut patient_name_row = inline_init(|r: &mut NameRow| {
            r.id = uuid();
            r.r#type = NameType::Patient;
            r.is_customer = true;
            r.is_supplier = false;
        });
        let mut patient_name_json = json!({
            "ID": patient_name_row.id,
            "type": "facility",
            "customer": true,
            "supplier": false,
        });

        let store_row = StoreRow {
            id: uuid(),
            name_id: facility_name_row.id.clone(),
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
                "name": [patient_name_json],
                "store": [store_json]
            }),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::Name(patient_name_row.clone()),
                PullUpsertRecord::Store(store_row.clone()),
            ]),
        });
        // STEP 2 name store joins need to be inserted after store
        let name_store_join = NameStoreJoinRow {
            id: uuid(),
            name_id: facility_name_row.id.clone(),
            store_id: store_row.id.clone(),
            name_is_customer: true,
            name_is_supplier: true,
        };

        let name_store_join_json = json!({
            "ID": name_store_join.id,
            "name_ID": name_store_join.name_id,
            "store_ID": name_store_join.store_id,
            "name_is_customer": name_store_join.name_is_customer,
            "name_is_supplier": name_store_join.name_is_supplier,
        });

        let patient_name_store_join_row1 = NameStoreJoinRow {
            id: uuid(),
            name_id: patient_name_row.id.clone(),
            store_id: new_site_properties.store_id.clone(),
            name_is_customer: true,
            name_is_supplier: false,
        };
        let patient_name_store_join_json1 = json!({
            "ID": patient_name_store_join_row1.id,
            "name_ID": patient_name_store_join_row1.name_id,
            "store_ID": patient_name_store_join_row1.id

        });

        let patient_name_store_join_row2 = NameStoreJoinRow {
            id: uuid(),
            name_id: patient_name_row.id.clone(),
            store_id: store_row.id.clone(),
            name_is_customer: true,
            name_is_supplier: false,
        };
        let patient_name_store_join_json2 = json!({
            "ID": patient_name_store_join_row2.id,
            "name_ID": patient_name_store_join_row2.name_id,
            "store_ID": patient_name_store_join_row2.store_id

        });

        result.push(TestStepData {
            central_upsert: json!({
                "name_store_join": [name_store_join_json, patient_name_store_join_json1, patient_name_store_join_json2],
            }),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::NameStoreJoin(name_store_join),
                PullUpsertRecord::NameStoreJoin(patient_name_store_join_row1.clone()),
                PullUpsertRecord::NameStoreJoin(patient_name_store_join_row2.clone()),
            ]),
        });

        // STEP 3 update patient name
        patient_name_row.first_name = Some("Rebeus".to_string());
        patient_name_row.last_name = Some("Hagrid".to_string());

        result.push(TestStepData {
            central_upsert: json!({}),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![PullUpsertRecord::Name(
                patient_name_row.clone(),
            )]),
        });

        result
    }
}
