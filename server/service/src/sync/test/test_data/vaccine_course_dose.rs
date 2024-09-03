use repository::vaccine_course::vaccine_course_dose_row::VaccineCourseDoseRow;
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "vaccine_course_dose";

const VACCINE_COURSE_DOSE1: (&str, &str) = (
    "test_vaccine_course_dose",
    r#"{
        "id":  "test_vaccine_course_dose",
        "vaccine_course_id": "test_vaccine_course",
        "label": "test dose label",
        "min_age": 12.0,
        "min_interval": 20
    }"#,
);

fn vaccine_course_dose1() -> VaccineCourseDoseRow {
    VaccineCourseDoseRow {
        id: VACCINE_COURSE_DOSE1.0.to_string(),
        vaccine_course_id: "test_vaccine_course".to_string(),
        label: "test dose label".to_string(),
        min_age: 12.0,
        min_interval_days: 20,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        VACCINE_COURSE_DOSE1,
        vaccine_course_dose1(),
    )]
}

pub(crate) fn test_v6_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: VACCINE_COURSE_DOSE1.0.to_string(),
        push_data: json!(vaccine_course_dose1()),
    }]
}
