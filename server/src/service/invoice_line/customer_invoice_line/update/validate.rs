use crate::{
    database::{
        repository::StorageConnection,
        schema::{InvoiceLineRow, InvoiceRow, ItemRow},
    },
    domain::{customer_invoice::UpdateCustomerInvoiceLine, invoice::InvoiceType},
    service::{
        invoice::{
            check_invoice_exists, check_invoice_finalised, check_invoice_type, InvoiceDoesNotExist,
            InvoiceIsFinalised, WrongInvoiceType,
        },
        invoice_line::{
            check_batch_exists, check_item_matches_batch, check_unique_stock_line,
            validate::{
                check_item, check_line_belongs_to_invoice, check_line_exists,
                check_number_of_packs, ItemNotFound, LineDoesNotExist, NotInvoiceLine,
                NumberOfPacksBelowOne,
            },
            ItemDoesNotMatchStockLine, StockLineAlreadyExistsInInvoice, StockLineNotFound,
        },
    },
};

use super::{BatchPair, UpdateCustomerInvoiceLineError};

pub fn validate(
    input: &UpdateCustomerInvoiceLine,
    connection: &StorageConnection,
) -> Result<(InvoiceLineRow, ItemRow, BatchPair, InvoiceRow), UpdateCustomerInvoiceLineError> {
    let line = check_line_exists(&input.id, connection)?;
    let invoice = check_invoice_exists(&input.invoice_id, connection)?;
    check_unique_stock_line(
        &line.id,
        &invoice.id,
        input.stock_line_id.clone(),
        connection,
    )?;

    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    // check batch belongs to store

    check_line_belongs_to_invoice(&line, &invoice)?;
    check_invoice_type(&invoice, InvoiceType::CustomerInvoice)?;
    check_invoice_finalised(&invoice)?;

    check_number_of_packs(input.number_of_packs.clone())?;
    let batch_pair = check_batch_exists_option(&input, &line, connection)?;
    let item = check_item_option(input.item_id.clone(), &line, connection)?;
    check_item_matches_batch(&batch_pair.main_batch, &item)?;

    check_reduction_below_zero(&input, &line, &batch_pair)?;

    Ok((line, item, batch_pair, invoice))
}

fn check_reduction_below_zero(
    input: &UpdateCustomerInvoiceLine,
    line: &InvoiceLineRow,
    batch_pair: &BatchPair,
) -> Result<(), UpdateCustomerInvoiceLineError> {
    // If previous batch is present, this means we are adjust new batch thus:
    // - check full number of pack in invoice
    let reduction = batch_pair.get_main_batch_reduction(input, line);

    if batch_pair.main_batch.available_number_of_packs < reduction {
        Err(UpdateCustomerInvoiceLineError::ReductionBelowZero {
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
) -> Result<ItemRow, UpdateCustomerInvoiceLineError> {
    if let Some(item_id) = item_id {
        Ok(check_item(&item_id, connection)?)
    } else {
        Ok(check_item(&invoice_line.item_id, connection)?)
    }
}

fn check_batch_exists_option(
    input: &UpdateCustomerInvoiceLine,
    existing_line: &InvoiceLineRow,
    connection: &StorageConnection,
) -> Result<BatchPair, UpdateCustomerInvoiceLineError> {
    use UpdateCustomerInvoiceLineError::*;

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

impl From<ItemDoesNotMatchStockLine> for UpdateCustomerInvoiceLineError {
    fn from(_: ItemDoesNotMatchStockLine) -> Self {
        UpdateCustomerInvoiceLineError::ItemDoesNotMatchStockLine
    }
}

impl From<NotInvoiceLine> for UpdateCustomerInvoiceLineError {
    fn from(error: NotInvoiceLine) -> Self {
        UpdateCustomerInvoiceLineError::NotThisInvoiceLine(error.0)
    }
}

impl From<LineDoesNotExist> for UpdateCustomerInvoiceLineError {
    fn from(_: LineDoesNotExist) -> Self {
        UpdateCustomerInvoiceLineError::LineDoesNotExist
    }
}

impl From<ItemNotFound> for UpdateCustomerInvoiceLineError {
    fn from(_: ItemNotFound) -> Self {
        UpdateCustomerInvoiceLineError::ItemNotFound
    }
}

impl From<StockLineAlreadyExistsInInvoice> for UpdateCustomerInvoiceLineError {
    fn from(error: StockLineAlreadyExistsInInvoice) -> Self {
        UpdateCustomerInvoiceLineError::StockLineAlreadyExistsInInvoice(error.0)
    }
}

impl From<StockLineNotFound> for UpdateCustomerInvoiceLineError {
    fn from(_: StockLineNotFound) -> Self {
        UpdateCustomerInvoiceLineError::StockLineNotFound
    }
}

impl From<NumberOfPacksBelowOne> for UpdateCustomerInvoiceLineError {
    fn from(_: NumberOfPacksBelowOne) -> Self {
        UpdateCustomerInvoiceLineError::NumberOfPacksBelowOne
    }
}

impl From<WrongInvoiceType> for UpdateCustomerInvoiceLineError {
    fn from(_: WrongInvoiceType) -> Self {
        UpdateCustomerInvoiceLineError::NotACustomerInvoice
    }
}

impl From<InvoiceIsFinalised> for UpdateCustomerInvoiceLineError {
    fn from(_: InvoiceIsFinalised) -> Self {
        UpdateCustomerInvoiceLineError::CannotEditFinalised
    }
}

impl From<InvoiceDoesNotExist> for UpdateCustomerInvoiceLineError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        UpdateCustomerInvoiceLineError::InvoiceDoesNotExist
    }
}
