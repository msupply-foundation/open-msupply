use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, ItemRow, RepositoryError,
    StockLine, StockLineRow, StorageConnection, Vaccination, VaccinationRow,
};

use crate::{
    common_stock::{check_stock_line_exists, CommonStockLineError},
    invoice_line::validate::check_item_exists,
    name::validate::check_name_exists,
    vaccination::validate::{
        check_clinician_exists, check_encounter_exists, check_item_belongs_to_vaccine_course,
        check_vaccination_exists, get_related_vaccinations,
    },
};

use super::{UpdateVaccination, UpdateVaccinationError};

pub enum ValidateResult {
    ChangeToGiven(ChangeToGiven),
    ChangeToNotGiven(ChangeToNotGiven),
    ChangeStockLine(ChangeStockLine),
    NoStatusChangeEdit(VaccinationRow),
}

pub struct ChangeToGiven {
    pub existing_vaccination: VaccinationRow,
    pub patient_id: String,
    pub new_stock_line: Option<StockLine>,
}

pub struct ChangeToNotGiven {
    pub existing_vaccination: VaccinationRow,
    pub patient_id: String,
    pub existing_prescription: Option<PrescriptionAndStockLine>,
}

pub struct PrescriptionAndStockLine {
    pub prescription_line: InvoiceLine,
    pub stock_line_row: StockLineRow,
}

pub struct ChangeStockLine {
    pub existing_vaccination: VaccinationRow,
    pub patient_id: String,
    pub existing_prescription: Option<PrescriptionAndStockLine>,
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

    if let Some(clinician_id) = input.clinician_id.clone().and_then(|u| u.value) {
        if !check_clinician_exists(&clinician_id, connection)? {
            return Err(UpdateVaccinationError::ClinicianDoesNotExist);
        }
    }

    if let Some(facility_name_id) = input.facility_name_id.clone().and_then(|u| u.value) {
        if check_name_exists(connection, &facility_name_id)?.is_none() {
            return Err(UpdateVaccinationError::FacilityNameDoesNotExist);
        }
    }

    // If not given, reason is required
    if input.given == Some(false) && input.not_given_reason.is_none() {
        return Err(UpdateVaccinationError::ReasonNotProvided);
    };

    // If selected item is changing - validate it
    if let Some(item_id) = input.item_id.clone().and_then(|u| u.value) {
        let item = check_item_exists(connection, &item_id)?
            .ok_or(UpdateVaccinationError::ItemDoesNotExist)?;

        let vaccine_course_id = &vaccination.vaccine_course_dose_row.vaccine_course_id;

        if !check_item_belongs_to_vaccine_course(&item_id, vaccine_course_id, connection)? {
            return Err(UpdateVaccinationError::ItemDoesNotBelongToVaccineCourse);
        };

        // If vaccination is in given status,
        // only store that gave the vaccination can change the item
        if vaccination.vaccination_row.given {
            check_is_giving_store(store_id, &vaccination)?;
        }

        check_doses_defined(&item)?;
    }

    let vaccination_row = vaccination.vaccination_row.clone();

    let item_id = input
        .item_id
        .clone()
        .map_or(vaccination_row.item_link_id.clone(), |u| u.value);
    let stock_line_id = input.stock_line_id.clone().and_then(|u| u.value);

    let result = match (vaccination_row.given, input.given) {
        // Changing not given -> given
        (false, Some(true)) => {
            validate_can_change_given_status(connection, &vaccination, true)?;

            ValidateResult::ChangeToGiven(ChangeToGiven {
                existing_vaccination: vaccination_row,
                patient_id: encounter.patient_link_id,
                new_stock_line: validate_new_stock_line(
                    connection,
                    store_id,
                    stock_line_id,
                    item_id,
                )?,
            })
        }
        // Changing given -> not given
        (true, Some(false)) => {
            check_is_giving_store(store_id, &vaccination)?;
            validate_can_change_given_status(connection, &vaccination, false)?;

            ValidateResult::ChangeToNotGiven(ChangeToNotGiven {
                existing_vaccination: vaccination_row.clone(),
                patient_id: encounter.patient_link_id,
                existing_prescription: validate_existing_prescription(
                    connection,
                    store_id,
                    &vaccination_row.invoice_id,
                )?,
            })
        }
        (true, Some(true)) | (true, None) => {
            // If still given, check if selected stock line has changed
            if input.stock_line_id.is_some() && vaccination_row.stock_line_id != stock_line_id {
                check_is_giving_store(store_id, &vaccination)?;

                ValidateResult::ChangeStockLine(ChangeStockLine {
                    existing_vaccination: vaccination_row.clone(),
                    patient_id: encounter.patient_link_id,
                    existing_prescription: validate_existing_prescription(
                        connection,
                        store_id,
                        &vaccination_row.invoice_id,
                    )?,
                    new_stock_line: validate_new_stock_line(
                        connection,
                        store_id,
                        stock_line_id,
                        item_id,
                    )?,
                })
            } else {
                ValidateResult::NoStatusChangeEdit(vaccination_row)
            }
        }
        _ => ValidateResult::NoStatusChangeEdit(vaccination_row),
    };

