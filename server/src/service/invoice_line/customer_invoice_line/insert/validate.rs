use crate::{
    database::{
        repository::StorageConnection,
        schema::{InvoiceRow, ItemRow, StockLineRow},
    },
    domain::{customer_invoice::InsertCustomerInvoiceLine, invoice::InvoiceType},
    service::{
        invoice::{
            check_invoice_exists, check_invoice_finalised, check_invoice_type, InvoiceDoesNotExist,
            InvoiceIsFinalised, WrongInvoiceType,
        },
        invoice_line::{
            check_batch_exists, check_item_matches_batch, check_unique_stock_line,
            validate::{
                check_item, check_line_does_not_exists, check_number_of_packs, ItemNotFound,
                LineAlreadyExists, NumberOfPacksBelowOne,
            },
            ItemDoesNotMatchStockLine, StockLineAlreadyExistsInInvoice, StockLineNotFound,
        },
        u32_to_i32,
    },
};

use super::InsertCustomerInvoiceLineError;

pub fn validate(
    input: &InsertCustomerInvoiceLine,
    connection: &StorageConnection,
) -> Result<(ItemRow, InvoiceRow, StockLineRow), InsertCustomerInvoiceLineError> {
    check_line_does_not_exists(&input.id, connection)?;
    check_number_of_packs(Some(input.number_of_packs))?;
    let batch = check_batch_exists(&input.stock_line_id, connection)?;
    let item = check_item(&input.item_id, connection)?;
    check_item_matches_batch(&batch, &item)?;
    let invoice = check_invoice_exists(&input.invoice_id, connection)?;
    check_unique_stock_line(
        &input.id,
        &invoice.id,
        Some(input.stock_line_id.to_string()),
        connection,
    )?;
    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice, InvoiceType::CustomerInvoice)?;
    check_invoice_finalised(&invoice)?;

    check_reduction_below_zero(&input, &batch)?;

    Ok((item, invoice, batch))
}

fn check_reduction_below_zero(
    input: &InsertCustomerInvoiceLine,
    batch: &StockLineRow,
) -> Result<(), InsertCustomerInvoiceLineError> {
    if batch.available_number_of_packs < u32_to_i32(input.number_of_packs) {
        Err(InsertCustomerInvoiceLineError::ReductionBelowZero {
            stock_line_id: batch.id.clone(),
        })
    } else {
        Ok(())
    }
}

impl From<StockLineAlreadyExistsInInvoice> for InsertCustomerInvoiceLineError {
    fn from(error: StockLineAlreadyExistsInInvoice) -> Self {
        InsertCustomerInvoiceLineError::StockLineAlreadyExistsInInvoice(error.0)
    }
}

impl From<ItemDoesNotMatchStockLine> for InsertCustomerInvoiceLineError {
    fn from(_: ItemDoesNotMatchStockLine) -> Self {
        InsertCustomerInvoiceLineError::ItemDoesNotMatchStockLine
    }
}

impl From<ItemNotFound> for InsertCustomerInvoiceLineError {
    fn from(_: ItemNotFound) -> Self {
        InsertCustomerInvoiceLineError::ItemNotFound
    }
}

impl From<StockLineNotFound> for InsertCustomerInvoiceLineError {
    fn from(_: StockLineNotFound) -> Self {
        InsertCustomerInvoiceLineError::StockLineNotFound
    }
}

impl From<NumberOfPacksBelowOne> for InsertCustomerInvoiceLineError {
    fn from(_: NumberOfPacksBelowOne) -> Self {
        InsertCustomerInvoiceLineError::NumberOfPacksBelowOne
    }
}

impl From<LineAlreadyExists> for InsertCustomerInvoiceLineError {
    fn from(_: LineAlreadyExists) -> Self {
        InsertCustomerInvoiceLineError::LineAlreadyExists
    }
}

impl From<WrongInvoiceType> for InsertCustomerInvoiceLineError {
    fn from(_: WrongInvoiceType) -> Self {
        InsertCustomerInvoiceLineError::NotACustomerInvoice
    }
}

impl From<InvoiceIsFinalised> for InsertCustomerInvoiceLineError {
    fn from(_: InvoiceIsFinalised) -> Self {
        InsertCustomerInvoiceLineError::CannotEditFinalised
    }
}

impl From<InvoiceDoesNotExist> for InsertCustomerInvoiceLineError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        InsertCustomerInvoiceLineError::InvoiceDoesNotExist
    }
}
