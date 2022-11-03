use crate::invoice::{
    check_invoice_is_editable, check_store, InvoiceIsNotEditable, NotThisStoreInvoice,
};
use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};
use repository::{
    InvoiceRow, InvoiceRowRepository, InvoiceRowType, Name, RepositoryError, StorageConnection,
};

use super::{UpdateOutboundShipmentName, UpdateOutboundShipmentNameError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    patch: &UpdateOutboundShipmentName,
) -> Result<(InvoiceRow, Option<Name>), UpdateOutboundShipmentNameError> {
    use UpdateOutboundShipmentNameError::*;
    let invoice = check_invoice_exists(&patch.id, connection)?;
    check_store(&invoice, store_id)?;
    check_invoice_type(&invoice)?;
    check_invoice_is_editable(&invoice)?;

    let other_party_id = match &patch.other_party_id {
        None => return Ok((invoice, None)),
        Some(other_party_id) => other_party_id,
    };

    // Other party check
    let other_party = check_other_party(
        connection,
        store_id,
        &other_party_id,
        CheckOtherPartyType::Customer,
    )
    .map_err(|e| match e {
        OtherPartyErrors::OtherPartyDoesNotExist => OtherPartyDoesNotExist {},
        OtherPartyErrors::OtherPartyNotVisible => OtherPartyNotVisible,
        OtherPartyErrors::TypeMismatched => OtherPartyNotACustomer,
        OtherPartyErrors::DatabaseError(repository_error) => DatabaseError(repository_error),
    })?;

    Ok((invoice, Some(other_party)))
}

fn check_invoice_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceRow, UpdateOutboundShipmentNameError> {
    let result = InvoiceRowRepository::new(connection).find_one_by_id(id);

    if let Err(RepositoryError::NotFound) = &result {
        return Err(UpdateOutboundShipmentNameError::InvoiceDoesNotExist);
    }
    Ok(result?)
}

fn check_invoice_type(invoice: &InvoiceRow) -> Result<(), UpdateOutboundShipmentNameError> {
    if invoice.r#type != InvoiceRowType::OutboundShipment {
        Err(UpdateOutboundShipmentNameError::NotAnOutboundShipment)
    } else {
        Ok(())
    }
}

impl From<InvoiceIsNotEditable> for UpdateOutboundShipmentNameError {
    fn from(_: InvoiceIsNotEditable) -> Self {
        UpdateOutboundShipmentNameError::InvoiceIsNotEditable
    }
}

impl From<NotThisStoreInvoice> for UpdateOutboundShipmentNameError {
    fn from(_: NotThisStoreInvoice) -> Self {
        UpdateOutboundShipmentNameError::NotThisStoreInvoice
    }
}
