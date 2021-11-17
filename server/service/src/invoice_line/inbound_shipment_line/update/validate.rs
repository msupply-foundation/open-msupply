use crate::{
    invoice::{
        check_invoice_exists, check_invoice_finalised, check_invoice_type,
        validate::InvoiceIsFinalised, InvoiceDoesNotExist, WrongInvoiceType,
    },
    invoice_line::{
        inbound_shipment_line::{check_batch, check_pack_size},
        validate::{
            check_item, check_line_belongs_to_invoice, check_line_exists, check_number_of_packs,
            ItemNotFound, LineDoesNotExist, NotInvoiceLine, NumberOfPacksBelowOne,
        },
        BatchIsReserved, PackSizeBelowOne,
    },
};
use domain::{inbound_shipment::UpdateInboundShipmentLine, invoice::InvoiceType};
use repository::{
    schema::{InvoiceLineRow, InvoiceRow, ItemRow},
    StorageConnection,
};

use super::UpdateInboundShipmentLineError;

pub fn validate(
    input: &UpdateInboundShipmentLine,
    connection: &StorageConnection,
) -> Result<(InvoiceLineRow, Option<ItemRow>, InvoiceRow), UpdateInboundShipmentLineError> {
    let line = check_line_exists(&input.id, connection)?;
    check_pack_size(input.pack_size.clone())?;
    check_number_of_packs(input.number_of_packs.clone())?;

    let item = check_item_option(&input.item_id, connection)?;

    let invoice = check_invoice_exists(&input.invoice_id, connection)?;
    check_line_belongs_to_invoice(&line, &invoice)?;
    check_invoice_type(&invoice, InvoiceType::InboundShipment)?;
    check_invoice_finalised(&invoice)?;

    check_batch(&line, connection)?;

    // InvoiceDoesNotBelongToCurrentStore
    // StockLineDoesNotBelongToCurrentStore
    // LocationDoesNotBelongToCurrentStore

    Ok((line, item, invoice))
}

fn check_item_option(
    item_id_option: &Option<String>,
    connection: &StorageConnection,
) -> Result<Option<ItemRow>, UpdateInboundShipmentLineError> {
    if let Some(item_id) = item_id_option {
        Ok(Some(check_item(item_id, connection)?))
    } else {
        Ok(None)
    }
}

impl From<ItemNotFound> for UpdateInboundShipmentLineError {
    fn from(_: ItemNotFound) -> Self {
        UpdateInboundShipmentLineError::ItemNotFound
    }
}

impl From<NumberOfPacksBelowOne> for UpdateInboundShipmentLineError {
    fn from(_: NumberOfPacksBelowOne) -> Self {
        UpdateInboundShipmentLineError::NumberOfPacksBelowOne
    }
}

impl From<PackSizeBelowOne> for UpdateInboundShipmentLineError {
    fn from(_: PackSizeBelowOne) -> Self {
        UpdateInboundShipmentLineError::PackSizeBelowOne
    }
}

impl From<LineDoesNotExist> for UpdateInboundShipmentLineError {
    fn from(_: LineDoesNotExist) -> Self {
        UpdateInboundShipmentLineError::LineDoesNotExist
    }
}

impl From<WrongInvoiceType> for UpdateInboundShipmentLineError {
    fn from(_: WrongInvoiceType) -> Self {
        UpdateInboundShipmentLineError::NotAnInboundShipment
    }
}

impl From<InvoiceIsFinalised> for UpdateInboundShipmentLineError {
    fn from(_: InvoiceIsFinalised) -> Self {
        UpdateInboundShipmentLineError::CannotEditFinalised
    }
}

impl From<NotInvoiceLine> for UpdateInboundShipmentLineError {
    fn from(error: NotInvoiceLine) -> Self {
        UpdateInboundShipmentLineError::NotThisInvoiceLine(error.0)
    }
}

impl From<BatchIsReserved> for UpdateInboundShipmentLineError {
    fn from(_: BatchIsReserved) -> Self {
        UpdateInboundShipmentLineError::BatchIsReserved
    }
}

impl From<InvoiceDoesNotExist> for UpdateInboundShipmentLineError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        UpdateInboundShipmentLineError::InvoiceDoesNotExist
    }
}
