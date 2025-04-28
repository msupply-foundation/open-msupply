use chrono::NaiveDate;
use repository::VaccinationRow;
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "vaccination";

const VACCINATION1: (&str, &str) = (
    "vacc1234-c3d5-4a04-a466-0ac81dde2aab",
    r#"{
        "id": "vacc1234-c3d5-4a04-a466-0ac81dde2aab",
        "encounter_id": "encounter_a",
        "program_enrolment_id": "program_test_enrolment",
        "patient_link_id": "C3FB3B30A8D04DDF9AF59A15BB48668A",
        "vaccine_course_dose_id": "test_vaccine_course_dose",
        "store_id": "store_a",
        "user_id": "user1",
        "created_datetime": "2024-12-17T15:16:00",
        "vaccination_date": "2024-12-17",
        "status": "DRAFT",
        "given": false,
        "facility_free_text": "Other facility"
    }"#,
);

fn vaccination1() -> VaccinationRow {
    VaccinationRow {
        id: VACCINATION1.0.to_string(),
        encounter_id: "encounter_a".to_string(),
        program_enrolment_id: "program_test_enrolment".to_string(),
        patient_link_id: "C3FB3B30A8D04DDF9AF59A15BB48668A".to_string(),
        vaccine_course_dose_id: "test_vaccine_course_dose".to_string(),
        store_id: "store_a".to_string(),
        created_datetime: NaiveDate::from_ymd_opt(2024, 12, 17)
            .unwrap()
            .and_hms_opt(15, 16, 0)
            .unwrap(),
        user_id: String::from("user1"),
        invoice_id: None,
        stock_line_id: None,
        item_link_id: None,
        clinician_link_id: None,
        vaccination_date: NaiveDate::from_ymd_opt(2024, 12, 17).unwrap(),
        given: false,
        given_store_id: None,
        not_given_reason: None,
        comment: None,
        facility_name_link_id: None,
        facility_free_text: Some("Other facility".to_string()),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        VACCINATION1,
        vaccination1(),
    )]
}

pub(crate) fn test_v6_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: VACCINATION1.0.to_string(),
        push_data: json!(vaccination1()),
    }]
}
