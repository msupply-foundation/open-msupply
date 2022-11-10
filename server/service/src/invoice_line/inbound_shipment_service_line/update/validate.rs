use repository::{
    InvoiceLineRow, InvoiceRow, InvoiceRowType, ItemRow, ItemRowType, StorageConnection,
};

use crate::{
    invoice::{
        check_invoice_exists_option, check_invoice_is_editable, check_invoice_type, check_store,
    },
    invoice_line::validate::{check_item, check_line_exists_option, ItemNotFound, NotInvoiceLine},
};

use super::{UpdateInboundShipmentServiceLine, UpdateInboundShipmentServiceLineError};

pub fn validate(
    input: &UpdateInboundShipmentServiceLine,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(InvoiceLineRow, InvoiceRow, ItemRow), UpdateInboundShipmentServiceLineError> {
    use UpdateInboundShipmentServiceLineError::*;

    let line = check_line_exists_option(connection, &input.id)?.ok_or(LineDoesNotExist)?;
    let invoice =
        check_invoice_exists_option(&line.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    let item = if let Some(item_id) = &input.item_id {
        check_item(item_id, connection)?
    } else {
        check_item(&line.item_id, connection)?
    };
    if item.r#type != ItemRowType::Service {
        return Err(UpdateInboundShipmentServiceLineError::NotAServiceItem);
    }

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_type(&invoice, InvoiceRowType::InboundShipment) {
        return Err(NotAnInboundShipment);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditInvoice);
    }

    Ok((line, invoice, item))
}

impl From<NotInvoiceLine> for UpdateInboundShipmentServiceLineError {
    fn from(error: NotInvoiceLine) -> Self {
        UpdateInboundShipmentServiceLineError::NotThisInvoiceLine(error.0)
    }
}

impl From<ItemNotFound> for UpdateInboundShipmentServiceLineError {
    fn from(_: ItemNotFound) -> Self {
        UpdateInboundShipmentServiceLineError::ItemNotFound
    }
}
