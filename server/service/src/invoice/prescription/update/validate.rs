use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_status_change,
    check_store,
};
use crate::validate::check_patient_exists;
use repository::{ClinicianRowRepository, RepositoryError};
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
