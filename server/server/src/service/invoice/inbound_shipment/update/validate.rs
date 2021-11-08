use crate::{
    database::{repository::StorageConnection, schema::InvoiceRow},
    service::invoice::{
        check_invoice_exists, check_invoice_finalised, check_invoice_status, check_invoice_type,
        inbound_shipment::check_other_party, InvoiceDoesNotExist, InvoiceIsFinalised,
        InvoiceStatusError, OtherPartyError, WrongInvoiceType,
    },
};
use domain::{inbound_shipment::UpdateInboundShipment, invoice::InvoiceType};

use super::UpdateInboundShipmentError;

pub fn validate(
    patch: &UpdateInboundShipment,
    connection: &StorageConnection,
) -> Result<InvoiceRow, UpdateInboundShipmentError> {
    let invoice = check_invoice_exists(&patch.id, connection)?;

    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice, InvoiceType::InboundShipment)?;
    check_invoice_finalised(&invoice)?;
    check_invoice_status(&invoice, &patch.status, &patch.on_hold)?;
    check_other_party(patch.other_party_id.clone(), connection)?;

    Ok(invoice)
}

impl From<OtherPartyError> for UpdateInboundShipmentError {
    fn from(error: OtherPartyError) -> Self {
        use UpdateInboundShipmentError::*;
        match error {
            OtherPartyError::NotASupplier(name) => OtherPartyNotASupplier(name),
            OtherPartyError::DoesNotExist => OtherPartyDoesNotExist,
            OtherPartyError::DatabaseError(error) => DatabaseError(error),
        }
    }
}

impl From<WrongInvoiceType> for UpdateInboundShipmentError {
    fn from(_: WrongInvoiceType) -> Self {
        UpdateInboundShipmentError::NotAnInboundShipment
    }
}

impl From<InvoiceIsFinalised> for UpdateInboundShipmentError {
    fn from(_: InvoiceIsFinalised) -> Self {
        UpdateInboundShipmentError::CannotEditFinalised
    }
}

impl From<InvoiceDoesNotExist> for UpdateInboundShipmentError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        UpdateInboundShipmentError::InvoiceDoesNotExist
    }
}

impl From<InvoiceStatusError> for UpdateInboundShipmentError {
    fn from(error: InvoiceStatusError) -> Self {
        use UpdateInboundShipmentError::*;
        match error {
            InvoiceStatusError::CannotChangeStatusOfInvoiceOnHold => {
                CannotChangeStatusOfInvoiceOnHold
            }
            InvoiceStatusError::CannotChangeInvoiceBackToDraft => CannotChangeInvoiceBackToDraft,
        }
    }
}
