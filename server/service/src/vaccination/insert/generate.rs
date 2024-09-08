use chrono::Utc;
use repository::VaccinationRow;

use super::InsertVaccination;

pub fn generate(
    store_id: &str,
    program_enrolment_id: String,
    InsertVaccination {
        id,
        encounter_id,
        vaccine_course_dose_id,
        vaccination_date,
        clinician_id,
        comment,
        given,
        stock_line_id,
        not_given_reason,
    }: InsertVaccination,
) -> VaccinationRow {
    let now = Utc::now().naive_utc();

    VaccinationRow {
        id,
        store_id: store_id.to_string(),
        program_enrolment_id,
        encounter_id,
        created_datetime: now,
        user_id: String::new(),
        vaccine_course_dose_id,

        clinician_link_id: clinician_id,
        vaccination_date,
        given,
        stock_line_id,
        not_given_reason,
        comment,

        // coming soon
        invoice_id: None,
    }
}
