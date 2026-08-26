use repository::{ClinicianStoreJoinRow, ClinicianStoreJoinRowDelete};
use serde_json::json;

use crate::sync::{
    test::{TestSyncIncomingRecord, TestSyncOutgoingRecord},
    translations::clinician_store_join::LegacyClinicianStoreJoinRow,
};

const CLINICIAN_STORE_JOIN_TABLE: &str = "clinician_store_join";

const CLINICIAN_STORE_JOIN_1: (&str, &str) = (
    "CLINICIAN_STORE_JOIN_1",
    r#"{
        "ID": "CLINICIAN_STORE_JOIN_1",
        "store_ID": "store_a",
        "prescriber_ID": "clinician_a"
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        CLINICIAN_STORE_JOIN_TABLE,
        CLINICIAN_STORE_JOIN_1,
        ClinicianStoreJoinRow {
            id: CLINICIAN_STORE_JOIN_1.0.to_owned(),
            store_id: "store_a".to_string(),
            clinician_link_id: "clinician_a".to_string(),
        },
    )]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        CLINICIAN_STORE_JOIN_TABLE,
        CLINICIAN_STORE_JOIN_1.0,
        ClinicianStoreJoinRowDelete(CLINICIAN_STORE_JOIN_1.0.to_string()),
    )]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: CLINICIAN_STORE_JOIN_TABLE.to_string(),
        record_id: CLINICIAN_STORE_JOIN_1.0.to_string(),
        push_data: json!(LegacyClinicianStoreJoinRow {
            id: CLINICIAN_STORE_JOIN_1.0.to_string(),
            store_id: "store_a".to_string(),
            prescriber_id: "clinician_a".to_string(),
        }),
    }]
}
