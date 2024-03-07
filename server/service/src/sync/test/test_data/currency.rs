use crate::sync::test::TestFromSyncRecord;
use chrono::NaiveDate;
use repository::CurrencyRow;

const TABLE_NAME: &'static str = "currency";

const CURRENCY_1: (&'static str, &'static str) = (
    "NEW_ZEALAND_DOLLARS",
    r#"{
    "ID": "NEW_ZEALAND_DOLLARS",
    "rate": 1.0,
    "currency": "NZD",
    "is_home_currency": true,
    "date_updated": "2020-01-01",
    "is_active": true
    }"#,
);

const CURRENCY_2: (&'static str, &'static str) = (
    "AUSTRALIAN_DOLLARS",
    r#"{
    "ID": "AUSTRALIAN_DOLLARS",
    "rate": 1.2,
    "currency": "AUD",
    "is_home_currency": false,
    "date_updated": "2022-01-01",
    "is_active": true
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestFromSyncRecord> {
    vec![
        TestFromSyncRecord::new_pull_upsert(
            TABLE_NAME,
            CURRENCY_1,
            CurrencyRow {
                id: CURRENCY_1.0.to_string(),
                rate: 1.0,
                code: "NZD".to_string(),
                is_home_currency: true,
                date_updated: Some(NaiveDate::from_ymd_opt(2020, 1, 1).unwrap()),
            },
        ),
        TestFromSyncRecord::new_pull_upsert(
            TABLE_NAME,
            CURRENCY_2,
            CurrencyRow {
                id: CURRENCY_2.0.to_string(),
                rate: 1.2,
                code: "AUD".to_string(),
                is_home_currency: false,
                date_updated: Some(NaiveDate::from_ymd_opt(2022, 1, 1).unwrap()),
            },
        ),
    ]
}
