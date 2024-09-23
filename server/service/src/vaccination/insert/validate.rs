use repository::{ProgramEnrolmentRow, RepositoryError, StockLine, StorageConnection};

use crate::{
    common_stock::{check_stock_line_exists, CommonStockLineError},
    name::validate::check_name_exists,
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
) -> Result<(ProgramEnrolmentRow, Option<StockLine>), InsertVaccinationError> {
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

    // Check vaccine course is for the same program as the encounter
    if program_enrolment.row.program_id != vaccine_course_dose.vaccine_course_row.program_id {
        return Err(InsertVaccinationError::ProgramEnrolmentDoesNotMatchVaccineCourse);
    }

    if !check_vaccination_does_not_exist_for_dose(
        &program_enrolment.row.id,
        &input.vaccine_course_dose_id,
        connection,
    )? {
        return Err(InsertVaccinationError::VaccinationAlreadyExistsForDose);
    }

    // TODO: check is the next dose! (can't give a dose if the previous one hasn't been given)

    if let Some(clinician_id) = &input.clinician_id {
        if !check_clinician_exists(clinician_id, connection)? {
            return Err(InsertVaccinationError::ClinicianDoesNotExist);
        }
    }

    if let Some(facility_name_id) = &input.facility_name_id {
        if !check_name_exists(connection, facility_name_id)?.is_some() {
            return Err(InsertVaccinationError::FacilityDoesNotExist);
        }
    }

    // If given, stock line is required
    // If not given, reason is required
    let stock_line = match input.given {
        false => {
            if input.not_given_reason.is_none() {
                return Err(InsertVaccinationError::ReasonNotProvided);
            };

            None
        }
        true => {
            let stock_line_id = input
                .stock_line_id
                .as_ref()
                .ok_or(InsertVaccinationError::StockLineNotProvided)?;

            let stock_line = check_stock_line_exists(connection, store_id, stock_line_id)?;

            if !check_item_belongs_to_vaccine_course(
                &stock_line.stock_line_row.item_link_id,
                &vaccine_course_dose
                    .vaccine_course_dose_row
                    .vaccine_course_id,
                connection,
            )? {
                return Err(InsertVaccinationError::ItemDoesNotBelongToVaccineCourse);
            };

            // This shouldn't be possible (mSupply ensures doses is at least 1 for vaccine items)
            // but if it happens, we should catch it - otherwise we'll dispense infinity!
            if stock_line.item_row.vaccine_doses == 0 {
                return Err(InsertVaccinationError::InternalError(
                    "Item has no doses defined".to_string(),
                ));
            }

            Some(stock_line)
        }
    };

    Ok((program_enrolment.row, stock_line))
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
