use chrono::Utc;
use repository::{EncounterRow, VaccinationRow};

use super::InsertVaccination;

pub fn generate(
    store_id: &str,
    encounter: EncounterRow,
    InsertVaccination {
        id,
        vaccine_course_dose_id,
        vaccination_date,
        clinician_id,
        comment,
        given,
        stock_line_id,
        not_given_reason,
        encounter_id: _,
    }: InsertVaccination,
) -> VaccinationRow {
    let now = Utc::now().naive_utc();

    VaccinationRow {
        id,
        store_id: store_id.to_string(),
        program_id: encounter.program_id,
        encounter_id: encounter.id,
        patient_link_id: encounter.patient_link_id,
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
