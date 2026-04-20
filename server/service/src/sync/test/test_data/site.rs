use repository::{SiteRow, SiteRowDelete};

use super::TestSyncIncomingRecord;

const TABLE_NAME: &str = "site";
const SITE_1: (&str, &str) = (
    "1",
    r#"{
    "ID": "1",
    "site_ID": 1,
    "name": "Site A",
    "password_hash": "hash_a",
    "hardwareID": "hw-uuid-aaa",
    "sync_out_IDs": "",
    "app_name": "",
    "SPARE_address": "",
    "prefs": null,
    "app_version": "",
    "code": "code1",
    "sync_version": "",
    "initialisation_status": "",
    "last_sync_date": "",
    "last_sync_time": "",
    "support_client_ID": "",
    "is_omsupply_central_server": false,
    "omsupply_central_server_url": null,
    "first_sync_date": "",
    "first_sync_time": "",
    "support_start_date": "",
    "support_end_date": "",
    "license_code": "",
    "funder_name": "",
    "concurrent_users_licensed": null,
    "project_name": "",
    "last_connection_time": "",
    "last_connection_date": "",
    "disabled_date": "",
    "support_level": ""
    }"#,
);

const SITE_2: (&str, &str) = (
    "2",
    r#"{
    "ID": "2",
    "site_ID": 2,
    "name": "Site B",
    "password_hash": "hash_b",
    "hardwareID": null,
    "sync_out_IDs": "",
    "app_name": "",
    "SPARE_address": "",
    "prefs": null,
    "app_version": "",
    "code": "code2",
    "sync_version": "",
    "initialisation_status": "",
    "last_sync_date": "",
    "last_sync_time": "",
    "support_client_ID": "",
    "is_omsupply_central_server": false,
    "omsupply_central_server_url": null,
    "first_sync_date": "",
    "first_sync_time": "",
    "support_start_date": "",
    "support_end_date": "",
    "license_code": "",
    "funder_name": "",
    "concurrent_users_licensed": null,
    "project_name": "",
    "last_connection_time": "",
    "last_connection_date": "",
    "disabled_date": "",
    "support_level": ""
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
                code: "code1".to_string(),
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
                code: "code2".to_string(),
                token: None,
            },
        ),
    ]
}
