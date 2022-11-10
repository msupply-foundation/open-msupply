use crate::{
    invoice::{
        check_invoice_exists_option, check_invoice_is_editable, check_invoice_type, check_store,
    },
    invoice_line::{
        check_batch_exists, check_batch_on_hold, check_item_matches_batch, check_location_on_hold,
        check_unique_stock_line,
        validate::{
            check_item, check_line_exists_option, check_number_of_packs, ItemNotFound,
            NotInvoiceLine, NumberOfPacksBelowOne,
        },
        BatchIsOnHold, ItemDoesNotMatchStockLine, LocationIsOnHoldError,
        StockLineAlreadyExistsInInvoice, StockLineNotFound,
    },
};
use repository::{InvoiceLineRow, InvoiceRow, InvoiceRowType, ItemRow, StorageConnection};

use super::{BatchPair, UpdateOutboundShipmentLine, UpdateOutboundShipmentLineError};

pub fn validate(
    input: &UpdateOutboundShipmentLine,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(InvoiceLineRow, ItemRow, BatchPair, InvoiceRow), UpdateOutboundShipmentLineError> {
    use UpdateOutboundShipmentLineError::*;

    let line = check_line_exists_option(connection, &input.id)?.ok_or(LineDoesNotExist)?;
    let invoice =
        check_invoice_exists_option(&line.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;
    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    check_unique_stock_line(
        &line.id,
        &invoice.id,
        input.stock_line_id.clone(),
        connection,
    )?;

    // check batch belongs to store

    if !check_invoice_type(&invoice, InvoiceRowType::OutboundShipment) {
        return Err(NotAnOutboundShipment);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }

    check_number_of_packs(input.number_of_packs.clone())?;
    let batch_pair = check_batch_exists_option(&input, &line, connection)?;
    let item = check_item_option(input.item_id.clone(), &line, connection)?;
    check_item_matches_batch(&batch_pair.main_batch, &item)?;

    check_batch_on_hold(&batch_pair.main_batch)?;
    check_location_on_hold(&batch_pair.main_batch, connection)?;
    check_reduction_below_zero(&input, &line, &batch_pair)?;

    Ok((line, item, batch_pair, invoice))
}

fn check_reduction_below_zero(
    input: &UpdateOutboundShipmentLine,
    line: &InvoiceLineRow,
    batch_pair: &BatchPair,
) -> Result<(), UpdateOutboundShipmentLineError> {
    // If previous batch is present, this means we are adjust new batch thus:
    // - check full number of pack in invoice
    let reduction = batch_pair.get_main_batch_reduction(input, line);

    if batch_pair.main_batch.available_number_of_packs < reduction {
        Err(UpdateOutboundShipmentLineError::ReductionBelowZero {
            stock_line_id: batch_pair.main_batch.id.clone(),
            line_id: line.id.clone(),
        })
    } else {
        Ok(())
    }
}

fn check_item_option(
    item_id: Option<String>,
    invoice_line: &InvoiceLineRow,
    connection: &StorageConnection,
) -> Result<ItemRow, UpdateOutboundShipmentLineError> {
    if let Some(item_id) = item_id {
        Ok(check_item(&item_id, connection)?)
    } else {
        Ok(check_item(&invoice_line.item_id, connection)?)
    }
}

fn check_batch_exists_option(
    input: &UpdateOutboundShipmentLine,
    existing_line: &InvoiceLineRow,
    connection: &StorageConnection,
) -> Result<BatchPair, UpdateOutboundShipmentLineError> {
    use UpdateOutboundShipmentLineError::*;

    let previous_batch = if let Some(batch_id) = &existing_line.stock_line_id {
        // Should always be found due to contraints on database
        check_batch_exists(batch_id, connection)?
    } else {
        // This should never happen, but still need to cover
        return Err(LineDoesNotReferenceStockLine);
    };

    let result = match &input.stock_line_id {
        Some(batch_id) if batch_id != &previous_batch.id => BatchPair {
            // stock_line changed
            main_batch: check_batch_exists(batch_id, connection)?,
            previous_batch_option: Some(previous_batch),
        },
        _ => {
            // stock_line_id not changed
            BatchPair {
                main_batch: previous_batch,
                previous_batch_option: None,
            }
        }
    };

    Ok(result)
}

impl From<ItemDoesNotMatchStockLine> for UpdateOutboundShipmentLineError {
    fn from(_: ItemDoesNotMatchStockLine) -> Self {
        UpdateOutboundShipmentLineError::ItemDoesNotMatchStockLine
    }
}

impl From<LocationIsOnHoldError> for UpdateOutboundShipmentLineError {
    fn from(error: LocationIsOnHoldError) -> Self {
        use UpdateOutboundShipmentLineError::*;
        match error {
            LocationIsOnHoldError::LocationIsOnHold => LocationIsOnHold,
            LocationIsOnHoldError::LocationNotFound => LocationNotFound,
        }
    }
}

impl From<BatchIsOnHold> for UpdateOutboundShipmentLineError {
    fn from(_: BatchIsOnHold) -> Self {
        UpdateOutboundShipmentLineError::BatchIsOnHold
    }
}

impl From<NotInvoiceLine> for UpdateOutboundShipmentLineError {
    fn from(error: NotInvoiceLine) -> Self {
        UpdateOutboundShipmentLineError::NotThisInvoiceLine(error.0)
    }
}

impl From<ItemNotFound> for UpdateOutboundShipmentLineError {
    fn from(_: ItemNotFound) -> Self {
        UpdateOutboundShipmentLineError::ItemNotFound
    }
}

impl From<StockLineAlreadyExistsInInvoice> for UpdateOutboundShipmentLineError {
    fn from(error: StockLineAlreadyExistsInInvoice) -> Self {
        UpdateOutboundShipmentLineError::StockLineAlreadyExistsInInvoice(error.0)
    }
}

impl From<StockLineNotFound> for UpdateOutboundShipmentLineError {
    fn from(_: StockLineNotFound) -> Self {
        UpdateOutboundShipmentLineError::StockLineNotFound
    }
}

impl From<NumberOfPacksBelowOne> for UpdateOutboundShipmentLineError {
    fn from(_: NumberOfPacksBelowOne) -> Self {
        UpdateOutboundShipmentLineError::NumberOfPacksBelowOne
    }
}
