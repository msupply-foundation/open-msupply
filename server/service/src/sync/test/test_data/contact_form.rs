use repository::contact_form_row::{ContactFormRow, ContactType};
use serde_json::json;
use util::Defaults;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "contact_form";

const CONTACT_FORM1: (&str, &str) = (
    "test_id",
    r#"{
        "id": "test_id",
        "reply_email": "test@email.com",
        "body": "Help description",
        "created_datetime": "2020-01-22T15:16:00",
        "user_id": "user1",
        "store_id": "store_a",
        "contact_type": "FEEDBACK"
    }"#,
);

fn contact_form1() -> ContactFormRow {
    ContactFormRow {
        id: CONTACT_FORM1.0.to_string(),
        reply_email: "test@email.com".to_string(),
        body: "Help description".to_string(),
        created_datetime: Defaults::naive_date_time(),
        user_id: String::from("user1"),
        store_id: "store_a".to_string(),
        contact_type: ContactType::Feedback,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        CONTACT_FORM1,
        contact_form1(),
    )]
}

pub(crate) fn test_v6_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: CONTACT_FORM1.0.to_string(),
        push_data: json!(contact_form1()),
    }]
}
