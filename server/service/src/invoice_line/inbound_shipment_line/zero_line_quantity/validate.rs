use crate::{
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::{
        inbound_shipment_line::check_batch,
        validate::{check_line_belongs_to_invoice, check_line_exists_option},
    },
};
use repository::{
    InvoiceLineRow, InvoiceRow, InvoiceRowType, StorageConnection,
};

use super::{ZeroInboundShipmentLineQuantity, ZeroInboundShipmentLineQuantityError};

pub fn validate(
    input: &ZeroInboundShipmentLineQuantity,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(InvoiceRow, InvoiceLineRow), ZeroInboundShipmentLineQuantityError> {
    use ZeroInboundShipmentLineQuantityError::*;

    let line = check_line_exists_option(connection, &input.id)?
        .ok_or(LineDoesNotExist)?
        .invoice_line_row;
    let invoice = check_invoice_exists(&line.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_type(&invoice, InvoiceRowType::InboundShipment) {
        return Err(NotAnInboundShipment);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }
    if !check_batch(&line, connection)? {
        return Err(BatchIsReserved);
    }
    if !check_line_belongs_to_invoice(&line, &invoice) {
        return Err(NotThisInvoiceLine(line.invoice_id));
    }

    Ok((invoice, line))
}
