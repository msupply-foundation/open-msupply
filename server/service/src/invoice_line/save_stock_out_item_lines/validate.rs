use repository::{InvoiceRow, InvoiceType, StorageConnection};

use crate::{
    invoice::{check_invoice_exists, check_invoice_is_editable, check_store},
    invoice_line::save_stock_out_item_lines::SaveStockOutItemLinesError,
};

fn is_stock_out_invoice(invoice: &InvoiceRow) -> bool {
    match invoice.r#type {
        InvoiceType::OutboundShipment | InvoiceType::Prescription | InvoiceType::SupplierReturn => {
            true
        }
        _ => false,
    }
}

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    id: &str,
) -> Result<InvoiceRow, SaveStockOutItemLinesError> {
    use SaveStockOutItemLinesError::*;

    let outbound = check_invoice_exists(id, connection)?.ok_or(InvoiceNotFound)?;

    if !check_store(&outbound, store_id) {
        return Err(InvoiceDoesNotBelongToCurrentStore);
    }
    if !check_invoice_is_editable(&outbound) {
        return Err(InvoiceNotEditable);
    }
    if !is_stock_out_invoice(&outbound) {
        return Err(NotAStockOutInvoice);
    }

    Ok(outbound)
}
