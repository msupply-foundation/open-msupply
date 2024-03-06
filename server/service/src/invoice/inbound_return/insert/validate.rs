use repository::Name;
use repository::StorageConnection;

use crate::invoice::check_invoice_does_not_exists;
use crate::invoice::InvoiceAlreadyExistsError;
use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};

use super::{InsertInboundReturn, InsertInboundReturnError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertInboundReturn,
) -> Result<Name, InsertInboundReturnError> {
    use InsertInboundReturnError::*;
    check_invoice_does_not_exists(&input.id, connection).map_err(|e| match e {
        InvoiceAlreadyExistsError::InvoiceAlreadyExists => InvoiceAlreadyExists,
        InvoiceAlreadyExistsError::RepositoryError(err) => DatabaseError(err),
    })?;

    let other_party = check_other_party(
        connection,
        store_id,
        &input.other_party_id,
        CheckOtherPartyType::Customer,
    )
    .map_err(|e| match e {
        OtherPartyErrors::OtherPartyDoesNotExist => OtherPartyDoesNotExist {},
        OtherPartyErrors::OtherPartyNotVisible => OtherPartyNotVisible,
        OtherPartyErrors::TypeMismatched => OtherPartyNotACustomer,
        OtherPartyErrors::DatabaseError(repository_error) => DatabaseError(repository_error),
    })?;

    Ok(other_party)
}
