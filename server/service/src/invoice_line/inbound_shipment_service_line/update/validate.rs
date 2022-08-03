use repository::{
    InvoiceLineRow, InvoiceRow, InvoiceRowType, ItemRow, ItemRowType, StorageConnection,
};

use crate::{
    invoice::{
        check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store,
        InvoiceDoesNotExist, InvoiceIsNotEditable, NotThisStoreInvoice, WrongInvoiceRowType,
    },
    invoice_line::validate::{
        check_item, check_line_exists, ItemNotFound, LineDoesNotExist, NotInvoiceLine,
    },
};

use super::{UpdateInboundShipmentServiceLine, UpdateInboundShipmentServiceLineError};

pub fn validate(
    input: &UpdateInboundShipmentServiceLine,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(InvoiceLineRow, InvoiceRow, ItemRow), UpdateInboundShipmentServiceLineError> {
    let line = check_line_exists(&input.id, connection)?;
    let invoice = check_invoice_exists(&line.invoice_id, connection)?;

    let item = if let Some(item_id) = &input.item_id {
        check_item(item_id, connection)?
    } else {
        check_item(&line.item_id, connection)?
    };
    if item.r#type != ItemRowType::Service {
        return Err(UpdateInboundShipmentServiceLineError::NotAServiceItem);
    }

    check_store(&invoice, store_id)?;
    check_invoice_type(&invoice, InvoiceRowType::InboundShipment)?;
    check_invoice_is_editable(&invoice)?;

    Ok((line, invoice, item))
}

impl From<LineDoesNotExist> for UpdateInboundShipmentServiceLineError {
    fn from(_: LineDoesNotExist) -> Self {
        UpdateInboundShipmentServiceLineError::LineDoesNotExist
    }
}

impl From<InvoiceDoesNotExist> for UpdateInboundShipmentServiceLineError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        UpdateInboundShipmentServiceLineError::InvoiceDoesNotExist
    }
}

impl From<NotInvoiceLine> for UpdateInboundShipmentServiceLineError {
    fn from(error: NotInvoiceLine) -> Self {
        UpdateInboundShipmentServiceLineError::NotThisInvoiceLine(error.0)
    }
}

impl From<WrongInvoiceRowType> for UpdateInboundShipmentServiceLineError {
    fn from(_: WrongInvoiceRowType) -> Self {
        UpdateInboundShipmentServiceLineError::NotAnInboundShipment
    }
}

impl From<InvoiceIsNotEditable> for UpdateInboundShipmentServiceLineError {
    fn from(_: InvoiceIsNotEditable) -> Self {
        UpdateInboundShipmentServiceLineError::CannotEditInvoice
    }
}

impl From<ItemNotFound> for UpdateInboundShipmentServiceLineError {
    fn from(_: ItemNotFound) -> Self {
        UpdateInboundShipmentServiceLineError::ItemNotFound
    }
}

impl From<NotThisStoreInvoice> for UpdateInboundShipmentServiceLineError {
    fn from(_: NotThisStoreInvoice) -> Self {
        UpdateInboundShipmentServiceLineError::NotThisStoreInvoice
    }
}
