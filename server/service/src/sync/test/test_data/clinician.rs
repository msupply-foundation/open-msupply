use repository::{ClinicianRow, GenderType};

use crate::sync::test::TestSyncIncomingRecord;

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
            "active": true
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
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
            ..Default::default()
        },
    )]
}
