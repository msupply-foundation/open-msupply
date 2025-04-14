use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, RepositoryError, StockLine,
    StorageConnection, VaccinationRow,
};

use crate::{
    common_stock::{check_stock_line_exists, CommonStockLineError},
    name::validate::check_name_exists,
    vaccination::validate::{
        check_clinician_exists, check_encounter_exists, check_item_belongs_to_vaccine_course,
        check_vaccination_exists, get_related_vaccinations,
    },
    NullableUpdate,
};

use super::{UpdateVaccination, UpdateVaccinationError};

pub struct ValidateResult {
    pub vaccination: VaccinationRow,
    pub patient_id: String,
    pub existing_stock_line: Option<StockLine>,
    pub new_stock_line: Option<StockLine>,
    pub existing_prescription_line: Option<InvoiceLine>,
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

    if let Some(clinician_id) = input.clinician_id.clone().and_then(|u| u.value) {
        if !check_clinician_exists(&clinician_id, connection)? {
            return Err(UpdateVaccinationError::ClinicianDoesNotExist);
        }
    }

    if let Some(facility_name_id) = input.facility_name_id.clone().and_then(|u| u.value) {
        if !check_name_exists(connection, &facility_name_id)?.is_some() {
            return Err(UpdateVaccinationError::FacilityNameDoesNotExist);
        }
    }
    // If not given, reason is required
    if input.given == Some(false) {
        if input.not_given_reason.is_none() {
            return Err(UpdateVaccinationError::ReasonNotProvided);
        };
    };

    // Validate existing stock line
    let existing_stock_line = match &vaccination.vaccination_row.stock_line_id {
        Some(stock_line_id) => match check_stock_line_exists(connection, store_id, stock_line_id) {
            Ok(stock_line) => {
                check_doses_defined(&stock_line)?;
                Some(stock_line)
            }
            // Assume that if stock line doesn't exist, this vaccination was synced from another store
            Err(_) => None,
        },
        None => None,
    };

    // Validate existing stock line
    let not_given = !input
        .given
        .unwrap_or(vaccination.vaccination_row.given.clone());

    let new_stock_line = if not_given {
        // If not given, stock line should not get set
        None
    } else {
        match &input.stock_line_id {
            // If no new stock line provided, existing stock line should be used
            None => existing_stock_line.clone(),
            // Setting to None
            Some(NullableUpdate { value: None }) => None,
            // Setting to new stock line, validate it
            Some(NullableUpdate {
                value: Some(stock_line_id),
            }) => {
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
            }
        }
    };

    // Get prescription line
    let existing_prescription_line = match &vaccination.vaccination_row.invoice_id {
        Some(invoice_id) => {
            InvoiceLineRepository::new(connection)
                // Vaccination prescription should only ever have 1 line
                .query_one(InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(invoice_id)))?

            // Don't error if not found, assume that if invoice line not found,
            // this vaccination was synced from another store
        }
        None => None,
    };

    // Check we can give/un-give this dose, based on previous and next doses
    let (previous_vaccination, next_vaccination) = get_related_vaccinations(
        connection,
        &vaccination.vaccine_course_dose_row.vaccine_course_id,
        &vaccination.vaccine_course_dose_row.id,
        &vaccination.vaccination_row.program_enrolment_id,
    )
    .map_err(|err| match err {
        // If there was a previous dose, but a vaccination for it wasn't found
        RepositoryError::NotFound => UpdateVaccinationError::NotNextDose,
        _ => UpdateVaccinationError::DatabaseError(err),
    })?;

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
        existing_prescription_line,
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
