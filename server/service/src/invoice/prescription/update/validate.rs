use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_status_change,
    check_store,
};
use crate::service_provider::ServiceContext;
use crate::stock_line::historical_stock::get_historical_stock_lines;
use crate::validate::check_patient_exists;
use chrono::NaiveDateTime;
use repository::{ClinicianRowRepository, InvoiceLineRowRepository, RepositoryError};
use repository::{InvoiceRow, InvoiceType, StorageConnection};

use super::{UpdatePrescription, UpdatePrescriptionError};

pub fn validate(
    ctx: &ServiceContext,
    store_id: &str,
    patch: &UpdatePrescription,
) -> Result<(InvoiceRow, bool), UpdatePrescriptionError> {
    use UpdatePrescriptionError::*;

    let invoice = check_invoice_exists(&patch.id, &ctx.connection)?.ok_or(InvoiceDoesNotExist)?;
    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(InvoiceIsNotEditable);
    }
    if !check_invoice_type(&invoice, InvoiceType::Prescription) {
        return Err(NotAPrescriptionInvoice);
    }
    if !check_clinician_exists(&ctx.connection, &patch.clinician_id)? {
        return Err(ClinicianDoesNotExist);
    }
    // Status check
    let status_changed = check_status_change(&invoice, patch.full_status());

    if let Some(patient_id) = &patch.patient_id {
        check_patient_exists(&ctx.connection, patient_id)?.ok_or(PatientDoesNotExist)?;
    }

    if let Some(prescription_date) = &patch.prescription_datetime {
        // Check that any lines already assigned won't create a ledger discrepancy
        check_stock_available_at_date(ctx, &invoice.store_id, &invoice.id, prescription_date)?;
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
    ctx: &ServiceContext,
    store_id: &str,
    invoice_id: &str,
    date: &NaiveDateTime,
) -> Result<bool, UpdatePrescriptionError> {
    let repo = InvoiceLineRowRepository::new(&ctx.connection);
    let lines = repo.find_many_by_invoice_id(invoice_id)?;

    for row in lines {
        let historical_stock = get_historical_stock_lines(ctx, &store_id, &row.item_link_id, date)
            .map_err(|e| UpdatePrescriptionError::DatabaseError(e))?;
        let stock_for_line = historical_stock
            .rows
            .iter()
            .filter(|stock_line| Some(stock_line.stock_line_row.id.clone()) == row.stock_line_id)
            .map(|stock_line| stock_line.stock_line_row.available_number_of_packs)
            .sum::<f64>();

        if stock_for_line < row.number_of_packs {
            return Err(UpdatePrescriptionError::StockNotAvailableAtDate(
                date.clone(),
            ));
        }
    }

    Ok(true)
}
