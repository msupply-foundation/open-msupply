use chrono::Utc;
use repository::VaccinationRow;

use super::InsertVaccination;

pub struct GenerateInput {
    pub store_id: String,
    pub user_id: String,
    pub program_enrolment_id: String,
    pub insert_input: InsertVaccination,
}

pub fn generate(
    GenerateInput {
        store_id,
        user_id,
        program_enrolment_id,
        insert_input,
    }: GenerateInput,
) -> VaccinationRow {
    let InsertVaccination {
        id,
        encounter_id,
        vaccine_course_dose_id,
        vaccination_date,
        clinician_id,
        comment,
        given,
        stock_line_id,
        not_given_reason,
    } = insert_input;

    let now = Utc::now().naive_utc();

    VaccinationRow {
        id,
        store_id,
        program_enrolment_id,
        user_id,
        created_datetime: now,

        encounter_id,
        vaccine_course_dose_id,
        clinician_link_id: clinician_id,
        vaccination_date: vaccination_date.unwrap_or(now.date()),
        given,
        stock_line_id,
        not_given_reason,
        comment,

        // coming soon
        invoice_id: None,
    }
}
