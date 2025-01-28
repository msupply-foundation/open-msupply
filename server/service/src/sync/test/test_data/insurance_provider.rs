use super::TestSyncIncomingRecord;
use repository::InsuranceProviderRow;

const TABLE_NAME: &str = "insuranceProvider";

const INSURANCE_PROVIDER_1: (&str, &str) = (
    "3CB14F143AFF4232889615B52EC56A1D",
    r#"{
        "ID": "3CB14F143AFF4232889615B52EC56A1D",
        "comment": "Test",
        "isActive": true,
        "prescriptionValidityDays": 30,
        "providerName": "AIA"
    }"#,
);

fn insurance_provider_1() -> InsuranceProviderRow {
    InsuranceProviderRow {
        id: INSURANCE_PROVIDER_1.0.to_string(),
        provider_name: "AIA".to_string(),
        comment: Some("Test".to_string()),
        is_active: true,
        prescription_validity_days: Some(30),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        INSURANCE_PROVIDER_1,
        insurance_provider_1(),
    )]
}
