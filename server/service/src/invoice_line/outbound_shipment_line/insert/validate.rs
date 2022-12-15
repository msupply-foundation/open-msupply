use crate::{
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::{
        check_batch_exists, check_batch_on_hold, check_item_matches_batch, check_location_on_hold,
        check_unique_stock_line,
        validate::{check_item_exists, check_line_does_not_exist, check_number_of_packs},
        LocationIsOnHoldError,
    },
};
use repository::{InvoiceRow, InvoiceRowType, ItemRow, StockLineRow, StorageConnection};

use super::{InsertOutboundShipmentLine, InsertOutboundShipmentLineError};

pub fn validate(
    input: &InsertOutboundShipmentLine,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(ItemRow, InvoiceRow, StockLineRow), InsertOutboundShipmentLineError> {
    use InsertOutboundShipmentLineError::*;

    if !check_line_does_not_exist(connection, &input.id)? {
        return Err(LineAlreadyExists);
    }
    if !check_number_of_packs(Some(input.number_of_packs)) {
        return Err(NumberOfPacksBelowOne);
    }

    let batch = check_batch_exists(&input.stock_line_id, connection)?.ok_or(StockLineNotFound)?;
    let item = check_item_exists(connection, &input.item_id)?.ok_or(ItemNotFound)?;

    if !check_item_matches_batch(&batch, &item) {
        return Err(ItemDoesNotMatchStockLine);
    }

    let invoice =
        check_invoice_exists(&input.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    let unique_stock = check_unique_stock_line(
        &input.id,
        &invoice.id,
        Some(input.stock_line_id.to_string()),
        connection,
    )?;
    if unique_stock.is_some() {
        return Err(StockLineAlreadyExistsInInvoice(unique_stock.unwrap().id));
    }

    if !check_invoice_type(&invoice, InvoiceRowType::OutboundShipment) {
        return Err(NotAnOutboundShipment);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }
    if !check_batch_on_hold(&batch) {
        return Err(BatchIsOnHold);
    }
    check_location_on_hold(&batch, connection).map_err(|e| match e {
        LocationIsOnHoldError::LocationNotFound => LocationNotFound,
        LocationIsOnHoldError::LocationIsOnHold => LocationIsOnHold,
    })?;
    check_reduction_below_zero(&input, &batch)?;

    Ok((item, invoice, batch))
}

fn check_reduction_below_zero(
    input: &InsertOutboundShipmentLine,
    batch: &StockLineRow,
) -> Result<(), InsertOutboundShipmentLineError> {
    if batch.available_number_of_packs < input.number_of_packs {
        Err(InsertOutboundShipmentLineError::ReductionBelowZero {
            stock_line_id: batch.id.clone(),
        })
    } else {
        Ok(())
    }
}
