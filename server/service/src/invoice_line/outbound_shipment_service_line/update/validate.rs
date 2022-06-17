use repository::{
    InvoiceLineRow, InvoiceRow, InvoiceRowType, ItemRow, ItemRowType, StorageConnection,
};

use crate::{
    invoice::{
        check_invoice_exists, check_invoice_is_editable, check_invoice_type, InvoiceDoesNotExist,
        InvoiceIsNotEditable, WrongInvoiceRowType,
    },
    invoice_line::validate::{
        check_item, check_line_belongs_to_invoice, check_line_exists, ItemNotFound,
        LineDoesNotExist, NotInvoiceLine,
    },
};

use super::{UpdateOutboundShipmentServiceLine, UpdateOutboundShipmentServiceLineError};

pub fn validate(
    input: &UpdateOutboundShipmentServiceLine,
    connection: &StorageConnection,
) -> Result<(InvoiceLineRow, InvoiceRow, ItemRow), UpdateOutboundShipmentServiceLineError> {
    let line = check_line_exists(&input.id, connection)?;
    let invoice = check_invoice_exists(&line.invoice_id, connection)?;

    let item = if let Some(item_id) = &input.item_id {
        check_item(item_id, connection)?
    } else {
        check_item(&line.item_id, connection)?
    };
    if item.r#type != ItemRowType::Service {
        return Err(UpdateOutboundShipmentServiceLineError::NotAServiceItem);
    }

    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore

    check_line_belongs_to_invoice(&line, &invoice)?;
    check_invoice_type(&invoice, InvoiceRowType::OutboundShipment)?;
    check_invoice_is_editable(&invoice)?;

    Ok((line, invoice, item))
}

impl From<LineDoesNotExist> for UpdateOutboundShipmentServiceLineError {
    fn from(_: LineDoesNotExist) -> Self {
        UpdateOutboundShipmentServiceLineError::LineDoesNotExist
    }
}

impl From<InvoiceDoesNotExist> for UpdateOutboundShipmentServiceLineError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        UpdateOutboundShipmentServiceLineError::InvoiceDoesNotExist
    }
}

impl From<NotInvoiceLine> for UpdateOutboundShipmentServiceLineError {
    fn from(error: NotInvoiceLine) -> Self {
        UpdateOutboundShipmentServiceLineError::NotThisInvoiceLine(error.0)
    }
}

impl From<WrongInvoiceRowType> for UpdateOutboundShipmentServiceLineError {
    fn from(_: WrongInvoiceRowType) -> Self {
        UpdateOutboundShipmentServiceLineError::NotAnOutboundShipment
    }
}

impl From<InvoiceIsNotEditable> for UpdateOutboundShipmentServiceLineError {
    fn from(_: InvoiceIsNotEditable) -> Self {
        UpdateOutboundShipmentServiceLineError::CannotEditInvoice
    }
}

impl From<ItemNotFound> for UpdateOutboundShipmentServiceLineError {
    fn from(_: ItemNotFound) -> Self {
        UpdateOutboundShipmentServiceLineError::ItemNotFound
    }
}
