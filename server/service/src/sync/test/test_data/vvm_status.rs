use repository::vvm_status_row::{VVMStatusRow, VVMStatusRowDelete};

use crate::sync::test::TestSyncIncomingRecord;

const TABLE_NAME: &str = "vvm_status";

const VVM_STATUS_1: (&str, &str) = (
    "VVM_STATUS_1",
    r#"{
        "ID":"VVM_STATUS_1",
        "code":"2",
        "description":"TEST DESCRIPTION 1",
        "is_active":true,
        "level":1,
        "unusable":false,
        "option_id":"TEST OPTION ID 1"
    }"#,
);

const VVM_STATUS_2: (&str, &str) = (
    "VVM_STATUS_2",
    r#"{
        "ID":"VVM_STATUS_2",
        "code":"4",
        "description":"TEST DESCRIPTION 2",
        "is_active":false,
        "level":2,
        "unusable":true,
        "option_id":"TEST OPTION ID 2"
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            VVM_STATUS_1,
            VVMStatusRow { 
                id: "VVM_STATUS_1".to_owned(),
                code: "2".to_owned(),
                description: "TEST DESCRIPTION 1".to_owned(),
                is_active: true.to_owned(),
                level: 1.to_owned(),
                unusable: false.to_owned(),
                reason_id: Some("TEST OPTION ID 1".to_owned()),
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            VVM_STATUS_2,
            VVMStatusRow { 
                id: "VVM_STATUS_2".to_owned(),
                code: "4".to_owned(),
                description: "TEST DESCRIPTION 2".to_owned(),
                is_active: false.to_owned(),
                level: 2.to_owned(),
                unusable: true.to_owned(),
                reason_id: Some("TEST OPTION ID 2".to_owned()),
            },
        ),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        VVM_STATUS_1.0,
        VVMStatusRowDelete(VVM_STATUS_1.0.to_string()),
    )]
}
