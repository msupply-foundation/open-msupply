use repository::{InvoiceRow, InvoiceStatus, ItemRow, StockLine, StorageConnection};

use crate::{
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::{
        check_batch_exists, check_batch_on_hold, check_existing_stock_line, check_location_on_hold,
        invoice_backdated_date,
        validate::{check_line_exists, check_number_of_packs},
        LocationIsOnHoldError,
    },
    stock_line::historical_stock::get_historical_stock_line_available_quantity,
};

use super::{InsertStockOutLine, InsertStockOutLineError};

pub fn validate(
    connection: &StorageConnection,
    input: &InsertStockOutLine,
    store_id: &str,
) -> Result<(ItemRow, InvoiceRow, StockLine), InsertStockOutLineError> {
    use InsertStockOutLineError::*;

    if (check_line_exists(connection, &input.id)?).is_some() {
        return Err(LineAlreadyExists);
    }
    let mut batch =
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

    if let Some(backdated_date) = invoice_backdated_date(&invoice) {
        batch.stock_line_row.available_number_of_packs =
            get_historical_stock_line_available_quantity(
                connection,
                &batch.stock_line_row,
                None,
                &backdated_date,
            )?
    }

    if is_reduction_below_zero(input, &batch) {
        return Err(InsertStockOutLineError::ReductionBelowZero {
            stock_line_id: batch.stock_line_row.id.clone(),
        });
    }

    Ok((item, invoice, batch))
}

fn is_reduction_below_zero(input: &InsertStockOutLine, batch: &StockLine) -> bool {
    batch.stock_line_row.available_number_of_packs < input.number_of_packs
}
