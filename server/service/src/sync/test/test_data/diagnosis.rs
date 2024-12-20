use repository::DiagnosisRow;

use crate::sync::test::TestSyncIncomingRecord;

const TABLE_NAME: &str = "diagnosis";

const DIAGNOSIS_1: (&str, &str) = (
    "503E901E00534F1797DF4F29E12F907D",
    r#"{
    "ICD_CODE": "Bad cold",
    "ICD_DESCRIPTION": "stuff",
    "ID": "503E901E00534F1797DF4F29E12F907D",
    "NOTES": "Don't use this unless it's a really bad cold!",
    "VALID_TILL": "0000-00-00"
}"#,
);

const DIAGNOSIS_2: (&str, &str) = (
    "7F7CDCD4BDF445DC9DB85B9D68B08D46",
    r#"{
    "ICD_CODE": "OLD",
    "ICD_DESCRIPTION": "Not longer valid",
    "ID": "7F7CDCD4BDF445DC9DB85B9D68B08D46",
    "NOTES": "Expired 25 Dec 2022",
    "VALID_TILL": "2022-12-25"
}"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            DIAGNOSIS_1,
            DiagnosisRow {
                id: DIAGNOSIS_1.0.to_owned(),
                code: "Bad cold".to_owned(),
                description: "stuff".to_owned(),
                notes: Some("Don't use this unless it's a really bad cold!".to_owned()),
                valid_till: None,
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            DIAGNOSIS_2,
            DiagnosisRow {
                id: DIAGNOSIS_2.0.to_owned(),
                code: "OLD".to_owned(),
                description: "Not longer valid".to_owned(),
                notes: Some("Expired 25 Dec 2022".to_owned()),
                valid_till: Some("2022-12-25".parse().unwrap()),
            },
        ),
    ]
}
