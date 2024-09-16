use repository::{ProgramEnrolmentRow, RepositoryError, StockLine, StorageConnection};

use crate::{
    common_stock::{check_stock_line_exists, CommonStockLineError},
    vaccination::validate::{
        check_clinician_exists, check_encounter_exists, check_item_belongs_to_vaccine_course,
        check_program_enrolment_exists, check_vaccination_does_not_exist_for_dose,
        check_vaccination_exists, check_vaccine_course_dose_exists,
    },
};

use super::{UpdateVaccination, UpdateVaccinationError};

pub fn validate(
    input: &UpdateVaccination,
    connection: &StorageConnection,
    store_id: &str,
) -> Result<(ProgramEnrolmentRow, Option<StockLine>), UpdateVaccinationError> {
    if check_vaccination_exists(&input.id, connection)?.is_some() {
        return Err(UpdateVaccinationError::VaccinationDoesNotExist);
    }
    let encounter = check_encounter_exists(&input.encounter_id, connection)?
        .ok_or(UpdateVaccinationError::EncounterDoesNotExist)?;

    let program_enrolment = check_program_enrolment_exists(&encounter, connection)?
        .ok_or(UpdateVaccinationError::ProgramEnrolmentDoesNotExist)?;

    let vaccine_course_dose =
        check_vaccine_course_dose_exists(&input.vaccine_course_dose_id, connection)?
            .ok_or(UpdateVaccinationError::VaccineCourseDoseDoesNotExist)?;

    // Check vaccine course is for the same program as the encounter
    if program_enrolment.row.program_id != vaccine_course_dose.vaccine_course_row.program_id {
        return Err(UpdateVaccinationError::ProgramEnrolmentDoesNotMatchVaccineCourse);
    }

    if !check_vaccination_does_not_exist_for_dose(
        &program_enrolment.row.id,
        &input.vaccine_course_dose_id,
        connection,
    )? {
        return Err(UpdateVaccinationError::VaccinationAlreadyExistsForDose);
    }

    // TODO: check is the next dose! (can't give a dose if the previous one hasn't been given)

    if let Some(clinician_id) = &input.clinician_id {
        if !check_clinician_exists(clinician_id, connection)? {
            return Err(UpdateVaccinationError::ClinicianDoesNotExist);
        }
    }

    // If given, stock line is required
    // If not given, reason is required
    let stock_line = match input.given {
        false => {
            if input.not_given_reason.is_none() {
                return Err(UpdateVaccinationError::ReasonNotProvided);
            };

            None
        }
        true => {
            let stock_line_id = input
                .stock_line_id
                .as_ref()
                .ok_or(UpdateVaccinationError::StockLineNotProvided)?;

            let stock_line = check_stock_line_exists(connection, store_id, stock_line_id)?;

            if !check_item_belongs_to_vaccine_course(
                &stock_line.stock_line_row.item_link_id,
                &vaccine_course_dose
                    .vaccine_course_dose_row
                    .vaccine_course_id,
                connection,
            )? {
                return Err(UpdateVaccinationError::ItemDoesNotBelongToVaccineCourse);
            };

            // This shouldn't be possible (mSupply ensures doses is at least 1 for vaccine items)
            // but if it happens, we should catch it - otherwise we'll dispense infinity!
            if stock_line.item_row.vaccine_doses == 0 {
                return Err(UpdateVaccinationError::InternalError(
                    "Item has no doses defined".to_string(),
                ));
            }

            Some(stock_line)
        }
    };

    Ok((program_enrolment.row, stock_line))
}

impl From<CommonStockLineError> for UpdateVaccinationError {
    fn from(error: CommonStockLineError) -> Self {
        match error {
            CommonStockLineError::StockLineDoesNotBelongToStore
            | CommonStockLineError::DatabaseError(RepositoryError::NotFound) => {
                UpdateVaccinationError::StockLineDoesNotExist
            }

            CommonStockLineError::DatabaseError(err) => UpdateVaccinationError::DatabaseError(err),
        }
    }
}
