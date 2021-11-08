use crate::{
    database::{
        repository::{InvoiceLineQueryRepository, StorageConnection},
        schema::InvoiceRow,
    },
    domain::{inbound_shipment::DeleteInboundShipment, invoice::InvoiceType},
    service::invoice::{
        check_invoice_exists, check_invoice_finalised, check_invoice_type, InvoiceDoesNotExist,
        InvoiceIsFinalised, WrongInvoiceType,
    },
};

use super::DeleteInboundShipmentError;

pub fn validate(
    input: &DeleteInboundShipment,
    connection: &StorageConnection,
) -> Result<InvoiceRow, DeleteInboundShipmentError> {
    let invoice = check_invoice_exists(&input.id, connection)?;

    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice, InvoiceType::InboundShipment)?;
    check_invoice_finalised(&invoice)?;
    check_lines_exist(&input.id, connection)?;

    Ok(invoice)
}

fn check_lines_exist(
    id: &str,
    connection: &StorageConnection,
) -> Result<(), DeleteInboundShipmentError> {
    let lines =
        InvoiceLineQueryRepository::new(connection).find_many_by_invoice_ids(&[id.to_string()])?;

    if lines.len() > 0 {
        Err(DeleteInboundShipmentError::InvoiceLinesExists(lines))
    } else {
        Ok(())
    }
}

impl From<WrongInvoiceType> for DeleteInboundShipmentError {
    fn from(_: WrongInvoiceType) -> Self {
        DeleteInboundShipmentError::NotAnInboundShipment
    }
}

impl From<InvoiceIsFinalised> for DeleteInboundShipmentError {
    fn from(_: InvoiceIsFinalised) -> Self {
        DeleteInboundShipmentError::CannotEditFinalised
    }
}

impl From<InvoiceDoesNotExist> for DeleteInboundShipmentError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        DeleteInboundShipmentError::InvoiceDoesNotExist
    }
}
