use chrono::NaiveDate;

use crate::SyncLogRow;

pub fn mock_sync_log_a_2025() -> SyncLogRow {
    SyncLogRow {
        id: "sync_log_1".to_string(),
        integration_finished_datetime: Some(
            NaiveDate::from_ymd_opt(2025, 01, 01)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
        ),
        ..Default::default()
    }
}

pub fn mock_sync_log_b_2024() -> SyncLogRow {
    SyncLogRow {
        id: "sync_log_2".to_string(),
        integration_finished_datetime: Some(
            NaiveDate::from_ymd_opt(2024, 01, 01)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
        ),
        ..Default::default()
    }
}

pub fn mock_sync_logs() -> Vec<SyncLogRow> {
    vec![mock_sync_log_a_2025(), mock_sync_log_b_2024()]
}
