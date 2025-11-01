use crate::{
    common::{check_stock_line_exists, CommonStockLineError},
    invoice_line::validate::check_item_exists,
    name::validate::check_name_exists,
    vaccination::validate::{
        check_clinician_exists, check_encounter_exists, check_item_belongs_to_vaccine_course,
        check_program_enrolment_exists, check_vaccination_does_not_exist_for_dose,
        check_vaccination_exists, check_vaccine_course_dose_exists, get_related_vaccinations,
    },
};
use repository::{ProgramEnrolmentRow, RepositoryError, StockLine, StorageConnection};

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

    // Check that the previous dose has been given (only if doses cannot be
    // skipped)
    if !vaccine_course_dose.vaccine_course_row.can_skip_dose {
        let (_previous_vaccination, _) = get_related_vaccinations(
            connection,
            &vaccine_course_dose.vaccine_course_row.id,
            &input.vaccine_course_dose_id,
            &program_enrolment.row.id,
        )
        .map_err(|err| match err {
            RepositoryError::NotFound => InsertVaccinationError::VaccineIsNotNextDose,
            _ => InsertVaccinationError::DatabaseError(err),
        })?;
        // If we have any previous vaccination, even if it's not given we can proceed to give the next dose
        // Skipping doses just means you don't have to manually mark the previous dose as given
        // Only if there is no previous vaccination at all do we error using InsertVaccinationError::VaccineIsNotNextDose, above^
    }

    if let Some(clinician_id) = &input.clinician_id {
        if !check_clinician_exists(clinician_id, connection)? {
            return Err(InsertVaccinationError::ClinicianDoesNotExist);
        }
    }

    if let Some(facility_name_id) = &input.facility_name_id {
        if check_name_exists(connection, facility_name_id)?.is_none() {
            return Err(InsertVaccinationError::FacilityDoesNotExist);
        }
    }
    // If not given, reason is required
    if !input.given && input.not_given_reason.is_none() {
        return Err(InsertVaccinationError::ReasonNotProvided);
    }

    let stock_line = if let Some(item_id) = &input.item_id {
        if check_item_exists(connection, item_id)?.is_none() {
            return Err(InsertVaccinationError::ItemDoesNotExist);
        }

        if !check_item_belongs_to_vaccine_course(
            item_id,
            &vaccine_course_dose
                .vaccine_course_dose_row
                .vaccine_course_id,
            connection,
        )? {
            return Err(InsertVaccinationError::ItemDoesNotBelongToVaccineCourse);
        };

        get_stock_line(connection, store_id, input, item_id.clone())?
    } else {
        None
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

fn get_stock_line(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertVaccination,
    item_id: String,
) -> Result<Option<StockLine>, InsertVaccinationError> {
    // If not given, we should not have associated stock line
    if !input.given {
        return Ok(None);
    }

    // If not for this facility, stock line is not required
    if input.facility_name_id.is_none() {
        return Ok(None);
    }

    let stock_line_id = match input.stock_line_id.as_ref() {
        Some(stock_line_id) => stock_line_id,
        None => return Ok(None),
    };

    let stock_line = check_stock_line_exists(connection, store_id, stock_line_id)?;

    if stock_line.item_row.id != item_id {
        return Err(InsertVaccinationError::StockLineDoesNotMatchItem);
    };

    // This shouldn't be possible (mSupply ensures doses is at least 1 for vaccine items)
    // but if it happens, we should catch it - otherwise we'll dispense infinity!
    if stock_line.item_row.vaccine_doses == 0 {
        return Err(InsertVaccinationError::InternalError(
            "Item has no doses defined".to_string(),
        ));
    }

    Ok(Some(stock_line))
}
