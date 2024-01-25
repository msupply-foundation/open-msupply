use crate::sync::{
    test::{TestSyncPullRecord, TestSyncPushRecord},
    translations::{currency::LegacyCurrencyRow, LegacyTableName, PullUpsertRecord},
};
use chrono::NaiveDate;
use repository::CurrencyRow;
use serde_json::json;

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

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::CURRENCY,
            CURRENCY_1,
            PullUpsertRecord::Currency(CurrencyRow {
                id: CURRENCY_1.0.to_string(),
                rate: 1.0,
                code: "NZD".to_string(),
                is_home_currency: true,
                date_updated: Some(NaiveDate::from_ymd_opt(2020, 1, 1).unwrap()),
            }),
        ),
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::CURRENCY,
            CURRENCY_2,
            PullUpsertRecord::Currency(CurrencyRow {
                id: CURRENCY_2.0.to_string(),
                rate: 1.2,
                code: "AUD".to_string(),
                is_home_currency: false,
                date_updated: Some(NaiveDate::from_ymd_opt(2022, 1, 1).unwrap()),
            }),
        ),
    ]
}

pub(crate) fn test_push_records() -> Vec<TestSyncPushRecord> {
    vec![
        TestSyncPushRecord {
            record_id: CURRENCY_1.0.to_string(),
            table_name: LegacyTableName::CURRENCY.to_string(),
            push_data: json!(LegacyCurrencyRow {
                id: CURRENCY_1.0.to_string(),
                rate: 1.0,
                code: "NZD".to_string(),
                is_home_currency: true,
                date_updated: NaiveDate::from_ymd_opt(2020, 1, 1),
            }),
        },
        TestSyncPushRecord {
            record_id: CURRENCY_2.0.to_string(),
            table_name: LegacyTableName::CURRENCY.to_string(),
            push_data: json!(LegacyCurrencyRow {
                id: CURRENCY_2.0.to_string(),
                rate: 1.2,
                code: "AUD".to_string(),
                is_home_currency: false,
                date_updated: NaiveDate::from_ymd_opt(2022, 1, 1),
            }),
        },
    ]
}
