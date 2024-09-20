use repository::{
    EqualFilter, RepositoryError, StockLine, StorageConnection, Vaccination, VaccinationFilter,
    VaccinationRepository, VaccinationRow,
};

use crate::{
    common_stock::{check_stock_line_exists, CommonStockLineError},
    name::validate::check_name_exists,
    vaccination::validate::{
        check_clinician_exists, check_encounter_exists, check_item_belongs_to_vaccine_course,
        check_vaccination_exists,
    },
};

use super::{UpdateVaccination, UpdateVaccinationError};

pub struct ValidateResult {
    pub vaccination: VaccinationRow,
    pub patient_id: String,
    pub existing_stock_line: Option<StockLine>,
    pub new_stock_line: Option<StockLine>,
}

pub fn validate(
    input: &UpdateVaccination,
    connection: &StorageConnection,
    store_id: &str,
) -> Result<ValidateResult, UpdateVaccinationError> {
    let vaccination = check_vaccination_exists(&input.id, connection)?
        .ok_or(UpdateVaccinationError::VaccinationDoesNotExist)?;

    let encounter = check_encounter_exists(&vaccination.vaccination_row.encounter_id, connection)?
        .ok_or(
            // Shouldn't be possible, hence internal error
            UpdateVaccinationError::InternalError("Encounter does not exist".to_string()),
        )?;

    if let Some(clinician_id) = input.clinician_id.clone().map(|u| u.value).flatten() {
        if !check_clinician_exists(&clinician_id, connection)? {
            return Err(UpdateVaccinationError::ClinicianDoesNotExist);
        }
    }

    if let Some(facility_name_id) = input.facility_name_id.clone().map(|u| u.value).flatten() {
        if !check_name_exists(connection, &facility_name_id)?.is_some() {
            return Err(UpdateVaccinationError::FacilityNameDoesNotExist);
        }
    }

    match input.given {
        None => {}
        // If not given, reason is required
        Some(false) => {
            if input.not_given_reason.is_none() {
                return Err(UpdateVaccinationError::ReasonNotProvided);
            };
        }
        // If given, stock line is required
        Some(true) => {
            if input.stock_line_id.is_none() {
                return Err(UpdateVaccinationError::StockLineNotProvided);
            };
        }
    };

    // Validate existing stock line
    let existing_stock_line = match &vaccination.vaccination_row.stock_line_id {
        Some(stock_line_id) => {
            let stock_line = check_stock_line_exists(connection, store_id, stock_line_id)?;
            check_doses_defined(&stock_line)?;
            Some(stock_line)
        }
        None => None,
    };

    // Validate existing stock line
    let not_given = !input
        .given
        .unwrap_or(vaccination.vaccination_row.given.clone());

    let new_stock_line = if not_given {
        // If not given, stock line should not get set
        None
    } else if let Some(stock_line_id) = &input.stock_line_id {
        let stock_line = check_stock_line_exists(connection, store_id, stock_line_id)?;

        if !check_item_belongs_to_vaccine_course(
            &stock_line.stock_line_row.item_link_id,
            &vaccination.vaccine_course_dose_row.vaccine_course_id,
            connection,
        )? {
            return Err(UpdateVaccinationError::ItemDoesNotBelongToVaccineCourse);
        };

        check_doses_defined(&stock_line)?;

        Some(stock_line)
    } else {
        // If no new stock line provided, existing stock line should be used
        existing_stock_line.clone()
    };

    // Check we can give/un-give this dose, based on previous and next doses
    let (previous_vaccination, next_vaccination) =
        get_related_vaccinations(connection, &vaccination)?;

    if let Some(previous_vaccination) = previous_vaccination {
        if !previous_vaccination.vaccination_row.given && input.given == Some(true) {
            return Err(UpdateVaccinationError::NotNextDose);
        }
    }
    if let Some(next_vaccination) = next_vaccination {
        if next_vaccination.vaccination_row.given && input.given == Some(false) {
            return Err(UpdateVaccinationError::NotMostRecentGivenDose);
        }
    }

    Ok(ValidateResult {
        vaccination: vaccination.vaccination_row,
        patient_id: encounter.patient_link_id,
        existing_stock_line,
        new_stock_line,
    })
}

fn check_doses_defined(stock_line: &StockLine) -> Result<(), UpdateVaccinationError> {
    // This shouldn't be possible (mSupply ensures doses is at least 1 for vaccine items)
    // but if it happens, we should catch it - otherwise we'll dispense infinity!
    if stock_line.item_row.vaccine_doses == 0 {
        return Err(UpdateVaccinationError::InternalError(
            "Item has no doses defined".to_string(),
        ));
    }

    Ok(())
}

fn get_related_vaccinations(
    connection: &StorageConnection,
    vaccination: &Vaccination,
) -> Result<(Option<Vaccination>, Option<Vaccination>), RepositoryError> {
    // Sorted by created date
    let other_vaccinations_for_course = VaccinationRepository::new(connection).query_by_filter(
        VaccinationFilter::new()
            .program_enrolment_id(EqualFilter::equal_to(
                &vaccination.vaccination_row.program_enrolment_id,
            ))
            .vaccine_course_id(EqualFilter::equal_to(
                &vaccination.vaccine_course_dose_row.vaccine_course_id,
            )),
    )?;

    let this_vaccination_index = other_vaccinations_for_course
        .iter()
        .position(|v| v.vaccination_row.id == vaccination.vaccination_row.id)
        .unwrap_or(0);

    let previous_vaccination = match this_vaccination_index {
        // First in course
        0 => None,
        index => other_vaccinations_for_course.get(index - 1).cloned(),
    };

    let next_vaccination = other_vaccinations_for_course
        .get(this_vaccination_index + 1)
        .cloned();

    return Ok((previous_vaccination, next_vaccination));
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
