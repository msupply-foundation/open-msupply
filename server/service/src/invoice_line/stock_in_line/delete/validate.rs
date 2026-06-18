use crate::invoice::inbound_shipment::InboundShipmentType;
use crate::{
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::{
        stock_in_line::{check_batch, check_lines_locked_by_authorisation},
        validate::{
            check_line_belongs_to_invoice, check_line_not_associated_with_stocktake,
            check_line_row_exists,
        },
    },
    validate::check_other_party_store_is_disabled,
};
use repository::{InvoiceLineRow, InvoiceRow, StorageConnection};

use super::{DeleteStockInLine, DeleteStockInLineError};

pub fn validate(
    input: &DeleteStockInLine,
    store_id: &str,
    connection: &StorageConnection,
    inbound_shipment_type: Option<InboundShipmentType>,
) -> Result<(InvoiceRow, InvoiceLineRow), DeleteStockInLineError> {
    use DeleteStockInLineError::*;

    let line = check_line_row_exists(connection, &input.id)?.ok_or(LineDoesNotExist)?;
    let invoice = check_invoice_exists(&line.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_type(&invoice, input.r#type.to_domain()) {
        return Err(NotAStockIn);
    }
    if let Some(inbound_type) = inbound_shipment_type {
        if !inbound_type.matches_input(invoice.purchase_order_id.is_some()) {
            return Err(WrongInboundShipmentType);
        }
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }
    if check_other_party_store_is_disabled(connection, store_id, &invoice.name_id)? {
        return Err(CannotEditFinalised);
    }
    if check_lines_locked_by_authorisation(connection, &invoice) {
        return Err(CannotDeleteLinesOfAuthorisedReceivedInvoice);
    }
    if !check_batch(&line, connection)? {
        return Err(BatchIsReserved);
    }
    if !check_line_belongs_to_invoice(&line, &invoice) {
        return Err(NotThisInvoiceLine(line.invoice_id));
    }
    if !check_line_not_associated_with_stocktake(connection, &line.id, store_id.to_string()) {
        return Err(LineUsedInStocktake);
    }
    if check_line_linked(&line) {
        return Err(LineLinkedToTransferredInvoice);
    }

    Ok((invoice, line))
}

fn check_line_linked(line: &InvoiceLineRow) -> bool {
    line.linked_invoice_id.is_some()
}
