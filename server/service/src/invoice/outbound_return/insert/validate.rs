use repository::{InvoiceRow, InvoiceStatus, InvoiceType, Name, StorageConnection};

use crate::invoice::{check_invoice_exists, check_invoice_type, check_store};
use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};

use super::{InsertOutboundReturn, InsertOutboundReturnError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertOutboundReturn,
) -> Result<Name, InsertOutboundReturnError> {
    use InsertOutboundReturnError::*;
    if (check_invoice_exists(&input.id, connection)?).is_some() {
        return Err(InvoiceAlreadyExists);
    }

    if let Some(inbound_shipment_id) = &input.inbound_shipment_id {
        let inbound_shipment = check_invoice_exists(inbound_shipment_id, connection)?
            .ok_or(InboundShipmentDoesNotExist)?;

        if !check_store(&inbound_shipment, store_id) {
            return Err(InboundShipmentDoesNotBelongToCurrentStore);
        }
        if !check_invoice_type(&inbound_shipment, InvoiceType::InboundShipment) {
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
        InvoiceStatus::Delivered | InvoiceStatus::Verified => true,
        _ => false,
    }
}
