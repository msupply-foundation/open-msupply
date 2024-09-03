use repository::vaccine_course::vaccine_course_row::VaccineCourseRow;
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "vaccine_course";

const VACCINE_COURSE1: (&str, &str) = (
    "test_vaccine_course",
    r#"{
        "id":  "test_vaccine_course",
        "name": "test_course",
        "program_id": "program_test",
        "coverage_rate": 0.0,
        "is_active": false,
        "wastage_rate": 1.0
    }"#,
);

fn vaccine_course1() -> VaccineCourseRow {
    VaccineCourseRow {
        id: VACCINE_COURSE1.0.to_string(),
        program_id: "program_test".to_string(),
        name: "test_course".to_string(),
        demographic_indicator_id: None,
        coverage_rate: 0.0,
        is_active: false,
        wastage_rate: 1.0,
        deleted_datetime: None,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        VACCINE_COURSE1,
        vaccine_course1(),
    )]
}

pub(crate) fn test_v6_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: VACCINE_COURSE1.0.to_string(),
        push_data: json!(vaccine_course1()),
    }]
}
