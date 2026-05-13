use repository::vaccine_course::vaccine_course_store_config_row::VaccineCourseStoreConfigRow;
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "vaccine_course_store_config";

const VACCINE_COURSE_STORE_CONFIG_1: (&str, &str) = (
    "test_vaccine_course_store_config",
    r#"{
        "id": "test_vaccine_course_store_config",
        "vaccine_course_id": "test_vaccine_course",
        "store_id": "store_a",
        "wastage_rate": 50.0,
        "coverage_rate": null
    }"#,
);

fn vaccine_course_store_config_1() -> VaccineCourseStoreConfigRow {
    VaccineCourseStoreConfigRow {
        id: VACCINE_COURSE_STORE_CONFIG_1.0.to_string(),
        vaccine_course_id: "test_vaccine_course".to_string(),
        store_id: "store_a".to_string(),
        wastage_rate: Some(50.0),
        coverage_rate: None,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        VACCINE_COURSE_STORE_CONFIG_1,
        vaccine_course_store_config_1(),
    )]
}

pub(crate) fn test_v6_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: VACCINE_COURSE_STORE_CONFIG_1.0.to_string(),
        push_data: json!(vaccine_course_store_config_1()),
    }]
}
