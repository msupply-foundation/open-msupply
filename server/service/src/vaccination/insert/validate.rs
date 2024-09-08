use repository::StorageConnection;

use crate::vaccination::validate::{
    check_encounter_exists, check_program_enrolment_exists, check_vaccination_exists,
    check_vaccine_course_dose_exists,
};

use super::{InsertVaccination, InsertVaccinationError};

pub fn validate(
    input: &InsertVaccination,
    connection: &StorageConnection,
) -> Result<(), InsertVaccinationError> {
    if check_vaccination_exists(&input.id, connection)?.is_some() {
        return Err(InsertVaccinationError::VaccinationAlreadyExists);
    }
    let encounter = check_encounter_exists(&input.encounter_id, connection)?
        .ok_or(InsertVaccinationError::EncounterDoesNotExist)?;

    if !check_program_enrolment_exists(&encounter, connection)? {
        return Err(InsertVaccinationError::ProgramEnrolmentDoesNotExist);
    }
    if !check_vaccine_course_dose_exists(&input.vaccine_course_dose_id, connection)?.is_none() {
        return Err(InsertVaccinationError::VaccineCourseDoseDoesNotExist);
    }

    Ok(())
}
