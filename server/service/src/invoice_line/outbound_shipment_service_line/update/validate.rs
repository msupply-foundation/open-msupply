use repository::{
    InvoiceLineRow, InvoiceRow, InvoiceRowType, ItemRow, ItemRowType, StorageConnection,
};

use crate::{
    invoice::{
        check_invoice_exists_option, check_invoice_is_editable, check_invoice_type, check_store,
    },
    invoice_line::validate::{
        check_item_exists_option, check_line_belongs_to_invoice, check_line_exists_option,
    },
};

use super::{UpdateOutboundShipmentServiceLine, UpdateOutboundShipmentServiceLineError};

pub fn validate(
    input: &UpdateOutboundShipmentServiceLine,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(InvoiceLineRow, InvoiceRow, ItemRow), UpdateOutboundShipmentServiceLineError> {
    use UpdateOutboundShipmentServiceLineError::*;

    let line = check_line_exists_option(connection, &input.id)?.ok_or(LineDoesNotExist)?;
    let invoice =
        check_invoice_exists_option(&line.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    let item = if let Some(item_id) = &input.item_id {
        check_item_exists_option(connection, item_id)?.ok_or(ItemNotFound)?
    } else {
        check_item_exists_option(connection, &line.item_id)?.ok_or(ItemNotFound)?
    };
    if item.r#type != ItemRowType::Service {
        return Err(UpdateOutboundShipmentServiceLineError::NotAServiceItem);
    }

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_type(&invoice, InvoiceRowType::OutboundShipment) {
        return Err(NotAnOutboundShipment);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditInvoice);
    }
    if !check_line_belongs_to_invoice(&line, &invoice) {
        return Err(NotThisInvoiceLine(line.invoice_id));
    }

    Ok((line, invoice, item))
}
