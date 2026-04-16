use repository::{SiteRow, SiteRowDelete};

use super::TestSyncIncomingRecord;

const TABLE_NAME: &str = "site";
const SITE_1: (&str, &str) = (
    "1",
    r#"{
    "ID": "1",
    "site_ID": 1,
    "name": "Site A",
    "password": "hash_a",
    "hardwareID": "hw-uuid-aaa"
    }"#,
);

const SITE_2: (&str, &str) = (
    "2",
    r#"{
    "ID": "2",
    "site_ID": 2,
    "name": "Site B",
    "password": "hash_b",
    "hardwareID": null
    }"#,
);

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        SITE_1.0,
        SiteRowDelete(SITE_1.0.to_string()),
    )]
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            SITE_1,
            SiteRow {
                id: 1,
                og_id: Some("1".to_string()),
                name: "Site A".to_string(),
                hashed_password: "hash_a".to_string(),
                hardware_id: Some("hw-uuid-aaa".to_string()),
                token: None,
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            SITE_2,
            SiteRow {
                id: 2,
                og_id: Some("2".to_string()),
                name: "Site B".to_string(),
                hashed_password: "hash_b".to_string(),
                hardware_id: None,
                token: None,
            },
        ),
    ]
}
