use crate::sync::translations::{temperature_breach::LegacyTemperatureBreachType, temperature_breach_config::LegacyTemperatureBreachConfigRow, LegacyTableName, PullUpsertRecord};

use repository::{TemperatureBreachConfigRow, TemperatureBreachRowType};
use serde_json::json;

use super::{TestSyncPullRecord, TestSyncPushRecord};

const TEMPERATURE_BREACH_CONFIG_1: (&'static str, &'static str) = (
    "997812e0c33911eb9757779d39ae2dbd",
    r#"{
        "ID": "997812e0c33911eb9757779d39ae2dbd",
        "type": "COLD_CONSECUTIVE",
        "description": "Cold Consecutive below 2.0 for 1 hour",
        "minimum_temperature": -273.0,
        "maximum_temperature": 2.0,
        "duration": 3600,
        "is_active": true,
        "store_ID": "store_a"
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![TestSyncPullRecord::new_pull_upsert(
        LegacyTableName::TEMPERATURE_BREACH_CONFIG,
        TEMPERATURE_BREACH_CONFIG_1,
        PullUpsertRecord::TemperatureBreachConfig(TemperatureBreachConfigRow {
            id: TEMPERATURE_BREACH_CONFIG_1.0.to_string(),
            store_id: Some("store_a".to_string()),
            r#type: TemperatureBreachRowType::ColdConsecutive,
            description: "Cold Consecutive below 2.0 for 1 hour".to_string(),
            is_active: true,
            minimum_temperature: -273.0,
            maximum_temperature: 2.0,
            duration: 3600,
        }),
    )]
}

pub(crate) fn test_push_records() -> Vec<TestSyncPushRecord> {
    vec![TestSyncPushRecord {
        table_name: LegacyTableName::TEMPERATURE_BREACH_CONFIG.to_string(),
        record_id: TEMPERATURE_BREACH_CONFIG_1.0.to_string(),
        push_data: json!(LegacyTemperatureBreachConfigRow {
            id: TEMPERATURE_BREACH_CONFIG_1.0.to_string(),
            r#type: LegacyTemperatureBreachType::ColdConsecutive,
            description: "Cold Consecutive below 2.0 for 1 hour".to_string(),
            is_active: true,
            store_id: Some("store_a".to_string()),
            minimum_temperature: -273.0,
            maximum_temperature: 2.0,
            duration: 3600,
        }),
    }]
}
