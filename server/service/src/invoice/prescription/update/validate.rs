use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_status, check_invoice_type,
    check_status_change, check_store, InvoiceRowStatusError,
};
use repository::{ClinicianRow, ClinicianRowRepository, EqualFilter, RepositoryError};
use repository::{
    InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus,
    InvoiceRowType, StorageConnection,
};

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
    if !check_invoice_type(&invoice, InvoiceRowType::Prescription) {
        return Err(NotAPrescription);
    }
    if let Some(clinician_id) = &patch.clinician_id {
        check_clinician_exists(connection, clinician_id)?.ok_or(ClinicianDoesNotExist)?;
    }

    // Status check
    let status_changed = check_status_change(&invoice, patch.full_status());
    if status_changed {
        check_can_change_status_to_picked(connection, &invoice, patch.full_status())?;
    }

    Ok((invoice, status_changed))
}

fn check_clinician_exists(
    connection: &StorageConnection,
    clinician_id: &String,
) -> Result<Option<ClinicianRow>, RepositoryError> {
    let result = ClinicianRowRepository::new(connection).find_one_by_id(&clinician_id);

    match result {
        Ok(clinician_row) => Ok(clinician_row),
        Err(RepositoryError::NotFound) => Ok(None),
        Err(error) => Err(error),
    }
}

fn check_can_change_status_to_picked(
    connection: &StorageConnection,
    invoice_row: &InvoiceRow,
    status_option: Option<InvoiceRowStatus>,
) -> Result<(), UpdatePrescriptionError> {
    if invoice_row.status != InvoiceRowStatus::New {
        return Ok(());
    };

    if let Some(new_status) = status_option {
        if new_status == InvoiceRowStatus::New {
            return Ok(());
        }

        let repository = InvoiceLineRepository::new(connection);
        let unallocated_lines = repository.query_by_filter(
            InvoiceLineFilter::new()
                .invoice_id(EqualFilter::equal_to(&invoice_row.id))
                .r#type(InvoiceLineRowType::UnallocatedStock.equal_to())
                .number_of_packs(EqualFilter::not_equal_to_f64(0.0)),
        )?;

        if unallocated_lines.len() > 0 {
            return Err(
                UpdatePrescriptionError::CanOnlyChangeToPickedWhenNoUnallocatedLines(
                    unallocated_lines,
                ),
            );
        }
    }

    Ok(())
}
