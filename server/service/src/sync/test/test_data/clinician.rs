use repository::{ClinicianRow, GenderType};
use serde_json::json;

use crate::sync::{
    test::{TestSyncIncomingRecord, TestSyncOutgoingRecord},
    translations::clinician::LegacyClinicianRow,
};

const CLINICIAN_TABLE: &str = "clinician";

const CLINICIAN_1: (&str, &str) = (
    "CLINICIAN_1",
    r#"{
            "ID": "CLINICIAN_1",
            "code": "CLINICIAN_CODE",
            "last_name": "Surname",
            "initials": "FS",
            "first_name": "First Name",
            "address1": "",
            "address2": "",
            "phone": "",
            "mobile": "",
            "email": "",
            "female": true,
            "active": true,
            "store_ID": "store_a",
            "oms_fields": null
    }"#,
);
const CLINICIAN_VALID_OMS_FIELDS_GENDER: (&str, &str) = (
    "CLINICIAN_VALID_OMS_FIELDS_GENDER",
    r#"{
            "ID": "CLINICIAN_VALID_OMS_FIELDS_GENDER",
            "code": "CLINICIAN_CODE",
            "last_name": "Surname",
            "initials": "FS",
            "first_name": "First Name",
            "address1": "",
            "address2": "",
            "phone": "",
            "mobile": "",
            "email": "",
            "female": true,
            "active": true,
            "store_ID": "store_a",
            "oms_fields": { "gender": "TRANSGENDER" }
    }"#,
);
const CLINICIAN_INVALID_OMS_FIELDS_GENDER: (&str, &str) = (
    "CLINICIAN_INVALID_OMS_FIELDS_GENDER",
    r#"{
            "ID": "CLINICIAN_INVALID_OMS_FIELDS_GENDER",
            "code": "CLINICIAN_CODE",
            "last_name": "Surname",
            "initials": "FS",
            "first_name": "First Name",
            "address1": "",
            "address2": "",
            "phone": "",
            "mobile": "",
            "email": "",
            "female": true,
            "active": true,
            "store_ID": "store_a",
            "oms_fields": { "gender": "Not in the gender enum" }
    }"#,
);
const CLINICIAN_OMS_FIELDS_GENDER_UNDEFINED: (&str, &str) = (
    "CLINICIAN_INVALID_OMS_FIELDS_GENDER",
    r#"{
            "ID": "CLINICIAN_INVALID_OMS_FIELDS_GENDER",
            "code": "CLINICIAN_CODE",
            "last_name": "Surname",
            "initials": "FS",
            "first_name": "First Name",
            "address1": "",
            "address2": "",
            "phone": "",
            "mobile": "",
            "email": "",
            "female": true,
            "active": true,
            "store_ID": "store_a",
            "oms_fields": {}
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            CLINICIAN_TABLE,
            CLINICIAN_1,
            ClinicianRow {
                id: CLINICIAN_1.0.to_owned(),
                code: "CLINICIAN_CODE".to_string(),
                last_name: "Surname".to_string(),
                initials: "FS".to_string(),
                first_name: Some("First Name".to_string()),
                gender: Some(GenderType::Female),
                is_active: true,
                store_id: Some("store_a".to_string()),
                ..Default::default()
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            CLINICIAN_TABLE,
            CLINICIAN_VALID_OMS_FIELDS_GENDER,
            ClinicianRow {
                id: CLINICIAN_VALID_OMS_FIELDS_GENDER.0.to_owned(),
                code: "CLINICIAN_CODE".to_string(),
                last_name: "Surname".to_string(),
                initials: "FS".to_string(),
                first_name: Some("First Name".to_string()),
                gender: Some(GenderType::Transgender),
                is_active: true,
                store_id: Some("store_a".to_string()),
                ..Default::default()
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            CLINICIAN_TABLE,
            CLINICIAN_INVALID_OMS_FIELDS_GENDER,
            ClinicianRow {
                id: CLINICIAN_INVALID_OMS_FIELDS_GENDER.0.to_owned(),
                code: "CLINICIAN_CODE".to_string(),
                last_name: "Surname".to_string(),
                initials: "FS".to_string(),
                first_name: Some("First Name".to_string()),
                gender: None,
                is_active: true,
                store_id: Some("store_a".to_string()),
                ..Default::default()
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            CLINICIAN_TABLE,
            CLINICIAN_INVALID_OMS_FIELDS_GENDER,
            ClinicianRow {
                id: CLINICIAN_INVALID_OMS_FIELDS_GENDER.0.to_owned(),
                code: "CLINICIAN_CODE".to_string(),
                last_name: "Surname".to_string(),
                initials: "FS".to_string(),
                first_name: Some("First Name".to_string()),
                gender: None,
                is_active: true,
                store_id: Some("store_a".to_string()),
                ..Default::default()
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            CLINICIAN_TABLE,
            CLINICIAN_OMS_FIELDS_GENDER_UNDEFINED,
            ClinicianRow {
                id: CLINICIAN_OMS_FIELDS_GENDER_UNDEFINED.0.to_owned(),
                code: "CLINICIAN_CODE".to_string(),
                last_name: "Surname".to_string(),
                initials: "FS".to_string(),
                first_name: Some("First Name".to_string()),
                gender: None,
                is_active: true,
                store_id: Some("store_a".to_string()),
                ..Default::default()
            },
        ),
    ]
}
pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: CLINICIAN_TABLE.to_string(),
        record_id: CLINICIAN_1.0.to_string(),
        push_data: json!(LegacyClinicianRow {
            id: CLINICIAN_1.0.to_string(),
            code: "CLINICIAN_CODE".to_string(),
            last_name: "Surname".to_string(),
            initials: "FS".to_string(),
            first_name: Some("First Name".to_string()),
            address1: None,
            address2: None,
            phone: None,
            mobile: None,
            email: None,
            is_female: true,
            is_active: true,
            store_id: Some("store_a".to_string()),
            oms_fields: None,
        }),
    }]
}
