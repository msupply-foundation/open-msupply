use repository::{RepositoryError, StorageConnection};

use crate::{
    common_stock::{check_stock_line_exists, CommonStockLineError},
    vaccination::validate::{
        check_clinician_exists, check_encounter_exists, check_item_belongs_to_vaccine_course,
        check_program_enrolment_exists, check_vaccination_does_not_exist_for_dose,
        check_vaccination_exists, check_vaccine_course_dose_exists,
    },
};

use super::{InsertVaccination, InsertVaccinationError};

pub fn validate(
    input: &InsertVaccination,
    connection: &StorageConnection,
    store_id: &str,
) -> Result<String, InsertVaccinationError> {
    if check_vaccination_exists(&input.id, connection)?.is_some() {
        return Err(InsertVaccinationError::VaccinationAlreadyExists);
    }
    let encounter = check_encounter_exists(&input.encounter_id, connection)?
        .ok_or(InsertVaccinationError::EncounterDoesNotExist)?;

    let program_enrolment = check_program_enrolment_exists(&encounter, connection)?
        .ok_or(InsertVaccinationError::ProgramEnrolmentDoesNotExist)?;

    let vaccine_course_dose =
        check_vaccine_course_dose_exists(&input.vaccine_course_dose_id, connection)?
            .ok_or(InsertVaccinationError::VaccineCourseDoseDoesNotExist)?;

    if !check_vaccination_does_not_exist_for_dose(
        &program_enrolment.row.id,
        &input.vaccine_course_dose_id,
        connection,
    )? {
        return Err(InsertVaccinationError::VaccinationAlreadyExistsForDose);
    }

    if let Some(clinician_id) = &input.clinician_id {
        if !check_clinician_exists(clinician_id, connection)? {
            return Err(InsertVaccinationError::ClinicianDoesNotExist);
        }
    }

    match input.given {
        false => {
            if input.not_given_reason.is_none() {
                return Err(InsertVaccinationError::ReasonNotProvided);
            }
        }
        true => {
            let stock_line_id = input
                .stock_line_id
                .as_ref()
                .ok_or(InsertVaccinationError::StockLineNotProvided)?;

            let stock_line = check_stock_line_exists(connection, store_id, stock_line_id)?;

            if !check_item_belongs_to_vaccine_course(
                &stock_line.stock_line_row.item_link_id,
                &vaccine_course_dose.vaccine_course_id,
                connection,
            )? {
                return Err(InsertVaccinationError::ItemDoesNotBelongToVaccineCourse);
            }
        }
    };

    Ok(program_enrolment.row.id)
}

impl From<CommonStockLineError> for InsertVaccinationError {
    fn from(error: CommonStockLineError) -> Self {
        match error {
            CommonStockLineError::StockLineDoesNotBelongToStore
            | CommonStockLineError::DatabaseError(RepositoryError::NotFound) => {
                InsertVaccinationError::StockLineDoesNotExist
            }

            CommonStockLineError::DatabaseError(err) => InsertVaccinationError::DatabaseError(err),
        }
    }
}