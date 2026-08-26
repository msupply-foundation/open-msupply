use repository::name_insurance_join_row::{InsurancePolicyType, NameInsuranceJoinRow};

use crate::sync::{
    test::{TestSyncIncomingRecord, TestSyncOutgoingRecord},
    translations::name_insurance_join::{
        LegacyInsurancePolicyType, LegacyNameInsuranceJoinRow, LegacyNameInsuranceJoinRowOmsFields,
    },
};
use serde_json::json;

const TABLE_NAME: &str = "nameInsuranceJoin";

const NAME_INSURANCE_JOIN_1: (&str, &str) = (
    "NAME_INSURANCE_JOIN_1_ID",
    r#"{
        "ID": "NAME_INSURANCE_JOIN_1_ID",
        "discountRate": 30,
        "enteredByID": "",
        "expiryDate": "2026-01-23",
        "insuranceProviderID": "INSURANCE_PROVIDER_1_ID",
        "isActive": true,
        "nameID": "1FB32324AF8049248D929CFB35F255BA", 
        "policyNumberFamily": "888",
        "policyNumberFull": "888",
        "policyNumberPerson": "",
        "type": "personal",
        "oms_fields": { "name_of_insured": "D" }
    }"#,
);

fn name_insurance_join_1() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        NAME_INSURANCE_JOIN_1,
        NameInsuranceJoinRow {
            id: NAME_INSURANCE_JOIN_1.0.to_owned(),
            name_id: "1FB32324AF8049248D929CFB35F255BA".to_string(),
            insurance_provider_id: "INSURANCE_PROVIDER_1_ID".to_string(),
            policy_number_person: None,
            policy_number_family: Some("888".to_string()),
            policy_number: "888".to_string(),
            policy_type: InsurancePolicyType::Personal,
            discount_percentage: 30.0,
            expiry_date: "2026-01-23".parse().unwrap(),
            is_active: true,
            entered_by_id: None,
            name_of_insured: Some("D".to_string()),
        },
    )
}

const NAME_INSURANCE_JOIN_2: (&str, &str) = (
    "NAME_INSURANCE_JOIN_2_ID",
    r#"{
        "ID": "NAME_INSURANCE_JOIN_2_ID",
        "discountRate": 20.5,
        "enteredByID": "",
        "expiryDate": "2027-01-01",
        "insuranceProviderID": "INSURANCE_PROVIDER_1_ID",
        "isActive": true,
        "nameID": "1FB32324AF8049248D929CFB35F255BA",
        "policyNumberFamily": "",
        "policyNumberFull": "777",
        "policyNumberPerson": "777",
        "type": "business",
        "oms_fields": {}
    }"#,
);

fn name_insurance_join_2() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        NAME_INSURANCE_JOIN_2,
        NameInsuranceJoinRow {
            id: NAME_INSURANCE_JOIN_2.0.to_owned(),
            name_id: "1FB32324AF8049248D929CFB35F255BA".to_string(),
            insurance_provider_id: "INSURANCE_PROVIDER_1_ID".to_string(),
            policy_number_person: Some("777".to_string()),
            policy_number_family: None,
            policy_number: "777".to_string(),
            policy_type: InsurancePolicyType::Business,
            discount_percentage: 20.5,
            expiry_date: "2027-01-01".parse().unwrap(),
            is_active: true,
            entered_by_id: None,
            name_of_insured: None,
        },
    )
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![name_insurance_join_1(), name_insurance_join_2()]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![
        TestSyncOutgoingRecord {
            record_id: NAME_INSURANCE_JOIN_1.0.to_string(),
            table_name: TABLE_NAME.to_string(),
            push_data: json!(LegacyNameInsuranceJoinRow {
                ID: NAME_INSURANCE_JOIN_1.0.to_string(),
                nameID: "1FB32324AF8049248D929CFB35F255BA".to_string(),
                insuranceProviderID: "INSURANCE_PROVIDER_1_ID".to_string(),
                discountRate: 30.0,
                enteredByID: None,
                expiryDate: "2026-01-23".parse().unwrap(),
                isActive: true,
                policyNumberFamily: Some("888".to_string()),
                policyNumberFull: "888".to_string(),
                policyNumberPerson: None,
                policyType: LegacyInsurancePolicyType::Personal,
                oms_fields: Some(LegacyNameInsuranceJoinRowOmsFields {
                    name_of_insured: Some("D".to_string()),
                })
            }),
        },
        TestSyncOutgoingRecord {
            record_id: NAME_INSURANCE_JOIN_2.0.to_string(),
            table_name: TABLE_NAME.to_string(),
            push_data: json!(LegacyNameInsuranceJoinRow {
                ID: NAME_INSURANCE_JOIN_2.0.to_string(),
                nameID: "1FB32324AF8049248D929CFB35F255BA".to_string(),
                insuranceProviderID: "INSURANCE_PROVIDER_1_ID".to_string(),
                discountRate: 20.5,
                enteredByID: None,
                expiryDate: "2027-01-01".parse().unwrap(),
                isActive: true,
                policyNumberFamily: None,
                policyNumberFull: "777".to_string(),
                policyNumberPerson: Some("777".to_string()),
                policyType: LegacyInsurancePolicyType::Business,
                oms_fields: None,
            }),
        },
    ]
}
