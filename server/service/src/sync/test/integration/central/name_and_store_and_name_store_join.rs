use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::{IntegrationRecords, PullDeleteRecord, PullDeleteRecordTable, PullUpsertRecord},
};
use chrono::NaiveDate;
use repository::{NameRow, NameStoreJoinRow, NameType, StoreRow};

use serde_json::json;
use util::{
    inline_init, merge_json,
    uuid::{small_uuid, uuid},
};

pub(crate) struct NameAndStoreAndNameStoreJoinTester;

impl SyncRecordTester for NameAndStoreAndNameStoreJoinTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let name_row1 = NameRow {
            id: uuid(),
            name: uuid(),
            code: small_uuid(),
            r#type: NameType::Facility,
            is_customer: true,
            is_supplier: true,
            supplying_store_id: None,
            first_name: Some(uuid()),
            last_name: Some(uuid()),
            gender: None,
            date_of_birth: NaiveDate::from_ymd_opt(1998, 07, 29),
            phone: Some(small_uuid()),
            charge_code: Some(small_uuid()),
            comment: Some(uuid()),
            country: Some(small_uuid()),
            address1: Some(uuid()),
            address2: Some(uuid()),
            email: Some(uuid()),
            website: Some(uuid()),
            is_manufacturer: true,
            is_donor: true,
            on_hold: true,
            created_datetime: NaiveDate::from_ymd_opt(2022, 05, 22)
                .unwrap()
                .and_hms_opt(0, 0, 0),
            is_deceased: false,
            national_health_number: None,
            is_sync_update: true,
        };
        let name_json1 = json!({
            "ID": name_row1.id,
            "name":  name_row1.name,
            "code": name_row1.code,
            "type": "facility",
            "customer": true,
            "supplier": true,
            "first": name_row1.first_name.as_ref().unwrap(),
            "last": name_row1.last_name.as_ref().unwrap(),
            "date_of_birth": "1998-07-29",
            "phone": name_row1.phone.as_ref().unwrap(),
            "charge code": name_row1.charge_code.as_ref().unwrap(),
            "comment": name_row1.comment.as_ref().unwrap(),
            "country": name_row1.country.as_ref().unwrap(),
            "bill_address1": name_row1.address1.as_ref().unwrap(),
            "bill_address2": name_row1.address2.as_ref().unwrap(),
            "email":  name_row1.email.as_ref().unwrap(),
            "url":  name_row1.website.as_ref().unwrap(),
            "manufacturer": true,
            "donor": true,
            "hold": true,
            "created_date": "2022-05-22",
            "is_deceased": false,
            "national_health_number": ""
        });

        let name_row2 = inline_init(|r: &mut NameRow| {
            r.id = uuid();
            r.r#type = NameType::Facility;
            r.is_customer = true;
            r.is_supplier = false;
            r.is_sync_update = true;
        });
        let mut name_json2 = json!({
            "ID": name_row2.id,
            "type": "facility",
            "customer": true,
            "supplier": false,
        });

        let store_row = StoreRow {
            id: uuid(),
            name_id: name_row1.id.clone(),
            code: small_uuid(),
            site_id: new_site_properties.site_id as i32,
            logo: None,
        };
        let store_json = json!({
            "ID": store_row.id,
            "code": store_row.code,
            "name_ID": store_row.name_id,
            "sync_id_remote_site": store_row.site_id,
            "store_mode": "store"
        });
        result.push(TestStepData {
            central_upsert: json!({
                "name": [name_json1, name_json2.clone()],
                "store": [store_json]
            }),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::Name(name_row1),
                PullUpsertRecord::Name(name_row2.clone()),
                PullUpsertRecord::Store(store_row.clone()),
            ]),
        });
        // STEP 2 name store joins need to be inserted after store (for them to be inserted in sync queue)
        let mut name_store_join_row1 = NameStoreJoinRow {
            id: uuid(),
            name_id: name_row2.id.clone(),
            store_id: new_site_properties.store_id.clone(),
            name_is_customer: true,
            name_is_supplier: false,
            is_sync_update: true,
        };
        let name_store_join_json1 = json!({
            "ID": name_store_join_row1.id,
            "name_ID": name_store_join_row1.name_id,
            "store_ID": name_store_join_row1.store_id

        });

        let mut name_store_join_row2 = NameStoreJoinRow {
            id: uuid(),
            name_id: name_row2.id.clone(),
            store_id: store_row.id.clone(),
            name_is_customer: true,
            name_is_supplier: false,
            is_sync_update: true,
        };
        let name_store_join_json2 = json!({
            "ID": name_store_join_row2.id,
            "name_ID": name_store_join_row2.name_id,
            "store_ID": name_store_join_row2.store_id
        });

        result.push(TestStepData {
            central_upsert: json!({
                "name_store_join": [name_store_join_json1, name_store_join_json2],
            }),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::NameStoreJoin(name_store_join_row1.clone()),
                PullUpsertRecord::NameStoreJoin(name_store_join_row2.clone()),
            ]),
        });
        // STEP 3 update name and make sure name_store_joins update
        merge_json(
            &mut name_json2,
            &json!({
                "customer": false,
                "supplier": true,
            }),
        );

        name_store_join_row1.name_is_customer = false;
        name_store_join_row2.name_is_customer = false;

        name_store_join_row1.name_is_supplier = true;
        name_store_join_row2.name_is_supplier = true;

        result.push(TestStepData {
            central_upsert: json!({
                "name": [name_json2],

            }),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::NameStoreJoin(name_store_join_row1.clone()),
                PullUpsertRecord::NameStoreJoin(name_store_join_row2),
            ]),
        });

        // STEP 4 - deletes
        // TODO should we check for name and store deletes ?
        result.push(TestStepData {
            central_upsert: json!({}),
            central_delete: json!({ "name_store_join": [name_store_join_row1.id] }),
            integration_records: IntegrationRecords::from_deletes(vec![PullDeleteRecord {
                id: name_store_join_row1.id,
                table: PullDeleteRecordTable::NameStoreJoin,
            }]),
        });
        result
    }
}
