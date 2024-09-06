use chrono::NaiveDateTime;
use repository::{EncounterRow, StorageConnection};

use super::{InsertVaccination, InsertVaccinationError};

pub fn validate(
    input: &InsertVaccination,
    connection: &StorageConnection,
) -> Result<EncounterRow, InsertVaccinationError> {
    // if check_vaccine_course_exists(&input.id, connection)?.is_some() {
    //     return Err(InsertVaccineCourseError::VaccineCourseAlreadyExists);
    // }

    Ok(EncounterRow {
        id: String::new(),
        document_type: String::new(),
        document_name: String::new(),
        program_id: String::new(),
        patient_link_id: String::new(),
        created_datetime: NaiveDateTime::default(),
        start_datetime: NaiveDateTime::default(),
        end_datetime: None,
        status: None,
        clinician_link_id: None,
        store_id: None,
    })
}
