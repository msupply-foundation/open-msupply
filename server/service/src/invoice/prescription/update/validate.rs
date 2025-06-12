use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_status_change,
    check_store, UpdatePrescriptionStatus,
};
use crate::validate::check_patient_exists;
use repository::{
    ClinicianRowRepository, ClinicianRowRepositoryTrait, EqualFilter, InvoiceLineFilter,
    InvoiceLineRepository, RepositoryError,
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
    // "Verified" prescriptions can be updated to "Cancelled", which is the one
    // exception to normal "is_editable" rules.
    // TO-DO: Should also have a preference check, but pref not yet implemented.
    // Issue #6505
    if !check_invoice_is_editable(&invoice)
        && !(patch.status == Some(UpdatePrescriptionStatus::Cancelled))
    {
        return Err(InvoiceIsNotEditable);
    }
    if !check_invoice_type(&invoice, InvoiceType::Prescription) {
        return Err(NotAPrescriptionInvoice);
    }
    if let Some(clinician_id) = &patch.clinician_id {
        if !check_clinician_exists(connection, &clinician_id.value)? {
            return Err(ClinicianDoesNotExist);
        }
    }
    // Status check
    let status_changed = check_status_change(&invoice, patch.full_status());

    if let Some(patient_id) = &patch.patient_id {
        check_patient_exists(connection, patient_id)?.ok_or(PatientDoesNotExist)?;
    }

    if patch.backdated_datetime.is_some() {
        // Check if we have any lines allocated to this invoice, if so we can't backdate
        let line_count = InvoiceLineRepository::new(connection).count(Some(
            InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(&patch.id)),
        ))?;
        if line_count > 0 {
            return Err(CantBackDate(
                "Can't backdate as invoice has allocated lines".to_string(),
            ));
        }
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
            .find_one_by_id(clinician_id)?
            .is_some(),
    };

    Ok(result)
}
