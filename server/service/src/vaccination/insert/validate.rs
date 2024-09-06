use repository::StorageConnection;

use super::{InsertVaccination, InsertVaccinationError};

pub fn validate(
    input: &InsertVaccination,
    connection: &StorageConnection,
) -> Result<(), InsertVaccinationError> {
    // if check_vaccine_course_exists(&input.id, connection)?.is_some() {
    //     return Err(InsertVaccineCourseError::VaccineCourseAlreadyExists);
    // }

    Ok(())
}
