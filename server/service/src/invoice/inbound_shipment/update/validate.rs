use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_status, check_invoice_type,
    check_other_party_id, InvoiceDoesNotExist, InvoiceIsNotEditable, InvoiceRowStatusError,
    WrongInvoiceRowType,
};
use domain::name::Name;
use repository::{
    schema::{InvoiceRow, InvoiceRowType},
    StorageConnection,
};

use super::{UpdateInboundShipment, UpdateInboundShipmentError};

pub fn validate(
    patch: &UpdateInboundShipment,
    connection: &StorageConnection,
) -> Result<(InvoiceRow, Option<Name>), UpdateInboundShipmentError> {
    use UpdateInboundShipmentError::*;
    let invoice = check_invoice_exists(&patch.id, connection)?;

    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice, InvoiceRowType::InboundShipment)?;
    check_invoice_is_editable(&invoice)?;
    check_invoice_status(&invoice, patch.full_status(), &patch.on_hold)?;

    let other_party_option = match &patch.other_party_id {
        Some(other_party_id) => {
            let other_party = check_other_party_id(connection, &other_party_id)?
                .ok_or(OtherPartyDoesNotExist {})?;

            if !other_party.is_supplier {
                return Err(OtherPartyNotASupplier(other_party));
            };
            Some(other_party)
        }
        None => None,
    };

    Ok((invoice, other_party_option))
}

impl From<WrongInvoiceRowType> for UpdateInboundShipmentError {
    fn from(_: WrongInvoiceRowType) -> Self {
        UpdateInboundShipmentError::NotAnInboundShipment
    }
}

impl From<InvoiceIsNotEditable> for UpdateInboundShipmentError {
    fn from(_: InvoiceIsNotEditable) -> Self {
        UpdateInboundShipmentError::CannotEditFinalised
    }
}

impl From<InvoiceDoesNotExist> for UpdateInboundShipmentError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        UpdateInboundShipmentError::InvoiceDoesNotExist
    }
}

impl From<InvoiceRowStatusError> for UpdateInboundShipmentError {
    fn from(error: InvoiceRowStatusError) -> Self {
        use UpdateInboundShipmentError::*;
        match error {
            InvoiceRowStatusError::CannotChangeStatusOfInvoiceOnHold => {
                CannotChangeStatusOfInvoiceOnHold
            }
            InvoiceRowStatusError::CannotReverseInvoiceStatus => CannotReverseInvoiceStatus,
        }
    }
}
