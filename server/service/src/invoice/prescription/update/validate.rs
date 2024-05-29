use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_status_change,
    check_store,
};
use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};
use repository::{ClinicianRowRepository, RepositoryError};
use repository::{InvoiceRow, InvoiceRowType, StorageConnection};

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
        return Err(NotAPrescriptionInvoice);
    }
    if !check_clinician_exists(connection, &patch.clinician_id)? {
        return Err(ClinicianDoesNotExist);
    }
    // Status check
    let status_changed = check_status_change(&invoice, patch.full_status());

    if let Some(patient_id) = &patch.patient_id {
        check_other_party(
            connection,
            store_id,
            patient_id,
            CheckOtherPartyType::Patient,
        )
        .map_err(|e| match e {
            OtherPartyErrors::OtherPartyDoesNotExist => OtherPartyDoesNotExist {},
            OtherPartyErrors::OtherPartyNotVisible => OtherPartyNotVisible,
            OtherPartyErrors::TypeMismatched => OtherPartyNotAPatient,
            OtherPartyErrors::DatabaseError(repository_error) => DatabaseError(repository_error),
        })?;
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
