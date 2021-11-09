use repository::{
    repository::{
        InvoiceLineQueryRepository, InvoiceRepository, RepositoryError, StorageConnection,
    },
    schema::{InvoiceRow, InvoiceRowStatus, InvoiceRowType},
};

use super::DeleteOutboundShipmentError;

pub fn validate(
    id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceRow, DeleteOutboundShipmentError> {
    //  check invoice exists
    let result = InvoiceRepository::new(connection).find_one_by_id(id);
    if let Err(RepositoryError::NotFound) = &result {
        return Err(DeleteOutboundShipmentError::InvoiceDoesNotExist);
    }
    let invoice = result?;

    // check invoice is not finalised
    if invoice.status == InvoiceRowStatus::Finalised {
        return Err(DeleteOutboundShipmentError::CannotEditFinalised);
    }

    // check no lines exist for the invoice;
    let lines =
        InvoiceLineQueryRepository::new(connection).find_many_by_invoice_ids(&[id.to_string()])?;
    if lines.len() > 0 {
        return Err(DeleteOutboundShipmentError::InvoiceLinesExists(lines));
    }

    // check its a outbound shipment
    if invoice.r#type != InvoiceRowType::OutboundShipment {
        return Err(DeleteOutboundShipmentError::NotAnOutboundShipment);
    }

    Ok(invoice)
}
