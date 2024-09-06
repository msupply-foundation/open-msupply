use chrono::Utc;
use repository::VaccinationRow;

use super::InsertVaccination;

pub fn generate(
    InsertVaccination {
        id,
        name,
        program_id,
        demographic_indicator_id,
        coverage_rate,
        is_active,
        wastage_rate,
    }: InsertVaccination,
) -> VaccinationRow {
    let now = Utc::now().naive_utc();

    VaccinationRow {
        id,
        store_id: String::new(),
        program_id,
        encounter_id: String::new(),
        user_id: String::new(),
        vaccine_course_dose_id: String::new(),
        created_datetime: now.clone(), // remove
        invoice_id: None,
        stock_line_id: None,
        clinician_link_id: None,
        vaccination_date: now.date(), // TODO
        given: false,
        not_given_reason: None,
        comment: None,
    }
}
