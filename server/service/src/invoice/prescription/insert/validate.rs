use crate::{
    invoice::check_invoice_exists,
    validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors},
};
use repository::StorageConnection;

use super::{InsertPrescription, InsertPrescriptionError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertPrescription,
) -> Result<(), InsertPrescriptionError> {
    use InsertPrescriptionError::*;
    if let Some(_) = check_invoice_exists(&input.id, connection)? {
        return Err(InvoiceAlreadyExists);
    }

    check_other_party(
        connection,
        store_id,
        &input.patient_id,
        CheckOtherPartyType::Patient,
    )
    .map_err(|e| match e {
        OtherPartyErrors::OtherPartyDoesNotExist => OtherPartyDoesNotExist {},
        // kept this in for match but added condition so that it won't trigger for patients
        // since you should be allowed to prescribe to a patient as long as they're on the site
        OtherPartyErrors::OtherPartyNotVisible => OtherPartyNotVisible,
        OtherPartyErrors::TypeMismatched => OtherPartyNotAPatient,
        OtherPartyErrors::DatabaseError(repository_error) => DatabaseError(repository_error),
    })?;

    Ok(())
}
