use repository::{rnr_form_row::RnRFormRow, RnRFormStatus};
use serde_json::json;
use util::Defaults;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "rnr_form";

const RNR_FORM1: (&str, &str) = (
    "cfd578f8-c3d5-4a04-a466-0ac81dde2aab",
    r#"{
        "id":  "cfd578f8-c3d5-4a04-a466-0ac81dde2aab",
        "store_id": "store_a",
        "name_link_id": "",
        "period_id": "period_1",
        "program_id": "program_test",
        "created_datetime": "2020-01-22T15:16:00",
        "finalised_datetime": null,
        "status": "DRAFT"
    }"#,
);

fn rnr_form1() -> RnRFormRow {
    RnRFormRow {
        id: RNR_FORM1.0.to_string(),
        store_id: "store_a".to_string(),
        name_link_id: String::new(),
        period_id: "period_1".to_string(),
        program_id: "program_test".to_string(),
        created_datetime: Defaults::naive_date_time(),
        finalised_datetime: None,
        status: RnRFormStatus::Draft,
        linked_requisition_id: None,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        RNR_FORM1,
        rnr_form1(),
    )]
}

pub(crate) fn test_v6_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: RNR_FORM1.0.to_string(),
        push_data: json!(rnr_form1()),
    }]
}
