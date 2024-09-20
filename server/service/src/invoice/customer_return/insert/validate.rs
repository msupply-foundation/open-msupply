use repository::{InvoiceRow, InvoiceStatus, InvoiceType, Name, StorageConnection};

use crate::invoice::{check_invoice_exists, check_invoice_type, check_store};
use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};

use super::{InsertCustomerReturn, InsertCustomerReturnError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertCustomerReturn,
) -> Result<Name, InsertCustomerReturnError> {
    use InsertCustomerReturnError::*;
    if (check_invoice_exists(&input.id, connection)?).is_some() {
        return Err(InvoiceAlreadyExists);
    }

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
        match input.is_patient_return {
            true => CheckOtherPartyType::Patient,
            false => CheckOtherPartyType::Customer,
        },
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
    matches!(
        outbound_shipment.status,
        InvoiceStatus::Shipped | InvoiceStatus::Delivered | InvoiceStatus::Verified
    )
}
