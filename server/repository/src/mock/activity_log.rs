use chrono::NaiveDate;

use crate::{ActivityLogRow, ActivityLogType};

pub fn activity_log_a() -> ActivityLogRow {
    ActivityLogRow {
        id: String::from("log_a"),
        r#type: ActivityLogType::UserLoggedIn,
        user_id: Some(String::from("user_account_a")),
        store_id: None,
        record_id: None,
        datetime: NaiveDate::from_ymd_opt(2020, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        event: None,
    }
}

pub fn activity_log_b() -> ActivityLogRow {
    ActivityLogRow {
        id: String::from("log_b"),
        r#type: ActivityLogType::InvoiceCreated,
        user_id: Some(String::from("user_account_a")),
        store_id: Some(String::from("store_b")),
        record_id: Some(String::from("outbound_shipment_a")),
        datetime: NaiveDate::from_ymd_opt(2020, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        event: None,
    }
}

pub fn activity_log_c() -> ActivityLogRow {
    ActivityLogRow {
        id: String::from("log_c"),
        r#type: ActivityLogType::InvoiceStatusAllocated,
        user_id: Some(String::from("user_account_a")),
        store_id: Some(String::from("store_b")),
        record_id: Some(String::from("inbound_shipment_a")),
        datetime: NaiveDate::from_ymd_opt(2020, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        event: None,
    }
}

pub fn mock_activity_logs() -> Vec<ActivityLogRow> {
    vec![activity_log_a(), activity_log_b(), activity_log_c()]
}
