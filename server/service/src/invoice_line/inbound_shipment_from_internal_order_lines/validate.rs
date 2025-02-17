use repository::{InvoiceRow, InvoiceType, ItemRow, RequisitionLineRow, StorageConnection};

use crate::{
    invoice::{check_invoice_exists, check_invoice_is_editable, check_store},
    invoice_line::validate::check_item_exists,
    requisition_line::common::check_requisition_line_exists,
};

use super::{InsertFromInternalOrderLine, InsertFromInternalOrderLineError};

pub struct ValidateResults {
    pub invoice: InvoiceRow,
    pub requisition_line: RequisitionLineRow,
    pub item: ItemRow,
}

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertFromInternalOrderLine,
) -> Result<ValidateResults, InsertFromInternalOrderLineError> {
    use InsertFromInternalOrderLineError::*;

    let invoice =
        check_invoice_exists(&input.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    };

    if invoice.r#type != InvoiceType::InboundShipment {
        return Err(NotAnInboundShipment);
    }

    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }

    let requisition_line = check_requisition_line_exists(connection, &input.requisition_line_id)?
        .ok_or(RequisitionLineDoesNotExist)?;

    if let Some(invoice_req_id) = &invoice.requisition_id {
        if requisition_line.requisition_row.id != *invoice_req_id {
            return Err(RequisitionNotLinkedToInvoice);
        }
    }

    let item =
        check_item_exists(connection, &requisition_line.item_row.id)?.ok_or(ItemDoesNotExist)?;

    Ok(ValidateResults {
        invoice,
        requisition_line: requisition_line.requisition_line_row,
        item,
    })
}
