use repository::{mock::MockData, NameRow, NameStoreJoinRow, StoreRow, SyncBufferRow};
use serde_json::json;
use util::{inline_edit, inline_init};

use crate::sync::{
    test::{TestSyncIncomingRecord, TestSyncOutgoingRecord},
    translations::{name_store_join::LegacyNameStoreJoinRow, PullTranslateResult},
};

const TABLE_NAME: &str = "name_store_join";

const NAME_1: (&str, &str) = (
    "BEB2D69692C44B32B24BEBD5020BCD14",
    r#"{
        "ID": "BEB2D69692C44B32B24BEBD5020BCD14",
        "supplier": false,
        "customer": true,
        "name": "General",
        "fax": "",
        "phone": "",
        "bill_address1": "",
        "bill_address2": "",
        "charge code": "GEN",
        "margin": 0,
        "comment": "",
        "currency_ID": "72C3E81AEF1F460686C31B1A1151E8C0",
        "country": "",
        "freightfac": 0,
        "email": "",
        "custom1": "",
        "code": "GEN",
        "last": "",
        "first": "",
        "title": "",
        "female": false,
        "date_of_birth": "0000-00-00",
        "overpayment": 0,
        "group_ID": "",
        "hold": false,
        "ship_address1": "",
        "ship_address2": "",
        "url": "",
        "barcode": "",
        "postal_address1": "",
        "postal_address2": "",
        "category1_ID": "",
        "region_ID": "",
        "type": "store",
        "price_category": "",
        "flag": "",
        "manufacturer": false,
        "print_invoice_alphabetical": false,
        "custom2": "",
        "custom3": "",
        "default_order_days": 0,
        "connection_type": 0,
        "PATIENT_PHOTO": "",
        "NEXT_OF_KIN_ID": "",
        "POBOX": "",
        "ZIP": 0,
        "middle": "",
        "preferred": false,
        "Blood_Group": "",
        "marital_status": "",
        "Benchmark": false,
        "next_of_kin_relative": "",
        "mother_id": "",
        "postal_address3": "",
        "postal_address4": "",
        "bill_address3": "",
        "bill_address4": "",
        "ship_address3": "",
        "ship_address4": "",
        "ethnicity_ID": "",
        "occupation_ID": "",
        "religion_ID": "",
        "national_health_number": "",
        "Master_RTM_Supplier_Code": 0,
        "ordering_method": "",
        "donor": false,
        "latitude": 0,
        "longitude": 0,
        "Master_RTM_Supplier_name": "",
        "category2_ID": "",
        "category3_ID": "",
        "category4_ID": "",
        "category5_ID": "",
        "category6_ID": "",
        "bill_address5": "",
        "bill_postal_zip_code": "",
        "postal_address5": "",
        "postal_zip_code": "",
        "ship_address5": "",
        "ship_postal_zip_code": "",
        "supplying_store_id": "",
        "license_number": "",
        "license_expiry": "0000-00-00",
        "has_current_license": false,
        "custom_data": null,
        "maximum_credit": 0,
        "nationality_ID": "",
        "created_date": "0000-00-00",
        "integration_ID": "",
        "isDeceased": false,
        "is_deleted": false,
        "om_created_datetime": "",
        "om_gender": "",
        "om_date_of_death": ""
    }"#,
);

pub fn name1() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = NAME_1.0.to_string();
    })
}

pub fn name2() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = "609F9BAB7313424CB05A3B3D26F4E6FA".to_string();
    })
}

pub fn store() -> StoreRow {
    inline_init(|r: &mut StoreRow| {
        r.id = "8576512519B44CCF840E191BABA89596".to_string();
        r.name_link_id = name2().id;
    })
}

pub fn name_store_join1() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: "name_to_name_store_join1".to_string(),
        name_link_id: NAME_1.0.to_string(),
        store_id: store().id,
        name_is_customer: false,
        name_is_supplier: true,
    }
}

pub fn name_store_join2() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: "name_to_name_store_join2".to_string(),
        name_link_id: NAME_1.0.to_string(),
        store_id: store().id,
        name_is_customer: false,
        name_is_supplier: false,
    }
}

pub fn name_store_join3() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: "name_to_name_store_join3".to_string(),
        name_link_id: name2().id,
        store_id: store().id,
        name_is_customer: true,
        name_is_supplier: true,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord {
        translated_record: PullTranslateResult::upserts(vec![
            inline_edit(&name_store_join1(), |mut r| {
                r.name_is_customer = true;
                r.name_is_supplier = false;
                r
            }),
            inline_edit(&name_store_join2(), |mut r| {
                r.name_is_customer = true;
                r.name_is_supplier = false;
                r
            }),
        ]),
        sync_buffer_row: inline_init(|r: &mut SyncBufferRow| {
            r.table_name = "name".to_string();
            r.record_id = NAME_1.0.to_owned();
            r.data = NAME_1.1.to_owned();
        }),
        extra_data: Some(inline_init(|r: &mut MockData| {
            r.stores = vec![store()];
            r.names = vec![name1(), name2()];
            r.name_store_joins = vec![name_store_join1(), name_store_join2(), name_store_join3()]
        })),
    }]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![
        TestSyncOutgoingRecord {
            record_id: name_store_join1().id,
            table_name: TABLE_NAME.to_string(),
            push_data: json!(LegacyNameStoreJoinRow {
                id: name_store_join1().id,
                store_id: name_store_join1().store_id,
                name_id: name_store_join1().name_link_id,
                inactive: Some(false),
                name_is_customer: Some(true),

                name_is_supplier: Some(false),
            }),
        },
        TestSyncOutgoingRecord {
            record_id: name_store_join2().id,
            table_name: TABLE_NAME.to_string(),
            push_data: json!(LegacyNameStoreJoinRow {
                id: name_store_join2().id,
                store_id: name_store_join2().store_id,
                name_id: name_store_join2().name_link_id,
                inactive: Some(false),
                name_is_customer: Some(true),
                name_is_supplier: Some(false),
            }),
        },
        TestSyncOutgoingRecord {
            record_id: name_store_join3().id,
            table_name: TABLE_NAME.to_string(),
            push_data: json!(LegacyNameStoreJoinRow {
                id: name_store_join3().id,
                store_id: name_store_join3().store_id,
                name_id: name_store_join3().name_link_id,
                inactive: Some(false),
                name_is_customer: Some(true),
                name_is_supplier: Some(true),
            }),
        },
    ]
}
