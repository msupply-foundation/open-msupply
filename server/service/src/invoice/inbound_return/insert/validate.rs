use repository::{InvoiceRow, InvoiceStatus, InvoiceType, Name, StorageConnection};

use crate::invoice::{
    check_invoice_does_not_exists, check_invoice_exists, check_invoice_type, check_store,
    InvoiceAlreadyExistsError,
};
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

    if let Some(outbound_shipment_id) = &input.outbound_shipment_id {
        let outbound_shipment = check_invoice_exists(outbound_shipment_id, connection)?
            .ok_or(OutboundShipmentDoesNotExist)?;

        if !check_store(&outbound_shipment, store_id) {
            return Err(OutboundShipmentDoesNotBelongToCurrentStore);
        }
        if !check_invoice_type(&outbound_shipment, InvoiceType::OutboundShipment) {
            return Err(OriginalInvoiceNotAnOutboundShipment);
        }
        if !check_outbound_shipment_is_returnable(&outbound_shipment) {
            return Err(CannotReturnOutboundShipment);
        }
    }

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

fn check_outbound_shipment_is_returnable(outbound_shipment: &InvoiceRow) -> bool {
    match outbound_shipment.status {
        InvoiceStatus::Shipped | InvoiceStatus::Delivered | InvoiceStatus::Verified => true,
        _ => false,
    }
}
