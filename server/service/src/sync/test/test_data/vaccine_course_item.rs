use repository::vaccine_course::vaccine_course_item_row::VaccineCourseItemRow;
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "vaccine_course_item";

const VACCINE_COURSE_ITEM1: (&str, &str) = (
    "test_vaccine_course_item",
    r#"{
        "id":  "test_vaccine_course_item",
        "vaccine_course_id": "test_vaccine_course",
        "item_link_id": "item_a"
    }"#,
);

fn vaccine_course_item1() -> VaccineCourseItemRow {
    VaccineCourseItemRow {
        id: VACCINE_COURSE_ITEM1.0.to_string(),
        vaccine_course_id: "test_vaccine_course".to_string(),
        item_link_id: "item_a".to_string(),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        VACCINE_COURSE_ITEM1,
        vaccine_course_item1(),
    )]
}

pub(crate) fn test_v6_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: VACCINE_COURSE_ITEM1.0.to_string(),
        push_data: json!(vaccine_course_item1()),
    }]
}
