use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_status_change,
    check_store,
};
use crate::stock_line::historical_stock::get_historical_stock_lines_available_quantity;
use crate::validate::check_patient_exists;
use chrono::NaiveDateTime;
use repository::{
    ClinicianRowRepository, EqualFilter, InvoiceLineFilter, InvoiceLineRepository, RepositoryError,
};
use repository::{InvoiceRow, InvoiceType, StorageConnection};

use super::{UpdatePrescription, UpdatePrescriptionError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    patch: &UpdatePrescription,
) -> Result<(InvoiceRow, bool), UpdatePrescriptionError> {
    use UpdatePrescriptionError::*;

    let invoice = check_invoice_exists(&patch.id, connection)?.ok_or(InvoiceDoesNotExist)?;
    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(InvoiceIsNotEditable);
    }
    if !check_invoice_type(&invoice, InvoiceType::Prescription) {
        return Err(NotAPrescriptionInvoice);
    }
    if !check_clinician_exists(connection, &patch.clinician_id)? {
        return Err(ClinicianDoesNotExist);
    }
    // Status check
    let status_changed = check_status_change(&invoice, patch.full_status());

    if let Some(patient_id) = &patch.patient_id {
        check_patient_exists(connection, patient_id)?.ok_or(PatientDoesNotExist)?;
    }

    if let Some(prescription_date) = &patch.prescription_datetime {
        // Check that any lines already assigned won't create a ledger discrepancy
        check_stock_available_at_date(connection, &invoice.id, prescription_date)?;
    }

    Ok((invoice, status_changed))
}

fn check_clinician_exists(
    connection: &StorageConnection,
    clinician_id: &Option<String>,
) -> Result<bool, RepositoryError> {
    let result = match clinician_id {
        None => true,
        Some(clinician_id) => ClinicianRowRepository::new(connection)
            .find_one_by_id_option(clinician_id)?
            .is_some(),
    };

    Ok(result)
}

fn check_stock_available_at_date(
    connection: &StorageConnection,
    invoice_id: &str,
    date: &NaiveDateTime,
) -> Result<bool, UpdatePrescriptionError> {
    let repo = InvoiceLineRepository::new(connection);
    let lines = repo
        .query_by_filter(InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(invoice_id)))?;

    let historic_stock_quantities = get_historical_stock_lines_available_quantity(
        connection,
        lines
            .iter()
            .filter_map(|r| {
                r.stock_line_option
                    .as_ref()
                    .map(|s| (s, Some(r.invoice_line_row.number_of_packs)))
            })
            .collect(),
        date,
    )?;

    for line in lines {
        let Some(stock_line_id) = &line.invoice_line_row.stock_line_id else {
            continue;
        };

        let Some(historical_stock) = historic_stock_quantities.get(stock_line_id) else {
            continue;
        };

        if *historical_stock < line.invoice_line_row.number_of_packs {
            return Err(UpdatePrescriptionError::StockNotAvailableAtDate(
                date.clone(),
            ));
        }
    }

    Ok(true)
}