    Ok(result)
}

fn validate_existing_prescription(
    connection: &StorageConnection,
    store_id: &str,
    invoice_id: &Option<String>,
) -> Result<Option<PrescriptionAndStockLine>, UpdateVaccinationError> {
    // Get prescription line
    let prescription_line = match invoice_id {
        Some(invoice_id) => {
            InvoiceLineRepository::new(connection)
                // Vaccination prescription should only ever have 1 line
                .query_one(InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(invoice_id)))?
                .ok_or(RepositoryError::NotFound)?
        }
        None => return Ok(None),
    };

    let stock_line = match prescription_line.stock_line_option.clone().map(|s| s.id) {
        Some(stock_line_id) => {
            let stock_line = check_stock_line_exists(connection, store_id, &stock_line_id)?;
            check_doses_defined(&stock_line.item_row)?;
            stock_line
        }
        None => return Err(UpdateVaccinationError::StockLineDoesNotExist),
    };

    Ok(Some(PrescriptionAndStockLine {
        prescription_line,
        stock_line_row: stock_line.stock_line_row,
    }))
}

fn validate_new_stock_line(
    connection: &StorageConnection,
    store_id: &str,
    stock_line_id: Option<String>,
    item_id: Option<String>,
) -> Result<Option<StockLine>, UpdateVaccinationError> {
    let stock_line = match stock_line_id {
        Some(stock_line_id) => {
            let stock_line = check_stock_line_exists(connection, store_id, &stock_line_id)?;

            if Some(stock_line.item_row.id.clone()) != item_id {
                return Err(UpdateVaccinationError::StockLineDoesNotMatchItem);
            };

            Some(stock_line)
        }
        None => None,
    };

    Ok(stock_line)
}

// Check we can give/un-give this dose, based on previous and next doses
pub fn validate_can_change_given_status(
    connection: &StorageConnection,
    existing: &Vaccination,
    new_given_status: bool,
) -> Result<(), UpdateVaccinationError> {
    let (previous_vaccination, next_vaccination) = get_related_vaccinations(
        connection,
        &existing.vaccine_course_dose_row.vaccine_course_id,
        &existing.vaccine_course_dose_row.id,
        &existing.vaccination_row.program_enrolment_id,
    )
    .map_err(|err| match err {
        // If there was a previous dose, but a vaccination for it wasn't found
        RepositoryError::NotFound => UpdateVaccinationError::NotNextDose,
        _ => UpdateVaccinationError::DatabaseError(err),
    })?;

    match new_given_status {
        true => validate_change_to_given(previous_vaccination),
        false => validate_change_to_not_given(next_vaccination),
    }
}

fn validate_change_to_given(
    previous_vaccination: Option<Vaccination>,
) -> Result<(), UpdateVaccinationError> {
    // Should only be able to change to given if all previous doses in the course are given
    if let Some(previous_vaccination) = previous_vaccination {
        if !previous_vaccination.vaccination_row.given {
            return Err(UpdateVaccinationError::NotNextDose);
        }
    }

    Ok(())
}

fn validate_change_to_not_given(
    next_vaccination: Option<Vaccination>,
) -> Result<(), UpdateVaccinationError> {
    // Should only be able to change to not given if all next doses in the course are not given
    if let Some(next_vaccination) = next_vaccination {
        if next_vaccination.vaccination_row.given {
            return Err(UpdateVaccinationError::NotMostRecentGivenDose);
        }
    }

    Ok(())
}

fn check_doses_defined(item_row: &ItemRow) -> Result<(), UpdateVaccinationError> {
    // This shouldn't be possible (mSupply ensures doses is at least 1 for vaccine items)
    // but if it happens, we should catch it - otherwise we'll dispense infinity!
    if item_row.vaccine_doses == 0 {
        return Err(UpdateVaccinationError::InternalError(
            "Item has no doses defined".to_string(),
        ));
    }

    Ok(())
}

// If a vaccination is given, key info should only be able to be changed by the store it was given from
fn check_is_giving_store(
    store_id: &str,
    vaccination: &Vaccination,
) -> Result<(), UpdateVaccinationError> {
    if vaccination.vaccination_row.given_store_id != Some(store_id.to_string()) {
        return Err(UpdateVaccinationError::NotGivenFromThisStore);
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
