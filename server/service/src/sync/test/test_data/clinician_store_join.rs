use repository::{ClinicianStoreJoinRow, ClinicianStoreJoinRowDelete};

use crate::sync::test::TestSyncIncomingRecord;

const CLINICIAN_STORE_JOIN_TABLE: &str = "clinician_store_join";

const CLINICIAN_STORE_JOIN_1: (&str, &str) = (
    "CLINICIAN_STORE_JOIN_1",
    r#"{
        "ID": "CLINICIAN_STORE_JOIN_1",
        "store_ID": "8F252B5884B74888AAB73A0D42C09E7A",
        "prescriber_ID": "Clinician_Link_Id"
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        CLINICIAN_STORE_JOIN_TABLE,
        CLINICIAN_STORE_JOIN_1,
        ClinicianStoreJoinRow {
            id: CLINICIAN_STORE_JOIN_1.0.to_owned(),
            store_id: "8F252B5884B74888AAB73A0D42C09E7A".to_string(),
            clinician_link_id: "Clinician_Link_Id".to_string(),
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
