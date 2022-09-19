use chrono::NaiveDate;

use crate::{LogRow, LogType};

pub fn log_a() -> LogRow {
    LogRow {
        id: String::from("log_a"),
        r#type: LogType::UserLoggedIn,
        user_id: Some(String::from("user_account_a")),
        store_id: None,
        record_id: None,
        datetime: NaiveDate::from_ymd(2020, 1, 1).and_hms(0, 0, 0),
    }
}

pub fn log_b() -> LogRow {
    LogRow {
        id: String::from("log_b"),
        r#type: LogType::InvoiceCreated,
        user_id: Some(String::from("user_account_a")),
        store_id: Some(String::from("store_a")),
        record_id: Some(String::from("outbound_shipment_a")),
        datetime: NaiveDate::from_ymd(2020, 1, 1).and_hms(0, 0, 0),
    }
}

pub fn log_c() -> LogRow {
    LogRow {
        id: String::from("log_c"),
        r#type: LogType::InvoiceStatusAllocated,
        user_id: Some(String::from("user_account_a")),
        store_id: Some(String::from("store_b")),
        record_id: Some(String::from("inbound_shipment_a")),
        datetime: NaiveDate::from_ymd(2020, 1, 1).and_hms(0, 0, 0),
    }
}

pub fn mock_logs() -> Vec<LogRow> {
    vec![log_a(), log_b(), log_c()]
}
