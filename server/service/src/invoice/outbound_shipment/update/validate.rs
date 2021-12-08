use crate::invoice::{
    check_invoice_is_editable, check_invoice_status, InvoiceIsNotEditable, InvoiceStatusError,
};
use domain::{name::NameFilter, outbound_shipment::UpdateOutboundShipment, EqualFilter};
use repository::{
    schema::{InvoiceRow, InvoiceRowType},
    InvoiceRepository, NameQueryRepository, RepositoryError, StorageConnection,
};

use super::UpdateOutboundShipmentError;

pub fn validate(
    patch: &UpdateOutboundShipment,
    connection: &StorageConnection,
) -> Result<InvoiceRow, UpdateOutboundShipmentError> {
    let invoice = check_invoice_exists(&patch.id, connection)?;

    // TODO check that during allocated status change, all unallocated lines are fullfilled
    // TODO check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice)?;
    check_invoice_is_editable(&invoice)?;
    check_invoice_status(&invoice, patch.full_status(), &patch.on_hold)?;
    check_other_party(&patch.other_party_id, connection)?;

    Ok(invoice)
}

fn check_invoice_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceRow, UpdateOutboundShipmentError> {
    let result = InvoiceRepository::new(connection).find_one_by_id(id);

    if let Err(RepositoryError::NotFound) = &result {
        return Err(UpdateOutboundShipmentError::InvoiceDoesNotExists);
    }
    Ok(result?)
}

fn check_invoice_type(invoice: &InvoiceRow) -> Result<(), UpdateOutboundShipmentError> {
    if invoice.r#type != InvoiceRowType::OutboundShipment {
        Err(UpdateOutboundShipmentError::NotAnOutboundShipment)
    } else {
        Ok(())
    }
}

pub fn check_other_party(
    id_option: &Option<String>,
    connection: &StorageConnection,
) -> Result<(), UpdateOutboundShipmentError> {
    use UpdateOutboundShipmentError::*;

    if let Some(id) = id_option {
        let repository = NameQueryRepository::new(&connection);

        let mut result =
            repository.query_by_filter(NameFilter::new().id(EqualFilter::equal_to(&id)))?;

        if let Some(name) = result.pop() {
            if name.is_customer {
                Ok(())
            } else {
                Err(OtherPartyNotACustomer(name))
            }
        } else {
            Err(OtherPartyDoesNotExists)
        }
    } else {
        Ok(())
    }
}

impl From<InvoiceIsNotEditable> for UpdateOutboundShipmentError {
    fn from(_: InvoiceIsNotEditable) -> Self {
        UpdateOutboundShipmentError::InvoiceIsNotEditable
    }
}

impl From<InvoiceStatusError> for UpdateOutboundShipmentError {
    fn from(error: InvoiceStatusError) -> Self {
        use UpdateOutboundShipmentError::*;
        match error {
            InvoiceStatusError::CannotChangeStatusOfInvoiceOnHold => {
                CannotChangeStatusOfInvoiceOnHold
            }
            InvoiceStatusError::CannotReverseInvoiceStatus => CannotReverseInvoiceStatus,
        }
    }
}
