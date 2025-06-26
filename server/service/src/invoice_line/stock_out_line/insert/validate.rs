use repository::{InvoiceRow, InvoiceStatus, ItemRow, StockLine, StorageConnection};

use crate::{
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::{
        check_batch_exists, check_batch_on_hold, check_existing_stock_line, check_location_on_hold,
        invoice_backdated_date,
        stock_out_line::adjust_for_residual_packs,
        validate::{check_line_exists, check_number_of_packs},
        LocationIsOnHoldError,
    },
    stock_line::historical_stock::get_historical_stock_line_available_quantity,
};

use super::{InsertStockOutLine, InsertStockOutLineError};

pub fn validate(
    connection: &StorageConnection,
    input: InsertStockOutLine,
    store_id: &str,
) -> Result<(ItemRow, InvoiceRow, StockLine, InsertStockOutLine), InsertStockOutLineError> {
    use InsertStockOutLineError::*;

    if (check_line_exists(connection, &input.id)?).is_some() {
        return Err(LineAlreadyExists);
    }
    let batch =
        check_batch_exists(store_id, &input.stock_line_id, connection)?.ok_or(StockLineNotFound)?;

    let item = batch.item_row.clone();

    let invoice =
        check_invoice_exists(&input.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if invoice.status != InvoiceStatus::New && !check_number_of_packs(Some(input.number_of_packs)) {
        return Err(NumberOfPacksBelowZero);
    }

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    let existing_stock = check_existing_stock_line(
        &input.id,
        &invoice.id,
        Some(input.stock_line_id.to_string()),
        connection,
    )?;
    if let Some(existing_stock) = existing_stock {
        return Err(StockLineAlreadyExistsInInvoice(existing_stock.id));
    }
    if let Some(existing_stock) = existing_stock {
        return Err(StockLineAlreadyExistsInInvoice(existing_stock.id));
    }

    if !check_invoice_type(&invoice, input.r#type.to_domain()) {
        return Err(InvoiceTypeDoesNotMatch);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }
    if !check_batch_on_hold(&batch) {
        return Err(BatchIsOnHold);
    }
    check_location_on_hold(&batch).map_err(|e| match e {
        LocationIsOnHoldError::LocationIsOnHold => LocationIsOnHold,
    })?;

    let mut available_packs = batch.stock_line_row.available_number_of_packs;
    if let Some(backdated_date) = invoice_backdated_date(&invoice) {
        available_packs = get_historical_stock_line_available_quantity(
            connection,
            &batch.stock_line_row,
            None,
            &backdated_date,
        )?
    }

    // If there's only a tiny bit left in stock after this, we'll adjust the invoice to take the last of the stock
    // Likewise, if there's almost enough for what the request asks for, we'll allocate the last of the stock and let the transaction continue
    let adjusted_requested_number_of_packs =
        adjust_for_residual_packs(available_packs, input.number_of_packs);
    let adjusted_input = InsertStockOutLine {
        number_of_packs: adjusted_requested_number_of_packs,
        ..input
    };

    if available_packs < adjusted_input.number_of_packs {
        return Err(InsertStockOutLineError::ReductionBelowZero {
            stock_line_id: batch.stock_line_row.id.clone(),
        });
    }

    Ok((item, invoice, batch, adjusted_input))
}
