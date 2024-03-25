use repository::InvoiceRow;
use repository::InvoiceRowStatus;
use repository::InvoiceRowType;
use repository::Name;
use repository::StorageConnection;

use crate::invoice::check_invoice_does_not_exists;
use crate::invoice::check_invoice_exists;
use crate::invoice::check_invoice_type;
use crate::invoice::check_store;
use crate::invoice::InvoiceAlreadyExistsError;
use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};

use super::{InsertOutboundReturn, InsertOutboundReturnError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertOutboundReturn,
) -> Result<Name, InsertOutboundReturnError> {
    use InsertOutboundReturnError::*;
    check_invoice_does_not_exists(&input.id, connection).map_err(|e| match e {
        InvoiceAlreadyExistsError::InvoiceAlreadyExists => InvoiceAlreadyExists,
        InvoiceAlreadyExistsError::RepositoryError(err) => DatabaseError(err),
    })?;

    if let Some(inbound_shipment_id) = &input.inbound_shipment_id {
        let inbound_shipment = check_invoice_exists(inbound_shipment_id, connection)?
            .ok_or(InboundShipmentDoesNotExist)?;

        if !check_store(&inbound_shipment, store_id) {
            return Err(InboundShipmentDoesNotBelongToCurrentStore);
        }
        if !check_invoice_type(&inbound_shipment, InvoiceRowType::InboundShipment) {
            return Err(OriginalInvoiceNotAnInboundShipment);
        }
        if !check_inbound_shipment_is_returnable(&inbound_shipment) {
            return Err(CannotReturnInboundShipment);
        }
    }

    let other_party = check_other_party(
        connection,
        store_id,
        &input.other_party_id,
        CheckOtherPartyType::Supplier,
    )
    .map_err(|e| match e {
        OtherPartyErrors::OtherPartyDoesNotExist => OtherPartyDoesNotExist {},
        OtherPartyErrors::OtherPartyNotVisible => OtherPartyNotVisible,
        OtherPartyErrors::TypeMismatched => OtherPartyNotASupplier,
        OtherPartyErrors::DatabaseError(repository_error) => DatabaseError(repository_error),
    })?;

    Ok(other_party)
}

fn check_inbound_shipment_is_returnable(inbound_shipment: &InvoiceRow) -> bool {
    match inbound_shipment.status {
        InvoiceRowStatus::Delivered | InvoiceRowStatus::Verified => true,
        _ => false,
    }
}
