use repository::name_insurance_join_row::{InsurancePolicyType, NameInsuranceJoinRow};

use crate::sync::test::TestSyncIncomingRecord;

const TABLE_NAME: &str = "nameInsuranceJoin";

const NAME_INSURANCE_JOIN_1: (&str, &str) = (
    "NAME_INSURANCE_JOIN_1_ID",
    r#"{
        "ID": "NAME_INSURANCE_JOIN_1",
        "discountRate": 30,
        "enteredByID": "",
        "expiryDate": "2026-01-23",
        "insuranceProviderID": "INSURANCE_PROVIDER_1_ID",
        "isActive": true,
        "nameID": "1FB32324AF8049248D929CFB35F255BA", 
        "policyNumberFamily": "888",
        "policyNumberFull": "888",
        "policyNumberPerson": "",
        "type": "personal"
    }"#,
);

fn name_insurance_join_1() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        NAME_INSURANCE_JOIN_1,
        NameInsuranceJoinRow {
            id: NAME_INSURANCE_JOIN_1.0.to_owned(),
            name_link_id: "1FB32324AF8049248D929CFB35F255BA".to_owned(),
            insurance_provider_id: "INSURANCE_PROVIDER_1_ID".to_owned(),
            policy_number_person: None,
            policy_number_family: Some("888".to_owned()),
            policy_number: "888".to_owned(),
            policy_type: InsurancePolicyType::Personal,
            discount_percentage: 30,
            expiry_date: "2026-01-23".parse().unwrap(),
            is_active: true,
            entered_by_id: None,
        },
    )
}

const NAME_INSURANCE_JOIN_2: (&str, &str) = (
    "NAME_INSURANCE_JOIN_2_ID",
    r#"{
        "ID": "NAME_INSURANCE_JOIN_2",
        "discountRate": 20,
        "enteredByID": "",
        "expiryDate": "2027-01-01",
        "insuranceProviderID": "INSURANCE_PROVIDER_1_ID",
        "isActive": true,
        "nameID": "1FB32324AF8049248D929CFB35F255BA",
        "policyNumberFamily": "",
        "policyNumberFull": "777",
        "policyNumberPerson": "777",
        "type": "business"
    }"#,
);

fn name_insurance_join_2() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        NAME_INSURANCE_JOIN_2,
        NameInsuranceJoinRow {
            id: NAME_INSURANCE_JOIN_2.0.to_owned(),
            name_link_id: "1FB32324AF8049248D929CFB35F255BA".to_owned(),
            insurance_provider_id: "INSURANCE_PROVIDER_1_ID".to_owned(),
            policy_number_person: Some("777".to_owned()),
            policy_number_family: None,
            policy_number: "777".to_owned(),
            policy_type: InsurancePolicyType::Business,
            discount_percentage: 20,
            expiry_date: "2027-01-01".parse().unwrap(),
            is_active: true,
            entered_by_id: None,
        },
    )
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![name_insurance_join_1(), name_insurance_join_2()]
}
