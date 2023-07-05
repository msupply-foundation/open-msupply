use crate::invoice::{check_invoice_does_not_exists, InvoiceAlreadyExistsError};
use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};
use repository::Name;
use repository::StorageConnection;

use super::{InsertPrescription, InsertPrescriptionError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertPrescription,
) -> Result<Name, InsertPrescriptionError> {
    use InsertPrescriptionError::*;
    check_invoice_does_not_exists(&input.id, connection).map_err(|e| match e {
        InvoiceAlreadyExistsError::InvoiceAlreadyExists => InvoiceAlreadyExists,
        InvoiceAlreadyExistsError::RepositoryError(err) => DatabaseError(err),
    })?;

    let other_party = check_other_party(
        connection,
        store_id,
        &input.patient_id,
        CheckOtherPartyType::Patient,
    )
    .map_err(|e| match e {
        OtherPartyErrors::OtherPartyDoesNotExist => OtherPartyDoesNotExist {},
        OtherPartyErrors::OtherPartyNotVisible => OtherPartyNotVisible,
        OtherPartyErrors::TypeMismatched => OtherPartyNotAPatient,
        OtherPartyErrors::DatabaseError(repository_error) => DatabaseError(repository_error),
    })?;

    Ok(other_party)
}
